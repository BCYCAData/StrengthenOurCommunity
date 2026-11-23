\set ON_ERROR_STOP on
create function pg_temp.assert(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
create function pg_temp.expect_error(code text,action text,args jsonb) returns void language plpgsql as $$
begin
 begin perform public.backpack_admin(action,args); raise exception 'FAIL: expected error';
 exception when others then if sqlstate<>code then raise; end if; end;
end $$;

select pg_temp.assert((select count(*)=2 from backpack.catalogues),'original catalogue retained');
select pg_temp.assert((select approved_at is null and not enabled and not email_enabled from backpack.policies where id=2),'committee policy is unapproved and disabled');
select pg_temp.assert((select cutoff_at='2025-09-30T14:00:00Z' from backpack.policies where id=2),'Sydney midnight cutoff adopted');
select pg_temp.assert((select jsonb_array_length(adopted_requirements)=3 and jsonb_array_length(pending_confirmations)=3 from backpack.policy_review_requests where policy_id=2),'upgrade adopts three supplied requirements and preserves three rollout decisions');
select pg_temp.assert(not exists(
 select 1 from backpack.policy_review_requests r,
 jsonb_array_elements(r.adopted_requirements) a(value),jsonb_array_elements(r.pending_confirmations) p(value)
 where r.policy_id=2 and a.value=p.value),'adopted requirements are no longer confirmation gates');

create function pg_temp.answers() returns jsonb language sql as $$ select '{
 "first_name":"Synthetic", "family_name":"Committee test", "mobile":"0400000000",
 "property_address_street":"TEST road","property_address_suburb":"TEST suburb","property_address_postcode":"2429",
 "sign_posted":false,"truck_access":3,"residents0_18":0,"residents19_50":0,"residents51_70":0,"residents71_":0,
 "vulnerable_residents":false,"has_other_critical_assets":false,"static_water_available":[5],"site_hazards":[0],
 "property_access_restricted":false,"property_access_restrictions":[]
 }'::jsonb $$;
create function pg_temp.assess(answers jsonb) returns jsonb language sql as $$
 select backpack.assess_answers(answers,c.definition,p.scope_question_ids,p.excluded_question_ids)
 from backpack.policies p join backpack.catalogues c on c.version=p.catalogue_version where p.id=2;
$$;
select pg_temp.assert((pg_temp.assess(pg_temp.answers())->>'answers_complete')::boolean,'No, zero and None answer required questions');
select pg_temp.assert(pg_temp.assess(pg_temp.answers()-'has_other_critical_assets')->'missing_required' ? 'Q13','missing asset answer is not No');
select pg_temp.assert(pg_temp.assess(pg_temp.answers() || '{"property_access_restricted":true}')->'missing_required' ? 'Q36a','restricted Yes needs details');
select pg_temp.assert((pg_temp.assess(pg_temp.answers() || '{"property_access_restricted":true,"property_access_restrictions":[2]}')->>'answers_complete')::boolean,'coded gate answers conditional follow-up');
select pg_temp.assert((pg_temp.assess(pg_temp.answers() || '{"site_hazards":[5]}')->>'answers_complete')::boolean,'electric vehicle option accepted');
select pg_temp.assert(not (pg_temp.assess(pg_temp.answers() || '{"site_hazards":[0,5]}')->>'answers_complete')::boolean,'None and EV cannot be combined');
select pg_temp.assert((pg_temp.assess(pg_temp.answers() || '{"truck_access":4}')->>'answers_complete')::boolean,'truck Other detail is optional under adopted committee requirements');

insert into auth.users(id,email,created_at,email_confirmed_at,raw_app_meta_data) values
 ('00000000-0000-0000-0000-000000000001','one@committee.test','2026-01-01',now(),'{}'),
 ('00000000-0000-0000-0000-000000000002','two@committee.test','2024-01-01',now(),'{"kitdate":"2024-02-01"}'),
 ('00000000-0000-0000-0000-000000000003','three@committee.test','2026-01-01',now(),'{}'),
 ('00000000-0000-0000-0000-000000000090','coordinator@committee.test',now(),now(),'{"tester":true}');
insert into public.profile select (jsonb_populate_record(null::public.profile,pg_temp.answers() || jsonb_build_object('id',id))).* from auth.users where raw_app_meta_data->>'tester' is null;
update public.profile set other_essential_assets='Earlier asset description',community_workshop_choices=array[1],information_sheet_choices=array[2],community_meeting_choices=array[3] where id='00000000-0000-0000-0000-000000000001';
select pg_temp.assert((select other_essential_assets='Earlier asset description' and has_other_critical_assets=false from public.profile where id='00000000-0000-0000-0000-000000000001'),'new boolean preserves legacy text');
update backpack.policies set approved_at=now(),enabled=true,sender='TEST <sender@committee.test>',reply_to='reply@committee.test',coordinator_email='coordinator@committee.test',profile_url='https://committee.test/profile' where id=2;
select pg_temp.assert(not (backpack.baseline_readiness(2)->>'configured')::boolean,'pending decisions remain a gate even if approval is set');
update backpack.policy_review_requests set pending_confirmations='[]' where policy_id=2;
select pg_temp.assert((backpack.baseline_readiness(2)->>'configured')::boolean,'clearing actual rollout decisions needs no further cutoff or conditional approval');
update auth.users set created_at='2025-09-30T13:59:59.999999Z' where id='00000000-0000-0000-0000-000000000001';
select pg_temp.assert(backpack.assess_user('00000000-0000-0000-0000-000000000001','baseline')->>'outcome'='special_case','registration before cutoff without kit needs special review');
update auth.users set created_at='2025-09-30T14:00:00Z' where id='00000000-0000-0000-0000-000000000001';
select pg_temp.assert(backpack.assess_user('00000000-0000-0000-0000-000000000001','baseline')->>'outcome'='qualified','registration exactly at cutoff is a new entrant');
update auth.users set created_at='2025-09-30T14:00:00.000001Z' where id='00000000-0000-0000-0000-000000000001';
select pg_temp.assert(backpack.assess_user('00000000-0000-0000-0000-000000000001','baseline')->>'outcome'='qualified','registration after cutoff is a new entrant');
update auth.users set created_at='2026-01-01' where id='00000000-0000-0000-0000-000000000001';
select public.backpack_baseline();
select pg_temp.assert(backpack.has_historical_kit('00000000-0000-0000-0000-000000000002'),'legacy kitdate alias recognised');
select pg_temp.assert((select count(*)=0 from backpack.notifications),'baseline creates no emails');
insert into backpack.coordinators(user_id,note) values('00000000-0000-0000-0000-000000000090','Synthetic review');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000090',false);
do $$ declare m record; preview jsonb; begin
 for m in select user_id,household_id from backpack.memberships loop
  preview:=public.backpack_admin('preview_household',jsonb_build_object('household_id',m.household_id,'member_ids',jsonb_build_array(m.user_id)));
  perform public.backpack_admin('confirm_household',jsonb_build_object('household_id',m.household_id,'member_ids',jsonb_build_array(m.user_id),'contact_user_id',m.user_id,'revision',preview->>'revision','note','Synthetic single-member household review'));
 end loop;
end $$;
select public.backpack_admin('record_kit','{"user_id":"00000000-0000-0000-0000-000000000003","reference":"source-row-kit","awarded_on":null,"note":"Verified starter kit; date remains unknown"}');
select pg_temp.assert((public.backpack_admin('record_kit','{"user_id":"00000000-0000-0000-0000-000000000003","reference":"source-row-kit","awarded_on":null,"note":"Same facts replay"}')->>'already_recorded')::boolean,'kit imports replay safely');
select pg_temp.expect_error('23505','record_committee_backpack','{"user_id":"00000000-0000-0000-0000-000000000003","reference":"source-row-kit","awarded_on":null,"note":"Cannot relabel kit as backpack silently"}');
select public.backpack_admin('record_committee_backpack','{"user_id":"00000000-0000-0000-0000-000000000003","reference":"source-row-backpack","awarded_on":"2025-10-17","note":"Verified backpack; date only, no exact time known"}');
select pg_temp.assert((select source_awarded_on='2025-10-17' and awarded_at is null and delivered_at is null from backpack.awards),'source date retained without invented time or delivery');
select pg_temp.assert((public.backpack_admin('record_committee_backpack','{"user_id":"00000000-0000-0000-0000-000000000003","reference":"source-row-backpack","awarded_on":"2025-10-17","note":"Replay same facts"}')->>'already_recorded')::boolean,'backpack source replay safe');
select pg_temp.expect_error('23505','record_committee_backpack','{"user_id":"00000000-0000-0000-0000-000000000003","reference":"source-row-backpack","awarded_on":"2025-10-18","note":"Different day conflicts"}');
update auth.users set last_sign_in_at=now() where id='00000000-0000-0000-0000-000000000002';
do $$ declare run jsonb; begin
 run:=public.backpack_admin('run_baseline','{"policy_id":2,"note":"Committee synthetic baseline"}');
 perform public.backpack_admin('review_baseline',jsonb_build_object('run_id',run->>'id','note','Reviewed synthetic evidence'));
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
set role authenticated;
select pg_temp.assert(public.backpack_my_status()->>'state'='qualified','own qualification status available');
select pg_temp.assert(not (public.backpack_my_status()::text like '%two@committee.test%'),'status exposes no other account answers or email');
select pg_temp.assert(public.backpack_dismiss_notice(),'notice can be dismissed');
reset role;
select pg_temp.assert((select count(*)=0 from backpack.notifications),'notice dismissal does not invent email history');
select pg_temp.expect_error('42501','list_notifications','{}');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000090',false);
insert into backpack.notifications(household_id,programme,kind,assessment_id,policy_id)
 select household_id,'backpack','complete',assessment_id,2 from backpack.household_status where household_id=(select household_id from backpack.memberships where user_id='00000000-0000-0000-0000-000000000001');
select public.backpack_admin('set_account_exclusion','{"user_id":"00000000-0000-0000-0000-000000000001","reference":"reviewed-deletion-request","excluded":true,"note":"Exclude pending separate account-removal review; preserve account"}');
select pg_temp.assert((select count(*)=4 from auth.users),'exclusion never deletes accounts');
select pg_temp.assert((backpack.baseline_readiness(2)->>'assessable_accounts')::integer=2,'excluded accounts removed from readiness counts');
do $$ declare run jsonb; begin
 run:=public.backpack_admin('run_baseline','{"policy_id":2,"note":"Reassess after exclusion"}');
 perform public.backpack_admin('review_baseline',jsonb_build_object('run_id',run->>'id','note','Reviewed remaining participants'));
end $$;
update backpack.policies set email_enabled=true where id=2;
select pg_temp.assert(public.backpack_claim_email() is null,'excluded contact cannot be dispatched');
select pg_temp.assert((select bool_and(status='suppressed' and accepted_at is null) from backpack.notifications),'excluded notification suppressed without fake acceptance');
-- Exclusion must preserve an uncertain provider outcome for manual reconciliation.
update backpack.notifications set status='processing',claim_token='00000000-0000-0000-0000-000000000099',claimed_at=clock_timestamp(),uncertain_since=clock_timestamp();
select backpack.prepare_notification(id,'00000000-0000-0000-0000-000000000099') from backpack.notifications;
select pg_temp.assert((select bool_and(status='needs_review' and accepted_at is null and uncertain_since is not null) from backpack.notifications),'excluded uncertain delivery remains a manual-review case');
select pg_temp.assert((select count(*)=0 from backpack.processing_errors),'all committee triggers succeeded');
select pg_temp.assert(not (public.backpack_admin('list_notifications','{}')::text like '%payload%'),'email read model omits payload');
select pg_temp.assert(not has_function_privilege('anon','public.backpack_my_status()','execute'),'anonymous cannot read participant status');
select pg_temp.assert(not has_function_privilege('authenticated','backpack.reserve_committee_reference(text,text,uuid,date,uuid)','execute'),'source registry private');
select 'Committee rules, reconciliation and participant status tests passed' as result;
