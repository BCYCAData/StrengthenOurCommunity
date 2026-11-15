-- All data is synthetic. This script never runs against the hosted project.
\o /dev/null
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
select pg_temp.assert(not exists(select 1 from backpack.policies where enabled or email_enabled),'disabled by default');
select pg_temp.assert(not has_schema_privilege('authenticated','backpack','USAGE'),'participants cannot read private schema');
select pg_temp.assert(not has_function_privilege('anon','public.backpack_baseline()','EXECUTE'),'baseline is not public');
select pg_temp.assert(not has_function_privilege('authenticated','public.backpack_reassess(uuid)','EXECUTE'),'participants cannot forge assessments');
select pg_temp.assert(has_function_privilege('service_role','public.backpack_claim_email()','EXECUTE'),'worker RPC available to service role');

create function pg_temp.answers() returns jsonb language plpgsql as $$
declare p jsonb:='{}'; q jsonb; r jsonb; v jsonb; begin
 for q in select value from jsonb_array_elements((select definition from backpack.catalogues)->'questions') loop
  for r in select value from jsonb_array_elements(q->'fields') loop
   v:=case r->>'kind' when 'boolean' then 'false'::jsonb when 'count' then '0'::jsonb
     when 'positive_number' then '25'::jsonb when 'choice' then r->'values'->0
     when 'array' then jsonb_build_array(r->'values'->0) else '"answered"'::jsonb end;
   p:=p || jsonb_build_object(r->>'field',v);
  end loop;
 end loop;
 return p;
end $$;
create function pg_temp.result(p jsonb, excluded text[] default '{}') returns jsonb language sql as $$
 select backpack.assess_answers(p,definition,array(select q->>'id' from jsonb_array_elements(definition->'questions') q),excluded) from backpack.catalogues;
$$;
select pg_temp.assert((pg_temp.result(pg_temp.answers())->>'answers_complete')::boolean,'complete profile, zero pets and No count');
select pg_temp.assert(not (pg_temp.result(pg_temp.answers() || '{"first_name":"  "}')->>'answers_complete')::boolean,'whitespace is missing');
select pg_temp.assert(not (pg_temp.result(pg_temp.answers() || '{"number_dogs":null}')->>'answers_complete')::boolean,'blank counts are not zero');
select pg_temp.assert((pg_temp.result(pg_temp.answers() || '{"live_stock_safe_area":null,"share_livestock_safe_area":null}')->>'answers_complete')::boolean,'no livestock requires no followups');
select pg_temp.assert(not (pg_temp.result(pg_temp.answers() || '{"property_rented":true,"agent_name":"","agent_phone":"","agent_mobile":""}')->>'answers_complete')::boolean,'renter missing both followups');
select pg_temp.assert(pg_temp.result(pg_temp.answers() || '{"property_rented":true,"agent_name":"","agent_phone":"","agent_mobile":""}')->'missing_required' @> '["Q3a","Q3b"]','agent checks independent');
select pg_temp.assert((pg_temp.result(pg_temp.answers() || '{"property_rented":true,"agent_name":"","agent_phone":"","agent_mobile":""}',array['Q3'])->>'answers_complete')::boolean,'parent exclusion covers children');
select pg_temp.assert(not (pg_temp.result(pg_temp.answers() || '{"site_hazards":[]}')->>'answers_complete')::boolean,'empty checkboxes missing');
select pg_temp.assert((pg_temp.result(pg_temp.answers() || '{"site_hazards":[0]}')->>'answers_complete')::boolean,'explicit None accepted');
select pg_temp.assert(not (pg_temp.result(pg_temp.answers() || '{"site_hazards":[0,1]}')->>'answers_complete')::boolean,'None cannot mix with options');
select pg_temp.assert(not (pg_temp.result(pg_temp.answers() || '{"site_hazards":[99]}')->>'answers_complete')::boolean,'invalid checkbox value rejected');

insert into auth.users(id,email,created_at,email_confirmed_at,last_sign_in_at,raw_app_meta_data,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000001','new@example.test','2026-06-01',now(),null,'{}','{"principaladdresssiteoid":"123"}'),
 ('00000000-0000-0000-0000-000000000002','kit@example.test','2025-01-01',now(),'2026-01-01','{"kit_date":"2025-02-01"}','{"principaladdresssiteoid":"123"}'),
 ('00000000-0000-0000-0000-000000000003','special@example.test','2025-01-01',now(),null,'{}','{}'),
 ('00000000-0000-0000-0000-000000000004','member@example.test','2026-06-01',now(),null,'{}','{}'),
 ('00000000-0000-0000-0000-000000000005','baseline@example.test','2026-06-01',now(),null,'{}','{}'),
 ('00000000-0000-0000-0000-000000000006','test@example.test','2026-06-01',now(),null,'{"tester":true}','{}');
insert into public.profile select (jsonb_populate_record(null::public.profile,pg_temp.answers() || jsonb_build_object('id',id))).* from auth.users;
select public.backpack_baseline();
select pg_temp.assert((select count(*)=5 from backpack.memberships),'test accounts excluded');
select pg_temp.assert((select count(distinct household_id)=2 from backpack.memberships where property_id='123'),'same property does not merge households');
select pg_temp.assert((select count(*)=0 from backpack.notifications),'unconfigured baseline creates no emails');
select pg_temp.assert((select bool_and(result->>'outcome'='unconfigured') from backpack.assessments),'missing policy is explicit');
select public.backpack_baseline();
select pg_temp.assert((select count(*)=5 from backpack.assessments),'baseline is rerunnable');

update backpack.policies set cutoff_at='2026-05-01',scope_question_ids=(select array_agg(q->>'id') from backpack.catalogues,lateral jsonb_array_elements(definition->'questions') q),
 excluded_question_ids='{}',approved_at=now(),enabled=true,
 sender='Community <sender@example.test>',reply_to='reply@example.test',coordinator_email='coordinator@example.test',profile_url='https://example.test/profile';
update backpack.households set status='confirmed',reviewed_by='00000000-0000-0000-0000-000000000099',reviewed_at=now();
update backpack.memberships set status='confirmed',reviewed_by='00000000-0000-0000-0000-000000000099',reviewed_at=now();
update backpack.households h set contact_user_id=m.user_id from backpack.memberships m where m.household_id=h.id;
-- One complete member cannot donate answers or review evidence to another.
update public.profile set first_name=null where id in ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004');
select public.backpack_baseline();
select pg_temp.assert((select result->>'outcome'='review_required' from backpack.assessments where user_id='00000000-0000-0000-0000-000000000002' order by assessed_at desc limit 1),'kit needs post-cutoff review');
select pg_temp.assert((select result->>'outcome'='special_case' from backpack.assessments where user_id='00000000-0000-0000-0000-000000000003' order by assessed_at desc limit 1),'pre-cutoff without kit held');
update backpack.policies set baseline_completed_at=now(),email_enabled=true;
select pg_temp.assert((select count(*)=0 from backpack.notifications),'baseline never queues mail');
-- Auth updates unrelated to actual sign-in do not count as reviews.
update auth.users set email=email where id='00000000-0000-0000-0000-000000000002';
select pg_temp.assert((select count(*)=1 from backpack.reviews where user_id='00000000-0000-0000-0000-000000000002'),'unrelated auth update not a review');
update auth.users set last_sign_in_at=now() where id='00000000-0000-0000-0000-000000000002';
select pg_temp.assert((select count(*)=1 from backpack.notifications where kind='complete'),'post-cutoff kit sign-in queues one email');
update auth.users set last_sign_in_at=clock_timestamp() where id='00000000-0000-0000-0000-000000000005';
select pg_temp.assert((select count(*)=1 from backpack.notifications where kind='complete'),'baseline-qualified member is not re-emailed');
update public.profile set family_name=family_name where id='00000000-0000-0000-0000-000000000001';
select pg_temp.assert((select count(*)=0 from backpack.notifications where kind='incomplete'),'background profile writes do not send incomplete reminders');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.backpack_record_submission();
select pg_temp.assert((select count(*)=1 from backpack.notifications where kind='incomplete'),'partial save queues incomplete');
update public.profile set first_name='Complete' where id='00000000-0000-0000-0000-000000000001';
select pg_temp.assert((select count(*)=2 from backpack.notifications where kind='complete'),'later completion queues congratulations');
select pg_temp.assert((select count(*)=0 from backpack.processing_errors),'no hidden trigger failures');

-- Claiming suppresses stale reminders and creates a frozen recipient/BCC payload.
create temporary table claimed as select public.backpack_claim_email() as job;
select pg_temp.assert((select job->'payload'->'bcc'='["coordinator@example.test"]' from claimed),'coordinator BCC');
select pg_temp.assert((select job->'payload'->'to'='["kit@example.test"]' from claimed),'contact address');
select pg_temp.assert(public.backpack_finish_email((select (job->>'id')::uuid from claimed),(select (job->>'claim_token')::uuid from claimed),'accepted','provider-test'),'acknowledge provider acceptance');
select pg_temp.assert(not public.backpack_finish_email((select (job->>'id')::uuid from claimed),(select (job->>'claim_token')::uuid from claimed),'accepted','provider-test'),'lease cannot finish twice');
select public.backpack_claim_email();
select pg_temp.assert((select count(*)=1 from backpack.notifications where kind='incomplete' and status='suppressed'),'obsolete incomplete email suppressed');
select pg_temp.assert((select count(*)=1 from backpack.notifications where status='accepted' and accepted_at is not null),'accepted only after provider ack');
select pg_temp.assert((select count(*)=0 from backpack.notifications where status<>'accepted' and accepted_at is not null),'no fake sent timestamps');

-- An award is a coordinator action, never a side-effect of qualification.
select pg_temp.assert((select count(*)=0 from backpack.awards),'qualification does not create awards');
insert into backpack.awards(programme,household_id,awarded_at,recorded_by,provenance)
 select 'backpack',household_id,now(),'00000000-0000-0000-0000-000000000099','synthetic test' from backpack.memberships where user_id='00000000-0000-0000-0000-000000000001';
do $$ begin
 begin
  insert into backpack.awards(programme,household_id,recorded_by,provenance)
   select programme,household_id,recorded_by,provenance from backpack.awards limit 1;
  raise exception 'FAIL: duplicate household award allowed';
 exception when unique_violation then null; end;
end $$;
-- Frozen policy prevents results from silently changing under a version number.
do $$ begin
 begin
  update backpack.policies set excluded_question_ids=array['Q1'];
  raise exception 'FAIL: assessed policy changed in place';
 exception when raise_exception then
  if sqlerrm like 'FAIL:%' then raise; end if;
 end;
end $$;
-- A household needs one complete member: partial profiles must not be combined.
insert into auth.users(id,email,created_at,email_confirmed_at) values
 ('00000000-0000-0000-0000-000000000007','shared1@example.test','2026-06-01',now()),
 ('00000000-0000-0000-0000-000000000008','shared2@example.test','2026-06-01',now());
insert into public.profile select (jsonb_populate_record(null::public.profile,pg_temp.answers() || jsonb_build_object('id',id,'first_name',case when id::text like '%7' then null else 'Present' end,'family_name',case when id::text like '%8' then null else 'Present' end))).*
 from auth.users where id in ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000008');
update backpack.memberships set household_id=(select household_id from backpack.memberships where user_id='00000000-0000-0000-0000-000000000007') where user_id='00000000-0000-0000-0000-000000000008';
update backpack.memberships set status='confirmed',reviewed_by='00000000-0000-0000-0000-000000000099',reviewed_at=now() where user_id in ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000008');
update backpack.households set status='confirmed',reviewed_by='00000000-0000-0000-0000-000000000099',reviewed_at=now(),contact_user_id='00000000-0000-0000-0000-000000000007' where id=(select household_id from backpack.memberships where user_id='00000000-0000-0000-0000-000000000007');
select public.backpack_reassess('00000000-0000-0000-0000-000000000007');
select public.backpack_reassess('00000000-0000-0000-0000-000000000008');
select pg_temp.assert(not (select s.qualified from backpack.household_status s join backpack.memberships m on m.household_id=s.household_id where m.user_id='00000000-0000-0000-0000-000000000007'),'partial answers are not combined');
update public.profile set first_name='Complete' where id='00000000-0000-0000-0000-000000000007';
update public.profile set family_name='Also complete' where id='00000000-0000-0000-0000-000000000008';
select pg_temp.assert((select count(*)=1 from backpack.notifications n join backpack.memberships m on m.household_id=n.household_id where m.user_id='00000000-0000-0000-0000-000000000007' and n.kind='complete'),'two complete members create one household notification');
update public.profile set first_name=null where id='00000000-0000-0000-0000-000000000007';
select pg_temp.assert((select a.user_id='00000000-0000-0000-0000-000000000008' from backpack.household_status s join backpack.assessments a on a.id=s.assessment_id join backpack.memberships m on m.household_id=s.household_id where m.user_id='00000000-0000-0000-0000-000000000007'),'qualifying evidence points to the complete member');
-- A different member's sign-in cannot qualify the historical kit recipient.
update auth.users set created_at='2025-01-01',raw_app_meta_data='{"kit_date":"2025-02-01"}',last_sign_in_at=null where id='00000000-0000-0000-0000-000000000008';
delete from backpack.reviews where user_id='00000000-0000-0000-0000-000000000008';
update auth.users set last_sign_in_at=clock_timestamp() where id='00000000-0000-0000-0000-000000000007';
select public.backpack_reassess('00000000-0000-0000-0000-000000000008');
select pg_temp.assert(not (select s.qualified from backpack.household_status s join backpack.memberships m on m.household_id=s.household_id where m.user_id='00000000-0000-0000-0000-000000000007'),'review evidence cannot be donated between members');
-- Recipient or payload changes after an uncertain attempt need reconciliation.
update backpack.notifications set status='suppressed' where status='pending';
update auth.users set last_sign_in_at=clock_timestamp() where id='00000000-0000-0000-0000-000000000008';
update backpack.notifications set status='pending' where household_id=(select household_id from backpack.memberships where user_id='00000000-0000-0000-0000-000000000007') and kind='complete';
truncate claimed;
insert into claimed select public.backpack_claim_email();
select pg_temp.assert((select job is not null from claimed),'household job claim');
select pg_temp.assert(public.backpack_finish_email((select (job->>'id')::uuid from claimed),(select (job->>'claim_token')::uuid from claimed),'retry_uncertain',null,'timeout',60),'uncertain outcome retained');
update backpack.notifications set available_at=now()-interval '1 minute',first_attempt_at=now()-interval '25 hours' where id=(select (job->>'id')::uuid from claimed);
select public.backpack_claim_email();
select pg_temp.assert((select status='needs_review' from backpack.notifications where id=(select (job->>'id')::uuid from claimed)),'expired idempotency uncertainty is not resent');
-- Address edits invalidate confirmed household membership for the edited member.
update public.profile set property_address_street='Changed address' where id='00000000-0000-0000-0000-000000000008';
select pg_temp.assert((select status='pending' from backpack.memberships where user_id='00000000-0000-0000-0000-000000000008'),'address change requires review');
select pg_temp.assert((select count(*)=0 from backpack.processing_errors),'all triggers still succeed');
select pg_temp.assert((select count(*)=7 from public.backpack_report()),'coordinator report includes member assessment rows');
-- Award and notification history must survive a membership correction.
do $$ begin
 begin
  update backpack.memberships set household_id=(select household_id from backpack.memberships where user_id='00000000-0000-0000-0000-000000000003') where user_id='00000000-0000-0000-0000-000000000007';
  raise exception 'FAIL: member with notification history silently moved';
 exception when raise_exception then
  if sqlerrm like 'FAIL:%' then raise; end if;
 end;
end $$;

-- Special-case decisions waive historical-path uncertainty, not answer requirements.
insert into backpack.special_cases(user_id,programme,decision,decided_by,decided_at,reason)
 values('00000000-0000-0000-0000-000000000003','backpack','approved','00000000-0000-0000-0000-000000000099',now(),'Synthetic coordinator review');
select pg_temp.assert(public.backpack_reassess('00000000-0000-0000-0000-000000000003')->>'outcome'='qualified','approved special case can qualify');
update auth.users set created_at='2026-05-01' where id='00000000-0000-0000-0000-000000000004';
update public.profile set first_name='Boundary' where id='00000000-0000-0000-0000-000000000004';
select pg_temp.assert(public.backpack_reassess('00000000-0000-0000-0000-000000000004')->>'outcome'='qualified','draft cutoff boundary is inclusive for new entrants');
select pg_temp.assert((select count(*)=0 from backpack.processing_errors),'no internal failures after special cases');
-- Leave a fresh resolved household for the independent-session concurrency check.
insert into auth.users(id,email,created_at,email_confirmed_at) values
 ('00000000-0000-0000-0000-000000000009','concurrent1@example.test','2026-06-01',now()),
 ('00000000-0000-0000-0000-000000000010','concurrent2@example.test','2026-06-01',now());
insert into public.profile select (jsonb_populate_record(null::public.profile,pg_temp.answers() || jsonb_build_object('id',id))).* from auth.users where id in ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000010');
update backpack.memberships set household_id=(select household_id from backpack.memberships where user_id='00000000-0000-0000-0000-000000000009') where user_id='00000000-0000-0000-0000-000000000010';
update backpack.memberships set status='confirmed',reviewed_by='00000000-0000-0000-0000-000000000099',reviewed_at=now() where user_id in ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000010');
update backpack.households set status='confirmed',reviewed_by='00000000-0000-0000-0000-000000000099',reviewed_at=now(),contact_user_id='00000000-0000-0000-0000-000000000009' where id=(select household_id from backpack.memberships where user_id='00000000-0000-0000-0000-000000000009');

\o
select 'Backpack database tests passed' as result;
