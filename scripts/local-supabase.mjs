import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	writeFileSync,
	chmodSync
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const workdir = resolve(root, '.supabase-local');
const project = 'strengthen-community-test';
const apiURL = 'http://127.0.0.1:54821';
const password = 'LocalBackpack2026!';
const command = process.argv[2] || 'start';

function cli(args) {
	const result = spawnSync(
		process.execPath,
		[resolve(root, 'node_modules/supabase/dist/supabase.js'), ...args, '--workdir', workdir],
		{
			cwd: root,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'inherit'],
			maxBuffer: 16 * 1024 * 1024
		}
	);
	if (result.error) throw result.error;
	if (result.status !== 0)
		throw new Error(`Local Supabase command failed (${args.join(' ')}). ${result.stdout}`);
	return result.stdout;
}

function prepare() {
	const directory = resolve(workdir, 'supabase');
	mkdirSync(resolve(directory, 'migrations'), { recursive: true });
	copyFileSync(resolve(root, 'supabase/local/config.toml'), resolve(directory, 'config.toml'));
	copyFileSync(
		resolve(root, 'supabase/local/profile-bootstrap.sql'),
		resolve(directory, 'migrations/20261114000000_local_profile.sql')
	);
	for (const name of readdirSync(resolve(root, 'supabase/migrations'))) {
		if (name.endsWith('.sql'))
			copyFileSync(
				resolve(root, 'supabase/migrations', name),
				resolve(directory, 'migrations', name)
			);
	}
}

function settings() {
	const config = JSON.parse(cli(['status', '--output', 'json']));
	if (config.API_URL !== apiURL || !config.ANON_KEY || !config.SERVICE_ROLE_KEY) {
		throw new Error('Refusing an unexpected Supabase target or incomplete local credentials.');
	}
	return config;
}

function configureApp(config) {
	const path = resolve(root, '.env.local');
	let content = existsSync(path)
		? readFileSync(path, 'utf8')
		: readFileSync(resolve(root, '.env.example'), 'utf8');
	const previousURL = content.match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1];
	if (previousURL && previousURL !== apiURL && !existsSync(resolve(root, '.env.hosted.local'))) {
		writeFileSync(resolve(root, '.env.hosted.local'), content, { mode: 0o600 });
	}
	const values = {
		VITE_SUPABASE_URL: apiURL,
		VITE_SUPABASE_ANON_KEY: config.ANON_KEY,
		VITE_SUPABASE_REDIRECT_URL_BASE: 'http://localhost:5173',
		BACKPACK_ADMIN_ENABLED: 'true',
		BACKPACK_ASSESSMENT_ENABLED: 'false',
		BACKPACK_EMAIL_WORKER_ENABLED: 'false',
		SUPABASE_URL: apiURL,
		SUPABASE_SERVICE_ROLE_KEY: '',
		RESEND_API_KEY: '',
		BACKPACK_WORKER_SECRET: ''
	};
	for (const [key, value] of Object.entries(values)) {
		const pattern = new RegExp(`^${key}=.*$`, 'm');
		content = pattern.test(content)
			? content.replace(pattern, () => `${key}=${value}`)
			: `${content}\n${key}=${value}\n`;
	}
	writeFileSync(path, content, { mode: 0o600 });
	chmodSync(path, 0o600);
}

async function seed(config) {
	async function request(path, method = 'GET', body) {
		const response = await fetch(`${apiURL}${path}`, {
			method,
			headers: {
				apikey: config.SERVICE_ROLE_KEY,
				Authorization: `Bearer ${config.SERVICE_ROLE_KEY}`,
				'Content-Type': 'application/json',
				Prefer: 'return=minimal'
			},
			body: body === undefined ? undefined : JSON.stringify(body)
		});
		const text = await response.text();
		if (!response.ok) throw new Error(`Local seed ${path}: ${response.status} ${text}`);
		return text ? JSON.parse(text) : null;
	}
	const { users } = await request('/auth/v1/admin/users?per_page=1000');
	const people = [
		{
			email: 'coordinator@example.test',
			first: 'Casey',
			family: 'Coordinator',
			property: 'LOCAL-COORDINATOR'
		},
		{
			email: 'alice@example.test',
			first: 'Alice',
			family: 'Example',
			property: 'LOCAL-PROPERTY-1'
		},
		{ email: 'bob@example.test', first: 'Bob', family: 'Example', property: 'LOCAL-PROPERTY-1' },
		{
			email: 'charlie@example.test',
			first: 'Charlie',
			family: 'Sample',
			property: 'LOCAL-PROPERTY-2'
		}
	];
	let created = false;
	for (const person of people) {
		if (users.some((user) => user.email === person.email)) continue;
		const user = await request('/auth/v1/admin/users', 'POST', {
			email: person.email,
			password,
			email_confirm: true,
			user_metadata: { principaladdresssiteoid: person.property }
		});
		await request(`/rest/v1/profile?id=eq.${user.id}`, 'PATCH', {
			first_name: person.first,
			family_name: person.family,
			property_address_street:
				person.property === 'LOCAL-PROPERTY-2' ? '2 Example Road' : '1 Example Road',
			property_address_suburb: 'Testville',
			property_address_postcode: '2429'
		});
		created = true;
	}
	const sql = `insert into backpack.coordinators(user_id,note)
	 select id,'Local synthetic test coordinator' from auth.users where email='coordinator@example.test'
	 on conflict(user_id) do nothing;
	 ${created ? 'select public.backpack_baseline();' : ''}`;
	const result = spawnSync(
		'docker',
		[
			'exec',
			'-i',
			`supabase_db_${project}`,
			'psql',
			'-X',
			'-U',
			'postgres',
			'-d',
			'postgres',
			'-v',
			'ON_ERROR_STOP=1',
			'-q'
		],
		{ input: sql, encoding: 'utf8' }
	);
	if (result.error || result.status !== 0)
		throw new Error(result.stderr || result.error?.message || 'Local seed failed.');
	console.log(`Test coordinator: coordinator@example.test; password: ${password}`);
}

async function main() {
	if (!['start', 'stop', 'status', 'seed'].includes(command))
		throw new Error('Use start, stop, status or seed.');
	if (command === 'start') {
		prepare();
		console.log('Starting isolated Supabase project on ports 54821–54824…');
		cli(['start']);
		cli(['migration', 'up', '--local']);
		const config = settings();
		await seed(config);
		configureApp(config);
		console.log(
			'Configured ignored .env.local. Earlier hosted settings are preserved in .env.hosted.local when present.'
		);
	} else if (command === 'stop') {
		cli(['stop']);
		console.log('Local test stack stopped; Docker database volume retained.');
		return;
	} else if (command === 'seed') {
		await seed(settings());
	} else settings();
	console.log(
		`API: ${apiURL}\nStudio: http://127.0.0.1:54823\nAuth inbox runs in Docker; see docs/local-supabase.md for access.\nRestart npm run dev, then open http://localhost:5173/admin/backpacks`
	);
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
