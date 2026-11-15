import { readFileSync } from 'node:fs';
const { questions } = JSON.parse(readFileSync('config/survey-questions.json', 'utf8'));
const fields = new Map();
for (const q of questions)
	for (const r of q.fields) {
		fields.set(
			r.field,
			r.kind === 'boolean'
				? 'boolean'
				: r.kind === 'array'
				? 'integer[]'
				: ['count', 'positive_number'].includes(r.kind) ||
				  (r.kind === 'choice' && typeof r.values[0] === 'number')
				? 'smallint'
				: 'text'
		);
	}
console.log(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users(id uuid primary key,email text,created_at timestamptz not null default now(),email_confirmed_at timestamptz,last_sign_in_at timestamptz,raw_app_meta_data jsonb default '{}',raw_user_meta_data jsonb default '{}');
create table public.profile(id uuid primary key references auth.users(id),${[...fields]
	.map(([field, type]) => `"${field}" ${type}`)
	.join(',')});`);
