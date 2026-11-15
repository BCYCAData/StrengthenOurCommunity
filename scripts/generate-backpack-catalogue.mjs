import { readFileSync, writeFileSync } from 'node:fs';
const path = 'supabase/migrations/20261115000000_backpack_programme.sql';
const catalogue = JSON.parse(readFileSync('config/survey-questions.json', 'utf8'));
const sql = readFileSync(path, 'utf8');
const seed = `-- BEGIN GENERATED CATALOGUE\ninsert into backpack.catalogues(version,definition) values ('${catalogue.version.replaceAll(
	"'",
	"''"
)}', $catalogue$${JSON.stringify(catalogue)}$catalogue$::jsonb);\n-- END GENERATED CATALOGUE`;
const updated = sql.replace(/-- BEGIN GENERATED CATALOGUE[\s\S]*?-- END GENERATED CATALOGUE/, seed);
if (process.argv.includes('--check')) {
	if (updated !== sql)
		throw new Error(
			'Catalogue migration is stale. Run node scripts/generate-backpack-catalogue.mjs'
		);
} else writeFileSync(path, updated);
