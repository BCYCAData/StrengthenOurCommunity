const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const schemas = {
	snapshot: { limit: 'page?', offset: 'offset?', search: 'search?', filter: 'filter?' },
	household_details: { household_id: 'uuid' },
	list_awards: { limit: 'page?', offset: 'offset?', search: 'search?' },
	preview_household: { household_id: 'uuid', member_ids: 'members' },
	confirm_household: {
		household_id: 'uuid',
		member_ids: 'members',
		contact_user_id: 'uuid',
		property_id: 'text?',
		revision: 'revision',
		note: 'note',
		mode: 'mode?'
	},
	decide_special_case: {
		user_id: 'uuid',
		programme: 'text',
		decision: 'decision',
		note: 'note',
		mode: 'mode?'
	},
	record_award: {
		household_id: 'uuid',
		programme: 'text',
		original_user_id: 'uuid?',
		reference: 'text',
		historical: 'boolean',
		awarded_at: 'date?',
		delivered_at: 'date?',
		note: 'note',
		mode: 'mode?'
	},
	record_delivery: { award_id: 'uuid', delivered_at: 'date', note: 'note', mode: 'mode?' },
	baseline_preview: {},
	run_baseline: { policy_id: 'integer', note: 'note' },
	review_baseline: { run_id: 'uuid', note: 'note' }
};

function valid(value, rule) {
	if (rule.endsWith('?') && value === undefined) return true;
	if (rule.endsWith('?') && value === null) return rule !== 'mode?';
	const type = rule.replace('?', '');
	if (type === 'search') return typeof value === 'string' && value.length <= 120;
	if (type === 'filter')
		return ['all', 'pending', 'special_case', 'incomplete', 'qualified', 'awarded'].includes(value);
	if (type === 'uuid') return typeof value === 'string' && uuid.test(value);
	if (type === 'members')
		return (
			Array.isArray(value) &&
			value.length >= 1 &&
			value.length <= 50 &&
			value.every((id) => typeof id === 'string' && uuid.test(id)) &&
			new Set(value.map((id) => id.toLowerCase())).size === value.length
		);
	if (type === 'mode') return ['baseline', 'live'].includes(value);
	if (type === 'boolean') return typeof value === 'boolean';
	if (type === 'integer') return Number.isSafeInteger(value) && value > 0;
	if (type === 'page') return Number.isInteger(value) && value >= 1 && value <= 100;
	if (type === 'offset') return Number.isInteger(value) && value >= 0 && value <= 100000;
	if (type === 'decision') return ['pending', 'approved', 'declined'].includes(value);
	if (type === 'revision') return typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
	// Require an explicit offset: never silently interpret an operator's local time.
	if (type === 'date')
		return (
			typeof value === 'string' &&
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
			Number.isFinite(Date.parse(value))
		);
	return (
		typeof value === 'string' &&
		value.trim().length > 0 &&
		value.length <= (type === 'note' ? 2000 : 200)
	);
}

export function validateCoordinatorAction(body) {
	if (
		!body ||
		typeof body !== 'object' ||
		Array.isArray(body) ||
		Object.keys(body).some((key) => !['action', 'arguments'].includes(key))
	)
		return false;
	if (typeof body.action !== 'string' || !Object.hasOwn(schemas, body.action)) return false;
	const args = body.arguments ?? {};
	if (!args || typeof args !== 'object' || Array.isArray(args)) return false;
	const schema = schemas[body.action];
	return (
		Object.keys(args).every((key) => Object.hasOwn(schema, key)) &&
		Object.entries(schema).every(([key, rule]) => valid(args[key], rule))
	);
}

const errorMessages = {
	42501: [403, 'Coordinator access required'],
	22023: [400, 'Check the supplied action and values'],
	'22P02': [400, 'Check the supplied identifiers and values'],
	22007: [400, 'Check the supplied timestamps'],
	22008: [400, 'Check the supplied timestamps'],
	23505: [409, 'An award or reference already exists; review the existing record'],
	23514: [400, 'The supplied values do not satisfy the programme rules'],
	40001: [409, 'The preview or baseline has changed; refresh and review it again'],
	55000: [
		409,
		'Programme readiness or in-flight delivery prevents this change; review the current status'
	],
	P0001: [
		409,
		'This change conflicts with existing household history; coordinator reconciliation is required'
	]
};

async function readLimitedJSON(request) {
	const reader = request.body?.getReader();
	if (!reader) throw new SyntaxError('Empty request');
	const chunks = [];
	let size = 0;
	try {
		let finished = false;
		while (!finished) {
			const { value, done } = await reader.read();
			finished = done;
			if (done) break;
			size += value.byteLength;
			if (size > 16384) {
				await reader.cancel();
				throw new RangeError('Request too large');
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return JSON.parse(new TextDecoder().decode(bytes));
}

export function createCoordinatorHandler({ env, getClient }) {
	return async function POST({ request, locals, url }) {
		const headers = { 'Cache-Control': 'private, no-store' };
		const reply = (status, body) => ({ status, headers, body });
		if (!locals?.user?.id) return reply(401, { error: 'Sign in required' });
		if (env.BACKPACK_ADMIN_ENABLED !== 'true')
			return reply(503, { error: 'Coordinator backend is disabled' });
		const expectedOrigin = url?.origin || new URL(request.url).origin;
		if (request.headers.get('origin') !== expectedOrigin)
			return reply(403, { error: 'Same-origin request required' });
		if (
			request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json'
		) {
			return reply(415, { error: 'JSON request required' });
		}
		const length = request.headers.get('content-length');
		if (length && Number(length) > 16384) return reply(413, { error: 'Request too large' });
		let body;
		try {
			body = await readLimitedJSON(request);
		} catch (error) {
			return error instanceof RangeError
				? reply(413, { error: 'Request too large' })
				: reply(400, { error: 'Invalid JSON' });
		}
		if (!validateCoordinatorAction(body))
			return reply(400, { error: 'Invalid coordinator action or arguments' });
		try {
			// Use the signed-in user's JWT, never a service key or a browser-provided actor.
			const client = getClient(request);
			const { data, error } = await client.rpc('backpack_admin', {
				p_action: body.action,
				p_arguments: body.arguments ?? {}
			});
			if (error) {
				const [status, message] = errorMessages[error.code] || [
					503,
					'Coordinator backend temporarily unavailable'
				];
				return reply(status, { error: message });
			}
			return reply(200, { result: data });
		} catch {
			return reply(503, { error: 'Coordinator backend temporarily unavailable' });
		}
	};
}
