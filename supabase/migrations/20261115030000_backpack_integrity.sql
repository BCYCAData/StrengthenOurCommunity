begin;
create function backpack.freeze_catalogue() returns trigger language plpgsql set search_path='' as $$
begin
  if exists(select 1 from backpack.policies where catalogue_version=old.version and approved_at is not null)
    or exists(select 1 from backpack.assessments a join backpack.policies p on p.id=a.policy_id where p.catalogue_version=old.version) then
    raise exception 'Referenced catalogue is immutable: create a new catalogue version';
  end if;
  return case when tg_op='DELETE' then old else new end;
end $$;
create trigger backpack_catalogue_immutable before update or delete on backpack.catalogues
for each row execute function backpack.freeze_catalogue();

-- A previously reviewed property match is invalidated when the source address
-- changes. Never silently move a user between households or expose other members.
create function backpack.on_address_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_table_schema='auth' then
    if (new.raw_user_meta_data->>'principaladdresssiteoid') is not distinct from (old.raw_user_meta_data->>'principaladdresssiteoid') then return new; end if;
  else
    if (new.property_address_street,new.property_address_suburb,new.property_address_postcode)
      is not distinct from (old.property_address_street,old.property_address_suburb,old.property_address_postcode) then return new; end if;
  end if;
  update backpack.memberships set status='pending',source='address_changed',reviewed_at=null,reviewed_by=null where user_id=new.id;
  if exists(select 1 from backpack.policies where enabled) then perform backpack.assess_user(new.id,'coordinator'); end if;
  return new;
exception when others then
  insert into backpack.processing_errors(user_id,source,error_code) values(new.id,'address_change',sqlstate);
  return new;
end $$;
-- Alphabetically before backpack_profile_save, so a save never qualifies a stale match.
create trigger backpack_address_change after update of property_address_street,property_address_suburb,property_address_postcode on public.profile
for each row execute function backpack.on_address_change();
create trigger backpack_address_change after update of raw_user_meta_data on auth.users
for each row execute function backpack.on_address_change();

revoke execute on all functions in schema backpack from public,anon,authenticated;
commit;
