-- LOCAL DEVELOPMENT ONLY: kept outside production migrations.
-- Profile column definitions from schema metadata; no production rows copied.
create table public.profile (id uuid not null,
first_name text,
family_name text,
property_address_street text,
property_address_suburb text,
property_address_postcode text,
residency_profile smallint,
property_rented boolean,
agent_name text,
agent_phone text,
sign_posted boolean,
truck_access_other_information text,
mobile text,
phone text,
mobile_reception smallint,
residents0_18 smallint,
residents19_50 smallint,
residents51_70 smallint,
residents71_ smallint,
vulnerable_residents boolean,
number_dogs smallint,
number_cats smallint,
number_birds smallint,
number_other_pets smallint,
live_stock_present boolean,
live_stock_safe_area text,
share_livestock_safe_area text,
static_water_available smallint[],
have_stortz text,
stortz_size smallint,
fire_fighting_resources smallint[],
site_hazards smallint[],
other_site_hazards text,
fire_hazard_reduction smallint[],
land_adjacent_hazard text,
other_hazards text,
rfs_survival_plan text,
send_rfs_survival_plan boolean,
fire_fighting_experience smallint,
fire_trauma boolean,
plan_to_leave_before_fire smallint,
plan_to_leave_before_flood smallint,
community_workshop_choices smallint[],
other_community_workshop text,
will_run_community_workshops text,
information_sheet_choices smallint[],
other_information_sheet text,
community_meeting_choices smallint[],
other_community_meeting text,
stay_in_touch_choices smallint[],
postal_address_street text,
postal_address_suburb text,
postal_address_postcode text,
other_comments text,
other_access_information text,
truck_access smallint,
agent_mobile text,
other_essential_assets text,
primary key (id), foreign key (id) references auth.users(id) on delete cascade
);

alter table public.profile enable row level security;
grant select, insert, update on public.profile to authenticated;
grant all on public.profile to service_role;
create policy profile_read_own on public.profile for select to authenticated using (id=auth.uid());
create policy profile_insert_own on public.profile for insert to authenticated with check (id=auth.uid());
create policy profile_update_own on public.profile for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

create function public.local_create_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.profile(id) values(new.id);
  return new;
end $$;
revoke all on function public.local_create_profile() from public, anon, authenticated;
create trigger local_create_profile after insert on auth.users
for each row execute function public.local_create_profile();

-- Empty legacy import surface for existing profile/survey pages.
-- Historical imports and spatial data are not part of this local test fixture.
create table public.survey_responses(email_address text primary key, invited boolean);
alter table public.survey_responses enable row level security;
grant select on public.survey_responses to authenticated;
grant all on public.survey_responses to service_role;
create policy survey_read_own on public.survey_responses for select to authenticated
using (email_address=auth.jwt()->>'email');
create function public.user_has_survey_results(email_input text) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from public.survey_responses where email_address=email_input);
$$;
revoke all on function public.user_has_survey_results(text) from public,anon;
grant execute on function public.user_has_survey_results(text) to authenticated;
