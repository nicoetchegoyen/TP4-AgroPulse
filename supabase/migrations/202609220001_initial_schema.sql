create extension if not exists pgcrypto;

create type public.membership_role as enum ('producer', 'operator', 'advisor');
create type public.reading_source as enum ('sensor', 'manual');
create type public.valve_status as enum ('open', 'closed');
create type public.command_action as enum ('open', 'close', 'timed');
create type public.command_status as enum ('pending', 'applied', 'failed', 'cancelled');
create type public.alert_type as enum ('dry', 'stale');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);

create table public.plots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  crop text,
  geom jsonb not null,
  threshold_min real not null default 25 check (threshold_min between 0 and 100),
  threshold_max real not null default 45 check (threshold_max between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_threshold_range check (threshold_min < threshold_max),
  constraint geojson_polygon check (geom ->> 'type' = 'Polygon'),
  unique (organization_id, name)
);

create table public.stations (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots(id) on delete cascade,
  name text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  created_at timestamptz not null default now(),
  unique (plot_id, name)
);

create table public.readings (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  measured_at timestamptz not null,
  moisture_pct real not null check (moisture_pct between 0 and 100),
  temp_c real not null check (temp_c between -40 and 80),
  rain_mm real check (rain_mm is null or rain_mm >= 0),
  source public.reading_source not null default 'sensor',
  client_request_id uuid,
  note text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create unique index readings_client_request_id_unique
  on public.readings (client_request_id)
  where client_request_id is not null;
create index readings_station_measured_at_idx
  on public.readings (station_id, measured_at desc);

create table public.valves (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots(id) on delete cascade,
  name text not null,
  status public.valve_status not null default 'closed',
  updated_at timestamptz not null default now(),
  unique (plot_id, name)
);

create table public.irrigation_commands (
  id uuid primary key default gen_random_uuid(),
  valve_id uuid not null references public.valves(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  action public.command_action not null,
  duration_min integer,
  status public.command_status not null default 'pending',
  failure_reason text,
  client_request_id uuid not null,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  constraint duration_matches_action check (
    (action = 'timed' and duration_min between 1 and 120)
    or (action <> 'timed' and duration_min is null)
  ),
  unique (client_request_id)
);

create unique index one_pending_command_per_valve
  on public.irrigation_commands (valve_id)
  where status = 'pending';
create index irrigation_commands_created_at_idx
  on public.irrigation_commands (created_at desc);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots(id) on delete cascade,
  type public.alert_type not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger plots_touch_updated_at before update on public.plots
for each row execute function public.touch_updated_at();
create trigger valves_touch_updated_at before update on public.valves
for each row execute function public.touch_updated_at();

create or replace function public.has_membership(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid() and organization_id = target_organization_id
  );
$$;

create or replace function public.has_role(target_organization_id uuid, allowed_roles public.membership_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
      and organization_id = target_organization_id
      and role = any(allowed_roles)
  );
$$;

revoke all on function public.has_membership(uuid) from public;
revoke all on function public.has_role(uuid, public.membership_role[]) from public;
grant execute on function public.has_membership(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.membership_role[]) to authenticated;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.plots enable row level security;
alter table public.stations enable row level security;
alter table public.readings enable row level security;
alter table public.valves enable row level security;
alter table public.irrigation_commands enable row level security;
alter table public.alerts enable row level security;

create policy organizations_select_member on public.organizations
for select to authenticated using (public.has_membership(id));

create policy memberships_select_self on public.memberships
for select to authenticated using (user_id = auth.uid());

create policy plots_select_member on public.plots
for select to authenticated using (public.has_membership(organization_id));
create policy plots_insert_operator on public.plots
for insert to authenticated with check (
  public.has_role(organization_id, array['producer', 'operator']::public.membership_role[])
);
create policy plots_update_operator on public.plots
for update to authenticated
using (public.has_role(organization_id, array['producer', 'operator']::public.membership_role[]))
with check (public.has_role(organization_id, array['producer', 'operator']::public.membership_role[]));

create policy stations_select_member on public.stations
for select to authenticated using (
  exists (select 1 from public.plots p where p.id = plot_id and public.has_membership(p.organization_id))
);

create policy readings_select_member on public.readings
for select to authenticated using (
  exists (
    select 1 from public.stations s
    join public.plots p on p.id = s.plot_id
    where s.id = station_id and public.has_membership(p.organization_id)
  )
);
create policy readings_insert_manual on public.readings
for insert to authenticated with check (
  source = 'manual'
  and exists (
    select 1 from public.stations s
    join public.plots p on p.id = s.plot_id
    where s.id = station_id
      and public.has_role(p.organization_id, array['producer', 'operator']::public.membership_role[])
  )
);

create policy valves_select_member on public.valves
for select to authenticated using (
  exists (select 1 from public.plots p where p.id = plot_id and public.has_membership(p.organization_id))
);

create policy commands_select_member on public.irrigation_commands
for select to authenticated using (
  exists (
    select 1 from public.valves v
    join public.plots p on p.id = v.plot_id
    where v.id = valve_id and public.has_membership(p.organization_id)
  )
);
create policy commands_insert_operator on public.irrigation_commands
for insert to authenticated with check (
  requested_by = auth.uid()
  and status = 'pending'
  and exists (
    select 1 from public.valves v
    join public.plots p on p.id = v.plot_id
    where v.id = valve_id
      and public.has_role(p.organization_id, array['producer', 'operator']::public.membership_role[])
  )
);

create policy alerts_select_member on public.alerts
for select to authenticated using (
  exists (select 1 from public.plots p where p.id = plot_id and public.has_membership(p.organization_id))
);

grant usage on schema public to authenticated, service_role;
grant select on public.organizations, public.memberships, public.plots, public.stations,
  public.readings, public.valves, public.irrigation_commands, public.alerts to authenticated;
grant insert, update on public.plots to authenticated;
grant insert on public.readings, public.irrigation_commands to authenticated;
grant all on all tables in schema public to service_role;

create or replace function public.compute_plot_status(
  measured_at timestamptz,
  moisture_pct real,
  threshold_min real,
  threshold_max real
)
returns text
language sql
stable
as $$
  select case
    when measured_at is null or now() - measured_at > interval '15 minutes' then 'stale'
    when moisture_pct < threshold_min then 'dry'
    when moisture_pct <= threshold_max then 'optimal'
    else 'wet'
  end;
$$;

create view public.plot_summaries
with (security_invoker = true)
as
select
  p.id,
  p.organization_id,
  p.name,
  p.crop,
  p.geom,
  p.threshold_min,
  p.threshold_max,
  latest.station_id,
  latest.measured_at,
  latest.moisture_pct,
  latest.temp_c,
  latest.rain_mm,
  public.compute_plot_status(latest.measured_at, latest.moisture_pct, p.threshold_min, p.threshold_max) as status
from public.plots p
left join lateral (
  select r.station_id, r.measured_at, r.moisture_pct, r.temp_c, r.rain_mm
  from public.stations s
  join public.readings r on r.station_id = s.id
  where s.plot_id = p.id
  order by r.measured_at desc
  limit 1
) latest on true;

grant select on public.plot_summaries to authenticated, service_role;

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['readings', 'valves', 'irrigation_commands', 'alerts'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end;
$$;
