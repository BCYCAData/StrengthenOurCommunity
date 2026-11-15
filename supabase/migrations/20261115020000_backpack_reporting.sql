begin;
-- A structured coordinator report replaces parsing comma-separated question labels.
-- Legacy reports remain intact pending comparison and approval of the new policy.
create function public.backpack_report()
returns table(user_id uuid,household_id uuid,property_id text,membership_status text,
  household_status text,is_contact boolean,email text,historical_kit_date text,
  rule_version integer,outcome text,missing_required jsonb,household_qualified boolean,
  awarded_at timestamptz,delivered_at timestamptz,award_recorded boolean)
language sql security definer set search_path='' as $$
  select m.user_id,m.household_id,m.property_id,m.status,h.status,m.user_id=h.contact_user_id,
    u.email,u.raw_app_meta_data->>'kit_date',p.version,a.result->>'outcome',a.result->'missing_required',
    coalesce(s.qualified,false),aw.awarded_at,aw.delivered_at,aw.id is not null
  from backpack.memberships m join backpack.households h on h.id=m.household_id
  join auth.users u on u.id=m.user_id
  left join lateral(select * from backpack.policies order by enabled desc,version desc limit 1) p on true
  left join lateral(select result from backpack.assessments where user_id=m.user_id and policy_id=p.id
    order by assessed_at desc,id desc limit 1) a on true
  left join backpack.household_status s on s.household_id=h.id and s.programme=p.programme and s.policy_id=p.id
  left join backpack.awards aw on aw.household_id=h.id and aw.programme=p.programme;
$$;
revoke all on function public.backpack_report() from public,anon,authenticated;
grant execute on function public.backpack_report() to service_role;
commit;
