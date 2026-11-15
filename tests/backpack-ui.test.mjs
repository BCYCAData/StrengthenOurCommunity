import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { compile } from 'svelte/compiler';
import {
	coordinatorAction,
	localDateTimeToISO,
	parseAwardCSV,
	readinessBlockers,
	liveAvailable
} from '../src/lib/backpackCoordinator.js';
import { createCoordinatorPageLoader } from '../src/lib/server/backpack/page.js';

test('coordinator components compile without accessibility warnings', () => {
	for (const file of readdirSync('src/components/backpack').filter((f) => f.endsWith('.svelte'))) {
		const compiled = compile(readFileSync(`src/components/backpack/${file}`, 'utf8'), {
			generate: 'ssr'
		});
		assert.deepEqual(compiled.warnings, [], file);
	}
	compile(readFileSync('src/routes/admin/backpacks/index.svelte', 'utf8'), { generate: 'ssr' });
	compile(readFileSync('src/routes/admin/__layout.svelte', 'utf8'), { generate: 'ssr' });
});
test('page loader requires sign-in before requesting any coordinator data', async () => {
	const loader = createCoordinatorPageLoader({
		env: { BACKPACK_ADMIN_ENABLED: 'true' },
		getClient() {
			throw new Error('must not read');
		}
	});
	const result = await loader({
		locals: {},
		request: new Request('https://example.test/admin/backpacks')
	});
	assert.equal(result.status, 303);
	assert.equal(result.headers.Location, '/auth/signin');
	assert.equal(result.headers['Cache-Control'], 'private, no-store');
});
test('disabled or forbidden pages receive no participant snapshot', async () => {
	const request = new Request('https://example.test/admin/backpacks');
	const getClient = () => ({
		rpc: async () => ({
			data: { members: [{ email: 'private@example.test' }] },
			error: { code: '42501', message: 'secret' }
		})
	});
	for (const enabled of [false, true]) {
		const loader = createCoordinatorPageLoader({
			env: { BACKPACK_ADMIN_ENABLED: String(enabled) },
			getClient
		});
		const result = await loader({ locals: { user: { id: 'user' } }, request });
		assert.equal(result.body.initialSnapshot, null);
		assert.equal(result.body.workerEnabled, false);
		assert.equal(result.body.accessState, enabled ? 'forbidden' : 'disabled');
		assert(!JSON.stringify(result).includes('private@example'));
	}
});
test('authorized page uses the request-bound client and fails closed on database errors', async () => {
	const request = new Request('https://example.test/admin/backpacks');
	let received;
	const loader = createCoordinatorPageLoader({
		env: { BACKPACK_ADMIN_ENABLED: 'true', BACKPACK_EMAIL_WORKER_ENABLED: 'false' },
		getClient(r) {
			received = r;
			return {
				rpc: async (name, args) => {
					assert.equal(name, 'backpack_admin');
					assert.deepEqual(args, { p_action: 'snapshot', p_arguments: { limit: 25, offset: 0 } });
					return {
						data: { members: [], readiness: {}, policy: { email_enabled: false } },
						error: null
					};
				}
			};
		}
	});
	const result = await loader({ locals: { user: { id: 'coordinator' } }, request });
	assert.equal(received, request);
	assert.equal(result.body.accessState, 'ready');
	assert.equal(result.body.workerEnabled, false);
	const broken = createCoordinatorPageLoader({
		env: { BACKPACK_ADMIN_ENABLED: 'true' },
		getClient() {
			throw new Error('private connection');
		}
	});
	assert.equal(
		(await broken({ locals: { user: { id: 'coordinator' } }, request })).body.accessState,
		'unavailable'
	);
});
test('date inputs preserve unknown dates and correctly convert Sydney summer/winter', () => {
	assert.equal(localDateTimeToISO(''), null);
	assert.equal(localDateTimeToISO('2026-11-16T12:30'), '2026-11-16T01:30:00.000Z');
	assert.equal(localDateTimeToISO('2026-06-16T12:30'), '2026-06-16T02:30:00.000Z');
	assert.equal(localDateTimeToISO('2026-11-16T12:30', 'UTC'), '2026-11-16T12:30:00.000Z');
	assert.throws(() => localDateTimeToISO('2026-02-30T12:30'));
	assert.throws(() => localDateTimeToISO('2026-10-04T02:30'), /does not exist/);
	assert.throws(() => localDateTimeToISO('2026-04-05T02:30'), /occurs twice/);
});
test('CSV supports quoted commas/newlines, BOM, unknown dates and stable references', () => {
	const rows = parseAwardCSV(
		'\uFEFFreference,email,awarded_at,delivered_at,note\r\nref-1,alice@example.test,,,"Register, row 1"\r\nref-2,bob@example.test,2026-01-02T10:00:00+11:00,,"Two\nlines"'
	);
	assert.equal(rows.length, 2);
	assert.equal(rows[0].awarded_at, '');
	assert.equal(rows[0].note, 'Register, row 1');
	assert.equal(rows[1].note, 'Two\nlines');
	assert.equal(rows[1].reference, 'ref-2');
});
test('CSV rejects ambiguous formats, duplicates, oversized batches and unspecified timezones', () => {
	for (const text of [
		'name,email\nOne,one@example.test',
		'reference,email\nref-1,a@example.test\nref-1,b@example.test',
		'reference,email\n"unterminated,a@example.test',
		'reference,email,awarded_at\na,a@example.test,2026-01-01',
		'reference,email\na,a@example.test,extra',
		'reference,email\n' +
			Array.from({ length: 51 }, (_, i) => `r${i},a${i}@example.test`).join('\n')
	])
		assert.throws(() => parseAwardCSV(text));
});
test('readiness distinguishes missing policy from an intentionally complete report', () => {
	assert(
		!liveAvailable({ enabled: true, email_enabled: false, baseline_completed_at: '2026-01-01' })
	);
	assert(
		liveAvailable({ enabled: true, email_enabled: true, baseline_completed_at: '2026-01-01' })
	);
	assert.deepEqual(
		readinessBlockers({
			configured: true,
			unassessed_accounts: 0,
			unresolved_memberships: 0,
			missing_contacts: 0,
			pending_special_cases: 0,
			processing_jobs: 0
		}),
		[]
	);
	assert(readinessBlockers({ configured: false }).length > 0);
	assert(readinessBlockers({ configured: true, missing_contacts: 2 }).some((s) => s.includes('2')));
});
test('client sends same-origin JSON and preserves conflict/authorization status', async () => {
	await assert.rejects(
		coordinatorAction('confirm_household', {}, async (url, options) => {
			assert.equal(url, '/api/backpack/admin');
			assert.equal(options.credentials, 'same-origin');
			assert.deepEqual(JSON.parse(options.body), { action: 'confirm_household', arguments: {} });
			return new Response(JSON.stringify({ error: 'Preview changed' }), { status: 409 });
		}),
		(e) => e.status === 409 && e.message === 'Preview changed'
	);
	await assert.rejects(
		coordinatorAction('snapshot', {}, async () => new Response('{}')),
		/unreadable/
	);
});
