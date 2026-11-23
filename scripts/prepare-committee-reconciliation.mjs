import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, relative, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCommitteeSheet } from '../src/lib/committeeImport.js';

async function main() {
	const root = fileURLToPath(new URL('../', import.meta.url));
	const input = process.argv[2];
	if (!input)
		throw new Error(
			'Usage: node scripts/prepare-committee-reconciliation.mjs data/committee/<source.csv>'
		);
	const path = resolve(input);
	const privatePath = relative(join(root, 'data/committee'), path);
	if (privatePath.startsWith('..') || privatePath.startsWith('/'))
		throw new Error('Keep committee sources and reports inside ignored data/committee.');
	const bytes = await readFile(path);
	const source_sha256 = createHash('sha256').update(bytes).digest('hex');
	const parsed = parseCommitteeSheet(bytes.toString('utf8'));
	if (process.argv.includes('--match-local')) {
		const result = spawnSync(
			process.execPath,
			[
				join(root, 'node_modules/supabase/dist/supabase.js'),
				'status',
				'--workdir',
				join(root, '.supabase-local'),
				'--output',
				'json'
			],
			{ encoding: 'utf8' }
		);
		if (result.status !== 0)
			throw new Error('Start the local Supabase instance before matching accounts.');
		const config = JSON.parse(result.stdout);
		if (config.API_URL !== 'http://127.0.0.1:54821' || !config.SERVICE_ROLE_KEY)
			throw new Error('Refusing a non-local account inventory.');
		const matches = new Map();
		for (let page = 1; page <= 100; page++) {
			const response = await fetch(
				`${config.API_URL}/auth/v1/admin/users?page=${page}&per_page=1000`,
				{
					headers: {
						apikey: config.SERVICE_ROLE_KEY,
						Authorization: `Bearer ${config.SERVICE_ROLE_KEY}`
					}
				}
			);
			if (!response.ok) throw new Error('Could not read the local account inventory.');
			const { users } = await response.json();
			for (const user of users) {
				const email = user.email?.toLowerCase();
				if (!email) continue;
				matches.set(email, [...(matches.get(email) || []), user]);
			}
			if (users.length < 1000) break;
			if (page === 100)
				throw new Error('Account inventory limit reached; no incomplete report written.');
		}
		for (const row of parsed.rows) {
			const users = matches.get(row.email) || [];
			row.account_match =
				users.length === 1
					? users[0].email_confirmed_at
						? 'matched'
						: 'unconfirmed'
					: users.length
					? 'ambiguous'
					: 'unmatched';
			if (row.account_match === 'matched') {
				const user = users[0];
				row.user_id = user.id;
				row.current_registered_at = user.created_at;
				row.legacy_kit_metadata = {
					kit_date: user.app_metadata?.kit_date ?? null,
					kitdate: user.app_metadata?.kitdate ?? null
				};
			}
		}
		parsed.summary.account_matches = Object.fromEntries(
			['matched', 'unmatched', 'ambiguous', 'unconfirmed'].map((state) => [
				state,
				parsed.rows.filter((row) => row.account_match === state).length
			])
		);
	}
	const report = {
		status: 'review_required_no_changes_applied',
		source_sha256,
		prepared_at: new Date().toISOString(),
		...parsed
	};
	const output = join(dirname(path), 'committee-reconciliation-review.json');
	await writeFile(output, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
	console.log(JSON.stringify({ report: output, summary: parsed.summary, applied: 0 }));
}
main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
