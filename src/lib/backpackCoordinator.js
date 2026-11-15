export class CoordinatorRequestError extends Error {
	constructor(message, status) {
		super(message);
		this.status = status;
	}
}
export async function coordinatorAction(action, args = {}, fetcher = fetch) {
	const response = await fetcher('/api/backpack/admin', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ action, arguments: args })
	});
	let body;
	try {
		body = await response.json();
	} catch {
		throw new CoordinatorRequestError(
			'The coordinator service returned an unreadable response. Try again.',
			response.status
		);
	}
	if (!response.ok)
		throw new CoordinatorRequestError(
			body?.error || 'The request could not be completed.',
			response.status
		);
	if (!body || !Object.hasOwn(body, 'result'))
		throw new CoordinatorRequestError(
			'The coordinator service returned an unreadable response. Try again.',
			response.status
		);
	return body.result;
}
export const personName = (person) =>
	[person?.first_name, person?.family_name].filter(Boolean).join(' ') ||
	person?.email ||
	'Unnamed participant';
export const addressText = (person) =>
	[
		person?.street ?? person?.property_address_street,
		person?.suburb ?? person?.property_address_suburb,
		person?.postcode ?? person?.property_address_postcode
	]
		.filter(Boolean)
		.join(', ') || 'Address not provided';
export function dateText(value) {
	if (!value) return 'Not recorded';
	const date = new Date(value);
	return Number.isNaN(date.valueOf())
		? 'Not recorded'
		: new Intl.DateTimeFormat('en-AU', {
				timeZone: 'Australia/Sydney',
				dateStyle: 'medium',
				timeStyle: 'short'
		  }).format(date);
}
export const liveAvailable = (policy) =>
	Boolean(policy?.enabled && policy?.email_enabled && policy?.baseline_completed_at);
export function readinessBlockers(readiness) {
	if (!readiness) return ['Programme configuration is unavailable.'];
	const blockers = [];
	if (!readiness.configured) blockers.push('Programme cutoff and question rules need approval.');
	for (const [key, label] of [
		['unassessed_accounts', 'accounts need assessment'],
		['unresolved_memberships', 'household memberships need review'],
		['missing_contacts', 'households need a contact'],
		['pending_special_cases', 'special cases need a decision'],
		['processing_jobs', 'email jobs are in flight']
	]) {
		if (Number(readiness[key]) > 0) blockers.push(`${readiness[key]} ${label}.`);
	}
	return blockers;
}

// A datetime-local value has no timezone. Match it against a named timezone;
// reject missing or repeated DST times rather than silently changing the record.
export function localDateTimeToISO(value, timeZone = 'Australia/Sydney') {
	if (!value) return null;
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
	if (!match) throw new Error('Enter a valid date and time.');
	const [year, month, day, hour, minute, second] = match.slice(1).map((v) => Number(v || 0));
	const nominal = Date.UTC(year, month - 1, day, hour, minute, second);
	const formatter = new Intl.DateTimeFormat('en-GB', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	});
	const candidates = [];
	for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
		const instant = nominal - offset * 60000;
		const parts = Object.fromEntries(
			formatter.formatToParts(instant).map((p) => [p.type, p.value])
		);
		if (
			[parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second]
				.map(Number)
				.join(',') === [year, month, day, hour, minute, second].join(',')
		)
			candidates.push(instant);
	}
	if (candidates.length !== 1)
		throw new Error(
			candidates.length
				? 'This time occurs twice when daylight saving changes. Select UTC and enter the known UTC time.'
				: 'This date or time does not exist in the selected timezone.'
		);
	return new Date(candidates[0]).toISOString();
}

export function parseAwardCSV(text) {
	if (new TextEncoder().encode(text).byteLength > 131072)
		throw new Error('Choose a CSV file smaller than 128 KiB.');
	const rows = [];
	let row = [],
		field = '',
		quoted = false,
		closed = false;
	const input = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
	for (let i = 0; i <= input.length; i++) {
		const c = input[i];
		if (quoted) {
			if (c === '"' && input[i + 1] === '"') {
				field += '"';
				i++;
			} else if (c === '"') {
				quoted = false;
				closed = true;
			} else if (c === undefined) throw new Error('A quoted CSV field was not closed.');
			else field += c;
		} else if (c === '"') {
			if (field || closed) throw new Error('Unexpected quote in CSV.');
			quoted = true;
		} else if (c === ',' || c === '\n' || c === undefined) {
			row.push(field.trim());
			field = '';
			closed = false;
			if (c !== ',') {
				if (row.some(Boolean)) rows.push(row);
				row = [];
			}
		} else {
			if (closed && c.trim()) throw new Error('Unexpected text after a quoted CSV field.');
			field += c;
		}
	}
	if (rows.length < 2) throw new Error('Include a header and at least one award row.');
	const headings = rows.shift().map((v) => v.toLowerCase());
	const allowed = ['reference', 'email', 'awarded_at', 'delivered_at', 'note'];
	if (
		!headings.includes('reference') ||
		!headings.includes('email') ||
		new Set(headings).size !== headings.length ||
		headings.some((h) => !allowed.includes(h))
	)
		throw new Error(
			'CSV needs reference and email columns. Optional columns: awarded_at, delivered_at, note.'
		);
	if (rows.length > 50) throw new Error('Import at most 50 rows at a time.');
	const refs = new Set();
	return rows.map((values, index) => {
		if (values.length !== headings.length)
			throw new Error(`Row ${index + 2} has the wrong number of columns.`);
		const entry = Object.fromEntries(headings.map((h, i) => [h, values[i]]));
		if (!entry.reference || entry.reference.length > 200 || !entry.email)
			throw new Error(`Row ${index + 2} needs a reference and email.`);
		if (refs.has(entry.reference)) throw new Error(`Duplicate reference on row ${index + 2}.`);
		refs.add(entry.reference);
		for (const key of ['awarded_at', 'delivered_at']) {
			if (
				entry[key] &&
				(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(entry[key]) ||
					!Number.isFinite(Date.parse(entry[key])))
			)
				throw new Error(`Row ${index + 2}: dates must include a timezone, or be blank if unknown.`);
		}
		return { ...entry, row: index + 2 };
	});
}
