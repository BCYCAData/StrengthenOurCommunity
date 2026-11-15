begin;
-- Preserve the audited mutation implementation; this wrapper adds coordinator-
-- only read models needed by the UI, without broadening private-table access.
alter function public.backpack_admin(text,jsonb) set schema backpack;
alter function backpack.backpack_admin(text,jsonb) rename to admin_v2;

create function backpack.member_rows() returns setof jsonb
language sql stable set search_path='' as $$
 select to_jsonb(r) || jsonb_build_object('first_name',p.first_name,'family_name',p.family_name,
   'street',p.property_address_street,'suburb',p.property_address_suburb,'postcode',p.property_address_postcode,
   'current_property_id',u.raw_user_meta_data->>'principaladdresssiteoid','registered_at',u.created_at,
   'special_case_decision',s.decision,'special_case_reason',s.reason,'award_id',a.id)
 from public.backpack_report() r join auth.users u on u.id=r.user_id
 left join public.profile p on p.id=r.user_id
 left join lateral(select programme from backpack.policies order by enabled desc,version desc limit 1) pol on true
 left join backpack.special_cases s on s.user_id=r.user_id and s.programme=pol.programme
 left join backpack.awards a on a.household_id=r.household_id and a.programme=pol.programme;
$$;

create function public.backpack_admin(p_action text,p_arguments jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare key text; allowed text[]; pol backpack.policies; h uuid; rows jsonb;
 page_limit integer; page_offset integer; search_text text; filter_name text;
begin
 perform backpack.require_coordinator();
 if jsonb_typeof(p_arguments) is distinct from 'object' then raise exception 'Arguments must be an object' using errcode='22023'; end if;
 if p_action not in ('snapshot','household_details','list_awards') or p_action is null then
   return backpack.admin_v2(p_action,p_arguments);
 end if;
 allowed:=case p_action when 'household_details' then array['household_id']
   when 'snapshot' then array['limit','offset','search','filter'] else array['limit','offset','search'] end;
 for key in select jsonb_object_keys(p_arguments) loop
   if not key=any(allowed) then raise exception 'Unexpected argument' using errcode='22023'; end if;
 end loop;
 select * into pol from backpack.policies order by enabled desc,version desc limit 1;
 if p_action='household_details' then
   h:=(p_arguments->>'household_id')::uuid;
   if not exists(select 1 from backpack.households where id=h) then raise exception 'Unknown household' using errcode='22023'; end if;
   return jsonb_build_object('household_id',h,'household',(select to_jsonb(hh) from backpack.households hh where hh.id=h),
     'members',(select coalesce(jsonb_agg(j order by j->>'user_id'),'[]') from backpack.member_rows() j where j->>'household_id'=h::text));
 end if;
 page_limit:=coalesce((p_arguments->>'limit')::integer,50);
 page_offset:=coalesce((p_arguments->>'offset')::integer,0);
 search_text:=lower(btrim(coalesce(p_arguments->>'search','')));
 filter_name:=coalesce(p_arguments->>'filter','all');
 if page_limit not between 1 and 100 or page_offset not between 0 and 100000 or length(search_text)>120
   or filter_name not in ('all','pending','special_case','incomplete','qualified','awarded') then
   raise exception 'Invalid search or page bounds' using errcode='22023';
 end if;
 if p_action='list_awards' then
   with matching as (
     select to_jsonb(a) || jsonb_build_object('property_id',h.property_id,'contact_email',u.email,
       'contact_name',concat_ws(' ',p.first_name,p.family_name),'original_email',original_user.email,
       'members',(select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',member_user.email,
         'first_name',member_profile.first_name,'family_name',member_profile.family_name) order by m.user_id),'[]')
         from backpack.memberships m join auth.users member_user on member_user.id=m.user_id
         left join public.profile member_profile on member_profile.id=m.user_id where m.household_id=h.id)) as j
     from backpack.awards a join backpack.households h on h.id=a.household_id
     left join auth.users u on u.id=h.contact_user_id left join public.profile p on p.id=u.id
     left join auth.users original_user on original_user.id=a.original_user_id
     where a.programme=pol.programme
   ), filtered as (
     select j from matching where search_text='' or position(search_text in lower(concat_ws(' ',
       j->>'external_reference',j->>'property_id',j->>'contact_email',j->>'contact_name',j->>'original_email',j->'members'))) > 0
   ) select jsonb_build_object('total_awards',(select count(*) from filtered),'awards',
       (select coalesce(jsonb_agg(j order by j->>'recorded_at' desc,j->>'id'),'[]') from
         (select j from filtered order by j->>'recorded_at' desc,j->>'id' limit page_limit offset page_offset) page)) into rows;
   return rows;
 end if;
 with filtered as (
   select j from backpack.member_rows() j
   where (search_text='' or position(search_text in lower(concat_ws(' ',j->>'email',j->>'first_name',j->>'family_name',
     j->>'street',j->>'suburb',j->>'postcode',j->>'current_property_id',j->>'property_id'))) > 0)
   and (filter_name='all'
     or (filter_name='pending' and (j->>'membership_status'<>'confirmed' or j->>'household_status'<>'confirmed'))
     or (filter_name='special_case' and (j->>'outcome'='special_case' or j->>'special_case_decision' is not null))
     or (filter_name='incomplete' and j->>'outcome'='incomplete')
     or (filter_name='qualified' and (j->>'household_qualified')::boolean)
     or (filter_name='awarded' and (j->>'award_recorded')::boolean))
 ) select jsonb_build_object('total_members',(select count(*) from filtered),'members',
     (select coalesce(jsonb_agg(j order by j->>'user_id'),'[]') from
       (select j from filtered order by j->>'user_id' limit page_limit offset page_offset) page)) into rows;
 return rows || jsonb_build_object('readiness',backpack.baseline_readiness(pol.id),
   'policy',jsonb_build_object('id',pol.id,'version',pol.version,'programme',pol.programme,'enabled',pol.enabled,
     'email_enabled',pol.email_enabled,'baseline_completed_at',pol.baseline_completed_at,'cutoff_at',pol.cutoff_at,
     'scope_question_ids',pol.scope_question_ids,'excluded_question_ids',pol.excluded_question_ids),
   'notification_counts',(select coalesce(jsonb_object_agg(status,n),'{}') from
     (select status,count(*) n from backpack.notifications group by status) counts),
   'recent_baselines',(select coalesce(jsonb_agg(to_jsonb(b) order by completed_at desc),'[]') from
     (select * from backpack.baseline_runs order by completed_at desc limit 10) b));
end $$;
revoke execute on all functions in schema backpack from public,anon,authenticated;
revoke all on function public.backpack_admin(text,jsonb) from public,anon,service_role;
grant execute on function public.backpack_admin(text,jsonb) to authenticated;
commit;
