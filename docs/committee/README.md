# Committee question worksheet

The revised [committee v2 PDF](backpack-required-questions-committee-v2.pdf) and
[printable HTML](backpack-required-questions-committee-v2.html) contain the 36 active
question IDs, including Q36/Q36a. The original [17 November PDF](backpack-required-questions.pdf)
and [HTML](backpack-required-questions.html) remain historical references.

The current catalogue retains seven retired IDs (Q27–Q33) for historical answers.
The revised four-page worksheet has blank decision boxes; it does not approve or
activate the proposed committee policy. See [the catalogue](../survey-question-catalogue.md)
for adopted required/excluded IDs and outstanding rollout decisions. The blank
worksheet predates adoption; its pending-rule wording is a historical snapshot. Keep completed worksheets
and personal committee returns in ignored `data/committee/`.

Regenerate with an available Playwright installation and Chromium:

```bash
node scripts/generate-backpack-committee-worksheet.mjs \
  --date 2026-11-23 \
  --playwright-module /absolute/path/to/playwright/index.mjs
```

Omit `--playwright-module` when Playwright is installed in this project;
`PLAYWRIGHT_MODULE` is also supported. Without `--date`, the script uses today's
Australia/Sydney date. Generation checks active-question coverage and page overflow,
and writes page previews under `/tmp/backpack-committee-page-*.png`.
