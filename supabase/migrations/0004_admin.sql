-- Prio 5, the rest of the admin panel: drafts for page texts, the Over ons
-- blocks, replies to messages, who checked a plot, and a guard so the
-- campsite never ends up without an admin.

-- ---------------------------------------------------------------- guests and has_role()

-- Policies such as "status = 'published' or has_role(...)" call has_role()
-- for guests too. has_role() runs auth_role() as the caller, and anon was
-- not allowed to: every guest query that reached a draft row failed, and
-- the site quietly fell back to the content files. For a guest auth_role()
-- simply returns null (there is no profile), so anon may call it.
grant execute on function public.auth_role() to anon;

-- ---------------------------------------------------------------- texts: draft and publish

-- Bert edits a draft; "Publiceren" copies it to value_*, which the site
-- shows. A null draft means "same as published".
alter table public.texts
  add column draft_nl text,
  add column draft_en text,
  add column draft_de text,
  add column published_at timestamptz;

-- ---------------------------------------------------------------- Over ons blocks

-- The timeline (kind 'milestone': label = year, title, body = text) and the
-- team (kind 'team': label = name, body = role) on the Over ons page.
create table public.about_blocks (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  kind text not null check (kind in ('milestone', 'team')),
  sort int not null default 0,
  -- The chicken has a drawing instead of a photo.
  is_chicken boolean not null default false,
  photo_path text,
  label_nl text not null default '',
  label_en text,
  label_de text,
  title_nl text not null default '',
  title_en text,
  title_de text,
  body_nl text not null default '',
  body_en text,
  body_de text,
  status public.content_status not null default 'published',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid()
);

alter table public.about_blocks enable row level security;
create policy about_blocks_read on public.about_blocks for select
  using (status = 'published' or public.has_role('admin', 'reception', 'animation', 'seasonal'));
create policy about_blocks_admin on public.about_blocks for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- ---------------------------------------------------------------- messages: replies

alter table public.messages
  add column reply_text text check (length(reply_text) <= 5000),
  add column replied_at timestamptz;

-- ---------------------------------------------------------------- plots: who checked

alter table public.plots
  add column checked_by uuid references auth.users (id) on delete set null;

-- Keeps checked_at and checked_by in step with the toggle, whoever sets it.
create function public.plots_checked_stamp() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.checked and (tg_op = 'INSERT' or not old.checked) then
    new.checked_at := now();
    new.checked_by := auth.uid();
  elsif not new.checked then
    new.checked_at := null;
    new.checked_by := null;
  end if;
  return new;
end;
$$;

create trigger plots_checked_stamp
  before insert or update of checked on public.plots
  for each row execute function public.plots_checked_stamp();

-- ---------------------------------------------------------------- staff: keep one admin

-- A role change or removal that would leave no admin is refused, so Bert
-- can't lock himself (or anyone) out of the panel.
create function public.profiles_keep_admin() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
    raise exception 'last_admin' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger profiles_keep_admin
  before update of role or delete on public.profiles
  for each row execute function public.profiles_keep_admin();

revoke execute on function public.profiles_keep_admin() from public, anon, authenticated;
revoke execute on function public.plots_checked_stamp() from public, anon, authenticated;

-- ---------------------------------------------------------------- missing translations

create or replace view public.missing_translations with (security_invoker = true) as
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
  from public.media where alt_en is null or alt_de is null
  union all
  select 'about_blocks', id, 'label', label_en is null, label_de is null
  from public.about_blocks where label_en is null or label_de is null;
