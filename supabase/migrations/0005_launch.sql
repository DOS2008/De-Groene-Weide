-- Prio 6: the guest's manage link, a retry queue for mail, and the
-- retention job that removes personal data after Bert's retention period.

-- ---------------------------------------------------------------- manage link (F4.6)

-- The booking behind a manage link, without anything the guest didn't type
-- in themselves. Only the sha256 of the token is stored, so the link can't
-- be rebuilt from the database.
create function public.manage_lookup(p_token text)
returns table (
  code text,
  plot_id text,
  arrival date,
  departure date,
  status public.reservation_status,
  name text,
  adults int,
  children int,
  dogs int,
  locale text,
  price_total numeric,
  cancel_until date,
  can_cancel boolean
)
language sql stable security definer
set search_path = public, extensions
as $$
  select
    r.code, r.plot_id, r.arrival, r.departure, r.status, r.name, r.adults, r.children, r.dogs, r.locale, r.price_total,
    r.arrival - public.setting_int('cancel_free_days', 14),
    r.status in ('requested', 'confirmed')
      and public.setting_int('cancel_free_days', 14) > 0
      and (now() at time zone 'Europe/Amsterdam')::date <= r.arrival - public.setting_int('cancel_free_days', 14)
  from public.reservations r
  where p_token is not null
    and length(p_token) = 48
    and r.manage_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and r.status <> 'held'
$$;

-- Cancels through the manage link, under Bert's condition: up to
-- cancel_free_days before arrival. Returns {status: cancelled | too_late |
-- not_found | already_cancelled, id}.
create function public.manage_cancel(p_token text)
returns jsonb
language plpgsql volatile security definer
set search_path = public, extensions
as $$
declare
  v_row public.reservations;
  v_days int := public.setting_int('cancel_free_days', 14);
begin
  select * into v_row from public.reservations
  where p_token is not null and length(p_token) = 48
    and manage_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and status <> 'held'
  for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_row.status = 'cancelled' then
    return jsonb_build_object('status', 'already_cancelled');
  end if;
  if v_days <= 0 or (now() at time zone 'Europe/Amsterdam')::date > v_row.arrival - v_days then
    return jsonb_build_object('status', 'too_late');
  end if;
  update public.reservations
  set status = 'cancelled', cancel_reason = 'Geannuleerd door de gast (beheerlink)'
  where id = v_row.id;
  return jsonb_build_object('status', 'cancelled', 'id', v_row.id);
end;
$$;

revoke execute on function public.manage_lookup(text) from public;
revoke execute on function public.manage_cancel(text) from public;
grant execute on function public.manage_lookup(text) to anon, authenticated;
grant execute on function public.manage_cancel(text) to anon, authenticated;

-- ---------------------------------------------------------------- mail retries (F4.5)

-- A mail that couldn't be sent waits here; the jobs endpoint retries it with
-- a growing pause. No policies: only the service role reads or writes it.
create table public.mail_outbox (
  id uuid primary key default gen_random_uuid(),
  to_address text not null,
  reply_to text,
  subject text not null,
  body_text text not null,
  body_html text,
  attempts int not null default 1,
  last_error text,
  next_attempt_at timestamptz not null default now() + interval '5 minutes',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index mail_outbox_due_idx on public.mail_outbox (next_attempt_at) where sent_at is null;
alter table public.mail_outbox enable row level security;

-- ---------------------------------------------------------------- retention (AVG)

-- After the retention period the booking stays (for the books and the
-- occupancy figures), but the person is gone.
alter table public.reservations add column anonymised_at timestamptz;

alter table public.reservations drop constraint booked_has_contact;
alter table public.reservations add constraint booked_has_contact check (
  status in ('held', 'cancelled')
  or anonymised_at is not null
  or (name is not null and adults is not null and (email is not null or phone is not null))
);

-- Runs every night. retention_months is Bert's setting (default 24).
create function public.apply_retention() returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_cutoff date := (now() at time zone 'Europe/Amsterdam')::date
    - make_interval(months => public.setting_int('retention_months', 24));
  v_bookings int;
  v_messages int;
  v_mail int;
begin
  update public.reservations
  set name = null, email = null, phone = null, remarks = null, cancel_reason = null,
      manage_token_hash = null, anonymised_at = now()
  where anonymised_at is null and departure < v_cutoff and status <> 'held';
  get diagnostics v_bookings = row_count;

  delete from public.messages where created_at < v_cutoff;
  get diagnostics v_messages = row_count;

  -- Mail holds addresses too: sent or given up after 30 days is enough.
  delete from public.mail_outbox where created_at < now() - interval '30 days';
  get diagnostics v_mail = row_count;

  return jsonb_build_object('bookings', v_bookings, 'messages', v_messages, 'mail', v_mail);
end;
$$;

revoke execute on function public.apply_retention() from public, anon, authenticated;

do $$
begin
  perform cron.schedule('apply-retention', '30 3 * * *', $job$select public.apply_retention()$job$);
exception when others then
  raise notice 'pg_cron not available, run select public.apply_retention() by hand: %', sqlerrm;
end;
$$;
