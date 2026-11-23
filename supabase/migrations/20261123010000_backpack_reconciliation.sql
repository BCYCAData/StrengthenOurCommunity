-- Historical reconciliation and participant/email read models. No sending is activated.
begin;
alter table backpack.awards add column source_awarded_on date;
create table backpack.kit_evidence (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id),
 awarded_on date, external_reference text not null unique, note text not null,
 recorded_by uuid not null, recorded_at timestamptz not null default now()
);
create table backpack.account_exclusions (
 user_id uuid primary key references auth.users(id), excluded boolean not null,
 external_reference text not null, note text not null, recorded_by uuid not null,
 recorded_at timestamptz not null default now()
);
create table backpack.committee_decisions (
 external_reference text primary key, action text not null, user_id uuid not null references auth.users(id),
 awarded_on date, recorded_by uuid not null, recorded_at timestamptz not null default now()
);
alter table backpack.committee_decisions enable row level security;
create function backpack.reserve_committee_reference(ref text,kind text,u uuid,stamp date,actor uuid) returns void
language plpgsql set search_path='' as $$
declare existing backpack.committee_decisions;
begin
 insert into backpack.committee_decisions(external_reference,action,user_id,awarded_on,recorded_by)
 values(ref,kind,u,stamp,actor) on conflict do nothing;
 select * into existing from backpack.committee_decisions where external_reference=ref for update;
 if existing.action<>kind or existing.user_id<>u or existing.awarded_on is distinct from stamp then
  raise exception 'Source row already has a different reviewed decision' using errcode='23505';
 end if;
end $$;
create table backpack.participant_notices (
 user_id uuid not null references auth.users(id) on delete cascade, policy_id bigint not null references backpack.policies(id),
 dismissed_at timestamptz not null default now(), primary key(user_id,policy_id)
);
alter table backpack.kit_evidence enable row level security;
alter table backpack.account_exclusions enable row level security;
alter table backpack.participant_notices enable row level security;

create function backpack.account_allowed(u uuid) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from auth.users a where a.id=u and a.email_confirmed_at is not null
 and a.raw_app_meta_data->>'tester' is null)
 and not exists(select 1 from backpack.account_exclusions e where e.user_id=u and e.excluded);
$$;
create function backpack.has_historical_kit(u uuid) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from backpack.kit_evidence e where e.user_id=u)
 or exists(select 1 from auth.users a where a.id=u and coalesce(nullif(btrim(a.raw_app_meta_data->>'kit_date'),''),nullif(btrim(a.raw_app_meta_data->>'kitdate'),'')) is not null);
$$;
create or replace function backpack.assess_user(p_user uuid,p_cause text,p_notify_incomplete boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pol backpack.policies; cat jsonb; usr auth.users; prof jsonb; h uuid;
  answer_result jsonb; outcome text; reviewed timestamptz; assessment uuid; qualifying_assessment uuid; v_fingerprint text;
  prior backpack.household_status; household_qualified boolean; baseline boolean := p_cause='baseline';
  kit boolean; configured boolean;
begin
  if p_cause not in ('baseline','sign_in','profile_save','coordinator') then raise exception 'Invalid cause'; end if;
  select * into pol from backpack.policies order by enabled desc,version desc limit 1;
  select * into usr from auth.users where id=p_user;
  if usr.id is null then raise exception 'Unknown user'; end if;
  if not backpack.account_allowed(p_user) then
    return jsonb_build_object('outcome','excluded');
  end if;
  h := backpack.ensure_candidate(p_user);
  -- Serialize assessment and enqueueing across every member of this household.
  perform 1 from backpack.households where id=h for update;
  select to_jsonb(p) into prof from public.profile p where p.id=p_user;
  select definition into cat from backpack.catalogues where version=pol.catalogue_version;
  answer_result := backpack.assess_answers(coalesce(prof,'{}'),cat,pol.scope_question_ids,coalesce(pol.excluded_question_ids,'{}'));
  configured := pol.approved_at is not null and pol.cutoff_at is not null and pol.scope_question_ids is not null
    and cardinality(pol.scope_question_ids)>0 and pol.excluded_question_ids is not null
    and not exists(select 1 from backpack.policy_review_requests where policy_id=pol.id and jsonb_array_length(pending_confirmations)>0);
  select max(signed_in_at) into reviewed from backpack.reviews where user_id=p_user;
  kit := backpack.has_historical_kit(p_user);
  outcome := 'unconfigured';
  if configured then
    if usr.created_at < pol.cutoff_at and not kit and not exists(
      select 1 from backpack.special_cases where user_id=p_user and programme=pol.programme and decision='approved') then
      outcome := 'special_case';
    elsif not (answer_result->>'answers_complete')::boolean then outcome := 'incomplete';
    elsif usr.created_at < pol.cutoff_at and kit and (reviewed is null or reviewed < pol.cutoff_at) then outcome := 'review_required';
    else outcome := 'qualified'; end if;
  end if;
  if not configured then answer_result := answer_result || jsonb_build_object('answers_complete',null,'missing_required',null); end if;
  answer_result := answer_result || jsonb_build_object('outcome',outcome,'catalogue_version',pol.catalogue_version,
    'reviewed_at',reviewed,'has_historical_kit',kit,'rule_version',pol.version);
  v_fingerprint := md5(coalesce(prof,'{}')::text || answer_result::text || h::text);
  insert into backpack.assessments(user_id,household_id,policy_id,cause,fingerprint,result,notification_suppression)
    values(p_user,h,pol.id,p_cause,v_fingerprint,answer_result,case when baseline then 'initial_baseline' when not pol.email_enabled then 'email_disabled' end)
    on conflict(user_id,policy_id,cause,fingerprint) do update set assessed_at=case when baseline then backpack.assessments.assessed_at else clock_timestamp() end
    returning id into assessment;
  insert into backpack.household_status(household_id,programme) values(h,pol.programme) on conflict do nothing;
  select * into prior from backpack.household_status where household_id=h and programme=pol.programme for update;
  select latest.id into qualifying_assessment
    from backpack.memberships m join backpack.households hh on hh.id=m.household_id
    cross join lateral (select a.id,a.result from backpack.assessments a where a.user_id=m.user_id and a.policy_id=pol.id
      order by a.assessed_at desc,a.id desc limit 1) latest
    where backpack.account_allowed(m.user_id) and m.household_id=h and m.status='confirmed' and hh.status='confirmed' and latest.result->>'outcome'='qualified'
    order by latest.id limit 1;
  household_qualified := qualifying_assessment is not null;
  update backpack.household_status set qualified=household_qualified,
    ever_qualified=ever_qualified or household_qualified,assessment_id=coalesce(qualifying_assessment,assessment),policy_id=pol.id,updated_at=now()
    where household_id=h and programme=pol.programme;
  -- Reconfiguration must be deliberately baselined before live notifications.
  if not baseline and pol.enabled and pol.email_enabled and pol.baseline_completed_at is not null
    and (prior.policy_id=pol.id or prior.policy_id is null)
    and not exists(select 1 from backpack.awards where household_id=h and programme=pol.programme)
    and exists(select 1 from backpack.households hh join backpack.memberships m on m.household_id=hh.id
      where hh.id=h and hh.status='confirmed' and m.user_id=p_user and m.status='confirmed') then
    if household_qualified and not prior.ever_qualified then
      insert into backpack.notifications(household_id,programme,kind,assessment_id,policy_id)
        values(h,pol.programme,'complete',qualifying_assessment,pol.id) on conflict do nothing;
    elsif not household_qualified and not prior.ever_qualified and p_cause='profile_save' and p_notify_incomplete and outcome='incomplete' then
      insert into backpack.notifications(household_id,programme,kind,assessment_id,policy_id)
        values(h,pol.programme,'incomplete',assessment,pol.id) on conflict do nothing;
    end if;
  end if;
  return answer_result || jsonb_build_object('assessment_id',assessment,'household_qualified',household_qualified);
end $$;
create or replace function backpack.household_qualifies(h uuid, pol backpack.policies) returns boolean
language plpgsql stable set search_path='' as $$
declare u record; cat jsonb; reviewed timestamptz; a jsonb; begin
  if pol.approved_at is null or pol.cutoff_at is null or pol.scope_question_ids is null or pol.excluded_question_ids is null
 or exists(select 1 from backpack.policy_review_requests where policy_id=pol.id and jsonb_array_length(pending_confirmations)>0) then return false; end if;
  select definition into cat from backpack.catalogues where version=pol.catalogue_version;
  for u in select au.*,to_jsonb(p) as profile from backpack.memberships m
    join backpack.households hh on hh.id=m.household_id join auth.users au on au.id=m.user_id
    join public.profile p on p.id=au.id
    where hh.id=h and hh.status='confirmed' and m.status='confirmed'
      and backpack.account_allowed(au.id) loop
    a:=backpack.assess_answers(u.profile,cat,pol.scope_question_ids,pol.excluded_question_ids);
    if not (a->>'answers_complete')::boolean then continue; end if;
    if u.created_at >= pol.cutoff_at then return true; end if;
    if backpack.has_historical_kit(u.id) then
      select max(signed_in_at) into reviewed from backpack.reviews where user_id=u.id;
      if reviewed >= pol.cutoff_at then return true; end if;
    elsif exists(select 1 from backpack.special_cases where user_id=u.id and programme=pol.programme and decision='approved') then
      return true;
    end if;
  end loop;
  return false;
end $$;
create or replace function public.backpack_baseline() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u record; n integer:=0; begin
  insert into backpack.reviews(user_id,signed_in_at,source)
    select id,last_sign_in_at,'historical_last_sign_in' from auth.users
    where last_sign_in_at is not null and backpack.account_allowed(id)
    on conflict do nothing;
  for u in select id from auth.users where backpack.account_allowed(id) loop
    perform backpack.assess_user(u.id,'baseline'); n:=n+1;
  end loop;
  return jsonb_build_object('assessed_users',n,'emails_queued',0);
end $$;
create or replace function backpack.baseline_readiness(p_policy bigint) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object(
  'policy_id',p.id,'rule_version',p.version,
  'configured',p.cutoff_at is not null and p.approved_at is not null and p.scope_question_ids is not null
    and cardinality(p.scope_question_ids)>0 and p.excluded_question_ids is not null
    and not exists(select 1 from backpack.policy_review_requests where policy_id=p.id and jsonb_array_length(pending_confirmations)>0),
  'assessable_accounts',(select count(*) from auth.users u where backpack.account_allowed(u.id)),
  'unassessed_accounts',(select count(*) from auth.users u where backpack.account_allowed(u.id)
    and not exists(select 1 from backpack.assessments a where a.user_id=u.id and a.policy_id=p.id)),
  'unresolved_memberships',(select count(*) from auth.users u left join backpack.memberships m on m.user_id=u.id
    left join backpack.households h on h.id=m.household_id
    where backpack.account_allowed(u.id)
    and (m.user_id is null or m.status<>'confirmed' or h.status<>'confirmed')),
  'missing_contacts',(select count(*) from backpack.households h where exists(select 1 from backpack.memberships m where m.household_id=h.id and backpack.account_allowed(m.user_id))
    and not exists(select 1 from backpack.memberships m join auth.users u on u.id=m.user_id
      where m.household_id=h.id and m.user_id=h.contact_user_id and m.status='confirmed'
      and backpack.account_allowed(u.id))),
  'pending_special_cases',(select count(*) from auth.users u where backpack.account_allowed(u.id)
    and u.created_at<p.cutoff_at and not backpack.has_historical_kit(u.id)
    and not exists(select 1 from backpack.special_cases s where s.user_id=u.id and s.programme=p.programme and s.decision in ('approved','declined'))),
  'processing_jobs',(select count(*) from backpack.notifications where status='processing')
 ) from backpack.policies p where p.id=p_policy;
$$;
create or replace function backpack.baseline_fingerprint(p_policy bigint) returns text
language sql stable set search_path='' set timezone='UTC' as $$
 select md5(
  coalesce((select (to_jsonb(p)-array['enabled','email_enabled','baseline_completed_at'])::text from backpack.policies p where id=p_policy),'') ||
  coalesce((select pending_confirmations::text from backpack.policy_review_requests where policy_id=p_policy),'') ||
  coalesce((select string_agg(jsonb_build_object('id',u.id,'created_at',u.created_at,'confirmed_at',u.email_confirmed_at,
    'last_sign_in_at',u.last_sign_in_at,'kit_date',u.raw_app_meta_data->>'kit_date','kitdate',u.raw_app_meta_data->>'kitdate','tester',u.raw_app_meta_data->>'tester',
    'property_id',u.raw_user_meta_data->>'principaladdresssiteoid','email',u.email)::text,'' order by u.id) from auth.users u),'') ||
  coalesce((select string_agg(to_jsonb(p)::text,'' order by p.id) from public.profile p),'') ||
  coalesce((select string_agg(to_jsonb(h)::text,'' order by h.id) from backpack.households h),'') ||
  coalesce((select string_agg(to_jsonb(m)::text,'' order by m.user_id) from backpack.memberships m),'') ||
  coalesce((select string_agg(to_jsonb(r)::text,'' order by r.user_id,r.signed_in_at) from backpack.reviews r),'') ||
  coalesce((select string_agg(to_jsonb(s)::text,'' order by s.user_id,s.programme) from backpack.special_cases s),'') ||
  coalesce((select string_agg(to_jsonb(a)::text,'' order by a.id) from backpack.awards a),'')
 || coalesce((select string_agg(to_jsonb(e)::text,'' order by e.id) from backpack.kit_evidence e),'')
 || coalesce((select string_agg(to_jsonb(e)::text,'' order by e.user_id) from backpack.account_exclusions e),'')
 );
$$;
create or replace function backpack.household_preview(p_household uuid,p_members uuid[]) returns jsonb
language plpgsql stable set search_path='' set timezone='UTC' as $$
declare members jsonb; households jsonb; revision text; count_users integer; begin
  if p_household is null or p_members is null or cardinality(p_members) not between 1 and 50
    or array_position(p_members,null) is not null
    or cardinality(p_members)<>(select count(distinct x) from unnest(p_members) x) then
    raise exception 'Supply 1 to 50 distinct member IDs' using errcode='22023';
  end if;
  if not exists(select 1 from backpack.households where id=p_household) then
    raise exception 'Unknown household' using errcode='22023';
  end if;
  select count(*),jsonb_agg(jsonb_build_object('user_id',u.id,'email',u.email,
      'first_name',p.first_name,'family_name',p.family_name,
      'property_address_street',p.property_address_street,'property_address_suburb',p.property_address_suburb,
      'property_address_postcode',p.property_address_postcode,
      'current_property_id',u.raw_user_meta_data->>'principaladdresssiteoid',
      'membership',to_jsonb(m)) order by u.id)
    into count_users,members
    from auth.users u join backpack.memberships m on m.user_id=u.id left join public.profile p on p.id=u.id
    where u.id=any(p_members) and backpack.account_allowed(u.id);
  if count_users<>cardinality(p_members) then
    raise exception 'Every member must be a confirmed non-test account with a baseline candidate' using errcode='22023';
  end if;
  -- Include every related household member and its review state. Changes made
  -- by another coordinator or an address edit invalidate the preview token.
  select jsonb_agg(jsonb_build_object('household',to_jsonb(h),'members',
    (select jsonb_agg(to_jsonb(m) order by m.user_id) from backpack.memberships m where m.household_id=h.id),
    'awards',(select coalesce(jsonb_agg(to_jsonb(a) order by a.id),'[]') from backpack.awards a where a.household_id=h.id),
    'status',(select coalesce(jsonb_agg(to_jsonb(s) order by s.programme),'[]') from backpack.household_status s where s.household_id=h.id),
    'notifications',(select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'status',n.status) order by n.id),'[]') from backpack.notifications n where n.household_id=h.id)) order by h.id)
    into households from backpack.households h where h.id=p_household or h.id in
      (select household_id from backpack.memberships where user_id=any(p_members));
  revision:=md5(jsonb_build_object('target',p_household,'members',members,'households',households)::text);
  return jsonb_build_object('household_id',p_household,'members',members,'related_households',households,'revision',revision,
    'property_review_required',true,'automatically_merged',false);
end $$;
alter function backpack.prepare_notification(uuid,uuid) rename to prepare_notification_v1;
create function backpack.prepare_notification(p_id uuid,p_token uuid) returns jsonb
language plpgsql set search_path='' as $$
declare contact uuid; subject uuid;
begin
 select h.contact_user_id,a.user_id into contact,subject from backpack.notifications n
 join backpack.households h on h.id=n.household_id left join backpack.assessments a on a.id=n.assessment_id
 where n.id=p_id and n.status='processing' and n.claim_token=p_token;
 if not found then return null; end if;
 if not backpack.account_allowed(contact) or not backpack.account_allowed(subject) then
  update backpack.notifications set status=case when uncertain_since is not null then 'needs_review' else 'suppressed' end,
    last_error=case when uncertain_since is not null then 'Excluded account; uncertain delivery requires reconciliation' else 'Account excluded or contact requires review' end,
    claim_token=null,claimed_at=null where id=p_id;
  return null;
 end if;
 return backpack.prepare_notification_v1(p_id,p_token);
end $$;
create or replace function backpack.member_rows() returns setof jsonb
language sql stable set search_path='' as $$
 select to_jsonb(r) || jsonb_build_object('first_name',p.first_name,'family_name',p.family_name,
   'street',p.property_address_street,'suburb',p.property_address_suburb,'postcode',p.property_address_postcode,
   'current_property_id',u.raw_user_meta_data->>'principaladdresssiteoid','registered_at',u.created_at,
   'special_case_decision',s.decision,'special_case_reason',s.reason,'award_id',a.id,'account_excluded',not backpack.account_allowed(u.id),'has_historical_kit',backpack.has_historical_kit(u.id),'kit_date',u.raw_app_meta_data->>'kit_date','kitdate',u.raw_app_meta_data->>'kitdate','recorded_kit_date',(select e.awarded_on from backpack.kit_evidence e where e.user_id=u.id))
 from public.backpack_report() r join auth.users u on u.id=r.user_id
 left join public.profile p on p.id=r.user_id
 left join lateral(select programme from backpack.policies order by enabled desc,version desc limit 1) pol on true
 left join backpack.special_cases s on s.user_id=r.user_id and s.programme=pol.programme
 left join backpack.awards a on a.household_id=r.household_id and a.programme=pol.programme;
$$;
-- Only the participant's own assessment and coarse household status are exposed.
create function public.backpack_my_status() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); pol backpack.policies; usr auth.users; h backpack.households; m backpack.memberships;
 cat jsonb; answers jsonb; outcome text; reviewed timestamptz; award backpack.awards; qualified boolean;
begin
 if u is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if not backpack.account_allowed(u) then return '{"state":"excluded","qualified":false}'::jsonb; end if;
 select * into pol from backpack.policies order by enabled desc,version desc limit 1;
 if pol.id is null or pol.approved_at is null or pol.cutoff_at is null or pol.scope_question_ids is null or pol.excluded_question_ids is null
 or exists(select 1 from backpack.policy_review_requests where policy_id=pol.id and jsonb_array_length(pending_confirmations)>0) then
  return jsonb_build_object('state','unconfigured','qualified',false,'policy_id',pol.id);
 end if;
 select * into usr from auth.users where id=u;
 select * into m from backpack.memberships where user_id=u;
 select * into h from backpack.households where id=m.household_id;
 select * into award from backpack.awards where household_id=h.id and programme=pol.programme;
 select definition into cat from backpack.catalogues where version=pol.catalogue_version;
 select backpack.assess_answers(coalesce(to_jsonb(p),'{}'),cat,pol.scope_question_ids,pol.excluded_question_ids) into answers from public.profile p where p.id=u;
 answers:=coalesce(answers,backpack.assess_answers('{}',cat,pol.scope_question_ids,pol.excluded_question_ids));
 select max(signed_in_at) into reviewed from backpack.reviews where user_id=u;
 qualified:=h.id is not null and h.status='confirmed' and m.status='confirmed' and backpack.account_allowed(h.contact_user_id)
 and exists(select 1 from backpack.memberships where user_id=h.contact_user_id and household_id=h.id and status='confirmed')
 and backpack.household_qualifies(h.id,pol);
 if award.id is not null then outcome:='awarded';
 elsif qualified and pol.enabled then outcome:='qualified';
 elsif not (answers->>'answers_complete')::boolean then outcome:='incomplete';
 elsif usr.created_at<pol.cutoff_at and not backpack.has_historical_kit(u) and not exists(
   select 1 from backpack.special_cases where user_id=u and programme=pol.programme and decision='approved') then outcome:='special_case';
 elsif usr.created_at<pol.cutoff_at and backpack.has_historical_kit(u) and (reviewed is null or reviewed<pol.cutoff_at) then outcome:='review_required';
 elsif h.id is null or h.status<>'confirmed' or m.status<>'confirmed' or not backpack.account_allowed(h.contact_user_id) then outcome:='household_review';
 elsif qualified and pol.enabled then outcome:='qualified';
 else outcome:='answers_complete'; end if;
 return jsonb_build_object('state',outcome,'policy_id',pol.id,'rule_version',pol.version,
 'answers_complete',answers->'answers_complete','qualified',qualified and pol.enabled,
 'missing_questions',(select coalesce(jsonb_agg(jsonb_build_object('id',q->>'id','label',q->>'label','section',q->>'section') order by ord),'[]')
   from jsonb_array_elements(cat->'questions') with ordinality as questions(q,ord)
   where answers->'missing_required' ? (q->>'id')),
 'awarded_at',award.awarded_at,'delivered_at',award.delivered_at,
 'notice_dismissed',exists(select 1 from backpack.participant_notices where user_id=u and policy_id=pol.id));
end $$;
create function public.backpack_dismiss_notice() returns boolean
language plpgsql security definer set search_path='' as $$
declare status jsonb;
begin
 status:=public.backpack_my_status();
 if status->>'state'<>'qualified' then return false; end if;
 insert into backpack.participant_notices(user_id,policy_id) values(auth.uid(),(status->>'policy_id')::bigint) on conflict do nothing;
 return true;
end $$;

-- Extend the audited dispatcher. No new action enables sending or deletes accounts.
alter function public.backpack_admin(text,jsonb) set schema backpack;
alter function backpack.backpack_admin(text,jsonb) rename to admin_v3;
create function public.backpack_admin(p_action text,p_arguments jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid; allowed text[]; key text; result jsonb; u uuid; pol backpack.policies; h uuid;
 ref text; review_note text; old backpack.kit_evidence; stamp date; exclusion_value boolean; row_user record;
 nlimit integer; noffset integer; state_filter text;
begin
 actor:=backpack.require_coordinator();
 if jsonb_typeof(p_arguments) is distinct from 'object' then raise exception 'Arguments must be an object' using errcode='22023'; end if;
 if p_action='list_notifications' then
  for key in select jsonb_object_keys(p_arguments) loop
   if not key=any(array['limit','offset','status']) then raise exception 'Unexpected argument' using errcode='22023'; end if;
  end loop;
  nlimit:=coalesce((p_arguments->>'limit')::integer,25); noffset:=coalesce((p_arguments->>'offset')::integer,0);
  state_filter:=coalesce(p_arguments->>'status','all');
  if nlimit not between 1 and 100 or noffset not between 0 and 100000 or state_filter not in ('all','pending','processing','accepted','failed','needs_review','suppressed') then raise exception 'Invalid page or status' using errcode='22023'; end if;
  return jsonb_build_object('total',(select count(*) from backpack.notifications where state_filter='all' or status=state_filter),
   'notifications',(select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc,n.id),'[]') from
     (select jobs.id,jobs.household_id,jobs.programme,jobs.kind,jobs.status,jobs.attempts,jobs.created_at,jobs.available_at,jobs.accepted_at,jobs.provider_id,jobs.last_error,
      coalesce(jobs.payload#>>'{to,0}',contact.email) as recipient_email,
      coalesce(jobs.payload#>>'{bcc,0}',policy.coordinator_email) as coordinator_bcc,
      case when jobs.payload is null then 'Not yet frozen' else 'Frozen at first attempt' end as recipient_state
      from backpack.notifications jobs join backpack.households hh on hh.id=jobs.household_id
      left join auth.users contact on contact.id=hh.contact_user_id left join backpack.policies policy on policy.id=jobs.policy_id
      where state_filter='all' or jobs.status=state_filter order by jobs.created_at desc,jobs.id limit nlimit offset noffset) n),
   'processing_error_count',(select count(*) from backpack.processing_errors));
 end if;
 if p_action='record_committee_backpack' then
  for key in select jsonb_object_keys(p_arguments) loop
   if not key=any(array['user_id','reference','awarded_on','note']) then raise exception 'Unexpected argument' using errcode='22023'; end if;
  end loop;
  perform backpack.require_maintenance();
  u:=(p_arguments->>'user_id')::uuid; stamp:=(p_arguments->>'awarded_on')::date;
  if stamp>current_date then raise exception 'Future award date' using errcode='22023'; end if;
  select m.household_id into h from backpack.memberships m join backpack.households hh on hh.id=m.household_id
   where m.user_id=u and m.status='confirmed' and hh.status='confirmed' and backpack.account_allowed(u);
  if h is null then raise exception 'Review the account household before importing a backpack' using errcode='55000'; end if;
  select * into pol from backpack.policies order by enabled desc,version desc limit 1;
  perform backpack.reserve_committee_reference(p_arguments->>'reference','backpack',u,stamp,actor);
  if exists(select 1 from backpack.awards where external_reference=p_arguments->>'reference' and source_awarded_on is distinct from stamp) then
   raise exception 'Conflicting source award date' using errcode='23505';
  end if;
  result:=backpack.admin_v3('record_award',jsonb_build_object('household_id',h,'programme',pol.programme,
   'original_user_id',u,'reference',p_arguments->>'reference','historical',true,'awarded_at',null,'delivered_at',null,
   'note',p_arguments->>'note'));
  update backpack.awards set source_awarded_on=stamp where id=(result->'award'->>'id')::uuid;
  return result;
 end if;
 if p_action not in ('record_kit','set_account_exclusion') or p_action is null then
  result:=backpack.admin_v3(p_action,p_arguments);
  if p_action='snapshot' then
   select * into pol from backpack.policies order by enabled desc,version desc limit 1;
   result:=result || jsonb_build_object('pending_confirmations',(select pending_confirmations from backpack.policy_review_requests where policy_id=pol.id));
  end if;
  return result;
 end if;
 allowed:=case when p_action='record_kit' then array['user_id','reference','awarded_on','note'] else array['user_id','reference','excluded','note'] end;
 for key in select jsonb_object_keys(p_arguments) loop
  if not key=any(allowed) then raise exception 'Unexpected argument' using errcode='22023'; end if;
 end loop;
 perform backpack.require_maintenance();
 u:=(p_arguments->>'user_id')::uuid; ref:=btrim(p_arguments->>'reference'); review_note:=p_arguments->>'note';
 perform backpack.require_note(review_note);
 if ref is null or length(ref) not between 1 and 200 or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then raise exception 'Confirmed account and stable reference required' using errcode='22023'; end if;
 if p_action='record_kit' then
  stamp:=(p_arguments->>'awarded_on')::date;
  if stamp>current_date then raise exception 'Future award date' using errcode='22023'; end if;
  perform backpack.reserve_committee_reference(ref,'starter_kit',u,stamp,actor);
  select * into old from backpack.kit_evidence where external_reference=ref;
  if old.id is not null then
   if old.user_id<>u or old.awarded_on is distinct from stamp then raise exception 'Conflicting historical kit evidence' using errcode='23505'; end if;
   return jsonb_build_object('already_recorded',true,'id',old.id);
  end if;
  insert into backpack.kit_evidence(user_id,awarded_on,external_reference,note,recorded_by) values(u,stamp,ref,review_note,actor);
 else
  if jsonb_typeof(p_arguments->'excluded') is distinct from 'boolean' then raise exception 'Explicit exclusion decision required' using errcode='22023'; end if;
  exclusion_value:=(p_arguments->>'excluded')::boolean;
  perform backpack.reserve_committee_reference(ref,case when exclusion_value then 'exclude' else 'restore' end,u,null,actor);
  if exists(select 1 from backpack.account_exclusions where user_id=u and external_reference=ref and account_exclusions.excluded=exclusion_value and account_exclusions.note=review_note) then return '{"already_recorded":true}'::jsonb; end if;
  insert into backpack.account_exclusions(user_id,excluded,external_reference,note,recorded_by) values(u,exclusion_value,ref,review_note,actor)
   on conflict(user_id) do update set excluded=excluded.excluded,external_reference=excluded.external_reference,note=excluded.note,recorded_by=actor,recorded_at=now();
 end if;
 select household_id into h from backpack.memberships where user_id=u;
 if h is not null then
  update backpack.household_status set qualified=false where household_id=h;
  for row_user in select user_id from backpack.memberships where household_id=h loop perform backpack.assess_user(row_user.user_id,'baseline'); end loop;
 else perform backpack.assess_user(u,'baseline'); end if;
 perform backpack.invalidate_baseline();
 insert into backpack.coordinator_audit(actor_id,action,target_id,note,details) values(actor,p_action,u::text,review_note,p_arguments-'note');
 return '{"already_recorded":false}'::jsonb;
end $$;

revoke all on all tables in schema backpack from public,anon,authenticated;
revoke execute on all functions in schema backpack from public,anon,authenticated,service_role;
revoke all on function public.backpack_admin(text,jsonb) from public,anon,service_role;
grant execute on function public.backpack_admin(text,jsonb) to authenticated;
revoke all on function public.backpack_my_status(),public.backpack_dismiss_notice() from public,anon,service_role;
grant execute on function public.backpack_my_status(),public.backpack_dismiss_notice() to authenticated;
commit;
