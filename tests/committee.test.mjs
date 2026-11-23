import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { accessAnswers, assetAnswers } from '../src/lib/committeeAnswers.js';
import {
	parseCommitteeSheet,
	committeeDate,
	reviewedCommitteeAction
} from '../src/lib/committeeImport.js';
import { createParticipantStatusHandlers } from '../src/lib/server/backpack/status.js';
import { validateCoordinatorAction } from '../src/lib/server/backpack/coordinator.js';
import { dispatchBatch } from '../scripts/dispatch-backpack-batch.mjs';

const uuid = '00000000-0000-0000-0000-000000000001';
const csv = (rows) =>
	[
		['Delete record', 'Has Kit', 'Kit date', 'get_new_users_confirmed_without_kits'],
		...rows.map(([remove, kit, date, email = 'person@example.test']) => [
			remove,
			kit,
			date,
			`(${email},First,Family,"Road, with comma",Testville,2025-01-01,Not Provided,Not Provided,Old missing labels)`
		])
	]
		.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','))
		.join('\r\n');

test('committee mapping has an exact required/excluded partition and preserves historical IDs', () => {
	const current = JSON.parse(readFileSync('config/survey-questions.json'));
	const frozen = JSON.parse(readFileSync('config/catalogues/2026-11-proposed-v1.json'));
	const policy = JSON.parse(readFileSync('config/backpack-committee-policy.json'));
	assert.equal(frozen.questions.length, 41);
	for (const q of frozen.questions) assert(current.questions.some((item) => item.id === q.id));
	assert.equal(current.questions.filter((q) => q.active === false).length, 7);
	assert.deepEqual(
		new Set(policy.required_question_ids),
		new Set(['Q2', 'Q4', 'Q5', 'Q6', 'Q9', 'Q10', 'Q13', 'Q14', 'Q17', 'Q36', 'Q36a'])
	);
	assert.equal(policy.excluded_question_ids.length, 25);
	assert.deepEqual(
		new Set([...policy.required_question_ids, ...policy.excluded_question_ids]),
		new Set(policy.scope_question_ids)
	);
	assert.equal(policy.cutoff_at, '2025-09-30T14:00:00Z');
	assert.equal(policy.status, 'requirements_adopted_pending_rollout');
	assert.equal(policy.cutoff_local_date, '2025-10-01');
	assert.equal(policy.timezone, 'Australia/Sydney');
	const initialPolicy = JSON.parse(
		readFileSync('config/policies/2026-11-committee-v2.initial.json')
	);
	assert.deepEqual(policy.adopted_requirements, initialPolicy.pending_confirmations.slice(0, 3));
	assert.deepEqual(policy.pending_confirmations, initialPolicy.pending_confirmations.slice(3));
	assert.equal(policy.pending_confirmations.length, 3);
	assert(policy.required_question_ids.includes('Q36a'));
	assert(policy.excluded_question_ids.includes('Q5a'));
});
test('new form answers distinguish missing and No, clear inapplicable restrictions and reject unknown options', () => {
	assert.deepEqual(assetAnswers(new FormData()), { has_other_critical_assets: null });
	const body = new FormData();
	body.set('has_other_critical_assets', 'false');
	body.set('property_access_restricted', 'true');
	body.append('property_access_restrictions', '2');
	assert.deepEqual(assetAnswers(body), { has_other_critical_assets: false });
	assert.deepEqual(accessAnswers(body), {
		property_access_restricted: true,
		property_access_restrictions: [2]
	});
	body.set('property_access_restricted', 'false');
	assert.deepEqual(accessAnswers(body), {
		property_access_restricted: false,
		property_access_restrictions: []
	});
	body.set('property_access_restricted', 'true');
	body.append('property_access_restrictions', '99');
	assert.throws(() => accessAnswers(body));
	body.set('has_other_critical_assets', 'maybe');
	assert.throws(() => assetAnswers(body));
});
test('committee CSV preserves quoted addresses, raw dates and undecided records without guessing award type', () => {
	const result = parseCommitteeSheet(
		csv([
			['', 'y', '30/9/2025', 'old@example.test'],
			['', 'Y', '1/10/2025', 'new@example.test'],
			['y', '', '', 'remove@example.test'],
			['', '', '', 'unknown@example.test'],
			['', 'y', '26/1123', 'bad@example.test']
		])
	);
	assert.equal(result.summary.total, 5);
	assert.equal(result.summary.pre_cutoff_awards, 1);
	assert.equal(result.summary.post_cutoff_awards, 1);
	assert.equal(result.summary.deletion_requests, 1);
	assert.equal(result.summary.unknown, 1);
	assert.equal(result.summary.invalid_rows, 1);
	assert.equal(result.rows[0].address, 'Road, with comma');
	assert.equal(result.rows[0].classification, 'starter_kit_candidate');
	assert.equal(result.rows[1].classification, 'award_type_review');
	assert.equal(result.rows[4].source_date, '26/1123');
	assert(result.rows.every((row) => row.decision === 'pending' && row.user_id === null));
});
test('committee parser rejects malformed dates, conflicting flags and duplicate identities', () => {
	assert.equal(committeeDate('29/02/2024'), '2024-02-29');
	for (const value of ['29/02/2025', '31/04/2025', '26/1123', '2025-01-01'])
		assert.throws(() => committeeDate(value));
	const result = parseCommitteeSheet(
		csv([
			['y', 'y', '1/1/2024'],
			['', 'y', '1/1/2024']
		])
	);
	assert(result.rows.every((row) => row.errors.some((error) => error.includes('Duplicate'))));
	assert(result.rows[0].errors.some((error) => error.includes('conflict')));
	assert.throws(() => parseCommitteeSheet('Email,Kit\na@example.test,Y'));
});
test('reviewed source actions need a deliberate decision, account match, checksum and note', () => {
	const row = parseCommitteeSheet(csv([['', 'Y', '1/2/2024']])).rows[0];
	const hash = 'a'.repeat(64);
	assert.throws(() => reviewedCommitteeAction(row, hash, 'Verified'));
	const candidate = { ...row, user_id: uuid, decision: 'starter_kit' };
	const action = reviewedCommitteeAction(candidate, hash, 'Verified starter kit from register');
	assert.equal(action.arguments.awarded_on, '2024-02-01');
	assert(validateCoordinatorAction(action));
	assert.equal(
		reviewedCommitteeAction({ ...candidate, decision: 'backpack' }, hash, 'Verified backpack')
			.action,
		'record_committee_backpack'
	);
	assert.equal(
		reviewedCommitteeAction({ ...candidate, decision: 'exclude' }, hash, 'Reviewed exclusion')
			.arguments.excluded,
		true
	);
	assert.throws(() =>
		reviewedCommitteeAction({ ...candidate, errors: ['Needs correction'] }, hash, 'Verified')
	);
	assert.throws(() => reviewedCommitteeAction(candidate, hash, ''));
});
test('participant status cannot choose another user; dismissal is same-origin and cannot mark an email sent', async () => {
	const calls = [];
	const handler = createParticipantStatusHandlers({
		env: { BACKPACK_PARTICIPANT_STATUS_ENABLED: 'true' },
		getClient: () => ({
			rpc: async (...args) => {
				calls.push(args);
				return {
					data:
						args[0] === 'backpack_my_status'
							? { state: 'incomplete', missing_questions: [{ id: 'Q13' }] }
							: true
				};
			}
		})
	});
	const locals = { user: { id: uuid } };
	const get = new Request('https://example.test/api/backpack/status?user_id=another');
	assert.equal((await handler.GET({ locals, request: get })).body.state, 'incomplete');
	assert.deepEqual(calls, [['backpack_my_status']]);
	const request = (origin, body) =>
		new Request('https://example.test/api/backpack/status', {
			method: 'POST',
			headers: { Origin: origin, 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
	assert.equal(
		(await handler.POST({ locals, request: request('https://evil.test', { dismiss: true }) }))
			.status,
		403
	);
	assert.equal(
		(
			await handler.POST({
				locals,
				request: request('https://example.test', { dismiss: true, user_id: 'another' })
			})
		).status,
		400
	);
	assert.equal(
		(await handler.POST({ locals, request: request('https://example.test', { dismiss: true }) }))
			.status,
		200
	);
	assert.deepEqual(calls[1], ['backpack_dismiss_notice']);
	assert.equal((await handler.GET({ locals: {}, request: get })).status, 401);
});
test('participant status remains disabled or unavailable without leaking database errors', async () => {
	const request = new Request('https://example.test/api/backpack/status');
	const locals = { user: { id: uuid } };
	const disabled = createParticipantStatusHandlers({
		env: {},
		getClient() {
			throw new Error('must not connect');
		}
	});
	assert.equal((await disabled.GET({ locals, request })).body.state, 'unconfigured');
	const broken = createParticipantStatusHandlers({
		env: { BACKPACK_PARTICIPANT_STATUS_ENABLED: 'true' },
		getClient: () => ({ rpc: async () => ({ error: { message: 'secret database details' } }) })
	});
	const result = await broken.GET({ locals, request });
	assert.equal(result.status, 503);
	assert(!JSON.stringify(result).includes('secret database'));
});
test('scheduled batches use authenticated POST, stay bounded and stop on quota or uncertainty', async () => {
	const outcomes = ['accepted', 'accepted', 'retry_safe'];
	let index = 0;
	const counts = await dispatchBatch({
		url: 'https://app.example.test/api/backpack/dispatch',
		secret: 'test-secret',
		limit: 5,
		fetcher: async (url, options) => {
			assert.equal(options.method, 'POST');
			assert.equal(options.headers.Authorization, 'Bearer test-secret');
			assert.equal(options.redirect, 'error');
			return new Response(JSON.stringify({ status: outcomes[index++] }));
		}
	});
	assert.deepEqual(counts, { accepted: 2, retry_safe: 1 });
	assert.equal(index, 3);
	await assert.rejects(
		dispatchBatch({ url: 'http://remote.example.test/api/backpack/dispatch', secret: 'x' })
	);
	await assert.rejects(
		dispatchBatch({ url: 'https://app.example.test/api/backpack/dispatch?secret=x', secret: 'x' })
	);
	await assert.rejects(
		dispatchBatch({ url: 'https://app.example.test/api/backpack/dispatch', secret: 'x', limit: 21 })
	);
});
