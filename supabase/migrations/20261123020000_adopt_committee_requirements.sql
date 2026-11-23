-- Adopt the committee requirements without approving rollout or activating emails.
-- Earlier migration seeds remain unchanged for databases that already applied them.
begin;
alter table backpack.policy_review_requests
 add column adopted_requirements jsonb not null default '[]'::jsonb
 check (jsonb_typeof(adopted_requirements)='array');

-- BEGIN GENERATED POLICY ADOPTION
update backpack.policy_review_requests r
set pending_confirmations=(
 select coalesce(jsonb_agg(value order by ord),'[]'::jsonb)
 from jsonb_array_elements(r.pending_confirmations) with ordinality as items(value,ord)
 where not '["Midnight Australia/Sydney cutoff; registrations at or after cutoff are new entrants.","Q36a is required only when access is restricted.","Q5a remains optional when truck access is Other."]'::jsonb @> jsonb_build_array(value)
), adopted_requirements=(
 select coalesce(jsonb_agg(value order by first_ord),'[]'::jsonb) from (
  select value,min(ord) as first_ord
  from jsonb_array_elements(r.adopted_requirements || '["Midnight Australia/Sydney cutoff; registrations at or after cutoff are new entrants.","Q36a is required only when access is restricted.","Q5a remains optional when truck access is Other."]'::jsonb)
   with ordinality as items(value,ord) group by value
 ) adopted
)
from backpack.policies p where p.id=r.policy_id and p.catalogue_version='2026-11-committee-v2'
 and p.cutoff_at='2025-09-30T14:00:00Z'::timestamptz
 and p.scope_question_ids=array['Q1','Q2','Q3','Q3a','Q3b','Q4','Q36','Q36a','Q5','Q5a','Q6','Q7','Q8','Q9','Q10','Q11','Q12','Q12a','Q12b','Q13','Q14','Q15','Q15a','Q16','Q17','Q18','Q19','Q20','Q21','Q22','Q23','Q24','Q25','Q26','Q34','Q35']::text[]
 and p.excluded_question_ids=array['Q1','Q3','Q3a','Q3b','Q5a','Q7','Q8','Q11','Q12','Q12a','Q12b','Q15','Q15a','Q16','Q18','Q19','Q20','Q21','Q22','Q23','Q24','Q25','Q26','Q34','Q35']::text[];
-- END GENERATED POLICY ADOPTION
commit;
