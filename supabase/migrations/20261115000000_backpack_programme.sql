-- Local implementation only. Applying this migration does not enable assessment or sending.
begin;
create schema backpack;
revoke all on schema backpack from public, anon, authenticated;

create table backpack.catalogues (
  version text primary key,
  definition jsonb not null check (jsonb_typeof(definition->'questions') = 'array')
);
-- BEGIN GENERATED CATALOGUE
insert into backpack.catalogues(version,definition) values ('2026-11-proposed-v1', $catalogue${"version":"2026-11-proposed-v1","status":"pending_coordinator_approval","questions":[{"id":"Q1","step":2,"label":"What is your name?","section":"About Me","fields":[{"field":"first_name","kind":"text"},{"field":"family_name","kind":"text"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q2","step":2,"label":"What is your property address?","section":"My Place","fields":[{"field":"property_address_street","kind":"text"},{"field":"property_address_suburb","kind":"text"},{"field":"property_address_postcode","kind":"text"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q3","step":2,"label":"Are you renting this property?","section":"My Place","fields":[{"field":"property_rented","kind":"boolean"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q3a","step":2,"label":"Agent (name)","section":"My Place","fields":[{"field":"agent_name","kind":"text"}],"match":"all","parent_id":"Q3","applies_when":[{"field":"property_rented","values":[true]}]},{"id":"Q3b","step":2,"label":"Agent Mobile / Landline","section":"My Place","fields":[{"field":"agent_mobile","kind":"text"},{"field":"agent_phone","kind":"text"}],"match":"any","parent_id":"Q3","applies_when":[{"field":"property_rented","values":[true]}]},{"id":"Q4","step":2,"label":"Is your property well sign-posted and numbered clearly from the road?","section":"My Place","fields":[{"field":"sign_posted","kind":"boolean"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q5","step":2,"label":"Is there easy truck access to the buildings, boundaries and paddocks?","section":"My Place","fields":[{"field":"truck_access","kind":"choice","values":[1,2,3,4]}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q5a","step":2,"label":"Other truck access information","section":"My Place","fields":[{"field":"truck_access_other_information","kind":"text"}],"match":"all","parent_id":"Q5","applies_when":[{"field":"truck_access","values":[4]}]},{"id":"Q6","step":2,"label":"What is your phone number?","section":"About Me","fields":[{"field":"mobile","kind":"text"},{"field":"phone","kind":"text"}],"match":"any","parent_id":null,"applies_when":[]},{"id":"Q7","step":2,"label":"What is the quality of your mobile reception at the property?","section":"About Me","fields":[{"field":"mobile_reception","kind":"choice","values":[1,2,3,4,5]}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q8","step":3,"label":"Are you:","section":"My Place","fields":[{"field":"residency_profile","kind":"choice","values":[1,2,3,4,5,6,7]}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q9","step":3,"label":"Please record the number of people who usually live at this property:","section":"My Place","fields":[{"field":"residents0_18","kind":"count"},{"field":"residents19_50","kind":"count"},{"field":"residents51_70","kind":"count"},{"field":"residents71_","kind":"count"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q10","step":3,"label":"Do you consider any person on the property to be vulnerable?","section":"My Place","fields":[{"field":"vulnerable_residents","kind":"boolean"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q11","step":4,"label":"Please record the number of pets you have on this property","section":"My Place / Assets","fields":[{"field":"number_dogs","kind":"count"},{"field":"number_cats","kind":"count"},{"field":"number_birds","kind":"count"},{"field":"number_other_pets","kind":"count"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q12","step":4,"label":"Do you have livestock?","section":"My Place / Assets","fields":[{"field":"live_stock_present","kind":"boolean"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q12a","step":4,"label":"Do you have an area which would be safe for stock in the event of a bushfire or flood?","section":"My Place / Assets","fields":[{"field":"live_stock_safe_area","kind":"choice","values":["Y","N","M"]}],"match":"all","parent_id":"Q12","applies_when":[{"field":"live_stock_present","values":[true]}]},{"id":"Q12b","step":4,"label":"Would you be happy for other people to leave their stock on your property, in your safe area, for a short period in an emergency?","section":"My Place / Assets","fields":[{"field":"share_livestock_safe_area","kind":"choice","values":["Y","N","M"]}],"match":"all","parent_id":"Q12","applies_when":[{"field":"live_stock_present","values":[true]},{"field":"live_stock_safe_area","values":["Y"]}]},{"id":"Q13","step":4,"label":"If there are assets, other than the residence, that you consider essential (eg crops, sheds with equipment or antique cars) please describe them here.","section":"My Place / Assets","fields":[{"field":"other_essential_assets","kind":"text"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q14","step":5,"label":"Are there any static water supplies on the property?","section":"My Place / Firefighting Resources","fields":[{"field":"static_water_available","kind":"array","values":[1,2,3,4,5],"none_value":5}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q15","step":5,"label":"Do you have a Stortz fitting attached to a water tank?","section":"My Place / Firefighting Resources","fields":[{"field":"have_stortz","kind":"choice","values":["Y","N","M"]}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q15a","step":5,"label":"Please include the size","section":"My Place / Firefighting Resources","fields":[{"field":"stortz_size","kind":"positive_number"}],"match":"all","parent_id":"Q15","applies_when":[{"field":"have_stortz","values":["Y"]}]},{"id":"Q16","step":5,"label":"Do you have any of the following at this property?","section":"My Place / Firefighting Resources","fields":[{"field":"fire_fighting_resources","kind":"array","values":[0,1,2,3,4,5],"none_value":0}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q17","step":6,"label":"Do you have any of the following on your property?","section":"My Place / Firefighting Hazards","fields":[{"field":"site_hazards","kind":"array","values":[0,1,2,3,4],"none_value":0}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q18","step":6,"label":"Are there any other hazards on the property that should be noted?","section":"My Place / Firefighting Hazards","fields":[{"field":"other_site_hazards","kind":"text"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q19","step":6,"label":"Does your property have?","section":"My Place / Firefighting Hazards","fields":[{"field":"fire_hazard_reduction","kind":"array","values":[0,1,2,3,4,5],"none_value":0}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q20","step":6,"label":"Does any adjoining land represent a hazard?","section":"My Place / Firefighting Hazards","fields":[{"field":"land_adjacent_hazard","kind":"choice","values":["Y","N","M"]}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q21","step":6,"label":"Are there other areas that concern you or represent a potential threat?","section":"My Place / Firefighting Hazards","fields":[{"field":"other_hazards","kind":"text"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q22","step":7,"label":"Have you completed a RFS Bushfire survival plan?","section":"About Me","fields":[{"field":"rfs_survival_plan","kind":"choice","values":["Y","N","S"]}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q23","step":7,"label":"What is your level of firefighting experience?","section":"About Me","fields":[{"field":"fire_fighting_experience","kind":"choice","values":[1,2,3,4]}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q24","step":7,"label":"Have you had unpleasant traumatic experience of bushfire?","section":"About Me","fields":[{"field":"fire_trauma","kind":"boolean"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q25","step":7,"label":"If your property is threatened by fire, are you:","section":"About Me","fields":[{"field":"plan_to_leave_before_fire","kind":"choice","values":[1,2,3]}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q26","step":7,"label":"If your property is threatened by flood, are you:","section":"About Me","fields":[{"field":"plan_to_leave_before_flood","kind":"choice","values":[1,2,3]}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q27","step":8,"label":"Which of these community initiated workshops would be useful to you?","section":"My Community / Workshops","fields":[{"field":"community_workshop_choices","kind":"array","values":[1,2,3,4,5,6]}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q28","step":8,"label":"If there are other workshops that you would like to see run, please add the details here","section":"My Community / Workshops","fields":[{"field":"other_community_workshop","kind":"text"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q29","step":8,"label":"If you would like to help run any of the workshops, please indicate which ones below.","section":"My Community / Workshops","fields":[{"field":"will_run_community_workshops","kind":"text"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q30","step":9,"label":"What information would be useful to you?","section":"My Community / Information","fields":[{"field":"information_sheet_choices","kind":"array","values":[1,2,3,4,5,6,7]}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q31","step":9,"label":"Is there other information which you would find useful?","section":"My Community / Information","fields":[{"field":"other_information_sheet","kind":"text"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q32","step":10,"label":"What Community Events are you interested in?","section":"My Community / Events","fields":[{"field":"community_meeting_choices","kind":"array","values":[1,2,3,4,5,6,7,8,9,10,11]}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q33","step":10,"label":"If there are other events you would be interested in, please add them below.","section":"My Community / Events","fields":[{"field":"other_community_meeting","kind":"text"}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q34","step":11,"label":"How would you prefer to stay in touch?","section":"My Community (contact preferences and comments)","fields":[{"field":"stay_in_touch_choices","kind":"array","values":[1,2,3,4,5]}],"match":"all","parent_id":null,"applies_when":[]},{"id":"Q35","step":11,"label":"Do you have any other comments that you would like to add?","section":"My Community (contact preferences and comments)","fields":[{"field":"other_comments","kind":"text"}],"match":"all","parent_id":null,"applies_when":[]}]}$catalogue$::jsonb);
-- END GENERATED CATALOGUE

create table backpack.policies (
  id bigint generated always as identity primary key,
  programme text not null default 'backpack',
  version integer not null unique,
  catalogue_version text not null references backpack.catalogues(version),
  cutoff_at timestamptz,
  scope_question_ids text[],
  excluded_question_ids text[],
  approved_at timestamptz,
  enabled boolean not null default false,
  email_enabled boolean not null default false,
  baseline_completed_at timestamptz,
  sender text,
  reply_to text,
  coordinator_email text,
  profile_url text,
  template_version text not null default 'v1',
  created_at timestamptz not null default now(),
  check (not enabled or (cutoff_at is not null and scope_question_ids is not null
    and cardinality(scope_question_ids) > 0 and excluded_question_ids is not null and approved_at is not null)),
  check (not email_enabled or (enabled and baseline_completed_at is not null
    and nullif(btrim(sender),'') is not null and nullif(btrim(reply_to),'') is not null
    and nullif(btrim(coordinator_email),'') is not null and profile_url like 'https://%'))
);
create unique index backpack_one_active_policy on backpack.policies(programme) where enabled;
insert into backpack.policies(version,catalogue_version)
select 1,version from backpack.catalogues;

create table backpack.households (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check(status in ('pending','confirmed')),
  property_id text,
  contact_user_id uuid references auth.users(id) on delete set null,
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check(status <> 'confirmed' or (reviewed_at is not null and reviewed_by is not null))
);
-- Multiple households may legitimately share a property identifier.
create index backpack_household_property on backpack.households(property_id);
create table backpack.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references backpack.households(id),
  status text not null default 'pending' check(status in ('pending','confirmed')),
  property_id text,
  source text not null default 'candidate',
  reviewed_by uuid,
  reviewed_at timestamptz,
  check(status <> 'confirmed' or (reviewed_at is not null and reviewed_by is not null))
);
create index backpack_membership_household on backpack.memberships(household_id);
create table backpack.membership_history (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  old_record jsonb,
  new_record jsonb,
  recorded_at timestamptz not null default now(),
  database_actor text not null default session_user
);
create table backpack.reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  signed_in_at timestamptz not null,
  source text not null check(source in ('auth_sign_in','historical_last_sign_in')),
  recorded_at timestamptz not null default now(),
  primary key(user_id,signed_in_at)
);
create table backpack.special_cases (
  user_id uuid not null references auth.users(id) on delete cascade,
  programme text not null,
  decision text not null default 'pending' check(decision in ('pending','approved','declined')),
  decided_by uuid,
  decided_at timestamptz,
  reason text,
  primary key(user_id,programme),
  check(decision = 'pending' or (decided_by is not null and decided_at is not null and nullif(btrim(reason),'') is not null))
);
create table backpack.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  household_id uuid references backpack.households(id),
  policy_id bigint not null references backpack.policies(id),
  cause text not null check(cause in ('baseline','sign_in','profile_save','coordinator')),
  fingerprint text not null,
  result jsonb not null,
  assessed_at timestamptz not null default clock_timestamp(),
  notification_suppression text,
  unique(user_id,policy_id,cause,fingerprint)
);
create index backpack_assessments_user on backpack.assessments(user_id,policy_id,assessed_at desc);
create table backpack.awards (
  id uuid primary key default gen_random_uuid(),
  programme text not null,
  household_id uuid not null references backpack.households(id),
  qualifying_assessment_id uuid references backpack.assessments(id),
  original_user_id uuid,
  awarded_at timestamptz,
  delivered_at timestamptz,
  recorded_by uuid not null,
  provenance text not null,
  recorded_at timestamptz not null default now(),
  unique(programme,household_id),
  check(delivered_at is null or awarded_at is null or delivered_at >= awarded_at)
);
create table backpack.household_status (
  household_id uuid not null references backpack.households(id),
  programme text not null,
  qualified boolean not null default false,
  ever_qualified boolean not null default false,
  assessment_id uuid references backpack.assessments(id),
  policy_id bigint references backpack.policies(id),
  updated_at timestamptz not null default now(),
  primary key(household_id,programme)
);
create table backpack.notifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references backpack.households(id),
  programme text not null,
  kind text not null check(kind in ('complete','incomplete')),
  assessment_id uuid not null references backpack.assessments(id),
  policy_id bigint not null references backpack.policies(id),
  status text not null default 'pending' check(status in ('pending','processing','accepted','failed','suppressed','needs_review')),
  payload jsonb,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  claim_token uuid,
  first_attempt_at timestamptz,
  provider_id text,
  accepted_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique(household_id,programme,kind),
  check((status = 'accepted') = (accepted_at is not null)),
  check(status <> 'accepted' or provider_id is not null)
);
create index backpack_notification_ready on backpack.notifications(status,available_at);
create table backpack.processing_errors (
  id bigint generated always as identity primary key,
  user_id uuid,
  source text not null,
  error_code text not null,
  occurred_at timestamptz not null default now()
);

-- Private schema and deny-by-default RLS: no participant can alter policy,
-- membership, qualification, awards or delivery state, or read another profile.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname='backpack' loop
    execute format('alter table backpack.%I enable row level security',t.tablename);
  end loop;
end $$;

create function backpack.valid_field(answer jsonb, rule jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare n numeric; item jsonb; begin
  if answer is null or answer = 'null'::jsonb then return false; end if;
  case rule->>'kind'
    when 'text' then return jsonb_typeof(answer)='string' and nullif(btrim(answer#>>'{}'),'') is not null;
    when 'boolean' then return jsonb_typeof(answer)='boolean';
    when 'choice' then return (rule->'values') @> jsonb_build_array(answer);
    when 'count', 'positive_number' then
      if jsonb_typeof(answer) <> 'number' then return false; end if;
      n := (answer#>>'{}')::numeric;
      return n=trunc(n) and case when rule->>'kind'='count' then n>=0 else n>0 end;
    when 'array' then
      if jsonb_typeof(answer)<>'array' or jsonb_array_length(answer)=0 then return false; end if;
      for item in select value from jsonb_array_elements(answer) loop
        if not (rule->'values') @> jsonb_build_array(item) then return false; end if;
      end loop;
      if rule ? 'none_value' and answer @> jsonb_build_array(rule->'none_value') then
        return jsonb_array_length(answer)=1;
      end if;
      return true;
    else return false;
  end case;
end $$;

create function backpack.assess_answers(profile jsonb, catalogue jsonb, scope_ids text[], excluded_ids text[])
returns jsonb language plpgsql immutable set search_path = '' as $$
declare q jsonb; cond jsonb; rule jsonb; applicable boolean; answers boolean[];
  all_missing text[] := '{}'; required_missing text[] := '{}'; ok boolean;
begin
  for q in select value from jsonb_array_elements(catalogue->'questions') loop
    applicable := true;
    for cond in select value from jsonb_array_elements(q->'applies_when') loop
      if not coalesce((cond->'values') @> jsonb_build_array(profile->(cond->>'field')),false) then
        applicable := false;
      end if;
    end loop;
    if not applicable then continue; end if;
    answers := '{}';
    for rule in select value from jsonb_array_elements(q->'fields') loop
      answers := array_append(answers,backpack.valid_field(profile->(rule->>'field'),rule));
    end loop;
    ok := case when q->>'match'='any' then true=any(answers) else not false=any(answers) end;
    if not ok then
      all_missing := array_append(all_missing,q->>'id');
      -- Excluding a parent excludes its conditional children as well.
      if (q->>'id')=any(scope_ids) and not (q->>'id')=any(excluded_ids)
        and not coalesce((q->>'parent_id')=any(excluded_ids),false) then
        required_missing := array_append(required_missing,q->>'id');
      end if;
    end if;
  end loop;
  return jsonb_build_object('unanswered',all_missing,'missing_required',required_missing,
    'answers_complete',cardinality(required_missing)=0);
end $$;

create function backpack.guard_policy() returns trigger language plpgsql set search_path='' as $$
declare ids text[]; begin
  select array_agg(q->>'id') into ids from backpack.catalogues c,
    lateral jsonb_array_elements(c.definition->'questions') q where c.version=new.catalogue_version;
  if not coalesce(new.scope_question_ids <@ ids,true) or not coalesce(new.excluded_question_ids <@ ids,true)
     or array_position(new.scope_question_ids,null) is not null or array_position(new.excluded_question_ids,null) is not null then
    raise exception 'Policy contains unknown or null question IDs';
  end if;
  if tg_op='UPDATE' and old.approved_at is not null and exists(select 1 from backpack.assessments where policy_id=old.id)
    and (to_jsonb(new)-array['enabled','email_enabled','baseline_completed_at'])
      is distinct from (to_jsonb(old)-array['enabled','email_enabled','baseline_completed_at']) then
    raise exception 'Assessed policy is immutable: create a new version';
  end if;
  return new;
end $$;
create trigger backpack_policy_guard before insert or update on backpack.policies
for each row execute function backpack.guard_policy();

create function backpack.audit_membership() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and new.household_id is distinct from old.household_id then
    if exists(select 1 from backpack.awards where household_id in (old.household_id,new.household_id))
       or exists(select 1 from backpack.household_status where household_id in (old.household_id,new.household_id) and ever_qualified)
       or exists(select 1 from backpack.notifications where household_id in (old.household_id,new.household_id)) then
      raise exception 'Award/notification history exists; reconcile household history before moving this member';
    end if;
  end if;
  insert into backpack.membership_history(user_id,old_record,new_record)
    values(coalesce(new.user_id,old.user_id),case when tg_op<>'INSERT' then to_jsonb(old) end,
      case when tg_op<>'DELETE' then to_jsonb(new) end);
  return coalesce(new,old);
end $$;
create trigger backpack_membership_audit after insert or update or delete on backpack.memberships
for each row execute function backpack.audit_membership();

create function backpack.ensure_candidate(p_user uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare h uuid; prop text; begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  select household_id into h from backpack.memberships where user_id=p_user;
  if h is not null then return h; end if;
  select nullif(btrim(raw_user_meta_data->>'principaladdresssiteoid'),'') into prop from auth.users where id=p_user;
  insert into backpack.households(property_id) values(prop) returning id into h;
  insert into backpack.memberships(user_id,household_id,property_id) values(p_user,h,prop);
  return h;
end $$;

create function backpack.assess_user(p_user uuid,p_cause text,p_notify_incomplete boolean default false) returns jsonb
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
  if usr.raw_app_meta_data->>'tester' is not null or usr.email_confirmed_at is null then
    return jsonb_build_object('outcome','excluded');
  end if;
  h := backpack.ensure_candidate(p_user);
  -- Serialize assessment and enqueueing across every member of this household.
  perform 1 from backpack.households where id=h for update;
  select to_jsonb(p) into prof from public.profile p where p.id=p_user;
  select definition into cat from backpack.catalogues where version=pol.catalogue_version;
  answer_result := backpack.assess_answers(coalesce(prof,'{}'),cat,pol.scope_question_ids,coalesce(pol.excluded_question_ids,'{}'));
  configured := pol.approved_at is not null and pol.cutoff_at is not null and pol.scope_question_ids is not null
    and cardinality(pol.scope_question_ids)>0 and pol.excluded_question_ids is not null;
  select max(signed_in_at) into reviewed from backpack.reviews where user_id=p_user;
  kit := nullif(btrim(usr.raw_app_meta_data->>'kit_date'),'') is not null;
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
    where m.household_id=h and m.status='confirmed' and hh.status='confirmed' and latest.result->>'outcome'='qualified'
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

create function backpack.on_profile_save() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from backpack.policies where enabled) then
    perform backpack.assess_user(new.id,'profile_save');
  end if;
  return new;
exception when others then
  insert into backpack.processing_errors(user_id,source,error_code) values(new.id,'profile_save',sqlstate);
  return new;
end $$;
create trigger backpack_profile_save after insert or update on public.profile
for each row execute function backpack.on_profile_save();

create function backpack.on_sign_in() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.last_sign_in_at is not null and new.last_sign_in_at is distinct from old.last_sign_in_at then
    insert into backpack.reviews(user_id,signed_in_at,source) values(new.id,new.last_sign_in_at,'auth_sign_in') on conflict do nothing;
    if exists(select 1 from backpack.policies where enabled) then perform backpack.assess_user(new.id,'sign_in'); end if;
  end if;
  return new;
exception when others then
  insert into backpack.processing_errors(user_id,source,error_code) values(new.id,'sign_in',sqlstate);
  return new;
end $$;
create trigger backpack_sign_in after update of last_sign_in_at on auth.users
for each row execute function backpack.on_sign_in();

-- Explicit administrative baseline: records real historical evidence, never sends.
create function public.backpack_baseline() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u record; n integer:=0; begin
  insert into backpack.reviews(user_id,signed_in_at,source)
    select id,last_sign_in_at,'historical_last_sign_in' from auth.users
    where last_sign_in_at is not null and email_confirmed_at is not null and raw_app_meta_data->>'tester' is null
    on conflict do nothing;
  for u in select id from auth.users where email_confirmed_at is not null and raw_app_meta_data->>'tester' is null loop
    perform backpack.assess_user(u.id,'baseline'); n:=n+1;
  end loop;
  return jsonb_build_object('assessed_users',n,'emails_queued',0);
end $$;
-- Only an explicit authenticated form submission requests an incomplete reminder.
-- Background imports and arbitrary profile updates still assess completion but do
-- not pretend that a participant submitted an incomplete questionnaire.
create function public.backpack_record_submission() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not exists(select 1 from backpack.policies where enabled) then return '{"outcome":"disabled"}'::jsonb; end if;
  return backpack.assess_user(auth.uid(),'profile_save',true);
end $$;
revoke all on function public.backpack_record_submission() from public,anon;
grant execute on function public.backpack_record_submission() to authenticated;

create function public.backpack_reassess(p_user uuid) returns jsonb
language sql security definer set search_path='' as $$ select backpack.assess_user(p_user,'coordinator'); $$;

create view backpack.household_candidates as
select m.user_id,m.household_id,m.property_id,m.status,
  (select count(*) from backpack.memberships other where other.property_id=m.property_id and other.user_id<>m.user_id) as other_accounts_at_property
from backpack.memberships m;

-- No table or private function is exposed to the anonymous/authenticated roles.
revoke all on all tables in schema backpack from public,anon,authenticated;
revoke all on all sequences in schema backpack from public,anon,authenticated;
revoke execute on all functions in schema backpack from public,anon,authenticated;
revoke all on function public.backpack_baseline() from public,anon,authenticated;
revoke all on function public.backpack_reassess(uuid) from public,anon,authenticated;
grant execute on function public.backpack_baseline(),public.backpack_reassess(uuid) to service_role;
commit;
