-- Prio 3: booking level 1. Reservations, blocks, seasons, prices and
-- settings, with the rules that make a double booking impossible.
--
-- The rules live in the database, not in the app:
--   * an exclusion constraint refuses overlapping nights on one plot;
--   * a trigger checks the season, the minimum stay and plot blocks, and
--     locks the plot row so blocks and bookings can't race each other;
--   * guests only reach reservations through security definer functions
--     that never return another guest's personal data.

create extension if not exists pgcrypto with schema extensions;

create type public.reservation_status as enum ('held', 'requested', 'confirmed', 'cancelled');
create type public.reservation_source as enum ('web', 'phone', 'desk');

-- ---------------------------------------------------------------- settings

create table public.settings (
  key text primary key,
  value jsonb not null,
  -- Private settings are only visible to staff.
  public boolean not null default true,
  updated_at timestamptz not null default now()
);

create function public.setting(p_key text) returns jsonb
language sql stable security definer
set search_path = public
as $$ select value from public.settings where key = p_key $$;

create function public.setting_int(p_key text, p_default int) returns int
language sql stable security definer
set search_path = public
as $$
  select coalesce((select (value #>> '{}')::int from public.settings where key = p_key), p_default)
$$;

-- ---------------------------------------------------------------- seasons and prices

-- The opening season per year. A stay must arrive and leave inside it: the
-- last night is the night before ends_on.
create table public.seasons (
  year int primary key,
  starts_on date not null,
  ends_on date not null,
  check (starts_on < ends_on),
  check (extract(year from starts_on) = year and extract(year from ends_on) = year)
);

-- Price periods within the season, as month-day ranges. The period without
-- dates ('low') covers every night that falls in no other period.
create table public.price_periods (
  id text primary key,
  starts_md text check (starts_md ~ '^\d\d-\d\d$'),
  ends_md text check (ends_md ~ '^\d\d-\d\d$'),
  name_nl text not null,
  name_en text,
  name_de text,
  sort int not null default 0,
  check ((starts_md is null) = (ends_md is null))
);

-- Price per night. Null until Bert supplies it; the site shows a placeholder.
create table public.prices (
  price_group_id text not null references public.price_groups (id) on delete cascade,
  period_id text not null references public.price_periods (id) on delete cascade,
  price_per_night numeric(8, 2) check (price_per_night >= 0),
  primary key (price_group_id, period_id)
);

-- Extra costs: tourist tax, electricity, a dog.
create table public.extras (
  id text primary key,
  amount numeric(8, 2) check (amount >= 0),
  per text not null check (per in ('person_night', 'night', 'stay')),
  name_nl text not null,
  name_en text,
  name_de text,
  unit_nl text not null default '',
  unit_en text,
  unit_de text,
  sort int not null default 0
);

-- ---------------------------------------------------------------- reservations

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  -- Booking number shown to guests and Bert, e.g. GW-4F7K2Q.
  code text not null unique default ('GW-' || upper(substr(md5(gen_random_uuid()::text), 1, 6))),
  plot_id text not null references public.plots (id),
  -- Nights from arrival up to (not including) departure.
  stay daterange not null,
  -- Copies of the range bounds, for sorting and filtering through the API.
  arrival date generated always as (lower(stay)) stored,
  departure date generated always as (upper(stay)) stored,
  status public.reservation_status not null,
  source public.reservation_source not null default 'web',
  adults int check (adults between 1 and 20),
  children int not null default 0 check (children between 0 and 20),
  dogs int not null default 0 check (dogs between 0 and 5),
  accommodation text check (accommodation in ('tent', 'caravan', 'camper', 'safari_tent')),
  electricity boolean not null default false,
  -- Contact details. Never any payment data.
  name text,
  email text,
  phone text,
  remarks text check (length(remarks) <= 2000),
  locale text not null default 'nl' check (locale in ('nl', 'en', 'de')),
  -- Price at the moment of booking, for the confirmation email.
  price_total numeric(10, 2),
  held_until timestamptz,
  hold_token uuid,
  manage_token_hash text unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  reminder_sent_at timestamptz,

  constraint stay_is_nights check (
    not isempty(stay) and lower_inc(stay) and not upper_inc(stay)
    and lower(stay) is not null and upper(stay) is not null
  ),
  constraint held_has_expiry check (
    status <> 'held' or (held_until is not null and hold_token is not null)
  ),
  constraint booked_has_contact check (
    status in ('held', 'cancelled')
    or (name is not null and adults is not null and (email is not null or phone is not null))
  ),
  -- THE rule: one plot, one active booking per night.
  constraint no_double_booking exclude using gist (plot_id with =, stay with &&)
    where (status <> 'cancelled')
);

create index reservations_status_idx on public.reservations (status);
create index reservations_arrival_idx on public.reservations (arrival);
create index reservations_hold_token_idx on public.reservations (hold_token) where status = 'held';

create table public.plot_blocks (
  id uuid primary key default gen_random_uuid(),
  plot_id text not null references public.plots (id) on delete cascade,
  period daterange not null check (not isempty(period)),
  reason text not null check (length(reason) between 1 and 500),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint no_block_overlap exclude using gist (plot_id with =, period with &&)
);

-- ---------------------------------------------------------------- rules

-- Raises a readable error key when a stay is not allowed. The app turns the
-- key into a sentence (messages: booking.errors.<key>).
create function public.check_stay(p_stay daterange) returns void
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_arrival date := lower(p_stay);
  v_departure date := upper(p_stay);
  v_season public.seasons;
begin
  if v_arrival is null or v_departure is null or v_departure <= v_arrival then
    raise exception 'departure_before_arrival' using errcode = 'P0001';
  end if;

  select * into v_season from public.seasons
  where v_arrival >= starts_on and v_arrival <= ends_on;

  if not found then
    raise exception 'outside_season' using errcode = 'P0001';
  end if;
  if v_arrival = v_season.ends_on then
    raise exception 'arrival_on_last_day' using errcode = 'P0001';
  end if;
  if v_departure > v_season.ends_on then
    raise exception 'stay_crosses_season_end' using errcode = 'P0001';
  end if;
  if v_departure - v_arrival < public.setting_int('min_nights', 1) then
    raise exception 'too_few_nights' using errcode = 'P0001';
  end if;
  if v_departure - v_arrival > public.setting_int('max_nights', 28) then
    raise exception 'too_many_nights' using errcode = 'P0001';
  end if;
end;
$$;

-- Runs before every insert or change of a reservation, whoever makes it
-- (guest, phone booking, admin edit). Same rules for everyone.
create function public.reservations_guard() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.status = 'cancelled' then
    if tg_op = 'UPDATE' and old.status <> 'cancelled' then
      new.cancelled_at := coalesce(new.cancelled_at, now());
    end if;
    return new;
  end if;
  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status <> 'confirmed') then
    new.confirmed_at := coalesce(new.confirmed_at, now());
  end if;

  if tg_op = 'INSERT'
     or new.stay is distinct from old.stay
     or new.plot_id is distinct from old.plot_id
     or old.status = 'cancelled' then
    -- Lock the plot: bookings and blocks for one plot happen one at a time.
    perform 1 from public.plots where id = new.plot_id and active for update;
    if not found then
      raise exception 'plot_not_found' using errcode = 'P0001';
    end if;

    perform public.check_stay(new.stay);

    if exists (
      select 1 from public.plot_blocks b
      where b.plot_id = new.plot_id and b.period && new.stay
    ) then
      raise exception 'plot_blocked' using errcode = 'P0001';
    end if;

    -- An expired hold doesn't count: clear it so the constraint lets this in.
    delete from public.reservations r
    where r.plot_id = new.plot_id
      and r.status = 'held'
      and r.held_until < now()
      and r.stay && new.stay
      and r.id <> new.id;
  end if;
  return new;
end;
$$;

create trigger reservations_guard
  before insert or update on public.reservations
  for each row execute function public.reservations_guard();

-- A block may not cover nights that are already booked.
create function public.plot_blocks_guard() returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  perform 1 from public.plots where id = new.plot_id for update;
  if exists (
    select 1 from public.reservations r
    where r.plot_id = new.plot_id
      and r.stay && new.period
      and (r.status in ('requested', 'confirmed') or (r.status = 'held' and r.held_until > now()))
  ) then
    raise exception 'block_overlaps_reservation' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger plot_blocks_guard
  before insert or update on public.plot_blocks
  for each row execute function public.plot_blocks_guard();

-- ---------------------------------------------------------------- guest functions

-- Status of every plot for a stay: free, taken or blocked. Never returns
-- personal data. A plot held with the caller's own token counts as free.
create function public.availability(p_arrival date, p_departure date, p_token uuid default null)
returns table (plot_id text, status text)
language sql stable security definer
set search_path = public
as $$
  select
    p.id,
    case
      when exists (
        select 1 from public.plot_blocks b
        where b.plot_id = p.id and b.period && daterange(p_arrival, p_departure)
      ) then 'blocked'
      when exists (
        select 1 from public.reservations r
        where r.plot_id = p.id
          and r.stay && daterange(p_arrival, p_departure)
          and (
            r.status in ('requested', 'confirmed')
            or (r.status = 'held' and r.held_until > now() and r.hold_token is distinct from p_token)
          )
      ) then 'taken'
      else 'free'
    end
  from public.plots p
  where p.active
  order by p.sort
$$;

-- Holds a plot for this visitor (hold_minutes, default 15). Returns
-- {status: held | taken | blocked | too_many_holds | <error key>, id, held_until}.
-- p_release frees the visitor's previous hold, so picking another plot
-- never costs a second hold.
create function public.place_hold(
  p_plot text,
  p_arrival date,
  p_departure date,
  p_token uuid,
  p_release uuid default null
) returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_stay daterange;
  v_row public.reservations;
  v_active int;
begin
  if p_token is null then
    raise exception 'missing_token' using errcode = 'P0001';
  end if;
  if p_arrival is null or p_departure is null or p_departure <= p_arrival then
    return jsonb_build_object('status', 'departure_before_arrival');
  end if;
  v_stay := daterange(p_arrival, p_departure);
  if p_arrival < (now() at time zone 'Europe/Amsterdam')::date then
    return jsonb_build_object('status', 'arrival_in_past');
  end if;

  if p_release is not null then
    delete from public.reservations
    where id = p_release and hold_token = p_token and status = 'held';
  end if;

  -- Clicking the same plot twice returns the same hold.
  select * into v_row from public.reservations
  where hold_token = p_token and status = 'held' and held_until > now()
    and plot_id = p_plot and stay = v_stay;
  if found then
    return jsonb_build_object('status', 'held', 'id', v_row.id, 'held_until', v_row.held_until);
  end if;

  select count(*) into v_active from public.reservations
  where hold_token = p_token and status = 'held' and held_until > now();
  if v_active >= public.setting_int('max_holds_per_visitor', 2) then
    return jsonb_build_object('status', 'too_many_holds');
  end if;

  begin
    insert into public.reservations (plot_id, stay, status, source, held_until, hold_token)
    values (
      p_plot, v_stay, 'held', 'web',
      now() + make_interval(mins => public.setting_int('hold_minutes', 15)),
      p_token
    )
    returning * into v_row;
  exception
    when exclusion_violation then
      return jsonb_build_object('status', 'taken');
    when raise_exception then
      if sqlerrm = 'plot_blocked' then
        return jsonb_build_object('status', 'blocked');
      end if;
      return jsonb_build_object('status', sqlerrm);
  end;

  return jsonb_build_object('status', 'held', 'id', v_row.id, 'held_until', v_row.held_until);
end;
$$;

create function public.release_hold(p_id uuid, p_token uuid) returns void
language sql volatile security definer
set search_path = public
as $$
  delete from public.reservations where id = p_id and hold_token = p_token and status = 'held'
$$;

-- The visitor's own hold, to restore the flow after a page reload.
create function public.hold_info(p_id uuid, p_token uuid)
returns table (plot_id text, arrival date, departure date, held_until timestamptz)
language sql stable security definer
set search_path = public
as $$
  select r.plot_id, lower(r.stay), upper(r.stay), r.held_until
  from public.reservations r
  where r.id = p_id and r.hold_token = p_token and r.status = 'held' and r.held_until > now()
$$;

-- Turns the visitor's hold into a booking. Level 1: 'requested', Bert
-- confirms. Level 2: 'confirmed' straight away. Returns
-- {status, code, manage_token} or {status: expired | <error key>}.
-- The manage token is returned once; only its hash is stored.
create function public.confirm_reservation(
  p_id uuid,
  p_token uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_adults int,
  p_children int,
  p_dogs int,
  p_accommodation text,
  p_electricity boolean,
  p_remarks text,
  p_locale text
) returns jsonb
language plpgsql volatile security definer
set search_path = public, extensions
as $$
declare
  v_row public.reservations;
  v_max int;
  v_status public.reservation_status;
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  select * into v_row from public.reservations
  where id = p_id and hold_token = p_token and status = 'held'
  for update;
  if not found or v_row.held_until < now() then
    return jsonb_build_object('status', 'expired');
  end if;

  if coalesce(trim(p_name), '') = '' then
    return jsonb_build_object('status', 'name_required');
  end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('status', 'email_invalid');
  end if;
  if coalesce(p_adults, 0) < 1 then
    return jsonb_build_object('status', 'adults_required');
  end if;

  select max_persons into v_max from public.plots where id = v_row.plot_id;
  if p_adults + coalesce(p_children, 0) > v_max then
    return jsonb_build_object('status', 'too_many_persons');
  end if;

  v_status := case when public.setting_int('booking_level', 1) >= 2 then 'confirmed' else 'requested' end;

  update public.reservations set
    status = v_status,
    name = trim(p_name),
    email = lower(trim(p_email)),
    phone = nullif(trim(coalesce(p_phone, '')), ''),
    adults = p_adults,
    children = coalesce(p_children, 0),
    dogs = coalesce(p_dogs, 0),
    accommodation = p_accommodation,
    electricity = coalesce(p_electricity, false),
    remarks = nullif(trim(coalesce(p_remarks, '')), ''),
    locale = coalesce(p_locale, 'nl'),
    held_until = null,
    hold_token = null,
    manage_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex')
  where id = p_id;

  return jsonb_build_object('status', v_status, 'id', v_row.id, 'code', v_row.code, 'manage_token', v_token);
end;
$$;

-- ---------------------------------------------------------------- cleanup

-- Expired holds are deleted every minute. Correctness doesn't depend on it:
-- the guard trigger and availability() already ignore expired holds.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'delete-expired-holds',
    '* * * * *',
    $job$delete from public.reservations where status = 'held' and held_until < now()$job$
  );
exception when others then
  raise notice 'pg_cron not available, expired holds are cleaned on use: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------- privileges

revoke execute on function public.check_stay(daterange) from public, anon, authenticated;
revoke execute on function public.reservations_guard() from public, anon, authenticated;
revoke execute on function public.plot_blocks_guard() from public, anon, authenticated;
revoke execute on function public.setting(text) from public;
revoke execute on function public.setting_int(text, int) from public;
grant execute on function public.setting(text) to anon, authenticated;
grant execute on function public.setting_int(text, int) to anon, authenticated;

revoke execute on function public.availability(date, date, uuid) from public;
revoke execute on function public.place_hold(text, date, date, uuid, uuid) from public;
revoke execute on function public.release_hold(uuid, uuid) from public;
revoke execute on function public.hold_info(uuid, uuid) from public;
revoke execute on function public.confirm_reservation(uuid, uuid, text, text, text, int, int, int, text, boolean, text, text) from public;
grant execute on function public.availability(date, date, uuid) to anon, authenticated;
grant execute on function public.place_hold(text, date, date, uuid, uuid) to anon, authenticated;
grant execute on function public.release_hold(uuid, uuid) to anon, authenticated;
grant execute on function public.hold_info(uuid, uuid) to anon, authenticated;
grant execute on function public.confirm_reservation(uuid, uuid, text, text, text, int, int, int, text, boolean, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- RLS

alter table public.settings enable row level security;
alter table public.seasons enable row level security;
alter table public.price_periods enable row level security;
alter table public.prices enable row level security;
alter table public.extras enable row level security;
alter table public.reservations enable row level security;
alter table public.plot_blocks enable row level security;

create policy settings_read on public.settings for select
  using (public or public.has_role('admin', 'reception', 'animation', 'seasonal'));
create policy settings_admin on public.settings for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

create policy seasons_read on public.seasons for select using (true);
create policy seasons_admin on public.seasons for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
create policy price_periods_read on public.price_periods for select using (true);
create policy price_periods_admin on public.price_periods for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
create policy prices_read on public.prices for select using (true);
create policy prices_admin on public.prices for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
create policy extras_read on public.extras for select using (true);
create policy extras_admin on public.extras for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- Guests have no policy at all: they only use the functions above.
create policy reservations_read on public.reservations for select to authenticated
  using (public.has_role('admin', 'reception', 'seasonal'));
create policy reservations_insert on public.reservations for insert to authenticated
  with check (public.has_role('admin', 'reception') and status <> 'held' and source in ('phone', 'desk'));
create policy reservations_update on public.reservations for update to authenticated
  using (public.has_role('admin', 'reception')) with check (public.has_role('admin', 'reception'));
create policy reservations_delete on public.reservations for delete to authenticated
  using (public.has_role('admin'));

create policy plot_blocks_read on public.plot_blocks for select to authenticated
  using (public.has_role('admin', 'reception', 'seasonal'));
create policy plot_blocks_write on public.plot_blocks for all to authenticated
  using (public.has_role('admin', 'reception')) with check (public.has_role('admin', 'reception'));
