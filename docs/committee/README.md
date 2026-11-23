# Committee question worksheet

[Download the PDF](backpack-required-questions.pdf) or open the printable
[HTML copy](backpack-required-questions.html).

The four-page A4 landscape worksheet contains all 41 question IDs from
`config/survey-questions.json`, with the original prompts, profile sections,
conditional applicability, blank decision boxes and space for notes. Brief answer
context clarifies prompts such as “Are you:” without changing the original wording.
The final page includes a scope/exclusion summary and approval fields.

The catalogue's numbering and qualification rules remain pending committee
approval. Generating or completing this worksheet does not change programme
configuration. Both decision columns are deliberately left blank.

Regenerate using an available Playwright installation with Chromium:

```bash
node scripts/generate-backpack-committee-worksheet.mjs \
  --date 2026-11-17 \
  --playwright-module /absolute/path/to/playwright/index.mjs
```

If Playwright is installed in this project, omit `--playwright-module`.
`PLAYWRIGHT_MODULE` is also supported. Omitting `--date` uses the current date in
Australia/Sydney. The script checks complete question coverage and page overflow,
then writes HTML/PDF here and page previews under `/tmp/backpack-committee-page-*.png`.
