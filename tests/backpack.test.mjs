import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compile } from 'svelte/compiler';
import { optionalCount, choiceGroup } from '../src/lib/surveyAnswerValues.js';
import { dispatchBackpackEmail } from '../src/lib/server/backpack/dispatch.js';
import { createDispatchHandler } from '../src/lib/server/backpack/handler.js';
import {
	fireFightingResources,
	siteHazardsOptions,
	fireHazardReductionOptions
} from '../src/lib/profileOptions.js';

const catalogue = JSON.parse(
	readFileSync(new URL('../config/survey-questions.json', import.meta.url))
);
test('catalogue covers every named survey field once, with valid parent/conditional references', () => {
	const sourceFields = new Set();
	for (let step = 2; step <= 11; step++) {
		const source = readFileSync(`src/components/form/surveyForm/Step${step}.svelte`, 'utf8');
		for (const match of source.matchAll(/\b(?:name|nameText)="([^"]+)"/g))
			sourceFields.add(match[1]);
	}
	const fields = catalogue.questions.flatMap((q) => q.fields.map((r) => r.field));
	assert.equal(catalogue.questions.length, 41);
	assert.equal(new Set(fields).size, 52);
	assert.equal(fields.length, 52);
	assert.deepEqual(new Set(fields), sourceFields);
	const ids = new Set(catalogue.questions.map((q) => q.id));
	for (const q of catalogue.questions) {
		if (q.parent_id) assert(ids.has(q.parent_id));
		for (const c of q.applies_when) assert(sourceFields.has(c.field));
	}
});
test('None values match the actual checkbox options', () => {
	for (const [id, options] of [
		['Q16', fireFightingResources],
		['Q17', siteHazardsOptions],
		['Q19', fireHazardReductionOptions]
	]) {
		assert.deepEqual(
			catalogue.questions.find((q) => q.id === id).fields[0].values,
			options.map((o) => o.value).sort((a, b) => a - b)
		);
	}
});
test('blank counts stay unanswered; deliberate zero stays an answer', () => {
	for (const blank of [null, undefined, '', '  ']) assert.equal(optionalCount(blank), null);
	assert.equal(optionalCount('0'), 0);
	assert.equal(optionalCount('12'), 12);
	for (const invalid of ['-1', '2.5', '3abc', 'NaN', '999999'])
		assert.equal(optionalCount(invalid), null);
});
test('None remains exclusive for loaded string values and new selections', () => {
	assert.deepEqual(choiceGroup(['1', '2'], 0, true), [0]);
	assert.deepEqual(choiceGroup(['0'], 2, true), [2]);
	assert.deepEqual(choiceGroup(['2'], 2, false), []);
	assert.deepEqual(choiceGroup(['1'], 5, true, 5), [5]);
	assert.deepEqual(choiceGroup(['5'], 1, true, 5), [1]);
});
test('edited survey and profile forms compile', () => {
	for (const path of [
		'src/components/form/surveyForm/Step2.svelte',
		'src/components/form/surveyForm/Step4.svelte',
		'src/components/form/surveyForm/Step5.svelte',
		'src/components/form/surveyForm/Step6.svelte',
		'src/routes/profile/myplace/resources/index.svelte',
		'src/routes/profile/myplace/assets/index.svelte',
		'src/routes/profile/myplace/index.svelte',
		'src/routes/profile/myplace/hazards/index.svelte'
	]) {
		compile(readFileSync(path, 'utf8'), { filename: path, generate: 'ssr' });
	}
});
const job = {
	id: 'job-1',
	claim_token: 'lease-1',
	attempt: 1,
	payload: {
		from: 'sender@example.test',
		to: ['household@example.test'],
		bcc: ['coordinator@example.test'],
		text: 'No survey answers'
	}
};
function clientFor(data = job) {
	const calls = [];
	return {
		calls,
		async rpc(name, args) {
			calls.push({ name, args });
			return { data: name === 'backpack_claim_email' ? data : true, error: null };
		}
	};
}
test('worker uses frozen recipients and a stable idempotency key, then records acceptance', async () => {
	const client = clientFor();
	const result = await dispatchBackpackEmail(client, 'test-key', async (url, init) => {
		assert.equal(url, 'https://api.resend.com/emails');
		assert.equal(init.headers['Idempotency-Key'], 'backpack/job-1');
		assert.deepEqual(JSON.parse(init.body), job.payload);
		return new Response(JSON.stringify({ id: 'provider-1' }));
	});
	assert.equal(result.status, 'accepted');
	assert.equal(client.calls[1].args.p_provider_id, 'provider-1');
	assert.equal(client.calls[1].args.p_token, 'lease-1');
});
test('worker handles quotas without inventing a successful send', async () => {
	const client = clientFor();
	const result = await dispatchBackpackEmail(
		client,
		'test-key',
		async () => new Response('', { status: 429, headers: { 'retry-after': '600' } })
	);
	assert.equal(result.status, 'retry_safe');
	assert.equal(client.calls[1].args.p_retry_seconds, 600);
	assert.equal(client.calls[1].args.p_provider_id, null);
});
test('timeouts and uncertain responses retain retry safety information', async () => {
	for (const fetcher of [
		async () => {
			throw new Error('timeout');
		},
		async () => new Response('', { status: 503 }),
		async () => new Response('{}')
	]) {
		const client = clientFor();
		assert.equal((await dispatchBackpackEmail(client, 'key', fetcher)).status, 'retry_uncertain');
	}
});
test('permanent provider rejection is not endlessly retried', async () => {
	const client = clientFor();
	assert.equal(
		(await dispatchBackpackEmail(client, 'key', async () => new Response('', { status: 422 })))
			.status,
		'failed'
	);
});
test('no job means no provider call', async () => {
	assert.equal(
		(
			await dispatchBackpackEmail(clientFor(null), 'key', () => {
				throw new Error('must not call');
			})
		).status,
		'idle'
	);
});
test('lost acknowledgement fails instead of reporting success', async () => {
	const client = {
		rpc: async (name) => (name === 'backpack_claim_email' ? { data: job } : { data: false })
	};
	await assert.rejects(
		dispatchBackpackEmail(client, 'key', async () => new Response('{"id":"provider-1"}'))
	);
});
test('HTTP worker denies missing/wrong authorization and remains off without credentials', async () => {
	const env = { BACKPACK_WORKER_SECRET: 'test-secret' };
	const handler = createDispatchHandler({
		env,
		createClient() {
			throw new Error('disabled worker must not create client');
		}
	});
	const request = (auth) => ({
		request: new Request('https://example.test/api/backpack/dispatch', {
			method: 'POST',
			headers: auth ? { authorization: auth } : {}
		})
	});
	assert.equal((await handler(request())).status, 401);
	assert.equal((await handler(request('Bearer wrong'))).status, 401);
	assert.equal((await handler(request('Bearer test-secret'))).body.status, 'disabled');
	env.BACKPACK_EMAIL_WORKER_ENABLED = 'true';
	assert.equal((await handler(request('Bearer test-secret'))).status, 503);
	const unconfigured = createDispatchHandler({
		env: {},
		createClient() {
			throw new Error('unauthorised');
		}
	});
	assert.equal((await unconfigured(request('Bearer undefined'))).status, 401);
});

test('explicit submission hook is gated and cannot choose another user', async () => {
	const { recordBackpackSubmission } = await import('../src/lib/server/backpack/submission.js');
	const calls = [];
	const client = {
		async rpc(...args) {
			calls.push(args);
			return { error: null };
		}
	};
	await recordBackpackSubmission(client, {});
	assert.equal(calls.length, 0);
	await recordBackpackSubmission(client);
	assert.equal(calls.length, 0);
	await recordBackpackSubmission(client, { BACKPACK_ASSESSMENT_ENABLED: 'true' });
	assert.deepEqual(calls, [['backpack_record_submission']]);
});

test('HTTP worker supports a test transport while recording the real acknowledgement flow', async () => {
	const client = clientFor();
	let providerCalls = 0;
	const handler = createDispatchHandler({
		env: {
			BACKPACK_WORKER_SECRET: 'test-worker',
			BACKPACK_EMAIL_WORKER_ENABLED: 'true',
			SUPABASE_URL: 'http://127.0.0.1:54921',
			SUPABASE_SERVICE_ROLE_KEY: 'local-test-key',
			RESEND_API_KEY: 'simulated-provider'
		},
		createClient: () => client,
		fetchEmail: async (url, init) => {
			providerCalls++;
			assert.equal(url, 'https://api.resend.com/emails');
			assert.deepEqual(JSON.parse(init.body), job.payload);
			return new Response(JSON.stringify({ id: 'LOCAL-SIMULATED-ACK' }));
		}
	});
	const result = await handler({
		request: new Request('http://127.0.0.1/api/backpack/dispatch', {
			method: 'POST',
			headers: { authorization: 'Bearer test-worker' }
		})
	});
	assert.equal(result.status, 200);
	assert.equal(result.body.status, 'accepted');
	assert.equal(providerCalls, 1);
	assert.equal(client.calls[1].args.p_provider_id, 'LOCAL-SIMULATED-ACK');
});

test('enabled HTTP worker uses the installed Supabase v1 server-only options', async () => {
	const env = {
		BACKPACK_WORKER_SECRET: 'secret',
		BACKPACK_EMAIL_WORKER_ENABLED: 'true',
		SUPABASE_URL: 'https://example.supabase.co',
		SUPABASE_SERVICE_ROLE_KEY: 'service-key',
		RESEND_API_KEY: 'resend-key'
	};
	let options;
	const handler = createDispatchHandler({
		env,
		createClient(url, key, opts) {
			assert.equal(url, env.SUPABASE_URL);
			assert.equal(key, env.SUPABASE_SERVICE_ROLE_KEY);
			options = opts;
			return clientFor(null);
		}
	});
	const response = await handler({
		request: new Request('https://example.test', {
			method: 'POST',
			headers: { authorization: 'Bearer secret' }
		})
	});
	assert.equal(response.body.status, 'idle');
	assert.deepEqual(options, {
		persistSession: false,
		autoRefreshToken: false,
		detectSessionInUrl: false
	});
});
