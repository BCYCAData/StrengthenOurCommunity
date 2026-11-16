// Real local Auth, HTTP form handlers, PostgreSQL triggers/RPCs and worker.
// Disposable stack only. Resend is replaced in memory by a loopback capture server.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import {
	mkdtemp,
	mkdir,
	copyFile,
	readdir,
	symlink,
	writeFile,
	readFile,
	rm
} from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const api = 'http://127.0.0.1:54921';
const testPassword = 'DisposableE2E2026!';
const workerSecret = 'local-e2e-worker-only';
const providerKey = 'LOCAL-E2E-SIMULATED-NO-REAL-EMAIL';

async function command(binary, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(binary, args, { cwd: root, ...options });
		let stdout = '',
			stderr = '';
		child.stdout.on('data', (chunk) => {
			stdout += chunk;
		});
		child.stderr.on('data', (chunk) => {
			stderr += chunk;
		});
		child.on('error', reject);
		child.on('close', (code) =>
			code === 0 ? resolve(stdout) : reject(new Error(`${binary} ${args[0]} failed: ${stderr}`))
		);
		child.stdin.end(options.input);
	});
}

async function listen(server) {
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	return server.address().port;
}

async function main() {
	await mkdir(join(root, '.supabase-local'), { recursive: true });
	const workdir = await mkdtemp(join(root, '.supabase-local/e2e-'));
	const project = `soc-backpack-e2e-${process.pid}`;
	const container = `supabase_db_${project}`;
	const cli = (args) =>
		command(process.execPath, [
			join(root, 'node_modules/supabase/dist/supabase.js'),
			...args,
			'--workdir',
			workdir
		]);
	const sql = async (query) => {
		const text = await command(
			'docker',
			[
				'exec',
				'-i',
				container,
				'psql',
				'-X',
				'-U',
				'postgres',
				'-d',
				'postgres',
				'-At',
				'-v',
				'ON_ERROR_STOP=1'
			],
			{ input: query }
		);
		return text.trim();
	};
	const scalar = async (query) => (await sql(query)).split('\n')[0];
	const checks = [];
	const captures = [];
	let capture,
		app,
		config,
		started = false,
		providerMode = 'accept';
	let logs = '';
	const acceptedKeys = new Map();
	const check = (name) => {
		checks.push(name);
		console.log(`PASS ${name}`);
	};
	try {
		const directory = join(workdir, 'supabase');
		await mkdir(join(directory, 'migrations'), { recursive: true });
		let toml = await readFile(join(root, 'supabase/local/config.toml'), 'utf8');
		toml = toml
			.replace('strengthen-community-test', project)
			.replaceAll('5482', '5492')
			.replace('[studio]\nenabled = true', '[studio]\nenabled = false')
			.replace('[local_smtp]\nenabled = true', '[local_smtp]\nenabled = false');
		await writeFile(join(directory, 'config.toml'), toml);
		await copyFile(
			join(root, 'supabase/local/profile-bootstrap.sql'),
			join(directory, 'migrations/20261114000000_local_profile.sql')
		);
		for (const name of await readdir(join(root, 'supabase/migrations'))) {
			if (name.endsWith('.sql'))
				await copyFile(
					join(root, 'supabase/migrations', name),
					join(directory, 'migrations', name)
				);
		}
		console.log(
			'Starting disposable local Supabase stack on ports 54921/54922. Existing dev data is untouched.'
		);
		started = true;
		await cli(['start']);
		config = JSON.parse(await cli(['status', '--output', 'json']));
		assert.equal(config.API_URL, api, 'Test stack must use its exact loopback API');
		assert(config.SERVICE_ROLE_KEY && config.ANON_KEY);
		const apiRequest = async function (
			path,
			body,
			token = config.SERVICE_ROLE_KEY,
			method = 'POST'
		) {
			const response = await fetch(`${api}${path}`, {
				method,
				headers: {
					apikey: config.ANON_KEY,
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: body === undefined ? undefined : JSON.stringify(body)
			});
			const text = await response.text();
			assert(response.ok, `Local API ${path}: ${response.status} ${text}`);
			return text ? JSON.parse(text) : null;
		};
		const users = {};
		for (const [name, options] of Object.entries({
			coordinator: { tester: true },
			alice: {},
			bob: {},
			baseline: {},
			kit: {}
		})) {
			const user = await apiRequest('/auth/v1/admin/users', {
				email: `${name}@backpack-e2e.test`,
				password: testPassword,
				email_confirm: true,
				app_metadata: options,
				user_metadata: { principaladdresssiteoid: name === 'bob' ? 'TEST-alice' : `TEST-${name}` }
			});
			users[name] = user.id;
			await apiRequest(
				`/rest/v1/profile?id=eq.${user.id}`,
				{
					first_name: `LOCAL TEST ${name}`,
					family_name: 'Synthetic',
					mobile: ['baseline', 'kit'].includes(name) ? '0400000000' : null,
					property_address_street: name === 'bob' ? 'TEST alice road' : `TEST ${name} road`,
					property_address_suburb: 'Synthetic',
					property_address_postcode: '2429'
				},
				config.SERVICE_ROLE_KEY,
				'PATCH'
			);
		}
		await sql(`
		 insert into backpack.coordinators(user_id,note) values('${users.coordinator}','LOCAL E2E TEST ONLY');
		 update auth.users set created_at='1999-01-01',raw_app_meta_data=raw_app_meta_data || '{"kit_date":"1999-02-01"}' where id='${users.kit}';
		 insert into backpack.catalogues(version,definition)
		 select 'LOCAL-E2E-TEST-ONLY',definition || '{"version":"LOCAL-E2E-TEST-ONLY","status":"local_test_only"}' from backpack.catalogues limit 1;
		 update backpack.policies set catalogue_version='LOCAL-E2E-TEST-ONLY',cutoff_at='2000-01-01T00:00:00Z',
		 scope_question_ids=array['Q1','Q6'],excluded_question_ids='{}',approved_at=now(),enabled=true,
		 sender='LOCAL TEST <sender@backpack-e2e.test>',reply_to='reply@backpack-e2e.test',
		 coordinator_email='coordinator@backpack-e2e.test',profile_url='https://backpack-e2e.test/profile';
		 select public.backpack_baseline();
		`);
		// Only disposable synthetic rules are approved. No production settings are read.
		const capturesServer = createServer(async (request, response) => {
			try {
				let text = '';
				for await (const chunk of request) text += chunk;
				assert.equal(request.headers.authorization, `Bearer ${providerKey}`);
				const payload = JSON.parse(text);
				for (const address of [...payload.to, ...payload.bcc])
					assert(address.endsWith('@backpack-e2e.test'));
				const key = request.headers['idempotency-key'];
				assert(key?.startsWith('backpack/'));
				captures.push({ simulated: true, key, payload, mode: providerMode });
				response.setHeader('Content-Type', 'application/json');
				if (providerMode === 'quota') {
					response.writeHead(429, { 'Retry-After': '60' });
					response.end('{"message":"LOCAL TEST quota"}');
				} else {
					if (!acceptedKeys.has(key))
						acceptedKeys.set(key, `LOCAL-SIMULATED-${acceptedKeys.size + 1}`);
					response.end(JSON.stringify({ id: acceptedKeys.get(key) }));
				}
			} catch (error) {
				response.writeHead(400);
				response.end(JSON.stringify({ error: error.message }));
			}
		});
		capture = capturesServer;
		const capturePort = await listen(capture);
		const probe = createServer();
		const appPort = await listen(probe);
		await new Promise((resolve) => probe.close(resolve));
		const origin = `http://127.0.0.1:${appPort}`;
		for (const name of ['src', 'static', 'node_modules'])
			await symlink(join(root, name), join(workdir, name), 'dir');
		await writeFile(
			join(workdir, 'package.json'),
			await readFile(join(root, 'package.json'), 'utf8')
		);
		await writeFile(
			join(workdir, '.env.local'),
			Object.entries({
				VITE_SUPABASE_URL: api,
				VITE_SUPABASE_ANON_KEY: config.ANON_KEY,
				VITE_SUPABASE_REDIRECT_URL_BASE: origin,
				BACKPACK_ADMIN_ENABLED: 'true',
				BACKPACK_ASSESSMENT_ENABLED: 'true',
				BACKPACK_EMAIL_WORKER_ENABLED: 'true',
				SUPABASE_URL: api,
				SUPABASE_SERVICE_ROLE_KEY: config.SERVICE_ROLE_KEY,
				RESEND_API_KEY: providerKey,
				BACKPACK_WORKER_SECRET: workerSecret
			})
				.map(([key, value]) => `${key}=${value}`)
				.join('\n'),
			{ mode: 0o600 }
		);
		await writeFile(
			join(workdir, 'svelte.config.js'),
			`import base from ${JSON.stringify(
				pathToFileURL(join(root, 'svelte.config.js')).href
			)};export default {...base,kit:{...base.kit,outDir:'.svelte-kit'}};`
		);
		await writeFile(
			join(workdir, 'vite.config.js'),
			`
		 import {sveltekit} from '@sveltejs/kit/vite';
		 import Unocss from 'unocss/vite';
		 export default {plugins:[{name:'local-e2e-provider',enforce:'pre',
		 transform(code,id){
		 if(id.endsWith('/src/lib/server/backpack/coordinator.js'))return code.replace('if (error) {', 'if (error) { console.error("E2E RPC error",JSON.stringify(error));').replace('} catch {','} catch (error) { console.error("E2E RPC exception",error);');
		 if(!id.endsWith('/src/routes/api/backpack/dispatch.js'))return;
		 const original='createDispatchHandler({ env, createClient })';
		 if(!code.includes(original))throw new Error('E2E worker injection needs updating');
		 return 'import {fakeFetch} from "virtual:backpack-e2e-provider";\\n'+code.replace(original,'createDispatchHandler({ env, createClient, fetchEmail: fakeFetch })');},
		 resolveId(id){if(id==='virtual:backpack-e2e-provider')return '\\0'+id;},
		 load(id){if(id==='\\0virtual:backpack-e2e-provider')return ${JSON.stringify(
				`export async function fakeFetch(url,init){if(url!=='https://api.resend.com/emails')throw new Error('Unexpected provider URL');return fetch('http://127.0.0.1:${capturePort}',init);}`
			)};}
		 },sveltekit(),Unocss()],optimizeDeps:{include:['@supabase/auth-helpers-shared','@supabase/supabase-js','dequal']},ssr:{noExternal:['@supabase/auth-helpers-svelte','@supabase/auth-helpers-sveltekit']},server:{host:'127.0.0.1',port:${appPort},strictPort:true,fs:{allow:[${JSON.stringify(
				root
			)}]}}};
		`
		);
		// Prove private values come from .env.local, not inherited shell configuration.
		const childEnv = { ...process.env };
		for (const key of Object.keys(childEnv))
			if (/^(VITE_SUPABASE_|SUPABASE_|BACKPACK_|RESEND_)/.test(key)) delete childEnv[key];
		app = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js')], {
			cwd: workdir,
			env: childEnv,
			stdio: ['ignore', 'pipe', 'pipe']
		});
		app.stdout.on('data', (chunk) => {
			logs = (logs + chunk).slice(-12000);
		});
		app.stderr.on('data', (chunk) => {
			logs = (logs + chunk).slice(-12000);
		});
		let ready = false;
		for (let attempt = 0; attempt < 100; attempt++) {
			if (app.exitCode !== null) throw new Error(`Test app exited: ${logs}`);
			try {
				if ((await fetch(`${origin}/auth/signin`)).ok) {
					ready = true;
					break;
				}
			} catch {
				/* starting */
			}
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
		assert(ready, `Test app did not start: ${logs}`);
		const login = async function (name) {
			const response = await fetch(`${origin}/auth/signin`, {
				method: 'POST',
				redirect: 'manual',
				body: new URLSearchParams({ email: `${name}@backpack-e2e.test`, password: testPassword })
			});
			assert.equal(response.status, 303, `Login ${name}: ${await response.text()}`);
			const cookie = response.headers
				.getSetCookie()
				.map((value) => value.split(';')[0])
				.join('; ');
			assert(cookie.includes('access-token='));
			return cookie;
		};
		const coordinator = await login('coordinator');
		const admin = async function (action, args = {}) {
			const response = await fetch(`${origin}/api/backpack/admin`, {
				method: 'POST',
				headers: { Cookie: coordinator, Origin: origin, 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, arguments: args })
			});
			const result = await response.json();
			if (response.status !== 200)
				throw new Error(
					`Local coordinator ${action}: ${JSON.stringify(result)}\n${logs.slice(-5000)}`
				);
			assert.equal(response.status, 200, `Coordinator ${action}: ${JSON.stringify(result)}`);
			return result.result;
		};
		const initial = await admin('snapshot');
		for (const names of [['alice', 'bob'], ['baseline'], ['kit']]) {
			const target = initial.members.find((m) => m.user_id === users[names[0]]).household_id;
			const ids = names.map((name) => users[name]);
			const preview = await admin('preview_household', { household_id: target, member_ids: ids });
			await admin('confirm_household', {
				household_id: target,
				member_ids: ids,
				contact_user_id: ids[0],
				property_id: `TEST-${names[0]}`,
				revision: preview.revision,
				note: 'LOCAL E2E TEST ONLY: synthetic household review'
			});
		}
		const run = await admin('run_baseline', {
			policy_id: 1,
			note: 'LOCAL E2E TEST ONLY: Q1/Q6, cutoff 2000-01-01; no real programme rules'
		});
		await admin('review_baseline', {
			run_id: run.id,
			note: 'LOCAL E2E TEST ONLY: approve disposable synthetic baseline'
		});
		assert.equal(await scalar('select count(*) from backpack.notifications;'), '0');
		assert.equal(
			await scalar(
				"select result->>'outcome' from backpack.assessments where user_id='" +
					users.kit +
					"' order by assessed_at desc limit 1;"
			),
			'review_required'
		);
		await sql('update backpack.policies set email_enabled=true;');
		check('Synthetic baseline and coordinator review create no email history');
		const alice = await login('alice');
		const bob = await login('bob');
		await login('baseline');
		assert.equal(await scalar('select count(*) from backpack.notifications;'), '0');
		await apiRequest(
			`/rest/v1/profile?id=eq.${users.alice}`,
			{ other_comments: 'LOCAL TEST background update' },
			config.SERVICE_ROLE_KEY,
			'PATCH'
		);
		assert.equal(await scalar('select count(*) from backpack.notifications;'), '0');
		check(
			'Sign-in and background profile updates do not send incomplete reminders; baseline qualification stays silent'
		);
		const save = async function (cookie, name, mobile = '') {
			const response = await fetch(`${origin}/profile/aboutme`, {
				method: 'POST',
				headers: { Cookie: cookie, Origin: origin },
				body: new URLSearchParams({
					first_name: `LOCAL TEST ${name}`,
					family_name: 'Synthetic',
					phone: '',
					mobile,
					mobile_reception: '1',
					rfs_survival_plan: 'N',
					fire_fighting_experience: '1',
					fire_trauma: 'false',
					plan_to_leave_before_fire: '1',
					plan_to_leave_before_flood: '1'
				})
			});
			assert.equal(response.status, 200, `Profile save: ${await response.text()}`);
		};
		const dispatch = async function (auth = `Bearer ${workerSecret}`) {
			const response = await fetch(`${origin}/api/backpack/dispatch`, {
				method: 'POST',
				headers: { Authorization: auth }
			});
			const body = await response.json();
			return { code: response.status, ...body };
		};
		assert.equal((await dispatch('Bearer wrong')).code, 401);
		await save(alice, 'alice');
		assert.equal(
			await scalar("select count(*) from backpack.notifications where kind='incomplete';"),
			'1'
		);
		assert.equal(
			await scalar('select count(*) from backpack.notifications where accepted_at is not null;'),
			'0'
		);
		providerMode = 'quota';
		assert.equal((await dispatch()).status, 'retry_safe');
		assert.equal(
			await scalar(
				"select status || ':' || attempts || ':' || (accepted_at is null)::text from backpack.notifications where kind='incomplete';"
			),
			'pending:1:true'
		);
		await sql(
			"update backpack.notifications set available_at=now()-interval '1 second' where status='pending';"
		);
		providerMode = 'accept';
		assert.equal((await dispatch()).status, 'accepted');
		assert.equal(captures.length, 2);
		assert.equal(captures[0].key, captures[1].key);
		assert.deepEqual(captures[0].payload, captures[1].payload);
		assert.deepEqual(captures[1].payload.to, ['alice@backpack-e2e.test']);
		assert.deepEqual(captures[1].payload.bcc, ['coordinator@backpack-e2e.test']);
		assert.match(captures[1].payload.text, /required questions.*About Me and My Place/);
		assert.equal(
			await scalar(
				"select (accepted_at is not null and provider_id like 'LOCAL-SIMULATED-%')::text from backpack.notifications where kind='incomplete';"
			),
			'true'
		);
		await save(alice, 'alice');
		assert.equal((await dispatch()).status, 'idle');
		assert.equal(captures.length, 2);
		check(
			'Explicit incomplete save queues once; simulated quota retry preserves payload/key, BCC and acknowledgement'
		);
		await save(bob, 'bob', '0400000000');
		assert.equal((await dispatch()).status, 'accepted');
		assert.deepEqual(captures[2].payload.to, ['alice@backpack-e2e.test']);
		assert.match(captures[2].payload.text, /Congratulations/);
		await save(bob, 'bob', '0400000000');
		assert.equal((await dispatch()).status, 'idle');
		assert.equal(
			await scalar("select count(*) from backpack.notifications where kind='complete';"),
			'1'
		);
		check(
			'One complete member qualifies the shared household; nominated contact receives one simulated congratulations'
		);
		const before = Number(
			await scalar(`select count(*) from backpack.reviews where user_id='${users.kit}';`)
		);
		const kitCookie = await login('kit');
		assert(
			Number(await scalar(`select count(*) from backpack.reviews where user_id='${users.kit}';`)) >
				before
		);
		assert.equal((await dispatch()).status, 'accepted');
		const refreshPair = kitCookie
			.split('; ')
			.find((pair) => pair.split('=')[0].endsWith('refresh-token'));
		assert(refreshPair);
		const refreshToken = decodeURIComponent(refreshPair.slice(refreshPair.indexOf('=') + 1));
		const reviewed = await scalar(
			`select count(*) from backpack.reviews where user_id='${users.kit}';`
		);
		await apiRequest(
			'/auth/v1/token?grant_type=refresh_token',
			{ refresh_token: refreshToken },
			config.ANON_KEY
		);
		assert.equal(
			await scalar(`select count(*) from backpack.reviews where user_id='${users.kit}';`),
			reviewed
		);
		assert.equal((await dispatch()).status, 'idle');
		assert.equal(captures.length, 4);
		assert.equal(await scalar('select count(*) from backpack.processing_errors;'), '0');
		assert.equal(
			await scalar("select count(*) from backpack.notifications where status='accepted';"),
			'3'
		);
		check(
			'Historical kit recipient qualifies on real sign-in; refresh adds no review or duplicate notification'
		);
		await mkdir(join(root, '.supabase-local/e2e-artifacts'), { recursive: true });
		await writeFile(
			join(root, '.supabase-local/e2e-artifacts/last-run.json'),
			JSON.stringify(
				{
					simulated: true,
					rules: 'LOCAL E2E TEST ONLY: Q1/Q6; cutoff 2000-01-01',
					checks,
					captures
				},
				null,
				2
			)
		);
		console.log(
			'All local end-to-end checks passed. Captures: .supabase-local/e2e-artifacts/last-run.json (simulated only).'
		);
	} finally {
		if (app && app.exitCode === null) {
			app.kill('SIGTERM');
			await new Promise((resolve) => {
				const timer = setTimeout(() => {
					app.kill('SIGKILL');
					resolve();
				}, 5000);
				app.once('close', () => {
					clearTimeout(timer);
					resolve();
				});
			});
		}
		if (capture) await new Promise((resolve) => capture.close(resolve));
		let cleaned = true;
		if (started) {
			try {
				await cli(['stop', '--no-backup']);
			} catch (error) {
				console.error(`Test stack cleanup failed for ${project}: ${error.message}`);
				process.exitCode = 1;
				cleaned = false;
			}
		}
		if (cleaned) await rm(workdir, { recursive: true, force: true });
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
