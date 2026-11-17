-- Prio 6: the guest's manage link and the retention job. Rolled back by
-- scripts/db/test.sh.

\set ON_ERROR_STOP on

-- A token of 48 characters; only its sha256 is stored.
insert into public.reservations (id, plot_id, stay, status, source, name, adults, email, manage_token_hash, locale)
values
  ('00000000-0000-0000-0000-00000000e001', 'T11', '[2030-08-10,2030-08-14)', 'confirmed', 'web', 'Gast Een', 2, 'een@example.nl',
   encode(extensions.digest(repeat('a', 48), 'sha256'), 'hex'), 'de'),
  ('00000000-0000-0000-0000-00000000e002', 'T12', '[2030-08-10,2030-08-14)', 'requested', 'web', 'Gast Twee', 2, 'twee@example.nl',
   encode(extensions.digest(repeat('b', 48), 'sha256'), 'hex'), 'nl'),
  -- Left long ago: personal data must go.
  ('00000000-0000-0000-0000-00000000e003', 'T13', '[2026-05-01,2026-05-03)', 'confirmed', 'phone', 'Oude Gast', 2, 'oud@example.nl',
   null, 'nl');
insert into public.messages (name, email, body, created_at) values ('Oud bericht', 'o@example.nl', 'Van heel lang geleden', now() - interval '5 years');

create function pg_temp.act_as_guest() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;

do $$
declare
  n int;
  r record;
  j jsonb;
begin
  perform pg_temp.act_as_guest();

  select * into r from public.manage_lookup(repeat('a', 48));
  assert r.code is not null, 'the manage link finds its booking';
  assert r.can_cancel, 'far ahead, the guest may cancel';
  assert r.locale = 'de', 'the page knows the booking language';
  select count(*) into n from public.manage_lookup(repeat('c', 48));
  assert n = 0, 'a wrong token finds nothing';
  select count(*) into n from public.manage_lookup('short');
  assert n = 0, 'a malformed token finds nothing';

  j := public.manage_cancel(repeat('a', 48));
  assert j ->> 'status' = 'cancelled', 'the guest cancels through the link';
  j := public.manage_cancel(repeat('a', 48));
  assert j ->> 'status' = 'already_cancelled', 'a second click changes nothing';
  j := public.manage_cancel(repeat('c', 48));
  assert j ->> 'status' = 'not_found', 'a wrong token cancels nothing';
  reset role;

  -- Bert's condition: with 3000 free days, 2030 is already too late.
  update public.settings set value = '3000' where key = 'cancel_free_days';
  perform pg_temp.act_as_guest();
  select * into r from public.manage_lookup(repeat('b', 48));
  assert not r.can_cancel, 'past the free period the page offers no cancel';
  j := public.manage_cancel(repeat('b', 48));
  assert j ->> 'status' = 'too_late', 'and the function refuses it';
  reset role;
  select count(*) into n from public.reservations where id = '00000000-0000-0000-0000-00000000e002' and status = 'requested';
  assert n = 1, 'the booking stays';

  -- 0 days: online cancelling is off.
  update public.settings set value = '0' where key = 'cancel_free_days';
  j := public.manage_cancel(repeat('b', 48));
  assert j ->> 'status' = 'too_late', 'with 0 days guests never cancel online';

  ---------------------------------------------------------------- retention
  update public.settings set value = '6' where key = 'retention_months';
  j := public.apply_retention();
  assert (j ->> 'bookings')::int >= 1, 'old bookings are anonymised';
  select * into r from public.reservations where id = '00000000-0000-0000-0000-00000000e003';
  assert r.name is null and r.email is null and r.phone is null and r.anonymised_at is not null,
    'name, email and phone are gone';
  assert r.plot_id = 'T13' and r.status = 'confirmed', 'the booking itself stays for the figures';
  select count(*) into n from public.reservations where id = '00000000-0000-0000-0000-00000000e002' and name is not null;
  assert n = 1, 'future bookings keep their details';
  select count(*) into n from public.messages where email = 'o@example.nl';
  assert n = 0, 'old messages are deleted';

  -- Guests can't run the retention job.
  perform pg_temp.act_as_guest();
  begin
    perform public.apply_retention();
    raise exception 'a guest may not run apply_retention';
  exception when insufficient_privilege then null;
  end;
  reset role;

  ---------------------------------------------------------------- booking level 2
  update public.settings set value = '2' where key = 'booking_level';
  perform pg_temp.act_as_guest();
  j := public.place_hold('T14', '2030-09-01', '2030-09-04', '00000000-0000-0000-0000-00000000f001');
  assert j ->> 'status' = 'held', 'level 2: the hold works as before';
  j := public.confirm_reservation((j ->> 'id')::uuid, '00000000-0000-0000-0000-00000000f001', 'Direct', 'direct@example.nl', null,
    2, 0, 0, 'tent', false, null, 'en');
  assert j ->> 'status' = 'confirmed', 'level 2 confirms straight away';
  reset role;
  update public.settings set value = '1' where key = 'booking_level';
  perform pg_temp.act_as_guest();
  j := public.place_hold('T15', '2030-09-01', '2030-09-04', '00000000-0000-0000-0000-00000000f002');
  j := public.confirm_reservation((j ->> 'id')::uuid, '00000000-0000-0000-0000-00000000f002', 'Aanvraag', 'a@example.nl', null,
    2, 0, 0, 'tent', false, null, 'nl');
  assert j ->> 'status' = 'requested', 'level 1 makes a request';
  reset role;

  raise notice 'launch tests passed';
end;
$$;
