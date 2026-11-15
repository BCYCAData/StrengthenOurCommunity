import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	createCoordinatorHandler,
	validateCoordinatorAction
} from '../src/lib/server/backpack/coordinator.js';

const id = '00000000-0000-0000-0000-000000000001';
const household = '00000000-0000-0000-0000-000000000002';
const requestFor = (body, headers = {}) =>
	new Request('https://example.test/api/backpack/admin', {
		method: 'POST',
		headers: { origin: 'https://example.test', 'content-type': 'application/json', ...headers },
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
const context = (request) => ({ request, locals: { user: { id } }, url: new URL(request.url) });
function setup({ enabled = true, result = {}, error = null } = {}) {
	const calls = [];
	const handler = createCoordinatorHandler({
		env: { BACKPACK_ADMIN_ENABLED: String(enabled) },
		getClient(request) {
			calls.push({ request });
			return {
				async rpc(name, args) {
					calls.push({ name, args });
					return { data: result, error };
				}
			};
		}
	});
	return { handler, calls };
}

test('coordinator backend is disabled by default and creates no client', async () => {
	const { handler, calls } = setup({ enabled: false });
	assert.equal((await handler(context(requestFor({ action: 'snapshot' })))).status, 503);
	assert.equal(calls.length, 0);
});
test('unauthenticated access is denied before any RPC', async () => {
	const { handler, calls } = setup();
	assert.equal(
		(await handler({ request: requestFor({ action: 'snapshot' }), locals: {} })).status,
		401
	);
	assert.equal(calls.length, 0);
});
test('missing or cross-origin requests cannot perform coordinator operations', async () => {
	for (const origin of ['', 'https://attacker.test']) {
		const { handler, calls } = setup();
		assert.equal(
			(await handler(context(requestFor({ action: 'snapshot' }, { origin })))).status,
			403
		);
		assert.equal(calls.length, 0);
	}
});
test('JSON and bounded body size are enforced, including chunked/no-length input', async () => {
	const { handler, calls } = setup();
	assert.equal(
		(await handler(context(requestFor('{}', { 'content-type': 'text/plain' })))).status,
		415
	);
	assert.equal((await handler(context(requestFor('not json')))).status, 400);
	assert.equal((await handler(context(requestFor(' '.repeat(17000))))).status, 413);
	assert.equal(
		(await handler(context(requestFor('{}', { 'content-length': '17000' })))).status,
		413
	);
	assert.equal(calls.length, 0);
});
test('actions reject actor spoofing, arbitrary RPC names, service flags and unknown arguments', () => {
	for (const body of [
		{ action: 'snapshot', actor_id: id },
		{ action: 'snapshot', arguments: { actor_id: id } },
		{ action: 'backpack_baseline' },
		{ action: 'enable_email' },
		{ action: 'run_baseline', arguments: { policy_id: 1, note: 'review', email_enabled: true } },
		{ action: '__proto__' },
		{ action: 'constructor' },
		{ action: { toString: null } },
		{ action: null },
		{ action: 'snapshot', arguments: [] }
	])
		assert.equal(validateCoordinatorAction(body), false);
});
test('household review requires a revision, distinct members, contact and note', () => {
	const args = {
		household_id: household,
		member_ids: [id],
		contact_user_id: id,
		revision: 'a'.repeat(32),
		note: 'Reviewed household evidence'
	};
	assert(validateCoordinatorAction({ action: 'confirm_household', arguments: args }));
	for (const invalid of [
		{ ...args, revision: undefined },
		{ ...args, member_ids: [id, id] },
		{ ...args, member_ids: [] },
		{ ...args, note: ' ' },
		{ ...args, household_id: 'invalid' }
	]) {
		assert.equal(
			validateCoordinatorAction({ action: 'confirm_household', arguments: invalid }),
			false
		);
	}
});
test('award validation requires explicit historical flag and timezone-aware dates', () => {
	const args = {
		household_id: household,
		programme: 'backpack',
		reference: 'legacy-001',
		historical: true,
		awarded_at: null,
		delivered_at: null,
		note: 'Imported register; dates unknown'
	};
	assert(validateCoordinatorAction({ action: 'record_award', arguments: args }));
	for (const invalid of [
		{ ...args, historical: 'true' },
		{ ...args, historical: undefined },
		{ ...args, reference: '' },
		{ ...args, awarded_at: '2026-01-01' },
		{ ...args, awarded_at: '2026-01-01T10:00:00' }
	]) {
		assert.equal(validateCoordinatorAction({ action: 'record_award', arguments: invalid }), false);
	}
	assert(
		validateCoordinatorAction({
			action: 'record_award',
			arguments: { ...args, awarded_at: '2026-01-01T10:00:00+11:00' }
		})
	);
});
test('baseline and pagination arguments are bounded', () => {
	assert(validateCoordinatorAction({ action: 'baseline_preview' }));
	assert(
		validateCoordinatorAction({
			action: 'run_baseline',
			arguments: { policy_id: 1, note: 'Reviewed baseline' }
		})
	);
	for (const args of [{ limit: 0 }, { limit: 101 }, { offset: -1 }, { limit: 1.5 }])
		assert.equal(validateCoordinatorAction({ action: 'snapshot', arguments: args }), false);
	assert.equal(
		validateCoordinatorAction({ action: 'run_baseline', arguments: { policy_id: 1 } }),
		false
	);
});
test('requests forward only the action and arguments under the signed-in client', async () => {
	const { handler, calls } = setup({ result: { readiness: {} } });
	const request = requestFor({ action: 'snapshot', arguments: { limit: 10, offset: 0 } });
	const response = await handler(context(request));
	assert.equal(response.status, 200);
	assert.equal(response.headers['Cache-Control'], 'private, no-store');
	assert.equal(calls[0].request, request);
	assert.deepEqual(calls[1], {
		name: 'backpack_admin',
		args: { p_action: 'snapshot', p_arguments: { limit: 10, offset: 0 } }
	});
});
test('database authorization is enforced independently of a signed-in session', async () => {
	const { handler } = setup({ error: { code: '42501', message: 'Sensitive internal details' } });
	const response = await handler(context(requestFor({ action: 'snapshot' })));
	assert.equal(response.status, 403);
	assert(!JSON.stringify(response).includes('Sensitive'));
});
test('stale revisions, duplicate awards and maintenance blockers return conflicts', async () => {
	for (const code of ['40001', '23505', '55000', 'P0001']) {
		const { handler } = setup({ error: { code, message: 'Never echo raw SQL' } });
		const response = await handler(context(requestFor({ action: 'snapshot' })));
		assert.equal(response.status, 409);
		assert(!JSON.stringify(response).includes('raw SQL'));
	}
});
test('unexpected failures never expose internal messages or report success', async () => {
	const handler = createCoordinatorHandler({
		env: { BACKPACK_ADMIN_ENABLED: 'true' },
		getClient() {
			throw new Error('Secret connection details');
		}
	});
	const response = await handler(context(requestFor({ action: 'snapshot' })));
	assert.equal(response.status, 503);
	assert(!JSON.stringify(response).includes('Secret'));
});

test('live mode is explicit, scoped to supported operations and cannot turn on email', () => {
	const args = {
		user_id: id,
		programme: 'backpack',
		decision: 'approved',
		note: 'Reviewed live case',
		mode: 'live'
	};
	assert(validateCoordinatorAction({ action: 'decide_special_case', arguments: args }));
	assert.equal(
		validateCoordinatorAction({
			action: 'decide_special_case',
			arguments: { ...args, mode: 'enable' }
		}),
		false
	);
	assert.equal(
		validateCoordinatorAction({
			action: 'run_baseline',
			arguments: { policy_id: 1, note: 'Review', mode: 'live' }
		}),
		false
	);
	assert.equal(
		validateCoordinatorAction({
			action: 'decide_special_case',
			arguments: { ...args, email_enabled: true }
		}),
		false
	);
});
