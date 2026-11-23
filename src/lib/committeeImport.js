// Parses local committee returns only. No record is an instruction to delete or award.
export function parseDelimited(text, postgres = false) {
	const rows = [];
	let row = [],
		field = '',
		quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (postgres && quoted && c === '\\') {
			field += text[++i] || '';
			continue;
		}
		if (c === '"') {
			if (quoted && text[i + 1] === '"') {
				field += '"';
				i++;
			} else quoted = !quoted;
		} else if (!quoted && c === ',') {
			row.push(field);
			field = '';
		} else if (!quoted && (c === '\n' || c === '\r')) {
			if (c === '\r' && text[i + 1] === '\n') i++;
			row.push(field);
			if (row.some((value) => value !== '')) rows.push(row);
			row = [];
			field = '';
		} else field += c;
	}
	if (quoted) throw new Error('Unclosed quoted value in the committee file.');
	row.push(field);
	if (row.some((value) => value !== '')) rows.push(row);
	return rows;
}

export function committeeDate(value) {
	if (!value?.trim()) return null;
	const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (!match) throw new Error('Date must be day/month/four-digit-year; do not guess a correction.');
	const [, d, m, y] = match.map(Number);
	const date = new Date(Date.UTC(y, m - 1, d));
	if (
		y < 1900 ||
		y > 2100 ||
		date.getUTCFullYear() !== y ||
		date.getUTCMonth() !== m - 1 ||
		date.getUTCDate() !== d
	)
		throw new Error('Invalid calendar date.');
	return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseCommitteeSheet(text, cutoff = '2025-10-01') {
	if (text.length > 2 * 1024 * 1024) throw new Error('Committee file exceeds 2 MiB.');
	const [headers, ...source] = parseDelimited(text.replace(/^\uFEFF/, ''));
	const columns = ['Delete record', 'Has Kit', 'Kit date', 'get_new_users_confirmed_without_kits'];
	if (
		!headers ||
		columns.some((name) => !headers.includes(name)) ||
		new Set(headers).size !== headers.length
	)
		throw new Error(
			'Expected the committee spreadsheet columns: Delete record, Has Kit, Kit date and get_new_users_confirmed_without_kits.'
		);
	if (source.length > 5000) throw new Error('Committee file exceeds 5,000 rows.');
	const emails = new Map();
	const rows = source.map((values, index) => {
		const sourceRow = index + 2;
		if (values.length !== headers.length)
			throw new Error(`CSV row ${sourceRow} has an unexpected number of columns.`);
		const raw = Object.fromEntries(headers.map((key, i) => [key, values[i]]));
		const errors = [];
		const marker = (value) => {
			if (!value.trim()) return null;
			if (/^y$/i.test(value.trim())) return true;
			errors.push('Unrecognised marker; only Y/y or blank is accepted.');
			return null;
		};
		const deleteRequested = marker(raw['Delete record']);
		const hasKit = marker(raw['Has Kit']);
		const record = raw[columns[3]].trim();
		let fields = [];
		try {
			if (!record.startsWith('(') || !record.endsWith(')'))
				throw new Error('Expected a PostgreSQL record.');
			fields = parseDelimited(record.slice(1, -1), true)[0] || [];
			if (fields.length < 8) throw new Error('Record is missing account columns.');
		} catch (error) {
			errors.push(error.message);
		}
		const email = (fields[0] || '').trim().toLowerCase();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Missing or invalid account email.');
		let date = null;
		try {
			date = committeeDate(raw['Kit date']);
		} catch (error) {
			errors.push(error.message);
		}
		if (date && !hasKit) errors.push('Award date supplied without an award marker.');
		if (deleteRequested && hasKit) errors.push('Deletion and award flags conflict; review both.');
		const classification = deleteRequested
			? 'deletion_review'
			: !hasKit
			? 'unknown'
			: errors.length
			? 'invalid_award'
			: !date || date >= cutoff
			? 'award_type_review'
			: 'starter_kit_candidate';
		const row = {
			source_row: sourceRow,
			raw_source: raw,
			email,
			first_name: fields[1] || '',
			family_name: fields[2] || '',
			address: fields[3] || '',
			suburb: fields[4] || '',
			registered_at_snapshot: fields[5] || '',
			delete_requested: !!deleteRequested,
			has_kit_marker: !!hasKit,
			source_date: raw['Kit date'],
			awarded_on: date,
			classification,
			errors,
			decision: 'pending',
			user_id: null,
			legacy_missing_labels: fields.slice(8).join(',')
		};
		if (email) {
			const earlier = emails.get(email);
			if (earlier) {
				earlier.errors.push('Duplicate email in source file.');
				row.errors.push('Duplicate email in source file.');
			} else emails.set(email, row);
		}
		return row;
	});
	return {
		rows,
		summary: {
			total: rows.length,
			deletion_requests: rows.filter((r) => r.delete_requested).length,
			marked_awards: rows.filter((r) => r.has_kit_marker).length,
			pre_cutoff_awards: rows.filter(
				(r) => r.has_kit_marker && r.awarded_on && r.awarded_on < cutoff
			).length,
			post_cutoff_awards: rows.filter(
				(r) => r.has_kit_marker && r.awarded_on && r.awarded_on >= cutoff
			).length,
			unknown: rows.filter((r) => r.classification === 'unknown').length,
			invalid_rows: rows.filter((r) => r.errors.length).length
		}
	};
}

export function reviewedCommitteeAction(row, sourceHash, note) {
	if (!/^[a-f0-9]{64}$/.test(sourceHash) || !Number.isInteger(row.source_row) || row.source_row < 2)
		throw new Error('Source checksum and row number are required.');
	if (row.errors?.length)
		throw new Error('Resolve source errors with documented corrections before applying this row.');
	if (!/^[a-f0-9-]{36}$/i.test(row.user_id || ''))
		throw new Error('Resolve the current account UUID before applying.');
	if (!note?.trim()) throw new Error('A review and provenance note is required.');
	const args = {
		user_id: row.user_id,
		reference: `committee/${sourceHash}/row-${row.source_row}`,
		note: note.trim()
	};
	if (row.decision === 'starter_kit')
		return { action: 'record_kit', arguments: { ...args, awarded_on: row.awarded_on } };
	if (row.decision === 'backpack')
		return {
			action: 'record_committee_backpack',
			arguments: { ...args, awarded_on: row.awarded_on }
		};
	if (row.decision === 'exclude')
		return { action: 'set_account_exclusion', arguments: { ...args, excluded: true } };
	throw new Error(
		'Choose an explicit reviewed starter-kit, backpack or exclusion decision. Pending rows are not applied.'
	);
}
