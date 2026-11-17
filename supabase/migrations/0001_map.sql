-- Prio 2: the site map. Plots, facilities and the distances between them,
-- plus the role helpers that every later policy uses.
--
-- Text that guests read is stored per language (name_nl, name_en, name_de).
-- Dutch is required; English and German stay null until they are written.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------- types

create type public.plot_type as enum ('tent_caravan', 'camper', 'safari_tent');
create type public.surface_type as enum ('grass', 'semi_paved', 'paved');
create type public.shade_level as enum ('none', 'some', 'lots');
create type public.app_role as enum ('admin', 'reception', 'animation', 'seasonal');

-- ---------------------------------------------------------------- roles

-- One row per staff account. Guests never have an account.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role public.app_role not null default 'seasonal',
  created_at timestamptz not null default now()
);

-- The role of the signed-in staff member, but only after 2FA (aal2).
-- Without a second factor this returns null, so no staff policy matches.
create function public.auth_role() returns public.app_role
language sql stable security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

create function public.has_role(variadic roles public.app_role[]) returns boolean
language sql stable
set search_path = public
as $$
  select coalesce(public.auth_role() = any (roles), false)
$$;

revoke execute on function public.auth_role() from public, anon;
grant execute on function public.auth_role() to authenticated;
grant execute on function public.has_role(public.app_role[]) to anon, authenticated;

-- ---------------------------------------------------------------- plots

create table public.price_groups (
  id text primary key,
  name_nl text not null,
  name_en text,
  name_de text,
  sort int not null default 0
);

create table public.plots (
  id text primary key check (id ~ '^[TCS][1-9][0-9]?$'),
  type public.plot_type not null,
  -- Zone on the map: A and B are the meadows, C the campers, S the safari tents.
  zone text not null check (zone in ('A', 'B', 'C', 'S')),
  electricity boolean not null default false,
  surface public.surface_type not null default 'grass',
  level boolean not null default true,
  shade public.shade_level not null default 'some',
  wheelchair boolean not null default false,
  max_persons int not null default 6 check (max_persons between 1 and 20),
  price_group_id text not null references public.price_groups (id),
  -- Centre of the plot in the SVG drawing. Written by scripts/import-map.ts.
  map_x numeric,
  map_y numeric,
  -- "Gecontroleerd": the features were checked on the terrain walk-through.
  -- Until then a plot is never recommended as accessible.
  checked boolean not null default false,
  checked_at timestamptz,
  photo_path text,
  note_nl text,
  note_en text,
  note_de text,
  active boolean not null default true,
  sort int not null default 0
);

create table public.facilities (
  id text primary key check (id ~ '^[a-z_]+$'),
  icon text not null,
  surface text not null default 'stro',
  on_home boolean not null default false,
  hours_label text not null default 'open' check (hours_label in ('open', 'when')),
  name_nl text not null,
  name_en text,
  name_de text,
  summary_nl text not null default '',
  summary_en text,
  summary_de text,
  description_nl text not null default '',
  description_en text,
  description_de text,
  hours_nl text not null default '',
  hours_en text,
  hours_de text,
  access_nl text not null default '',
  access_en text,
  access_de text,
  location_nl text not null default '',
  location_en text,
  location_de text,
  photo_path text,
  map_x numeric,
  map_y numeric,
  sort int not null default 0
);

-- Walking distance in metres, straight line on the drawing times the scale.
-- Calculated by scripts/import-map.ts, never entered by hand.
create table public.plot_distances (
  plot_id text not null references public.plots (id) on delete cascade,
  facility_id text not null references public.facilities (id) on delete cascade,
  metres int not null check (metres >= 0),
  primary key (plot_id, facility_id)
);

-- ---------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.price_groups enable row level security;
alter table public.plots enable row level security;
alter table public.facilities enable row level security;
alter table public.plot_distances enable row level security;

-- Staff see their own profile; the admin sees and manages everyone.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role('admin'));
create policy profiles_admin on public.profiles for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- Public data: anyone may read, only the admin writes.
create policy price_groups_read on public.price_groups for select using (true);
create policy price_groups_admin on public.price_groups for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

create policy plots_read on public.plots for select using (true);
create policy plots_admin on public.plots for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

create policy facilities_read on public.facilities for select using (true);
create policy facilities_admin on public.facilities for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

create policy plot_distances_read on public.plot_distances for select using (true);
create policy plot_distances_admin on public.plot_distances for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
