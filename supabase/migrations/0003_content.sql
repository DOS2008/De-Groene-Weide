-- Prio 5: the content that Bert maintains in the admin panel. Until now it
-- lived in src/content; the seed copies it in once, after which the admin
-- panel is the source.

create type public.content_status as enum ('draft', 'published');
create type public.message_status as enum ('new', 'done');

-- ---------------------------------------------------------------- events

create table public.events (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  kind text not null check (kind in ('animals', 'play', 'pool', 'food')),
  age_group text not null default 'all' check (age_group in ('all', 'toddlers', 'kids', 'adults')),
  start_time text not null check (start_time ~ '^[0-2]\d:[0-5]\d$'),
  -- {"type":"once","date":…} | {"type":"daily","from":…,"until"?:…} |
  -- {"type":"weekly","weekdays":[1..7],"from":…,"until"?:…}
  recurrence jsonb not null check (recurrence ->> 'type' in ('once', 'daily', 'weekly')),
  skip_dates date[] not null default '{}',
  title_nl text not null,
  title_en text,
  title_de text,
  description_nl text not null default '',
  description_en text,
  description_de text,
  location_nl text not null default '',
  location_en text,
  location_de text,
  photo_path text,
  status public.content_status not null default 'draft',
  sample boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid()
);

-- ---------------------------------------------------------------- jokes

-- One joke per row, written per language (never translated word for word):
-- a language without its own joke simply doesn't show this one.
create table public.jokes (
  id text primary key default gen_random_uuid()::text,
  text_nl text,
  text_en text,
  text_de text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- messages

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 100),
  email text not null check (length(email) <= 200),
  subject text check (length(subject) <= 150),
  body text not null check (length(body) between 1 and 5000),
  locale text not null default 'nl' check (locale in ('nl', 'en', 'de')),
  status public.message_status not null default 'new',
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid references auth.users (id) on delete set null
);

create index messages_status_idx on public.messages (status, created_at desc);

-- ---------------------------------------------------------------- texts

-- Page texts that Bert edits. Each row overrides one UI text from
-- messages/<locale>.json, e.g. key "home.title". A null keeps the default.
create table public.texts (
  key text primary key check (key ~ '^[a-zA-Z0-9_.\[\]]+$'),
  value_nl text,
  value_en text,
  value_de text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid()
);

-- ---------------------------------------------------------------- media

create table public.media (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  -- Alt text is required in Dutch; the panel flags missing translations.
  alt_nl text not null check (length(trim(alt_nl)) > 0),
  alt_en text,
  alt_de text,
  width int,
  height int,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null default auth.uid()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------- RLS

alter table public.events enable row level security;
alter table public.jokes enable row level security;
alter table public.messages enable row level security;
alter table public.texts enable row level security;
alter table public.media enable row level security;

create policy events_read on public.events for select
  using (status = 'published' or public.has_role('admin', 'reception', 'animation', 'seasonal'));
create policy events_write on public.events for all to authenticated
  using (public.has_role('admin', 'reception', 'animation'))
  with check (public.has_role('admin', 'reception', 'animation'));

create policy jokes_read on public.jokes for select using (true);
create policy jokes_admin on public.jokes for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- Guests send messages through the contact form; only staff read them.
create policy messages_insert on public.messages for insert to anon, authenticated
  with check (status = 'new' and handled_at is null and handled_by is null);
create policy messages_staff on public.messages for select to authenticated
  using (public.has_role('admin', 'reception'));
create policy messages_update on public.messages for update to authenticated
  using (public.has_role('admin', 'reception')) with check (public.has_role('admin', 'reception'));
create policy messages_delete on public.messages for delete to authenticated
  using (public.has_role('admin'));

create policy texts_read on public.texts for select using (true);
create policy texts_admin on public.texts for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

create policy media_read on public.media for select using (true);
create policy media_write on public.media for all to authenticated
  using (public.has_role('admin', 'animation')) with check (public.has_role('admin', 'animation'));

create policy media_objects_read on storage.objects for select using (bucket_id = 'media');
create policy media_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.has_role('admin', 'animation'));
create policy media_objects_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.has_role('admin', 'animation'));
create policy media_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.has_role('admin', 'animation'));

-- Staff list for the users screen: names, roles and whether 2FA is set up.
-- Only the admin gets rows.
create function public.staff_overview()
returns table (id uuid, email text, display_name text, role public.app_role, has_2fa boolean, last_sign_in_at timestamptz)
language sql stable security definer
set search_path = public, auth
as $$
  select p.id, u.email::text, p.display_name, p.role,
    exists (select 1 from auth.mfa_factors f where f.user_id = p.id and f.status = 'verified'),
    u.last_sign_in_at
  from public.profiles p join auth.users u on u.id = p.id
  where public.has_role('admin')
  order by p.display_name
$$;
revoke execute on function public.staff_overview() from public, anon;
grant execute on function public.staff_overview() to authenticated;

-- Missing translations, for the start screen and the labels in the panel.
create view public.missing_translations with (security_invoker = true) as
  select 'events' as source, id as item, 'title' as field,
    title_en is null as missing_en, title_de is null as missing_de
  from public.events where title_en is null or title_de is null
  union all
  select 'facilities', id, 'name', name_en is null, name_de is null
  from public.facilities where name_en is null or name_de is null
  union all
  select 'texts', key, 'value', value_nl is not null and value_en is null, value_nl is not null and value_de is null
  from public.texts where value_nl is not null and (value_en is null or value_de is null)
  union all
  select 'media', id::text, 'alt', alt_en is null, alt_de is null
  from public.media where alt_en is null or alt_de is null;
