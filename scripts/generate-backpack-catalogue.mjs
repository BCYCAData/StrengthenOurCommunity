import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const catalogue = JSON.parse(readFileSync('config/survey-questions.json', 'utf8'));
const policy = JSON.parse(readFileSync('config/backpack-committee-policy.json', 'utf8'));
// Preserve the first migration's policy seed after requirements are adopted.
const initialPath = `config/policies/${policy.catalogue_version}.initial.json`;
const initialPolicy = existsSync(initialPath)
	? JSON.parse(readFileSync(initialPath, 'utf8'))
	: policy;
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const array = (values) => `array[${values.map(literal).join(',')}]::text[]`;
const migrations = readdirSync('supabase/migrations').filter((name) => name.endsWith('.sql'));
const seeds = migrations.flatMap((name) => {
	const text = readFileSync(`supabase/migrations/${name}`, 'utf8');
	return [...text.matchAll(/\$catalogue\$([\s\S]*?)\$catalogue\$/g)].map((match) => ({
		path: `supabase/migrations/${name}`,
		catalogue: JSON.parse(match[1])
	}));
});
for (const name of readdirSync('config/catalogues').filter((name) => name.endsWith('.json'))) {
	const frozen = JSON.parse(readFileSync(`config/catalogues/${name}`, 'utf8'));
	const saved = seeds.find((seed) => seed.catalogue.version === frozen.version);
	assert(saved, `Frozen catalogue ${frozen.version} needs its original migration`);
	assert.deepEqual(saved.catalogue, frozen, `Frozen catalogue ${frozen.version} has changed`);
}
const explicit = process.argv.indexOf('--migration');
const path =
	explicit >= 0
		? process.argv[explicit + 1]
		: seeds.find((seed) => seed.catalogue.version === catalogue.version)?.path;
assert(
	path && resolve(path).startsWith(resolve('supabase/migrations') + '/') && path.endsWith('.sql'),
	'A new catalogue version needs a new migration: --migration supabase/migrations/<timestamp>_catalogue.sql'
);
assert(
	!seeds.some((seed) => seed.path === path && seed.catalogue.version !== catalogue.version),
	'Never replace a historical catalogue with a different version'
);
const frozenCurrent = `config/catalogues/${catalogue.version}.json`;
if (existsSync(frozenCurrent))
	assert.deepEqual(
		catalogue,
		JSON.parse(readFileSync(frozenCurrent, 'utf8')),
		'Create a new catalogue version rather than editing a frozen one'
	);
assert.equal(policy.catalogue_version, catalogue.version);
for (const key of [
	'catalogue_version',
	'cutoff_at',
	'scope_question_ids',
	'excluded_question_ids',
	'required_question_ids'
])
	assert.deepEqual(policy[key], initialPolicy[key], `Changed ${key} needs a new policy version`);
const active = catalogue.questions.filter((q) => q.active !== false).map((q) => q.id);
assert(
	policy.scope_question_ids.every((id) => active.includes(id)),
	'Scope must contain active IDs'
);
assert(policy.required_question_ids.every((id) => policy.scope_question_ids.includes(id)));
assert.deepEqual(
	policy.excluded_question_ids,
	policy.scope_question_ids.filter((id) => !policy.required_question_ids.includes(id)),
	'Allowed-unanswered list must match the reviewed required mapping'
);
const seed = `-- BEGIN GENERATED CATALOGUE\ninsert into backpack.catalogues(version,definition) values (${literal(
	catalogue.version
)}, $catalogue$${JSON.stringify(catalogue)}$catalogue$::jsonb);\n-- END GENERATED CATALOGUE`;
const policySeed = `-- BEGIN GENERATED POLICY
insert into backpack.policies(version,catalogue_version,cutoff_at,scope_question_ids,excluded_question_ids)
select coalesce(max(version),0)+1,${literal(catalogue.version)},${literal(
	initialPolicy.cutoff_at
)},${array(initialPolicy.scope_question_ids)},${array(
	initialPolicy.excluded_question_ids
)} from backpack.policies;
insert into backpack.policy_review_requests select id,${literal(
	JSON.stringify(initialPolicy.pending_confirmations)
)}::jsonb from backpack.policies where catalogue_version=${literal(catalogue.version)};
-- END GENERATED POLICY`;
const sql = existsSync(path)
	? readFileSync(path, 'utf8')
	: `begin;\n${seed}\n${policySeed}\ncommit;\n`;
assert(
	sql.includes('-- BEGIN GENERATED CATALOGUE') && sql.includes('-- BEGIN GENERATED POLICY'),
	'Migration needs catalogue and policy seed markers'
);
const updated = sql
	.replace(/-- BEGIN GENERATED CATALOGUE[\s\S]*?-- END GENERATED CATALOGUE/, seed)
	.replace(/-- BEGIN GENERATED POLICY[\s\S]*?-- END GENERATED POLICY/, policySeed);
if (process.argv.includes('--check'))
	assert.equal(
		updated,
		sql,
		'Catalogue/policy migration is stale; run node scripts/generate-backpack-catalogue.mjs'
	);
else writeFileSync(path, updated);

if (policy.adopted_requirements?.length) {
	assert(
		policy.adopted_requirements.every((item) => initialPolicy.pending_confirmations.includes(item))
	);
	assert.deepEqual(
		policy.pending_confirmations,
		initialPolicy.pending_confirmations.filter(
			(item) => !policy.adopted_requirements.includes(item)
		),
		'Adoption must retain all outstanding rollout decisions'
	);
	const adoptionPath = 'supabase/migrations/20261123020000_adopt_committee_requirements.sql';
	const adoption = `-- BEGIN GENERATED POLICY ADOPTION
update backpack.policy_review_requests r
set pending_confirmations=(
 select coalesce(jsonb_agg(value order by ord),'[]'::jsonb)
 from jsonb_array_elements(r.pending_confirmations) with ordinality as items(value,ord)
 where not ${literal(
		JSON.stringify(policy.adopted_requirements)
 )}::jsonb @> jsonb_build_array(value)
), adopted_requirements=(
 select coalesce(jsonb_agg(value order by first_ord),'[]'::jsonb) from (
  select value,min(ord) as first_ord
  from jsonb_array_elements(r.adopted_requirements || ${literal(
		JSON.stringify(policy.adopted_requirements)
	)}::jsonb)
   with ordinality as items(value,ord) group by value
 ) adopted
)
from backpack.policies p where p.id=r.policy_id and p.catalogue_version=${literal(
		policy.catalogue_version
	)}
 and p.cutoff_at=${literal(policy.cutoff_at)}::timestamptz
 and p.scope_question_ids=${array(policy.scope_question_ids)}
 and p.excluded_question_ids=${array(policy.excluded_question_ids)};
-- END GENERATED POLICY ADOPTION`;
	const before = readFileSync(adoptionPath, 'utf8');
	assert(before.includes('-- BEGIN GENERATED POLICY ADOPTION'));
	const after = before.replace(
		/-- BEGIN GENERATED POLICY ADOPTION[\s\S]*?-- END GENERATED POLICY ADOPTION/,
		adoption
	);
	if (process.argv.includes('--check'))
		assert.equal(after, before, 'Policy adoption migration is stale');
	else writeFileSync(adoptionPath, after);
}
