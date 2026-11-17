-- Prio 7, the Shoulds: Plekmatch counts, the farewell mail, and the audit
-- log with version history.

-- ---------------------------------------------------------------- Plekmatch (F7.1)

-- Only anonymous counts per day: how often the tips were shown and how
-- often a guest picked one. Never an answer, never a person.
create table public.plekmatch_stats (
  day date primary key,
  shown int not null default 0,
  picked int not null default 0
);
alter table public.plekmatch_stats enable row level security;
create policy plekmatch_stats_staff on public.plekmatch_stats for select to authenticated
  using (public.has_role('admin'));

create function public.plekmatch_count(p_event text) returns void
language sql volatile security definer
set search_path = public
as $$
  insert into public.plekmatch_stats (day, shown, picked)
  values ((now() at time zone 'Europe/Amsterdam')::date,
          case when p_event = 'shown' then 1 else 0 end,
          case when p_event = 'picked' then 1 else 0 end)
  on conflict (day) do update set
    shown = plekmatch_stats.shown + excluded.shown,
    picked = plekmatch_stats.picked + excluded.picked
$$;
revoke execute on function public.plekmatch_count(text) from public;
grant execute on function public.plekmatch_count(text) to anon, authenticated;

-- Near-match: the first stay of p_nights nights on this plot, from p_from
-- on, inside a season, that is free (no booking, no live hold, no block).
-- Looks up to 120 days ahead. Returns no row when there is none.
create function public.next_free_stay(p_plot text, p_nights int, p_from date)
returns table (arrival date, departure date)
language sql stable security definer
set search_path = public
as $$
  select d::date, (d + make_interval(days => p_nights))::date
  from generate_series(greatest(p_from, (now() at time zone 'Europe/Amsterdam')::date),
                       greatest(p_from, (now() at time zone 'Europe/Amsterdam')::date) + 120, interval '1 day') d
  where p_nights between 1 and 60
    and exists (
      select 1 from public.seasons s
      where d::date >= s.starts_on and (d + make_interval(days => p_nights))::date <= s.ends_on
    )
    and not exists (
      select 1 from public.reservations r
      where r.plot_id = p_plot
        and r.stay && daterange(d::date, (d + make_interval(days => p_nights))::date)
        and (r.status in ('requested', 'confirmed') or (r.status = 'held' and r.held_until > now()))
    )
    and not exists (
      select 1 from public.plot_blocks b
      where b.plot_id = p_plot and b.period && daterange(d::date, (d + make_interval(days => p_nights))::date)
    )
  order by d
  limit 1
$$;
revoke execute on function public.next_free_stay(text, int, date) from public;
grant execute on function public.next_free_stay(text, int, date) to anon, authenticated;

-- ---------------------------------------------------------------- farewell mail (F7.5)

alter table public.reservations add column farewell_sent_at timestamptz;

-- ---------------------------------------------------------------- audit log (F7.3)

-- Who changed what, when, with the old and new values. Personal data of
-- guests never goes in: for bookings only the facts (plot, dates, status).
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_name text,
  table_name text not null,
  row_key text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_data jsonb,
  new_data jsonb
);
create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_row_idx on public.audit_log (table_name, row_key, at desc);
alter table public.audit_log enable row level security;
create policy audit_log_admin on public.audit_log for select to authenticated
  using (public.has_role('admin'));

create function public.audit() returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_noise text[] := array['updated_at', 'updated_by'];
  v_key text;
begin
  if tg_table_name = 'reservations' then
    -- Holds come and go every minute and carry no decisions.
    if coalesce(v_old ->> 'status', 'held') = 'held' and coalesce(v_new ->> 'status', 'held') = 'held' then
      return null;
    end if;
    v_noise := v_noise || array['name', 'email', 'phone', 'remarks', 'cancel_reason', 'hold_token', 'held_until',
                                'manage_token_hash', 'reminder_sent_at', 'farewell_sent_at'];
  end if;
  v_old := v_old - v_noise;
  v_new := v_new - v_noise;
  if tg_op = 'UPDATE' and v_old = v_new then
    return null;
  end if;

  v_key := coalesce(
    coalesce(v_new, v_old) ->> 'id',
    coalesce(v_new, v_old) ->> 'key',
    coalesce(v_new, v_old) ->> 'year',
    (coalesce(v_new, v_old) ->> 'price_group_id') || ':' || (coalesce(v_new, v_old) ->> 'period_id')
  );
  insert into public.audit_log (actor, actor_name, table_name, row_key, action, old_data, new_data)
  values (
    auth.uid(),
    (select display_name from public.profiles where id = auth.uid()),
    tg_table_name,
    coalesce(v_key, '?'),
    lower(tg_op),
    v_old,
    v_new
  );
  return null;
end;
$$;
revoke execute on function public.audit() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'reservations', 'plot_blocks', 'plots', 'facilities', 'prices', 'price_periods', 'extras', 'seasons',
    'settings', 'events', 'jokes', 'texts', 'about_blocks', 'media', 'profiles'
  ] loop
    execute format(
      'create trigger audit after insert or update or delete on public.%I for each row execute function public.audit()', t);
  end loop;
end;
$$;

-- The log follows the same retention period as everything else.
create or replace function public.apply_retention() returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_cutoff date := (now() at time zone 'Europe/Amsterdam')::date
    - make_interval(months => public.setting_int('retention_months', 24));
  v_bookings int;
  v_messages int;
  v_mail int;
  v_audit int;
begin
  update public.reservations
  set name = null, email = null, phone = null, remarks = null, cancel_reason = null,
      manage_token_hash = null, anonymised_at = now()
  where anonymised_at is null and departure < v_cutoff and status <> 'held';
  get diagnostics v_bookings = row_count;

  delete from public.messages where created_at < v_cutoff;
  get diagnostics v_messages = row_count;

  delete from public.mail_outbox where created_at < now() - interval '30 days';
  get diagnostics v_mail = row_count;

  delete from public.audit_log where at < v_cutoff;
  get diagnostics v_audit = row_count;

  return jsonb_build_object('bookings', v_bookings, 'messages', v_messages, 'mail', v_mail, 'audit', v_audit);
end;
$$;
revoke execute on function public.apply_retention() from public, anon, authenticated;
