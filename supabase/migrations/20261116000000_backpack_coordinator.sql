begin;

-- Only a database administrator can bootstrap or revoke coordinators. No role
-- supplied in a browser request or editable Auth user metadata is trusted.
create table backpack.coordinators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  added_at timestamptz not null default now(),
  note text not null check(nullif(btrim(note),'') is not null)
);
create table backpack.coordinator_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  action text not null,
  target_id text,
  note text not null,
  details jsonb not null default '{}',
  recorded_at timestamptz not null default clock_timestamp()
);
create table backpack.baseline_runs (
  id uuid primary key default gen_random_uuid(),
  policy_id bigint not null references backpack.policies(id),
  actor_id uuid not null,
  completed_at timestamptz not null default clock_timestamp(),
  fingerprint text not null,
  summary jsonb not null,
  reviewed_by uuid,
  reviewed_at timestamptz,
  note text not null
);
alter table backpack.coordinators enable row level security;
alter table backpack.coordinator_audit enable row level security;
alter table backpack.baseline_runs enable row level security;
alter table backpack.awards add column external_reference text;
alter table backpack.awards add column historical boolean not null default true;
create unique index backpack_award_reference on backpack.awards(programme,external_reference)
  where external_reference is not null;

create function backpack.require_coordinator() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); begin
  if actor is null or not exists(select 1 from backpack.coordinators c join auth.users u on u.id=c.user_id
    where c.user_id=actor and c.active and u.email_confirmed_at is not null) then
    raise exception 'Coordinator access required' using errcode='42501';
  end if;
  return actor;
end $$;

create function backpack.require_note(note text) returns void
language plpgsql immutable set search_path='' as $$ begin
  if nullif(btrim(note),'') is null or length(note)>2000 then
    raise exception 'A review note of 1 to 2000 characters is required' using errcode='22023';
  end if;
end $$;

create function backpack.require_maintenance() returns void
language plpgsql set search_path='' as $$ begin
  -- Serialise coordinator changes. Row locks also prevent enabling mail while a
  -- maintenance transaction is checking/reconciling the historical records.
  perform pg_advisory_xact_lock(hashtextextended('backpack-coordinator-maintenance',0));
  perform 1 from backpack.policies order by id for update;
  if exists(select 1 from backpack.policies where email_enabled)
    or exists(select 1 from backpack.notifications where status='processing') then
    raise exception 'Pause email dispatch and reconcile in-flight jobs before coordinator changes' using errcode='55000';
  end if;
end $$;

-- Explicit live coordinator decisions are distinct from the default historical
-- reconciliation path. They cannot activate sending; they require an already
-- reviewed, email-enabled programme and refuse changes to an in-flight household.
create function backpack.require_live_operation(action text,args jsonb) returns void
language plpgsql set search_path='' as $$
declare h uuid; begin
  if action not in ('confirm_household','decide_special_case','record_award','record_delivery') then
    raise exception 'This action has no live mode' using errcode='22023';
  end if;
  if action='record_award' and (args->>'historical')::boolean is distinct from false then
    raise exception 'Historical imports require baseline mode' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('backpack-coordinator-maintenance',0));
  perform 1 from backpack.policies order by id for update;
  if not exists(select 1 from backpack.policies where enabled and email_enabled and baseline_completed_at is not null) then
    raise exception 'Live mode requires an already activated and reviewed programme' using errcode='55000';
  end if;
  if action in ('confirm_household','record_award') then h:=(args->>'household_id')::uuid;
  elsif action='decide_special_case' then select household_id into h from backpack.memberships where user_id=(args->>'user_id')::uuid;
  else select household_id into h from backpack.awards where id=(args->>'award_id')::uuid; end if;
  if exists(select 1 from backpack.notifications where household_id=h and status='processing') then
    raise exception 'Reconcile the household in-flight notification first' using errcode='55000';
  end if;
  if action='confirm_household' and exists(select 1 from backpack.notifications n join backpack.memberships m on m.household_id=n.household_id
    where m.user_id in(select value::uuid from jsonb_array_elements_text(args->'member_ids')) and n.status='processing') then
    raise exception 'Reconcile the member household in-flight notification first' using errcode='55000';
  end if;
end $$;

create function backpack.invalidate_baseline() returns void
language sql set search_path='' as $$
  update backpack.policies set baseline_completed_at=null where baseline_completed_at is not null;
$$;

-- Includes qualification evidence, never password hashes, tokens or SMTP secrets.
create function backpack.baseline_fingerprint(p_policy bigint) returns text
language sql stable set search_path='' set timezone='UTC' as $$
 select md5(
  coalesce((select (to_jsonb(p)-array['enabled','email_enabled','baseline_completed_at'])::text from backpack.policies p where id=p_policy),'') ||
  coalesce((select string_agg(jsonb_build_object('id',u.id,'created_at',u.created_at,'confirmed_at',u.email_confirmed_at,
    'last_sign_in_at',u.last_sign_in_at,'kit_date',u.raw_app_meta_data->>'kit_date','tester',u.raw_app_meta_data->>'tester',
    'property_id',u.raw_user_meta_data->>'principaladdresssiteoid','email',u.email)::text,'' order by u.id) from auth.users u),'') ||
  coalesce((select string_agg(to_jsonb(p)::text,'' order by p.id) from public.profile p),'') ||
  coalesce((select string_agg(to_jsonb(h)::text,'' order by h.id) from backpack.households h),'') ||
  coalesce((select string_agg(to_jsonb(m)::text,'' order by m.user_id) from backpack.memberships m),'') ||
  coalesce((select string_agg(to_jsonb(r)::text,'' order by r.user_id,r.signed_in_at) from backpack.reviews r),'') ||
  coalesce((select string_agg(to_jsonb(s)::text,'' order by s.user_id,s.programme) from backpack.special_cases s),'') ||
  coalesce((select string_agg(to_jsonb(a)::text,'' order by a.id) from backpack.awards a),'')
 );
$$;

create function backpack.baseline_readiness(p_policy bigint) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object(
  'policy_id',p.id,'rule_version',p.version,
  'configured',p.cutoff_at is not null and p.approved_at is not null and p.scope_question_ids is not null
    and cardinality(p.scope_question_ids)>0 and p.excluded_question_ids is not null,
  'assessable_accounts',(select count(*) from auth.users u where u.email_confirmed_at is not null and u.raw_app_meta_data->>'tester' is null),
  'unassessed_accounts',(select count(*) from auth.users u where u.email_confirmed_at is not null and u.raw_app_meta_data->>'tester' is null
    and not exists(select 1 from backpack.assessments a where a.user_id=u.id and a.policy_id=p.id)),
  'unresolved_memberships',(select count(*) from auth.users u left join backpack.memberships m on m.user_id=u.id
    left join backpack.households h on h.id=m.household_id
    where u.email_confirmed_at is not null and u.raw_app_meta_data->>'tester' is null
    and (m.user_id is null or m.status<>'confirmed' or h.status<>'confirmed')),
  'missing_contacts',(select count(*) from backpack.households h where exists(select 1 from backpack.memberships m where m.household_id=h.id)
    and not exists(select 1 from backpack.memberships m join auth.users u on u.id=m.user_id
      where m.household_id=h.id and m.user_id=h.contact_user_id and m.status='confirmed'
      and u.email_confirmed_at is not null and u.raw_app_meta_data->>'tester' is null)),
  'pending_special_cases',(select count(*) from auth.users u where u.email_confirmed_at is not null and u.raw_app_meta_data->>'tester' is null
    and u.created_at<p.cutoff_at and nullif(btrim(u.raw_app_meta_data->>'kit_date'),'') is null
    and not exists(select 1 from backpack.special_cases s where s.user_id=u.id and s.programme=p.programme and s.decision in ('approved','declined'))),
  'processing_jobs',(select count(*) from backpack.notifications where status='processing')
 ) from backpack.policies p where p.id=p_policy;
$$;

create function backpack.household_preview(p_household uuid,p_members uuid[]) returns jsonb
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
    where u.id=any(p_members) and u.email_confirmed_at is not null and u.raw_app_meta_data->>'tester' is null;
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

create function backpack.confirm_household(args jsonb,actor uuid) returns jsonb
language plpgsql set search_path='' as $$
declare h uuid:=(args->>'household_id')::uuid; ids uuid[]; contact uuid:=(args->>'contact_user_id')::uuid;
  u uuid; related uuid; preview jsonb; note text:=args->>'note'; old_rows jsonb;
begin
  perform backpack.require_note(note);
  select array_agg(value::uuid order by value::uuid) into ids from jsonb_array_elements_text(args->'member_ids');
  if contact is null or not coalesce(contact=any(ids),false) then
    raise exception 'Contact must belong to the proposed household' using errcode='22023';
  end if;
  -- Match the sign-in/assessment lock order: individual users before households.
  perform 1 from auth.users where id=any(ids) order by id for update;
  foreach u in array coalesce(ids,'{}') loop perform pg_advisory_xact_lock(hashtextextended(u::text,0)); end loop;
  for related in select id from backpack.households where id=h or id in
    (select household_id from backpack.memberships where user_id=any(ids)) order by id loop
    perform 1 from backpack.households where id=related for update;
  end loop;
  preview:=backpack.household_preview(h,ids);
  if nullif(args->>'revision','') is null or args->>'revision'<>preview->>'revision' then
    raise exception 'Household preview is stale; preview again' using errcode='40001';
  end if;
  if exists(select 1 from backpack.memberships where household_id=h and not user_id=any(ids)) then
    raise exception 'Include every existing member of the target household' using errcode='22023';
  end if;
  old_rows:=preview;
  -- Existing membership-history guards reject moves involving awards,
  -- notifications or prior qualification; they are never bypassed here.
  update backpack.memberships m set household_id=h,status='confirmed',source='coordinator_review',
    property_id=nullif(btrim(u.raw_user_meta_data->>'principaladdresssiteoid'),''),reviewed_by=actor,reviewed_at=clock_timestamp()
    from auth.users u where m.user_id=u.id and m.user_id=any(ids);
  update backpack.households set status='confirmed',contact_user_id=contact,
    property_id=nullif(btrim(args->>'property_id'),''),review_note=note,reviewed_by=actor,reviewed_at=clock_timestamp() where id=h;
  foreach u in array ids loop perform backpack.assess_user(u,case when args->>'mode'='live' then 'coordinator' else 'baseline' end); end loop;
  -- Reassess vacated candidates, but never delete their historical records.
  update backpack.household_status s set qualified=false,updated_at=clock_timestamp()
    where s.household_id<>h and not exists(select 1 from backpack.memberships m where m.household_id=s.household_id);
  if args->>'mode' is distinct from 'live' then perform backpack.invalidate_baseline(); end if;
  insert into backpack.coordinator_audit(actor_id,action,target_id,note,details)
    values(actor,'confirm_household',h::text,note,jsonb_build_object('mode',coalesce(args->>'mode','baseline'),'before',old_rows,'after',backpack.household_preview(h,ids)));
  return backpack.household_preview(h,ids);
end $$;

create function backpack.decide_special_case(args jsonb,actor uuid) returns jsonb
language plpgsql set search_path='' as $$
declare u uuid:=(args->>'user_id')::uuid; v_programme text:=args->>'programme'; decision text:=args->>'decision';
  note text:=args->>'note'; before_row jsonb; result jsonb;
begin
  perform backpack.require_note(note);
  if decision is null or decision not in ('pending','approved','declined') or v_programme is null
    or not exists(select 1 from backpack.policies p where p.programme=v_programme)
    or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and raw_app_meta_data->>'tester' is null) then
    raise exception 'Invalid special-case account, programme or decision' using errcode='22023';
  end if;
  select to_jsonb(s) into before_row from backpack.special_cases s where s.user_id=u and s.programme=v_programme;
  insert into backpack.special_cases(user_id,programme,decision,decided_by,decided_at,reason)
    values(u,v_programme,decision,actor,clock_timestamp(),note)
    on conflict on constraint special_cases_pkey do update set decision=excluded.decision,decided_by=excluded.decided_by,decided_at=excluded.decided_at,reason=excluded.reason;
  result:=backpack.assess_user(u,case when args->>'mode'='live' then 'coordinator' else 'baseline' end);
  if args->>'mode' is distinct from 'live' then perform backpack.invalidate_baseline(); end if;
  insert into backpack.coordinator_audit(actor_id,action,target_id,note,details)
    values(actor,'decide_special_case',u::text,note,jsonb_build_object('mode',coalesce(args->>'mode','baseline'),'before',before_row,'decision',decision,'programme',v_programme));
  return result;
end $$;

create function backpack.record_award(args jsonb,actor uuid) returns jsonb
language plpgsql set search_path='' as $$
declare h uuid:=(args->>'household_id')::uuid; v_programme text:=args->>'programme';
  ref text:=nullif(btrim(args->>'reference'),''); note text:=args->>'note'; historical boolean:=(args->>'historical')::boolean;
  source_user uuid:=(args->>'original_user_id')::uuid; award_time timestamptz:=(args->>'awarded_at')::timestamptz;
  delivery_time timestamptz:=(args->>'delivered_at')::timestamptz; existing backpack.awards; pol backpack.policies;
  inserted backpack.awards;
begin
  perform backpack.require_note(note);
  if historical is null or ref is null or length(ref)>200 or v_programme is null then
    raise exception 'Supply historical flag, programme and a stable reference (1 to 200 characters)' using errcode='22023';
  end if;
  select * into pol from backpack.policies p where p.programme=v_programme order by enabled desc,version desc limit 1;
  if pol.id is null then raise exception 'Unknown programme' using errcode='22023'; end if;
  perform 1 from backpack.households where id=h and status='confirmed' for update;
  if not found then raise exception 'Resolve the household before recording an award' using errcode='22023'; end if;
  if source_user is not null and not exists(select 1 from backpack.memberships where user_id=source_user and household_id=h and status='confirmed') then
    raise exception 'Original user must belong to the resolved household' using errcode='22023';
  end if;
  select * into existing from backpack.awards a where a.programme=v_programme and a.external_reference=ref;
  if found then
    if (existing.household_id,existing.original_user_id,existing.awarded_at,existing.delivered_at,existing.historical)
      is distinct from (h,source_user,case when not historical and award_time is null then existing.awarded_at else award_time end,case when delivery_time is null then existing.delivered_at else delivery_time end,historical) then
      raise exception 'Import reference already exists with different award facts' using errcode='23505';
    end if;
    return jsonb_build_object('award',to_jsonb(existing),'already_recorded',true);
  end if;
  if not historical then
    if not pol.enabled or not backpack.household_qualifies(h,pol) then
      raise exception 'Household is not currently qualified for a new award' using errcode='55000';
    end if;
    award_time:=coalesce(award_time,clock_timestamp());
  end if;
  if award_time>clock_timestamp() or delivery_time>clock_timestamp() or (delivery_time<award_time) then
    raise exception 'Award/delivery dates must be in the past and in order' using errcode='22023';
  end if;
  insert into backpack.awards(programme,household_id,original_user_id,awarded_at,delivered_at,recorded_by,provenance,external_reference,historical,qualifying_assessment_id)
    values(v_programme,h,source_user,award_time,delivery_time,actor,note,ref,historical,
      case when not historical then (select assessment_id from backpack.household_status s where s.household_id=h and s.programme=v_programme) end)
    returning * into inserted;
  update backpack.notifications set status=case when uncertain_since is null then 'suppressed' else 'needs_review' end,
    last_error='Award recorded; reconcile any uncertain delivery' where household_id=h and backpack.notifications.programme=v_programme and status='pending';
  if args->>'mode' is distinct from 'live' then perform backpack.invalidate_baseline(); end if;
  insert into backpack.coordinator_audit(actor_id,action,target_id,note,details)
    values(actor,'record_award',inserted.id::text,note,jsonb_build_object('mode',coalesce(args->>'mode','baseline'),'award',to_jsonb(inserted)));
  return jsonb_build_object('award',to_jsonb(inserted),'already_recorded',false);
end $$;

create function backpack.record_delivery(args jsonb,actor uuid) returns jsonb
language plpgsql set search_path='' as $$
declare award_id uuid:=(args->>'award_id')::uuid; note text:=args->>'note';
  delivery_time timestamptz:=(args->>'delivered_at')::timestamptz; aw backpack.awards;
begin
  perform backpack.require_note(note);
  select * into aw from backpack.awards where id=award_id for update;
  if not found or delivery_time is null or delivery_time>clock_timestamp() or delivery_time<aw.awarded_at then
    raise exception 'Supply an existing award and a valid delivery date' using errcode='22023';
  end if;
  if aw.delivered_at is not null then
    if aw.delivered_at is distinct from delivery_time then raise exception 'Delivery already recorded; reconcile rather than overwrite it' using errcode='23505'; end if;
    return to_jsonb(aw);
  end if;
  update backpack.awards set delivered_at=delivery_time where id=award_id returning * into aw;
  if args->>'mode' is distinct from 'live' then perform backpack.invalidate_baseline(); end if;
  insert into backpack.coordinator_audit(actor_id,action,target_id,note,details)
    values(actor,'record_delivery',award_id::text,note,jsonb_build_object('mode',coalesce(args->>'mode','baseline'),'delivered_at',delivery_time));
  return to_jsonb(aw);
end $$;

create function public.backpack_admin(p_action text,p_arguments jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid; allowed text[]; supplied text; note text:=p_arguments->>'note';
  h uuid; ids uuid[]; pol bigint; run backpack.baseline_runs; summary jsonb; result jsonb;
  page_limit integer; page_offset integer;
begin
  actor:=backpack.require_coordinator();
  if jsonb_typeof(p_arguments) is distinct from 'object' then raise exception 'Arguments must be an object' using errcode='22023'; end if;
  allowed:=case p_action
    when 'snapshot' then array['limit','offset']
    when 'preview_household' then array['household_id','member_ids']
    when 'confirm_household' then array['household_id','member_ids','contact_user_id','property_id','revision','note','mode']
    when 'decide_special_case' then array['user_id','programme','decision','note','mode']
    when 'record_award' then array['household_id','programme','original_user_id','reference','historical','awarded_at','delivered_at','note','mode']
    when 'record_delivery' then array['award_id','delivered_at','note','mode']
    when 'baseline_preview' then array[]::text[]
    when 'run_baseline' then array['policy_id','note']
    when 'review_baseline' then array['run_id','note']
    else null end;
  if allowed is null then raise exception 'Unknown coordinator action' using errcode='22023'; end if;
  for supplied in select jsonb_object_keys(p_arguments) loop
    if not supplied=any(allowed) then raise exception 'Unexpected argument: %',supplied using errcode='22023'; end if;
  end loop;
  if p_action in ('snapshot','baseline_preview') then
    select id into pol from backpack.policies order by enabled desc,version desc limit 1;
    summary:=backpack.baseline_readiness(pol);
    if p_action='baseline_preview' then return summary; end if;
    page_limit:=coalesce((p_arguments->>'limit')::integer,50);
    page_offset:=coalesce((p_arguments->>'offset')::integer,0);
    if page_limit not between 1 and 100 or page_offset not between 0 and 100000 then
      raise exception 'Invalid page bounds' using errcode='22023';
    end if;
    return jsonb_build_object('readiness',summary,
      'total_members',(select count(*) from backpack.memberships),
      'members',coalesce((select jsonb_agg(to_jsonb(r) || jsonb_build_object(
        'first_name',p.first_name,'family_name',p.family_name,'street',p.property_address_street,
        'suburb',p.property_address_suburb,'postcode',p.property_address_postcode,
        'current_property_id',u.raw_user_meta_data->>'principaladdresssiteoid') order by r.user_id)
        from (select * from public.backpack_report() order by user_id limit page_limit offset page_offset) r
        join auth.users u on u.id=r.user_id left join public.profile p on p.id=r.user_id),'[]'),
      'notification_counts',(select coalesce(jsonb_object_agg(status,n),'{}') from
        (select status,count(*) n from backpack.notifications group by status) counts),
      'recent_baselines',(select coalesce(jsonb_agg(to_jsonb(b) order by completed_at desc),'[]') from
        (select * from backpack.baseline_runs order by completed_at desc limit 10) b));
  end if;
  if p_action='preview_household' then
    select array_agg(value::uuid order by value::uuid) into ids from jsonb_array_elements_text(p_arguments->'member_ids');
    return backpack.household_preview((p_arguments->>'household_id')::uuid,ids);
  end if;
  perform backpack.require_note(note);
  if p_arguments ? 'mode' and (p_arguments->>'mode' is null or p_arguments->>'mode' not in ('baseline','live')) then
    raise exception 'Mode must be baseline or live' using errcode='22023';
  end if;
  if p_arguments->>'mode'='live' then perform backpack.require_live_operation(p_action,p_arguments);
  else perform backpack.require_maintenance(); end if;
  case p_action
    when 'confirm_household' then return backpack.confirm_household(p_arguments,actor);
    when 'decide_special_case' then return backpack.decide_special_case(p_arguments,actor);
    when 'record_award' then
      if jsonb_typeof(p_arguments->'historical') is distinct from 'boolean' then
        raise exception 'Historical must be a boolean' using errcode='22023';
      end if;
      return backpack.record_award(p_arguments,actor);
    when 'record_delivery' then return backpack.record_delivery(p_arguments,actor);
    when 'run_baseline' then
      select id into pol from backpack.policies order by enabled desc,version desc limit 1;
      if pol is distinct from (p_arguments->>'policy_id')::bigint then
        raise exception 'Select the current policy version' using errcode='22023';
      end if;
      -- Review a consistent historical evidence snapshot. These are brief,
      -- explicit maintenance operations, not locks held during email delivery.
      lock table auth.users,public.profile in share mode;
      perform public.backpack_baseline();
      summary:=backpack.baseline_readiness(pol);
      insert into backpack.baseline_runs(policy_id,actor_id,fingerprint,summary,note)
        values(pol,actor,backpack.baseline_fingerprint(pol),summary,note) returning * into run;
      perform backpack.invalidate_baseline();
      insert into backpack.coordinator_audit(actor_id,action,target_id,note,details)
        values(actor,p_action,run.id::text,note,summary);
      return to_jsonb(run);
    when 'review_baseline' then
      lock table auth.users,public.profile in share mode;
      select * into run from backpack.baseline_runs where id=(p_arguments->>'run_id')::uuid for update;
      select id into pol from backpack.policies order by enabled desc,version desc limit 1;
      if run.id is null or run.policy_id is distinct from pol then
        raise exception 'Select a baseline for the current policy' using errcode='22023';
      end if;
      if run.fingerprint is distinct from backpack.baseline_fingerprint(pol) then
        raise exception 'Baseline evidence has changed; rerun and review it again' using errcode='40001';
      end if;
      summary:=backpack.baseline_readiness(pol);
      if not (summary->>'configured')::boolean
        or (summary->>'unassessed_accounts')::integer<>0 or (summary->>'unresolved_memberships')::integer<>0
        or (summary->>'missing_contacts')::integer<>0 or (summary->>'pending_special_cases')::integer<>0 then
        raise exception 'Resolve policy, membership, contact and special-case blockers before baseline approval' using errcode='55000';
      end if;
      if run.reviewed_at is not null then return to_jsonb(run); end if;
      update backpack.baseline_runs set reviewed_by=actor,reviewed_at=clock_timestamp() where id=run.id returning * into run;
      update backpack.policies set baseline_completed_at=run.reviewed_at where id=pol;
      insert into backpack.coordinator_audit(actor_id,action,target_id,note,details)
        values(actor,p_action,run.id::text,note,summary);
      return to_jsonb(run);
    else raise exception 'Unknown action' using errcode='22023';
  end case;
end $$;

-- Coordinate the existing lease RPC with maintenance operations. The lock is
-- released when the claim commits; an in-flight HTTP send remains a processing
-- job, which maintenance refuses to change.
create or replace function public.backpack_claim_email() returns jsonb
language plpgsql security definer set search_path='' as $$
declare job backpack.notifications; token uuid:=gen_random_uuid(); payload jsonb; begin
  perform pg_advisory_xact_lock(hashtextextended('backpack-coordinator-maintenance',0));
  select n.* into job from backpack.notifications n join backpack.policies p on p.id=n.policy_id
    where p.enabled and p.email_enabled and p.baseline_completed_at is not null
      and ((n.status='pending' and n.available_at<=now()) or (n.status='processing' and n.claimed_at<now()-interval '5 minutes'))
    order by n.created_at for update of n skip locked limit 1;
  if not found then return null; end if;
  -- A worker that died after claiming might have sent the email. Keep its payload
  -- and key, and treat a recovered lease as uncertain until reconciled.
  update backpack.notifications set status='processing',claim_token=token,claimed_at=now(),
    uncertain_since=case when job.status='processing' then coalesce(uncertain_since,job.claimed_at) else uncertain_since end
    where id=job.id;
  payload:=backpack.prepare_notification(job.id,token);
  if payload is null then return null; end if;
  update backpack.notifications set attempts=attempts+1 where id=job.id;
  return jsonb_build_object('id',job.id,'claim_token',token,'attempt',job.attempts+1,'payload',payload);
end $$;

revoke all on all tables in schema backpack from public,anon,authenticated;
revoke all on all sequences in schema backpack from public,anon,authenticated;
revoke execute on all functions in schema backpack from public,anon,authenticated;
revoke all on function public.backpack_admin(text,jsonb) from public,anon,service_role;
grant execute on function public.backpack_admin(text,jsonb) to authenticated;
commit;
