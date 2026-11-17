-- Roles on the content tables from Prio 5 (F1.3): events, jokes, messages,
-- texts, media, Over ons blocks, prices, seasons, settings and the staff
-- list. Each role tries what it may and may not do; RLS must decide.
-- Rolled back by scripts/db/test.sh.

\set ON_ERROR_STOP on

insert into auth.users (id, instance_id, aud, role, email)
values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bert@content.test'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'receptie@content.test'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'animatie@content.test'),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seizoen@content.test');

insert into public.profiles (id, display_name, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'Bert', 'admin'),
  ('00000000-0000-0000-0000-0000000000c2', 'Receptie', 'reception'),
  ('00000000-0000-0000-0000-0000000000c3', 'Animatie', 'animation'),
  ('00000000-0000-0000-0000-0000000000c4', 'Seizoen', 'seasonal');

insert into public.events (id, kind, start_time, recurrence, title_nl, status)
values ('test-concept', 'play', '10:00', '{"type":"once","date":"2030-07-01"}', 'Concept', 'draft');
insert into public.about_blocks (id, kind, label_nl, status) values ('test-draft', 'milestone', 'Geheim', 'draft');
insert into public.messages (id, name, email, body) values ('00000000-0000-0000-0000-00000000d001', 'Gast', 'g@example.nl', 'Hallo Bert!');

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
begin
  ---------------------------------------------------------------- guest
  perform pg_temp.act_as_guest();
  select count(*) into n from public.events where id = 'test-concept';
  assert n = 0, 'a guest never sees a draft event';
  select count(*) into n from public.about_blocks where id = 'test-draft';
  assert n = 0, 'a guest never sees a draft Over ons block';
  select count(*) into n from public.messages;
  assert n = 0, 'a guest reads no messages';
  insert into public.messages (name, email, body) values ('Gast 2', 'g2@example.nl', 'Mag de hond mee?');
  begin
    insert into public.messages (name, email, body, status) values ('Slim', 's@example.nl', 'x', 'done');
    raise exception 'a guest may not send a message that is already done';
  exception when insufficient_privilege then null;
  end;
  update public.jokes set active = false;
  get diagnostics n = row_count;
  assert n = 0, 'a guest cannot change jokes';
  update public.texts set value_nl = 'gehackt';
  get diagnostics n = row_count;
  assert n = 0, 'a guest cannot change texts';
  update public.prices set price_per_night = 1;
  get diagnostics n = row_count;
  assert n = 0, 'a guest cannot change prices';
  begin
    perform public.staff_overview();
    raise exception 'a guest may not call staff_overview';
  exception when insufficient_privilege then null;
  end;
  reset role;

  ---------------------------------------------------------------- seasonal (read only)
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000c4');
  select count(*) into n from public.events where id = 'test-concept';
  assert n = 1, 'staff see draft events';
  begin
    insert into public.events (id, kind, start_time, recurrence, title_nl)
    values ('seizoen', 'play', '10:00', '{"type":"once","date":"2030-07-01"}', 'Nee');
    raise exception 'seasonal may not create events';
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from public.messages;
  assert n = 0, 'seasonal reads no messages';
  begin
    insert into public.media (path, alt_nl) values ('x/seizoen.jpg', 'Nee');
    raise exception 'seasonal may not add media';
  exception when insufficient_privilege then null;
  end;
  reset role;

  ---------------------------------------------------------------- animation (events, photos)
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000c3');
  insert into public.events (id, kind, start_time, recurrence, title_nl)
  values ('animatie-test', 'play', '11:00', '{"type":"once","date":"2030-07-02"}', 'Speurtocht');
  update public.events set status = 'published' where id = 'animatie-test';
  get diagnostics n = row_count;
  assert n = 1, 'animation publishes events';
  insert into public.media (path, alt_nl) values ('x/animatie.jpg', 'Kinderen bij de kippen');
  begin
    insert into public.media (path, alt_nl) values ('x/geen-alt.jpg', '  ');
    raise exception 'media without alt text must fail';
  exception when check_violation then null;
  end;
  select count(*) into n from public.messages;
  assert n = 0, 'animation reads no messages';
  update public.settings set value = '2' where key = 'booking_level';
  get diagnostics n = row_count;
  assert n = 0, 'animation cannot change settings';
  update public.about_blocks set label_nl = 'x';
  get diagnostics n = row_count;
  assert n = 0, 'animation cannot edit Over ons';
  reset role;

  ---------------------------------------------------------------- reception
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
  select count(*) into n from public.messages;
  assert n = 2, 'reception reads the messages';
  update public.messages set status = 'done', handled_at = now() where id = '00000000-0000-0000-0000-00000000d001';
  get diagnostics n = row_count;
  assert n = 1, 'reception handles messages';
  delete from public.messages;
  get diagnostics n = row_count;
  assert n = 0, 'reception cannot delete messages';
  update public.events set title_nl = 'Receptie' where id = 'animatie-test';
  get diagnostics n = row_count;
  assert n = 1, 'reception edits events';
  update public.prices set price_per_night = 1;
  get diagnostics n = row_count;
  assert n = 0, 'reception cannot change prices';
  update public.seasons set ends_on = ends_on;
  get diagnostics n = row_count;
  assert n = 0, 'reception cannot change seasons';
  update public.jokes set active = false;
  get diagnostics n = row_count;
  assert n = 0, 'reception cannot change jokes';
  begin
    insert into public.texts (key, value_nl) values ('home.title', 'Receptie was hier');
    raise exception 'reception may not override texts';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.media (path, alt_nl) values ('x/receptie.jpg', 'Nee');
    raise exception 'reception may not add media';
  exception when insufficient_privilege then null;
  end;
  update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c2';
  get diagnostics n = row_count;
  assert n = 0, 'reception cannot make itself admin';
  select count(*) into n from public.staff_overview();
  assert n = 0, 'reception gets no staff list';
  reset role;

  ---------------------------------------------------------------- admin
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
  update public.prices set price_per_night = 25 where price_group_id = 'tent_caravan' and period_id = 'low';
  get diagnostics n = row_count;
  assert n = 1, 'Bert changes a price';
  insert into public.texts (key, value_nl, draft_nl) values ('home.test', null, 'Concept');
  update public.about_blocks set label_nl = 'Openbaar', status = 'published' where id = 'test-draft';
  get diagnostics n = row_count;
  assert n = 1, 'Bert edits Over ons';
  delete from public.messages where id = '00000000-0000-0000-0000-00000000d001';
  get diagnostics n = row_count;
  assert n = 1, 'Bert deletes a message';
  select count(*) into n from public.staff_overview();
  assert n >= 4, 'Bert gets the staff list';
  update public.profiles set role = 'reception' where id = '00000000-0000-0000-0000-0000000000c2';
  get diagnostics n = row_count;
  assert n = 1, 'Bert changes a role';
  reset role;

  ---------------------------------------------------------------- checked stamp
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
  update public.plots set checked = true where id = 'T2';
  reset role;
  select count(*) into n from public.plots
  where id = 'T2' and checked_at is not null and checked_by = '00000000-0000-0000-0000-0000000000c1';
  assert n = 1, 'checking a plot records when and by whom';
  update public.plots set checked = false where id = 'T2';
  select count(*) into n from public.plots where id = 'T2' and checked_at is null and checked_by is null;
  assert n = 1, 'unchecking clears the stamp';

  raise notice 'content role tests passed';
end;
$$;

-- The last admin can't be demoted or removed (outside the do block, so the
-- other admins in the database don't count: remove them first).
do $$
begin
  delete from public.profiles where role = 'admin' and id <> '00000000-0000-0000-0000-0000000000c1';
  begin
    update public.profiles set role = 'reception' where id = '00000000-0000-0000-0000-0000000000c1';
    raise exception 'demoting the last admin should fail';
  exception when raise_exception then
    if sqlerrm <> 'last_admin' then raise; end if;
  end;
  begin
    delete from public.profiles where id = '00000000-0000-0000-0000-0000000000c1';
    raise exception 'removing the last admin should fail';
  exception when raise_exception then
    if sqlerrm <> 'last_admin' then raise; end if;
  end;
  raise notice 'last admin guard passed';
end;
$$;
