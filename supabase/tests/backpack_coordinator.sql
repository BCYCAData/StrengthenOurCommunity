-- Fresh synthetic database; no production configuration or personal data.
\o /dev/null
create function pg_temp.assert(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
create function pg_temp.expect_error(expected text,action text,args jsonb default '{}') returns void language plpgsql as $$
begin
 begin perform public.backpack_admin(action,args);
 exception when others then
   if sqlstate=expected then return; end if;
   raise exception 'FAIL: expected SQLSTATE %, got %: %',expected,sqlstate,sqlerrm;
 end;
 raise exception 'FAIL: action % unexpectedly succeeded',action;
end $$;
create temporary table state(key text primary key,value jsonb);
insert into auth.users(id,email,email_confirmed_at,created_at,raw_app_meta_data,raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000090','coordinator@example.test',now(),'2026-06-01','{"tester":true}','{}'),
 ('00000000-0000-0000-0000-000000000001','one@example.test',now(),'2026-06-01','{}','{"principaladdresssiteoid":"123","is_admin":true}'),
 ('00000000-0000-0000-0000-000000000002','two@example.test',now(),'2026-06-01','{}','{"principaladdresssiteoid":"123"}'),
 ('00000000-0000-0000-0000-000000000003','old@example.test',now(),'2025-01-01','{}','{}');
insert into public.profile(id,first_name,family_name,property_address_street) select id,'First','Family','123 Test Lane' from auth.users where raw_app_meta_data->>'tester' is null;
select pg_temp.assert(not has_function_privilege('anon','public.backpack_admin(text,jsonb)','execute'),'anonymous cannot execute coordinator RPC');
select pg_temp.assert(not has_schema_privilege('authenticated','backpack','usage'),'private schema stays private');
select pg_temp.assert(not has_table_privilege('authenticated','backpack.coordinators','insert'),'cannot self-promote');
select pg_temp.assert(not has_table_privilege('authenticated','backpack.coordinator_audit','update'),'cannot rewrite audit');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select pg_temp.expect_error('42501','snapshot');
-- Editable user metadata is not an authorization source.
select pg_temp.assert((select count(*)=0 from backpack.coordinator_audit),'denied access makes no administration changes');
insert into backpack.coordinators(user_id,note) values('00000000-0000-0000-0000-000000000090','Synthetic bootstrap');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000090',false);
set role authenticated;
select public.backpack_admin('snapshot');
reset role;
select pg_temp.expect_error('22023','snapshot','{"actor_id":"00000000-0000-0000-0000-000000000090"}');
select pg_temp.expect_error('22023','enable_email');
select pg_temp.expect_error('22023','snapshot','{"limit":101}');
select pg_temp.assert((public.backpack_admin('baseline_preview')->>'configured')::boolean=false,'unconfigured preview is explicit');
select pg_temp.assert((select count(*)=0 from backpack.memberships),'read-only preview creates no candidates');
insert into state values('initial_run',public.backpack_admin('run_baseline','{"policy_id":1,"note":"Prepare historical candidates"}'));
select pg_temp.assert((select count(*)=3 from backpack.memberships),'baseline creates non-test candidates');
select pg_temp.assert((select count(distinct household_id)=2 from backpack.memberships where property_id='123'),'shared property not automatically merged');
select pg_temp.assert((select count(*)=0 from backpack.notifications),'coordinator baseline sends nothing');
select pg_temp.expect_error('55000','review_baseline',jsonb_build_object('run_id',(select value->>'id' from state where key='initial_run'),'note','Not ready'));
insert into state select 'target',to_jsonb(household_id) from backpack.memberships where user_id='00000000-0000-0000-0000-000000000001';
insert into state select 'other',to_jsonb(household_id) from backpack.memberships where user_id='00000000-0000-0000-0000-000000000003';
insert into state values('preview',public.backpack_admin('preview_household',jsonb_build_object('household_id',(select value from state where key='target'),'member_ids',jsonb_build_array('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'))));
select pg_temp.assert((select jsonb_array_length(value->'members')=2 from state where key='preview'),'matching preview includes both members');
select pg_temp.assert((select value->>'automatically_merged'='false' from state where key='preview'),'preview does not merge');
update public.profile set property_address_street='456 Changed Lane' where id='00000000-0000-0000-0000-000000000002';
insert into state values('confirm_args',jsonb_build_object('household_id',(select value from state where key='target'),'member_ids',jsonb_build_array('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'),'contact_user_id','00000000-0000-0000-0000-000000000002','property_id','123','revision',(select value->>'revision' from state where key='preview'),'note','Coordinator inspected shared property and confirmed one household'));
select pg_temp.expect_error('40001','confirm_household',(select value from state where key='confirm_args'));
update state set value=public.backpack_admin('preview_household',jsonb_build_object('household_id',(select value from state where key='target'),'member_ids',jsonb_build_array('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'))) where key='preview';
update state set value=jsonb_set(value,'{revision}',(select value->'revision' from state where key='preview')) where key='confirm_args';
select pg_temp.expect_error('22023','confirm_household',(select value || '{"contact_user_id":"00000000-0000-0000-0000-000000000003"}' from state where key='confirm_args'));
select public.backpack_admin('confirm_household',(select value from state where key='confirm_args'));
select pg_temp.assert((select count(distinct household_id)=1 from backpack.memberships where property_id='123'),'reviewed candidates merged');
select pg_temp.assert((select contact_user_id='00000000-0000-0000-0000-000000000002' from backpack.households where id=(select (value#>>'{}')::uuid from state where key='target')),'nominated contact recorded');
select pg_temp.assert((select bool_and(reviewed_by='00000000-0000-0000-0000-000000000090') from backpack.memberships where property_id='123'),'reviewer comes from JWT');
select pg_temp.assert((select count(*)=0 from backpack.notifications),'household review sends nothing');
insert into state values('other_preview',public.backpack_admin('preview_household',jsonb_build_object('household_id',(select value from state where key='other'),'member_ids',jsonb_build_array('00000000-0000-0000-0000-000000000003'))));
select public.backpack_admin('confirm_household',jsonb_build_object('household_id',(select value from state where key='other'),'member_ids',jsonb_build_array('00000000-0000-0000-0000-000000000003'),'contact_user_id','00000000-0000-0000-0000-000000000003','property_id',null,'revision',(select value->>'revision' from state where key='other_preview'),'note','Manual evidence confirmed this household despite missing property identifier'));
-- Synthetic rules only: production cutoff and exclusions remain unset.
update backpack.policies set cutoff_at='2026-05-01T00:00:00Z',scope_question_ids=array['Q1'],excluded_question_ids='{}',approved_at=now(),enabled=true,
 sender='Test <sender@example.test>',reply_to='reply@example.test',coordinator_email='coordinator@example.test',profile_url='https://example.test/profile';
select public.backpack_admin('decide_special_case','{"user_id":"00000000-0000-0000-0000-000000000003","programme":"backpack","decision":"approved","note":"Coordinator approved historical exception"}');
select pg_temp.assert((select decided_by='00000000-0000-0000-0000-000000000090' from backpack.special_cases),'special-case actor recorded');
insert into state values('run',public.backpack_admin('run_baseline','{"policy_id":1,"note":"Assess reviewed candidates under synthetic rules"}'));
update public.profile set family_name='Changed after baseline' where id='00000000-0000-0000-0000-000000000001';
select pg_temp.expect_error('40001','review_baseline',jsonb_build_object('run_id',(select value->>'id' from state where key='run'),'note','Evidence changed'));
update state set value=public.backpack_admin('run_baseline','{"policy_id":1,"note":"Rerun following answer change"}') where key='run';
select public.backpack_admin('review_baseline',jsonb_build_object('run_id',(select value->>'id' from state where key='run'),'note','Coordinator reviewed classifications and contact nominations'));
select pg_temp.assert((select baseline_completed_at is not null and not email_enabled from backpack.policies),'review marks readiness without enabling mail');
select pg_temp.assert((select count(*)=0 from backpack.notifications),'reviewed baseline queues nothing');
-- A changed decision invalidates approval and unresolved cases block reapproval.
select public.backpack_admin('decide_special_case','{"user_id":"00000000-0000-0000-0000-000000000003","programme":"backpack","decision":"pending","note":"Evidence needs another review"}');
select pg_temp.assert((select baseline_completed_at is null from backpack.policies),'decisions invalidate baseline approval');
update state set value=public.backpack_admin('run_baseline','{"policy_id":1,"note":"Pending special case"}') where key='run';
select pg_temp.expect_error('55000','review_baseline',jsonb_build_object('run_id',(select value->>'id' from state where key='run'),'note','Special case unresolved'));
select public.backpack_admin('decide_special_case','{"user_id":"00000000-0000-0000-0000-000000000003","programme":"backpack","decision":"approved","note":"Coordinator resolved the evidence"}');

select pg_temp.expect_error('55000','decide_special_case','{"user_id":"00000000-0000-0000-0000-000000000003","programme":"backpack","decision":"approved","mode":"live","note":"Not activated"}');
insert into state values('import_args',jsonb_build_object('household_id',(select value from state where key='target'),'programme','backpack','original_user_id','00000000-0000-0000-0000-000000000001','reference','legacy-backpack-001','historical',true,'awarded_at',null,'delivered_at',null,'note','Imported from historical distribution register; dates unknown'));
insert into state values('award',public.backpack_admin('record_award',(select value from state where key='import_args')));
select pg_temp.assert((select value->'award'->'awarded_at'='null'::jsonb and value->'award'->'delivered_at'='null'::jsonb from state where key='award'),'import does not invent dates');
select pg_temp.assert((public.backpack_admin('record_award',(select value from state where key='import_args'))->>'already_recorded')::boolean,'historical import is idempotent');
select pg_temp.assert((select count(*)=1 from backpack.awards),'retry did not duplicate household award');
select pg_temp.expect_error('23505','record_award',(select value || '{"reference":"different-record"}' from state where key='import_args'));
select pg_temp.expect_error('23505','record_award',(select value || jsonb_build_object('household_id',(select value from state where key='other'),'original_user_id','00000000-0000-0000-0000-000000000003') from state where key='import_args'));
select pg_temp.expect_error('22023','record_award',(select value || '{"original_user_id":"00000000-0000-0000-0000-000000000003"}' from state where key='import_args'));
insert into state values('delivery_args',jsonb_build_object('award_id',(select value->'award'->>'id' from state where key='award'),'delivered_at',clock_timestamp()-interval '1 day','note','Coordinator confirmed delivery from register'));
select public.backpack_admin('record_delivery',(select value from state where key='delivery_args'));
select public.backpack_admin('record_delivery',(select value from state where key='delivery_args'));
select pg_temp.assert((select count(*)=1 from backpack.coordinator_audit where action='record_delivery'),'delivery retry is idempotent');
select pg_temp.expect_error('23505','record_delivery',(select value || jsonb_build_object('delivered_at',clock_timestamp()-interval '2 days') from state where key='delivery_args'));
select pg_temp.assert((select awarded_at is null and delivered_at is not null from backpack.awards),'delivery does not invent an award date');
select pg_temp.assert((public.backpack_admin('record_award',(select value from state where key='import_args'))->>'already_recorded')::boolean,'import retry after delivery preserves delivery');
-- A current award requires a resolved household and actual current qualification.
insert into state values('new_award_args',jsonb_build_object('household_id',(select value from state where key='other'),'programme','backpack','original_user_id','00000000-0000-0000-0000-000000000003','reference','current-award-002','historical',false,'note','Coordinator allocated a new backpack'));
update public.profile set first_name=null where id='00000000-0000-0000-0000-000000000003';
select pg_temp.expect_error('55000','record_award',(select value from state where key='new_award_args'));
update public.profile set first_name='Complete' where id='00000000-0000-0000-0000-000000000003';
select public.backpack_admin('record_award',(select value from state where key='new_award_args'));
select pg_temp.assert((public.backpack_admin('record_award',(select value from state where key='new_award_args'))->>'already_recorded')::boolean,'current award retry reuses allocation time');
select pg_temp.assert((select count(*)=2 from backpack.awards),'one award per household');
select pg_temp.assert((select bool_and(actor_id='00000000-0000-0000-0000-000000000090') from backpack.coordinator_audit),'every operation attributes the real coordinator');
select pg_temp.assert((select count(*)=0 from backpack.notifications),'imports and decisions sent no emails');
-- History guards prevent silently moving an awarded member into another household.
update state set value=public.backpack_admin('preview_household',jsonb_build_object('household_id',(select value from state where key='other'),'member_ids',jsonb_build_array('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003'))) where key='preview';
select pg_temp.expect_error('P0001','confirm_household',jsonb_build_object('household_id',(select value from state where key='other'),'member_ids',jsonb_build_array('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003'),'contact_user_id','00000000-0000-0000-0000-000000000003','revision',(select value->>'revision' from state where key='preview'),'note','Attempted move requires explicit history reconciliation'));
-- A live worker must be paused before maintenance starts, even for contact edits.
update state set value=public.backpack_admin('run_baseline','{"policy_id":1,"note":"Final synthetic baseline"}') where key='run';
select public.backpack_admin('review_baseline',jsonb_build_object('run_id',(select value->>'id' from state where key='run'),'note','Reviewed final synthetic state'));
select public.backpack_admin('review_baseline',jsonb_build_object('run_id',(select value->>'id' from state where key='run'),'note','Replay of baseline review'));
select pg_temp.assert((select count(*)=1 from backpack.coordinator_audit where action='review_baseline' and target_id=(select value->>'id' from state where key='run')),'baseline approval is idempotent');
update backpack.policies set email_enabled=true;
-- Live mode is explicit and cannot enable itself. A genuinely new household
-- confirmed after rollout should receive its one qualification event, rather
-- than being silently treated as part of the historical baseline.
insert into auth.users(id,email,email_confirmed_at,created_at,raw_user_meta_data)
 values('00000000-0000-0000-0000-000000000004','live@example.test',now(),'2026-06-01','{"principaladdresssiteoid":"789"}');
insert into public.profile(id,first_name,family_name) values('00000000-0000-0000-0000-000000000004','New','Member');
insert into state select 'live_household',to_jsonb(household_id) from backpack.memberships where user_id='00000000-0000-0000-0000-000000000004';
insert into state values('live_preview',public.backpack_admin('preview_household',jsonb_build_object('household_id',(select value from state where key='live_household'),'member_ids',jsonb_build_array('00000000-0000-0000-0000-000000000004'))));
insert into state values('live_confirmation',jsonb_build_object('household_id',(select value from state where key='live_household'),'member_ids',jsonb_build_array('00000000-0000-0000-0000-000000000004'),'contact_user_id','00000000-0000-0000-0000-000000000004','property_id','789','revision',(select value->>'revision' from state where key='live_preview'),'mode','live','note','Explicit post-launch household review'));
select public.backpack_admin('confirm_household',(select value from state where key='live_confirmation'));
select pg_temp.assert((select count(*)=1 from backpack.notifications where household_id=(select (value#>>'{}')::uuid from state where key='live_household') and kind='complete'),'live confirmation queues exactly one household event');
select pg_temp.assert((select baseline_completed_at is not null from backpack.policies),'live review preserves initial programme readiness');
update state set value=public.backpack_admin('preview_household',jsonb_build_object('household_id',(select value from state where key='live_household'),'member_ids',jsonb_build_array('00000000-0000-0000-0000-000000000004'))) where key='live_preview';
update state set value=jsonb_set(value,'{revision}',(select value->'revision' from state where key='live_preview')) where key='live_confirmation';
select public.backpack_admin('confirm_household',(select value from state where key='live_confirmation'));
select pg_temp.assert((select count(*)=1 from backpack.notifications where household_id=(select (value#>>'{}')::uuid from state where key='live_household')),'repeated live review does not duplicate a notification');
select public.backpack_admin('decide_special_case','{"user_id":"00000000-0000-0000-0000-000000000003","programme":"backpack","decision":"approved","mode":"live","note":"Post-launch review of existing decision"}');
select pg_temp.assert((select baseline_completed_at is not null from backpack.policies),'live special-case decision does not reset readiness');
select pg_temp.expect_error('22023','record_award',(select value || '{"mode":"live"}' from state where key='import_args'));

select pg_temp.expect_error('55000','record_delivery',(select value from state where key='delivery_args'));
update backpack.policies set email_enabled=false;
insert into backpack.notifications(household_id,programme,kind,assessment_id,policy_id,status,claimed_at,claim_token)
 select household_id,'backpack','complete',id,policy_id,'processing',now(),gen_random_uuid() from backpack.assessments where user_id='00000000-0000-0000-0000-000000000001' limit 1;
select pg_temp.expect_error('55000','record_delivery',(select value from state where key='delivery_args'));
update backpack.notifications set status='needs_review',claim_token=null;
select pg_temp.assert((select count(*)=0 from backpack.notifications where accepted_at is not null),'no fabricated accepted emails');
-- UI read models remain coordinator-only, literal-searchable and side-effect free.
insert into state values('audit_before_reads',to_jsonb((select count(*) from backpack.coordinator_audit)));
select pg_temp.assert((public.backpack_admin('snapshot','{"search":"one@example.test","limit":1,"offset":0}')->>'total_members')::integer=1,'participant search is server filtered');
select pg_temp.assert(public.backpack_admin('snapshot')->'policy'->>'programme'='backpack','snapshot includes non-secret programme state');
select pg_temp.assert((public.backpack_admin('snapshot','{"search":"%"}')->>'total_members')::integer=0,'search does not treat percent as a wildcard');
select pg_temp.assert(jsonb_array_length(public.backpack_admin('household_details',jsonb_build_object('household_id',(select value from state where key='target')))->'members')=2,'household details include all members independently of pagination');
select pg_temp.assert(not exists(select 1 from jsonb_array_elements(public.backpack_admin('snapshot')->'members') j where j ? 'fire_trauma' or j ? 'raw_app_meta_data'),'matching read model omits personal answer values and raw Auth metadata');
select pg_temp.assert((public.backpack_admin('list_awards','{"search":"legacy-backpack-001"}')->>'total_awards')::integer=1,'award reference search');
select pg_temp.assert(public.backpack_admin('list_awards','{"search":"legacy-backpack-001"}')->'awards'->0->>'id'=(select value->'award'->>'id' from state where key='award'),'award lookup supplies the delivery record ID');
select pg_temp.assert(not has_function_privilege('authenticated','backpack.admin_v2(text,jsonb)','execute'),'legacy dispatcher is private');
select pg_temp.expect_error('22023','snapshot','{"filter":"arbitrary"}');
select pg_temp.expect_error('22023','household_details','{"household_id":"00000000-0000-0000-0000-000000999999"}');
select pg_temp.expect_error('22023','list_awards','{"limit":101}');
select pg_temp.assert((select count(*) from backpack.coordinator_audit)=(select (value#>>'{}')::integer from state where key='audit_before_reads'),'UI reads create no audit or mutation side effects');
-- Revocation applies immediately, even with an existing signed-in session.
update backpack.coordinators set active=false;
select pg_temp.expect_error('42501','snapshot');
select pg_temp.expect_error('42501','list_awards');
select pg_temp.expect_error('42501','household_details',jsonb_build_object('household_id',(select value from state where key='target')));
select pg_temp.assert((select count(*)=0 from backpack.processing_errors),'no hidden trigger errors');
\o
select 'Coordinator authorization, matching, import and baseline tests passed' as result;
