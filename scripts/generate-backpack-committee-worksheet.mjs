// Generate a committee print worksheet directly from the project's question IDs.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import prettier from 'prettier';

const root = fileURLToPath(new URL('../', import.meta.url));
const argument = (name) => {
	const index = process.argv.indexOf(name);
	return index < 0 ? undefined : process.argv[index + 1];
};
const escapeHTML = (text) =>
	String(text).replace(
		/[&<>"']/g,
		(character) =>
			({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;'
			}[character])
	);

async function main() {
	const catalogue = JSON.parse(await readFile(join(root, 'config/survey-questions.json'), 'utf8'));
	assert.equal(catalogue.questions.length, 41);
	assert.equal(new Set(catalogue.questions.map((q) => q.id)).size, 41);
	const prepared = argument('--date')
		? new Date(`${argument('--date')}T12:00:00+11:00`)
		: new Date();
	const date = new Intl.DateTimeFormat('en-AU', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Australia/Sydney'
	}).format(prepared);
	const context = {
		Q6: 'Either a mobile or landline number answers this question.',
		Q8: 'Residency: how often the person is at the property.',
		Q9: 'Counts for ages 0–18, 19–50, 51–70 and 71+. A deliberate zero is an answer.',
		Q11: 'Counts of dogs, cats, birds and other pets. A deliberate zero is an answer.',
		Q15a: 'Size of the Stortz fitting.',
		Q16: 'Fire trailers, pumps, hoses, trailers with spray equipment, generator, or None.',
		Q17: 'Solar batteries, fuel stores, chemical stores, bottled gas, or None.',
		Q19: 'Fire breaks, slashed areas, backup pump, driveway clearance, truck access, or None.',
		Q25: 'Staying; leaving as early as possible; or unsure depending on severity.',
		Q26: 'Staying; leaving as early as possible; or unsure depending on severity.'
	};
	const applicability = {
		Q3a: 'Only if Q3 = Yes (renting).',
		Q3b: 'Only if Q3 = Yes. Either agent mobile or landline.',
		Q5a: 'Only if Q5 = Other.',
		Q12a: 'Only if Q12 = Yes (livestock).',
		Q12b: 'Only if Q12 = Yes AND Q12a = Yes.',
		Q15a: 'Only if Q15 = Yes (Stortz fitting).'
	};
	const groups = [
		{ title: 'Identity, address and contact', start: 'Q1', end: 'Q7' },
		{ title: 'Residents, animals, assets and water', start: 'Q8', end: 'Q15a' },
		{ title: 'Resources, hazards and emergency planning', start: 'Q16', end: 'Q26' },
		{ title: 'Community participation and contact preferences', start: 'Q27', end: 'Q35' }
	];
	const ids = [];
	const sections = groups.map((group, index) => {
		const first = catalogue.questions.findIndex((q) => q.id === group.start);
		const last = catalogue.questions.findIndex((q) => q.id === group.end);
		const questions = catalogue.questions.slice(first, last + 1);
		ids.push(...questions.map((q) => q.id));
		return `<section class="sheet">
		<header><p class="eyebrow">Strengthen Our Community · Backpack programme</p>
		<h1>${
			index === 0
				? 'Backpack qualification question checklist'
				: 'Backpack qualification question checklist · continued'
		}</h1>
		<div class="meta"><strong>Committee decision worksheet</strong><span>Prepared ${escapeHTML(
			date
		)}</span></div></header>
		${
			index === 0
				? `<div class="instructions"><p><strong>Tick ONE box for every row:</strong> “Required” means an answer is needed when the question applies; “May remain unanswered” permits a blank answer. Leave both blank only if the decision is deferred, and explain in Notes.</p><p>“No”, zero and an offered “None” can be valid answers. Conditional follow-ups apply only as stated. If a parent is exempt, its follow-ups are non-blocking under the current draft rules. One household member must independently meet the required answers; other eligibility and review rules still apply.</p><p><strong>Question references:</strong> the project catalogue contains 35 main questions plus six follow-ups. Numbering and requirements remain subject to committee approval. No decisions are preselected.</p></div>`
				: ''
		}
		<div class="group"><strong>${index + 1}. ${escapeHTML(group.title)}</strong><span>${group.start}–${
			group.end
		}</span></div>
		${
			index === 3
				? '<p class="scope-note">These questions are in <strong>My Community</strong>, outside the proposed About Me / My Place scope. The committee must explicitly decide whether they affect qualification.</p>'
				: ''
		}
		<table><colgroup><col class="id"><col class="question"><col class="section"><col class="applies"><col class="required"><col class="optional"><col class="notes"></colgroup>
		<thead><tr><th>ID</th><th>Survey question / prompt</th><th>Profile section</th><th>Applies when / answer note</th><th class="center">Required</th><th class="center">May remain<br>unanswered</th><th>Committee notes</th></tr></thead>
		<tbody>${questions
			.map(
				(q) =>
					`<tr data-question="${q.id}"><td class="qid">${
						q.id
					}</td><td><span class="prompt">${escapeHTML(q.label)}</span>${
						context[q.id] ? `<span class="context">${escapeHTML(context[q.id])}</span>` : ''
					}</td><td class="small">${escapeHTML(q.section).replaceAll(
						' / ',
						'<br>'
					)}</td><td class="small">${escapeHTML(
						applicability[q.id] || 'All respondents.'
					)}</td><td class="center"><span class="checkbox" aria-label="${
						q.id
					} required"></span></td><td class="center"><span class="checkbox" aria-label="${
						q.id
					} may remain unanswered"></span></td><td><span class="writing-line"></span></td></tr>`
			)
			.join('')}</tbody></table>
		${
			index === 3
				? `<div class="decision-summary"><div><strong>Record the agreed decision</strong><span>Complete after reviewing all four pages.</span></div><p>Qualification scope (sections or question IDs): <span class="line"></span></p><p>IDs allowed to remain unanswered (including lettered follow-ups where relevant):</p><div class="full-line"></div><div class="full-line"></div><p class="signoff"><span>Approved by: <i></i></span><span>Meeting date: <i></i></span><span>Signature: <i></i></span></p></div>`
				: `<div class="page-notes">Additional committee notes: <span class="line"></span></div>`
		}
		<footer><span>Reference catalogue ${escapeHTML(
			catalogue.version
		)} · decisions not yet applied</span><span>Page ${index + 1} of ${groups.length}</span></footer>
		</section>`;
	});
	assert.deepEqual(
		ids,
		catalogue.questions.map((q) => q.id),
		'Every question must appear once, in catalogue order'
	);
	const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Backpack qualification — committee question checklist</title><style>
	@page { size: A4 landscape; margin: 10mm; }
	* { box-sizing: border-box; }
	body { margin: 0; color: #172b29; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	.sheet { position: relative; width: 277mm; height: 190mm; padding-bottom: 8mm; break-after: page; }
	.sheet:last-child { break-after: auto; }
	header { border-top: 1.6mm solid #234c43; padding-top: 2.4mm; margin-bottom: 2mm; }
	.eyebrow { margin: 0 0 1.2mm; text-transform: uppercase; letter-spacing: 1.1px; font-size: 8pt; color: #385850; }
	h1 { font-size: 17pt; margin: 0 0 1.8mm; line-height: 1.12; color: #193b32; }
	.meta { display: flex; justify-content: space-between; font-size: 8.3pt; }
	.instructions { background: #f2f5f3; border-left: 1mm solid #b87927; padding: 1.6mm 2.5mm; margin: 2.2mm 0; font-size: 8.2pt; line-height: 1.26; }
	.instructions p { margin: 0 0 1mm; }
	.instructions p:last-child { margin-bottom: 0; }
	.group { display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 10pt; }
	.group span { color: #4a5b57; font-size: 8.5pt; }
	table { width: 100%; border-collapse: collapse; table-layout: fixed; }
	col.id { width: 14mm; } col.question { width: 100mm; } col.section { width: 30mm; } col.applies { width: 36mm; } col.required { width: 18mm; } col.optional { width: 24mm; } col.notes { width: 55mm; }
	th { background: #e7eeea; border: .25mm solid #9baaa4; padding: 1.3mm 1.8mm; font-size: 8.2pt; font-weight: bold; text-align: left; line-height: 1.15; }
	td { border: .25mm solid #b4bdb8; padding: 1mm 1.8mm; vertical-align: middle; line-height: 1.2; height: 9.5mm; }
	tr { break-inside: avoid; }
	tbody tr:nth-child(even) td { background: #fafbf9; }
	.qid { font-weight: bold; font-size: 10pt; color: #193b32; }
	.prompt { display: block; font-size: 8.9pt; }
	.context { display: block; margin-top: .8mm; font-size: 7.7pt; color: #4b5552; }
	.small { font-size: 8pt; }
	.center { text-align: center; }
	.checkbox { display: inline-block; width: 4.4mm; height: 4.4mm; border: .3mm solid #43564e; background: white; }
	.writing-line { display: block; height: 6mm; width: 100%; border-bottom: .2mm dotted #aab3ad; }
	.page-notes { display: flex; gap: 2mm; margin-top: 3.5mm; font-size: 8.2pt; }
	.line { display: inline-block; border-bottom: .2mm solid #a8b2ab; flex: 1; min-width: 65mm; height: 4mm; }
	footer { position: absolute; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; border-top: .25mm solid #aeb8b2; padding-top: 1.7mm; font-size: 7.6pt; color: #4b5b53; }
	.scope-note { font-size: 8.2pt; margin: 0 0 2mm; }
	.decision-summary { margin-top: 3mm; font-size: 8.2pt; }
	.decision-summary > div:first-child { display: flex; justify-content: space-between; }
	.decision-summary p { margin: 2mm 0 0; display: flex; gap: 2mm; align-items: baseline; }
	.full-line { height: 5mm; border-bottom: .2mm solid #a8b2ab; }
	.signoff { display: flex; justify-content: space-between; }
	.signoff > span { display: flex; gap: 2mm; width: 31%; }
	.signoff i { flex: 1; border-bottom: .2mm solid #a8b2ab; }
	@media screen { body { background: #e7e9e6; padding: 8mm; } .sheet { background: white; box-shadow: 0 1mm 5mm #0002; margin: 0 auto 8mm; outline: 10mm solid white; } }
	</style></head><body>${sections.join('')}</body></html>`;
	const directory = join(root, 'docs/committee');
	await mkdir(directory, { recursive: true });
	const htmlPath = join(directory, 'backpack-required-questions.html');
	const pdfPath = join(directory, 'backpack-required-questions.pdf');
	const formatting = await prettier.resolveConfig(htmlPath);
	await writeFile(htmlPath, prettier.format(html, { ...formatting, parser: 'html' }));
	const modulePath = argument('--playwright-module') || process.env.PLAYWRIGHT_MODULE;
	const { chromium } = await import(
		modulePath ? pathToFileURL(resolve(modulePath)).href : 'playwright'
	);
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		await page.goto(pathToFileURL(htmlPath).href);
		await page.emulateMedia({ media: 'print' });
		const layout = await page.locator('.sheet').evaluateAll((sheets) =>
			sheets.map((sheet) => ({
				rows: sheet.querySelectorAll('[data-question]').length,
				footerTop: sheet.querySelector('footer').getBoundingClientRect().top,
				contentBottom: Math.max(
					...[...sheet.children]
						.filter((element) => element.tagName !== 'FOOTER')
						.map((element) => element.getBoundingClientRect().bottom)
				),
				overflow: sheet.scrollHeight > sheet.clientHeight + 1
			}))
		);
		for (const [index, sheet] of layout.entries())
			assert(
				!sheet.overflow && sheet.contentBottom + 8 < sheet.footerTop,
				`Page ${index + 1} content overlaps footer: ${JSON.stringify(sheet)}`
			);
		await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true, tagged: true });
		for (let index = 0; index < groups.length; index++)
			await page
				.locator('.sheet')
				.nth(index)
				.screenshot({ path: `/tmp/backpack-committee-page-${index + 1}.png` });
		console.log(
			JSON.stringify({
				pdf: pdfPath,
				html: htmlPath,
				questions: ids.length,
				pages: layout.length,
				rowsPerPage: layout.map((page) => page.rows)
			})
		);
	} finally {
		await browser.close();
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
