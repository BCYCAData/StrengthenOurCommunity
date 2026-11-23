#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
backpack_container="soc-backpack-tests-$$"
cleanup() { docker stop "$backpack_container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# No ports, no production volumes, no network; only synthetic Auth/profile fixtures.
docker run --rm -d --name "$backpack_container" --network none \
  -e POSTGRES_HOST_AUTH_METHOD=trust postgis/postgis:17-3.5 >/dev/null
for attempt in {1..40}; do
  if docker exec "$backpack_container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 0.5
done
node scripts/backpack-test-fixture.mjs | docker exec -i "$backpack_container" psql -X -U postgres -v ON_ERROR_STOP=1 -q
for migration in supabase/migrations/*.sql; do
  docker exec -i "$backpack_container" psql -X -U postgres -v ON_ERROR_STOP=1 -q < "$migration"
done
docker exec "$backpack_container" psql -X -U postgres -v ON_ERROR_STOP=1 -q -c "delete from backpack.policy_review_requests; delete from backpack.policies where catalogue_version='2026-11-committee-v2'; delete from backpack.catalogues where version='2026-11-committee-v2';"
docker exec -i "$backpack_container" psql -X -U postgres -v ON_ERROR_STOP=1 -q < supabase/tests/backpack.sql

# Independent database sessions: both members qualify the same household at once.
docker exec "$backpack_container" psql -X -U postgres -v ON_ERROR_STOP=1 -qAt -c \
  "begin; select public.backpack_reassess('00000000-0000-0000-0000-000000000009'); select pg_sleep(0.2); commit;" >/dev/null &
backpack_first_pid=$!
docker exec "$backpack_container" psql -X -U postgres -v ON_ERROR_STOP=1 -qAt -c \
  "select public.backpack_reassess('00000000-0000-0000-0000-000000000010');" >/dev/null &
backpack_second_pid=$!
wait "$backpack_first_pid"
wait "$backpack_second_pid"
docker exec -i "$backpack_container" psql -X -U postgres -v ON_ERROR_STOP=1 -q <<'SQL'
do $$ begin
 if (select count(*) from backpack.notifications n join backpack.memberships m on m.household_id=n.household_id where m.user_id='00000000-0000-0000-0000-000000000009' and n.kind='complete') <> 1 then
  raise exception 'Concurrent qualifications did not produce exactly one household email';
 end if;
end $$;
select 'Concurrent household qualification passed' as result;
SQL

# Fresh schema for coordinator workflows, independent of the original suite.
docker exec "$backpack_container" createdb -U postgres backpack_coordinator_test
node scripts/backpack-test-fixture.mjs --reuse-roles | docker exec -i "$backpack_container" psql -X -U postgres -d backpack_coordinator_test -v ON_ERROR_STOP=1 -q
for migration in supabase/migrations/*.sql; do
  docker exec -i "$backpack_container" psql -X -U postgres -d backpack_coordinator_test -v ON_ERROR_STOP=1 -q < "$migration"
done
docker exec "$backpack_container" psql -X -U postgres -d backpack_coordinator_test -v ON_ERROR_STOP=1 -q -c "delete from backpack.policy_review_requests; delete from backpack.policies where catalogue_version='2026-11-committee-v2'; delete from backpack.catalogues where version='2026-11-committee-v2';"
docker exec -i "$backpack_container" psql -X -U postgres -d backpack_coordinator_test -v ON_ERROR_STOP=1 -q < supabase/tests/backpack_coordinator.sql

# New rules and historical reconciliation have their own fresh database.
docker exec "$backpack_container" createdb -U postgres backpack_committee_test
node scripts/backpack-test-fixture.mjs --reuse-roles | docker exec -i "$backpack_container" psql -X -U postgres -d backpack_committee_test -v ON_ERROR_STOP=1 -q
# Filename order is essential: questionnaire migration precedes reconciliation.
for migration in supabase/migrations/*.sql; do
  docker exec -i "$backpack_container" psql -X -U postgres -d backpack_committee_test -v ON_ERROR_STOP=1 -q < "$migration"
done
docker exec -i "$backpack_container" psql -X -U postgres -d backpack_committee_test -v ON_ERROR_STOP=1 -q < supabase/tests/committee.sql
