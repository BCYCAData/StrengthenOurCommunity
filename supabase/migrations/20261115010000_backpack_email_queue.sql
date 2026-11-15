begin;
alter table backpack.notifications add column uncertain_since timestamptz;

create function backpack.household_qualifies(h uuid, pol backpack.policies) returns boolean
language plpgsql stable set search_path='' as $$
declare u record; cat jsonb; reviewed timestamptz; a jsonb; begin
  if pol.approved_at is null or pol.cutoff_at is null or pol.scope_question_ids is null or pol.excluded_question_ids is null then return false; end if;
  select definition into cat from backpack.catalogues where version=pol.catalogue_version;
  for u in select au.*,to_jsonb(p) as profile from backpack.memberships m
    join backpack.households hh on hh.id=m.household_id join auth.users au on au.id=m.user_id
    join public.profile p on p.id=au.id
    where hh.id=h and hh.status='confirmed' and m.status='confirmed'
      and au.email_confirmed_at is not null and au.raw_app_meta_data->>'tester' is null loop
    a:=backpack.assess_answers(u.profile,cat,pol.scope_question_ids,pol.excluded_question_ids);
    if not (a->>'answers_complete')::boolean then continue; end if;
    if u.created_at >= pol.cutoff_at then return true; end if;
    if nullif(btrim(u.raw_app_meta_data->>'kit_date'),'') is not null then
      select max(signed_in_at) into reviewed from backpack.reviews where user_id=u.id;
      if reviewed >= pol.cutoff_at then return true; end if;
    elsif exists(select 1 from backpack.special_cases where user_id=u.id and programme=pol.programme and decision='approved') then
      return true;
    end if;
  end loop;
  return false;
end $$;

-- Revalidate current answers, historical path, household, contact, awards and policy
-- immediately before handing the immutable payload to the server-side worker.
create function backpack.prepare_notification(p_id uuid,p_token uuid) returns jsonb
language plpgsql set search_path='' as $$
declare job backpack.notifications; pol backpack.policies; recipient text; v_payload jsonb; qualified boolean;
begin
  select * into job from backpack.notifications where id=p_id and status='processing' and claim_token=p_token for update;
  if not found then return null; end if;
  select * into pol from backpack.policies where id=job.policy_id;
  if not pol.enabled or not pol.email_enabled or pol.baseline_completed_at is null then
    update backpack.notifications set status='pending',claim_token=null,claimed_at=null,available_at=now()+interval '1 hour' where id=p_id;
    return null;
  end if;
  qualified:=backpack.household_qualifies(job.household_id,pol);
  if job.kind='incomplete' and not exists(
    select 1 from backpack.assessments trigger_assessment
    join backpack.memberships m on m.user_id=trigger_assessment.user_id and m.household_id=job.household_id and m.status='confirmed'
    cross join lateral (select result from backpack.assessments a
      where a.user_id=m.user_id and a.policy_id=pol.id order by assessed_at desc,id desc limit 1) latest
    where trigger_assessment.id=job.assessment_id and latest.result->>'outcome'='incomplete'
  ) then
    update backpack.notifications set status='suppressed',last_error='Submission no longer incomplete',claim_token=null where id=p_id;
    return null;
  end if;
  if exists(select 1 from backpack.awards where household_id=job.household_id and programme=job.programme)
    or (job.kind='complete' and not qualified) or (job.kind='incomplete' and qualified) then
    update backpack.notifications set status='suppressed',last_error='Eligibility changed',claim_token=null where id=p_id;
    return null;
  end if;
  select u.email into recipient from backpack.households h join backpack.memberships m
    on m.household_id=h.id and m.user_id=h.contact_user_id join auth.users u on u.id=m.user_id
    where h.id=job.household_id and h.status='confirmed' and m.status='confirmed'
      and u.email_confirmed_at is not null and u.raw_app_meta_data->>'tester' is null;
  if recipient is null or nullif(btrim(recipient),'') is null then
    update backpack.notifications set status='pending',last_error='Confirmed contact required',claim_token=null,claimed_at=null,available_at=now()+interval '1 hour' where id=p_id;
    return null;
  end if;
  v_payload:=jsonb_build_object('from',pol.sender,'to',jsonb_build_array(recipient),
    'bcc',jsonb_build_array(pol.coordinator_email),'reply_to',pol.reply_to,
    'subject',case when job.kind='complete' then 'Your household has qualified for a backpack' else 'Your household survey: next steps' end,
    'text',case when job.kind='complete' then 'Congratulations! Your household has qualified for a backpack. We will be in touch to arrange delivery.'
      else 'Thanks for taking part. To qualify your household for a backpack, one household member needs to complete the required questions in About Me and My Place and meet the programme review requirements.' end
      || E'\n\nSign in: ' || pol.profile_url);
  if job.payload is not null and job.payload is distinct from v_payload then
    update backpack.notifications set status='needs_review',last_error='Payload or contact changed after first attempt',claim_token=null where id=p_id;
    return null;
  end if;
  if job.uncertain_since is not null and job.first_attempt_at < now()-interval '23 hours' then
    update backpack.notifications set status='needs_review',last_error='Uncertain delivery beyond safe retry window',claim_token=null where id=p_id;
    return null;
  end if;
  update backpack.notifications set payload=v_payload,first_attempt_at=coalesce(first_attempt_at,now()) where id=p_id;
  return v_payload;
end $$;

create function public.backpack_claim_email() returns jsonb
language plpgsql security definer set search_path='' as $$
declare job backpack.notifications; token uuid:=gen_random_uuid(); payload jsonb; begin
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

create function public.backpack_finish_email(p_id uuid,p_token uuid,p_outcome text,p_provider_id text default null,p_error text default null,p_retry_seconds integer default 300)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_outcome not in ('accepted','retry_safe','retry_uncertain','failed') then raise exception 'Invalid delivery outcome'; end if;
  if p_outcome='accepted' and nullif(btrim(p_provider_id),'') is null then raise exception 'Provider ID required'; end if;
  update backpack.notifications set
    status=case when p_outcome='accepted' then 'accepted' when p_outcome='failed' or attempts>=8 then 'failed' else 'pending' end,
    accepted_at=case when p_outcome='accepted' then now() end,provider_id=p_provider_id,
    uncertain_since=case when p_outcome='retry_uncertain' then coalesce(uncertain_since,now()) else uncertain_since end,
    available_at=now()+make_interval(secs=>greatest(60,least(p_retry_seconds,86400))),
    last_error=left(p_error,200),claim_token=null,claimed_at=null
    where id=p_id and status='processing' and claim_token=p_token;
  return found;
end $$;

revoke execute on all functions in schema backpack from public,anon,authenticated;
revoke all on function public.backpack_claim_email() from public,anon,authenticated;
revoke all on function public.backpack_finish_email(uuid,uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.backpack_claim_email(),public.backpack_finish_email(uuid,uuid,text,text,text,integer) to service_role;
commit;
