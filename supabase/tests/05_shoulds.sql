-- Prio 7: the audit log, the anonymous Plekmatch counts and the near-match
-- search. Rolled back by scripts/db/test.sh.

\set ON_ERROR_STOP on

insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bert@audit.test'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'receptie@audit.test');
insert into public.profiles (id, display_name, role) values
  ('00000000-0000-0000-0000-0000000000f1', 'Bert Audit', 'admin'),
  ('00000000-0000-0000-0000-0000000000f2', 'Receptie Audit', 'reception');

create function pg_temp.act_as(p_user text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

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
  ---------------------------------------------------------------- audit log
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000f1');
  update public.prices set price_per_night = 31 where price_group_id = 'camper' and period_id = 'peak';
  reset role;
  select * into r from public.audit_log where table_name = 'prices' and row_key = 'camper:peak' order by id desc limit 1;
  assert r.actor_name = 'Bert Audit' and r.action = 'update', 'a price change is logged with who did it';
  assert (r.new_data ->> 'price_per_night')::numeric = 31, 'with the new value';

  -- A booking: the facts are logged, the guest's details never.
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000f2');
  insert into public.reservations (id, plot_id, stay, status, source, name, adults, phone, email, remarks)
  values ('00000000-0000-0000-0000-0000000aa001', 'T20', '[2030-06-20,2030-06-22)', 'confirmed', 'phone',
          'Geheime Gast', 2, '0611111111', 'geheim@example.nl', 'Allergisch voor hanen');
  reset role;
  select * into r from public.audit_log where table_name = 'reservations' and row_key = '00000000-0000-0000-0000-0000000aa001';
  assert r.actor_name = 'Receptie Audit', 'the booking is logged with who entered it';
  assert r.new_data ->> 'plot_id' = 'T20', 'with the plot';
  assert not (r.new_data ? 'name' or r.new_data ? 'email' or r.new_data ? 'phone' or r.new_data ? 'remarks'),
    'but without the guest''s personal data';
  assert r.new_data::text not like '%Geheime%' and r.new_data::text not like '%geheim@%', 'not even as text';

  -- Holds come and go without a trace.
  select count(*) into n from public.audit_log;
  perform public.place_hold('T21', '2030-06-20', '2030-06-22', '00000000-0000-0000-0000-0000000aa0ff');
  select count(*) - n into n from public.audit_log;
  assert n = 0, 'a hold is not logged';

  -- Only the admin reads the log.
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000f2');
  select count(*) into n from public.audit_log;
  assert n = 0, 'reception cannot read the audit log';
  reset role;
  perform pg_temp.act_as_guest();
  select count(*) into n from public.audit_log;
  assert n = 0, 'a guest cannot read the audit log';
  reset role;
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000f1');
  select count(*) into n from public.audit_log;
  assert n > 0, 'Bert reads the audit log';
  reset role;

  ---------------------------------------------------------------- Plekmatch counts
  perform pg_temp.act_as_guest();
  perform public.plekmatch_count('shown');
  perform public.plekmatch_count('shown');
  perform public.plekmatch_count('picked');
  select count(*) into n from public.plekmatch_stats;
  assert n = 0, 'a guest adds to the counts but cannot read them';
  reset role;
  select * into r from public.plekmatch_stats where day = (now() at time zone 'Europe/Amsterdam')::date;
  assert r.shown >= 2 and r.picked >= 1, 'the counts add up';

  ---------------------------------------------------------------- next free stay
  insert into public.plot_blocks (plot_id, period, reason) values ('T22', '[2030-07-01,2030-07-05)', 'Onderhoud');
  insert into public.reservations (plot_id, stay, status, source, name, adults, phone)
  values ('T22', '[2030-07-05,2030-07-08)', 'confirmed', 'phone', 'Gast', 2, '0612');
  perform pg_temp.act_as_guest();
  select * into r from public.next_free_stay('T22', 3, '2030-07-01');
  assert r.arrival = '2030-07-08' and r.departure = '2030-07-11', 'skips the block and the booking';
  select * into r from public.next_free_stay('T22', 3, '2030-10-29');
  assert r.arrival >= '2031-01-01' or r.arrival is null, 'never across the end of the season';
  reset role;

  raise notice 'shoulds tests passed';
end;
$$;
