-- Roles from Plan.md, "Rollen": each role tries a forbidden action through
-- the same path as the API (role authenticated + JWT claims), and RLS must
-- refuse it. Rolled back by scripts/db/test.sh.

\set ON_ERROR_STOP on

insert into auth.users (id, instance_id, aud, role, email)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bert@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'receptie@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'animatie@test.local'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seizoen@test.local');

insert into public.profiles (id, display_name, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'Bert', 'admin'),
  ('00000000-0000-0000-0000-0000000000a2', 'Receptie', 'reception'),
  ('00000000-0000-0000-0000-0000000000a3', 'Animatie', 'animation'),
  ('00000000-0000-0000-0000-0000000000a4', 'Seizoen', 'seasonal');

insert into public.reservations (id, plot_id, stay, status, source, name, adults, email)
values ('00000000-0000-0000-0000-00000000b001', 'T5', '[2030-06-10,2030-06-12)', 'requested', 'web', 'Gast', 2, 'gast@example.nl');

-- Acts as a staff member. aal = 'aal2' means 2FA was passed.
create function pg_temp.act_as(p_user text, p_aal text default 'aal2') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
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
begin
  ---------------------------------------------------------------- guest
  perform pg_temp.act_as_guest();
  select count(*) into n from public.reservations;
  assert n = 0, 'a guest sees no reservations';
  select count(*) into n from public.plots;
  assert n = 60, 'a guest reads the plots';
  begin
    insert into public.reservations (plot_id, stay, status, source, name, adults, email)
    values ('T6', '[2030-06-10,2030-06-12)', 'confirmed', 'phone', 'Hacker', 1, 'h@example.nl');
    raise exception 'guest insert should fail';
  exception when insufficient_privilege then null;
  end;
  update public.plots set checked = true where id = 'T1';
  get diagnostics n = row_count;
  assert n = 0, 'a guest cannot change plots';
  reset role;

  ---------------------------------------------------------------- without 2FA
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1', 'aal1');
  select count(*) into n from public.reservations;
  assert n = 0, 'without 2FA even Bert sees no reservations';
  reset role;

  ---------------------------------------------------------------- seasonal
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a4');
  select count(*) into n from public.reservations where id = '00000000-0000-0000-0000-00000000b001';
  assert n = 1, 'a seasonal worker reads reservations';
  update public.reservations set status = 'confirmed' where id = '00000000-0000-0000-0000-00000000b001';
  get diagnostics n = row_count;
  assert n = 0, 'a seasonal worker cannot confirm';
  begin
    insert into public.plot_blocks (plot_id, period, reason) values ('T7', '[2030-06-01,2030-06-02)', 'x');
    raise exception 'seasonal block should fail';
  exception when insufficient_privilege then null;
  end;
  reset role;

  ---------------------------------------------------------------- animation
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a3');
  select count(*) into n from public.reservations;
  assert n = 0, 'animation sees no reservations';
  reset role;

  ---------------------------------------------------------------- reception
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
  update public.reservations set status = 'confirmed' where id = '00000000-0000-0000-0000-00000000b001';
  get diagnostics n = row_count;
  assert n = 1, 'reception can confirm';
  insert into public.plot_blocks (plot_id, period, reason) values ('T7', '[2030-06-01,2030-06-02)', 'Onderhoud');
  insert into public.reservations (plot_id, stay, status, source, name, adults, phone)
  values ('T8', '[2030-06-01,2030-06-03)', 'confirmed', 'phone', 'Telefoon', 2, '0612345678');
  update public.plots set checked = true where id = 'T1';
  get diagnostics n = row_count;
  assert n = 0, 'reception cannot edit plots';
  update public.settings set value = '2' where key = 'booking_level';
  get diagnostics n = row_count;
  assert n = 0, 'reception cannot change settings';
  select count(*) into n from public.profiles;
  assert n = 1, 'reception sees only its own profile';
  reset role;

  ---------------------------------------------------------------- admin
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
  update public.plots set checked = true where id = 'T1';
  get diagnostics n = row_count;
  assert n = 1, 'Bert can edit plots';
  select count(*) into n from public.profiles;
  assert n >= 4, 'Bert sees every profile';
  reset role;

  raise notice 'role tests passed';
end;
$$;
