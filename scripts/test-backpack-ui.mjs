// Synthetic standalone component harness. No real Auth, Supabase or Resend calls.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createBackpackFixture, uuid } from '../tests/fixtures/backpack-ui.mjs';
import { validateCoordinatorAction } from '../src/lib/server/backpack/coordinator.js';

async function main() {
	const moduleIndex = process.argv.indexOf('--playwright-module');
	const modulePath =
		moduleIndex >= 0 ? process.argv[moduleIndex + 1] : process.env.PLAYWRIGHT_MODULE;
	const { chromium } = await import(
		modulePath ? pathToFileURL(resolve(modulePath)).href : 'playwright'
	);
	const root = process.cwd();
	const fixture = await mkdtemp(join(tmpdir(), 'soc-backpack-ui-'));
	let server, browser;
	try {
		await symlink(join(root, 'node_modules'), join(fixture, 'node_modules'), 'dir');
		await writeFile(
			join(fixture, 'package.json'),
			JSON.stringify({ type: 'module', dependencies: { svelte: '^3.44.0' } })
		);
		const backend = createBackpackFixture();
		const initial = backend.initial();
		await writeFile(
			join(fixture, 'index.html'),
			'<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;font-family:Arial,sans-serif"><div id="app"></div><script type="module" src="/main.js"></script></body></html>'
		);
		await writeFile(
			join(fixture, 'main.js'),
			`import App from '/@fs/${join(
				root,
				'src/components/backpack/BackpackCoordinator.svelte'
			)}';\nconst state=new URLSearchParams(location.search).get('access')||'ready';new App({target:document.querySelector('#app'),props:{initialSnapshot:state==='ready'?${JSON.stringify(
				initial
			)}:null,accessState:state,workerEnabled:false}});`
		);
		server = await createServer({
			configFile: false,
			logLevel: 'warn',
			root: fixture,
			cacheDir: join(fixture, '.vite'),
			plugins: [svelte({ configFile: false })],
			server: { host: '127.0.0.1', port: 0, fs: { allow: [root, fixture] } }
		});
		await server.listen();
		const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
		browser = await chromium.launch({ headless: true });
		const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
		const errors = [];
		let denyAccess = false;
		page.on('pageerror', (e) => errors.push(e.message));
		await page.route('**/*', async (route) => {
			const request = route.request();
			const url = new URL(request.url());
			if (url.origin !== origin) {
				await route.abort();
				return;
			}
			if (url.pathname === '/api/backpack/admin') {
				const body = request.postDataJSON();
				if (denyAccess) {
					await route.fulfill({
						status: 403,
						contentType: 'application/json',
						body: JSON.stringify({ error: 'Coordinator access required' })
					});
					return;
				}
				assert(validateCoordinatorAction(body), `Invalid UI action: ${JSON.stringify(body)}`);
				const reply = backend.execute(body.action, body.arguments);
				await route.fulfill({
					status: reply.status,
					contentType: 'application/json',
					body: JSON.stringify(reply.body)
				});
			} else await route.continue();
		});
		await page.goto(origin, { waitUntil: 'networkidle' });
		await page.getByRole('heading', { name: 'Backpack programme', exact: true }).waitFor();
		assert.equal(await page.getByText('Email sending disabled', { exact: true }).count(), 1);
		assert(
			await page
				.getByRole('option', { name: 'Live programme — notification rules apply' })
				.isDisabled()
		);
		await page.screenshot({ path: '/tmp/backpack-coordinator-desktop.png', fullPage: true });
		const households = page.getByRole('tabpanel', { name: 'Households', exact: true });
		await households.getByRole('button', { name: 'Review household for Alice Lane' }).click();
		await households.getByRole('checkbox', { name: 'Select Bob Lane' }).check();
		await households.getByRole('radio', { name: 'Nominated contact' }).first().check();
		await households.getByRole('button', { name: 'Preview household', exact: true }).click();
		await households
			.getByLabel('Review notes', { exact: true })
			.fill('Verified the register and confirmed this is one household.');
		assert.equal(backend.calls.filter((c) => c.action === 'confirm_household').length, 0);
		await households.getByRole('button', { name: 'Confirm household and contact' }).click();
		await households.getByRole('alert').filter({ hasText: 'preview has changed' }).waitFor();
		assert.equal(
			await households.getByRole('button', { name: 'Confirm household and contact' }).count(),
			0
		);
		await households.getByRole('button', { name: 'Preview household', exact: true }).click();
		await households.getByRole('button', { name: 'Confirm household and contact' }).click();
		await households.getByRole('status').filter({ hasText: 'Household saved' }).waitFor();
		assert.equal(backend.members[1].household_id, uuid(101));
		await households.getByRole('button', { name: 'Clear selection', exact: true }).click();
		await households.getByRole('checkbox', { name: 'Select Alice Lane' }).check();
		await households.getByRole('radio', { name: 'Nominated contact' }).first().check();
		await households.getByRole('button', { name: 'Preview household', exact: true }).click();
		await households
			.getByText('This household already has additional members.', { exact: false })
			.waitFor();
		await households
			.getByLabel('Review notes', { exact: true })
			.fill('Checked every existing household member.');
		assert(
			await households.getByRole('button', { name: 'Confirm household and contact' }).isDisabled()
		);
		await households.getByRole('button', { name: 'Include existing household members' }).click();
		await households.getByRole('button', { name: 'Preview household', exact: true }).click();
		await households.getByRole('button', { name: 'Confirm household and contact' }).click();
		await households.getByRole('status').filter({ hasText: 'Household saved' }).waitFor();

		await page.getByRole('tab', { name: 'Special cases', exact: true }).click();
		const cases = page.getByRole('tabpanel', { name: 'Special cases', exact: true });
		await cases.getByRole('button', { name: 'Review case for Charlie Reed' }).click();
		await cases.getByLabel('Decision', { exact: true }).selectOption('approved');
		await cases
			.getByLabel('Decision notes')
			.fill('Historical exception checked against the register.');
		await cases.getByRole('button', { name: 'Record decision', exact: true }).click();
		await cases.getByRole('status').filter({ hasText: 'Decision recorded' }).waitFor();
		await page.getByRole('tab', { name: 'Backpacks', exact: true }).click();
		const records = page.getByRole('tabpanel', { name: 'Backpacks', exact: true });
		await records.getByLabel('Household via participant').selectOption(uuid(1));
		await records.getByLabel('Source reference / register row ID').fill('register-101');
		await records
			.getByLabel('Provenance / review notes', { exact: true })
			.fill('Historical distribution register; exact dates unknown.');
		await records.getByRole('button', { name: 'Record historical award', exact: true }).click();
		await records.getByRole('status').filter({ hasText: 'Backpack record saved' }).waitFor();
		const awardCall = backend.calls.find((c) => c.action === 'record_award');
		assert.equal(awardCall.arguments.awarded_at, null);
		assert.equal(awardCall.arguments.delivered_at, null);
		await records.getByText('Import historical records from CSV', { exact: true }).click();
		await records
			.getByLabel('Or paste CSV')
			.fill('reference,email\nregister-101,alice@example.test\nregister-102,bob@example.test');
		await records.getByLabel('Import provenance / review notes').fill('Register reconciliation.');
		await records.getByRole('button', { name: 'Preview CSV', exact: true }).click();
		await records
			.getByRole('table', { name: 'CSV import preview' })
			.getByText('Multiple rows refer to the same household.', { exact: false })
			.first()
			.waitFor();
		assert(await records.getByRole('button', { name: 'Import reviewed rows' }).isDisabled());
		await records
			.getByLabel('Or paste CSV')
			.fill('reference,email\nregister-101,alice@example.test');
		await records.getByRole('button', { name: 'Preview CSV', exact: true }).click();
		await records
			.getByRole('table', { name: 'CSV import preview' })
			.getByText('ready', { exact: true })
			.waitFor();
		await records.getByRole('button', { name: 'Import reviewed rows' }).click();
		await records
			.getByRole('table', { name: 'CSV import preview' })
			.getByText('existing', { exact: true })
			.waitFor();
		assert.equal(backend.awards.length, 2);
		await records.getByRole('button', { name: 'Record delivery for legacy-001' }).click();
		await records.getByLabel('Known delivery date and time').fill('2026-11-16T12:30');
		await records
			.getByLabel('Delivery evidence / notes')
			.fill('Confirmed handover against signed register.');
		await records.getByRole('button', { name: 'Save delivery', exact: true }).click();
		await records.getByRole('status').filter({ hasText: 'Delivery recorded' }).waitFor();
		assert.equal(
			backend.calls.find((c) => c.action === 'record_delivery').arguments.delivered_at,
			'2026-11-16T01:30:00.000Z'
		);
		await page.getByRole('tab', { name: 'Baseline', exact: true }).click();
		const baseline = page.getByRole('tabpanel', { name: 'Baseline', exact: true });
		await baseline
			.getByLabel('Assessment notes')
			.fill('Households, historical awards and exceptions reviewed.');
		await baseline.getByRole('button', { name: 'Run baseline assessment' }).click();
		await baseline.getByLabel('Review conclusions').fill('All classifications checked.');
		await baseline.getByRole('button', { name: 'Approve baseline readiness' }).click();
		await baseline.getByRole('alert').filter({ hasText: 'baseline has changed' }).waitFor();
		await baseline.getByLabel('Assessment notes').fill('Rerun after the recorded evidence change.');
		await baseline.getByRole('button', { name: 'Run baseline assessment' }).click();
		await baseline
			.getByLabel('Review conclusions')
			.fill('Rerun checked; ready for later activation.');
		await baseline.getByRole('button', { name: 'Approve baseline readiness' }).click();
		await baseline.getByRole('status').filter({ hasText: 'Baseline readiness approved' }).waitFor();
		assert.equal(backend.policy.email_enabled, false);
		await page.setViewportSize({ width: 390, height: 844 });
		await page.getByRole('tab', { name: 'Households', exact: true }).click();
		assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
		await page.screenshot({ path: '/tmp/backpack-coordinator-mobile.png', fullPage: true });

		denyAccess = true;
		await page.getByRole('button', { name: 'Refresh programme', exact: true }).click();
		await page.getByRole('heading', { name: 'Coordinator access required' }).waitFor();
		assert.equal(await page.getByRole('table').count(), 0);
		assert.equal(await page.getByText('alice@example.test', { exact: true }).count(), 0);
		const before = backend.calls.length;
		await page.goto(`${origin}/?access=forbidden`, { waitUntil: 'networkidle' });
		assert.equal(
			await page.getByRole('heading', { name: 'Coordinator access required' }).count(),
			1
		);
		assert.equal(await page.getByRole('table').count(), 0);
		assert.equal(backend.calls.length, before);
		assert.deepEqual(errors, []);
		assert(backend.calls.every((c) => !['enable_email', 'activate'].includes(c.action)));
		console.log(
			'Browser workflows passed: stale household review, special cases, historical/CSV imports, delivery, stale baseline approval, mobile layout and denied access.'
		);
		console.log(
			'Screenshots: /tmp/backpack-coordinator-desktop.png and /tmp/backpack-coordinator-mobile.png'
		);
	} finally {
		await browser?.close();
		await server?.close();
		await rm(fixture, { recursive: true, force: true });
	}
}
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
