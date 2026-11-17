-- Booking rules from Plan.md, "Technische tests". Runs inside a transaction
-- that scripts/db/test.sh rolls back, so it leaves no data behind.
-- Every check raises an exception when it fails.

\set ON_ERROR_STOP on

-- Dates are in a future season, so "arrival in the past" never interferes.


do $$
declare
  tok_a uuid := gen_random_uuid();
  tok_b uuid := gen_random_uuid();
  r jsonb;
  r2 jsonb;
  n int;
begin
  ---------------------------------------------------------------- double booking
  r := public.place_hold('T14', '2030-07-10', '2030-07-13', tok_a);
  assert r->>'status' = 'held', 'first hold should succeed: ' || r::text;

  r2 := public.place_hold('T14', '2030-07-12', '2030-07-15', tok_b);
  assert r2->>'status' = 'taken', 'overlapping hold must be refused: ' || r2::text;

  -- Touching stays are fine: departure day = next arrival day.
  r2 := public.place_hold('T14', '2030-07-13', '2030-07-15', tok_b);
  assert r2->>'status' = 'held', 'back-to-back stay should be allowed: ' || r2::text;
  perform public.release_hold((r2->>'id')::uuid, tok_b);

  -- The constraint holds even without the functions.
  begin
    insert into public.reservations (plot_id, stay, status, source, name, adults, email)
    values ('T14', '[2030-07-11,2030-07-12)', 'confirmed', 'phone', 'Test', 2, 'a@b.nl');
    raise exception 'direct overlapping insert should fail';
  exception when exclusion_violation then null;
  end;

  ---------------------------------------------------------------- confirm
  r2 := public.confirm_reservation((r->>'id')::uuid, tok_a, 'Fam. Jansen', 'jansen@example.nl', null,
    2, 2, 0, 'tent', true, null, 'nl');
  assert r2->>'status' = 'requested', 'level 1 gives requested: ' || r2::text;
  assert length(r2->>'manage_token') = 48, 'manage token returned once';
  select count(*) into n from public.reservations
    where id = (r->>'id')::uuid and manage_token_hash is not null and hold_token is null;
  assert n = 1, 'only the hash of the manage token is stored';

  -- Wrong token can't confirm someone else's hold.
  r := public.place_hold('T15', '2030-07-10', '2030-07-13', tok_a);
  r2 := public.confirm_reservation((r->>'id')::uuid, tok_b, 'X', 'x@example.nl', null, 1, 0, 0, 'tent', false, null, 'nl');
  assert r2->>'status' = 'expired', 'foreign token must not confirm: ' || r2::text;

  -- Too many persons for the plot.
  r2 := public.confirm_reservation((r->>'id')::uuid, tok_a, 'X', 'x@example.nl', null, 6, 2, 0, 'tent', false, null, 'nl');
  assert r2->>'status' = 'too_many_persons', 'max persons enforced: ' || r2::text;
  perform public.release_hold((r->>'id')::uuid, tok_a);

  ---------------------------------------------------------------- hold expiry
  r := public.place_hold('T16', '2030-08-01', '2030-08-05', tok_a);
  assert r->>'status' = 'held';
  -- Move the clock: the hold ran out 1 minute ago.
  update public.reservations set held_until = now() - interval '1 minute' where id = (r->>'id')::uuid;
  select count(*) into n from public.availability('2030-08-01', '2030-08-05') a
    where a.plot_id = 'T16' and a.status = 'free';
  assert n = 1, 'expired hold no longer blocks the plot in availability()';
  r2 := public.place_hold('T16', '2030-08-02', '2030-08-04', tok_b);
  assert r2->>'status' = 'held', 'expired hold no longer blocks a new hold: ' || r2::text;
  r := public.confirm_reservation((r->>'id')::uuid, tok_a, 'X', 'x@example.nl', null, 1, 0, 0, 'tent', false, null, 'nl');
  assert r->>'status' = 'expired', 'an expired hold cannot be confirmed: ' || r::text;
  perform public.release_hold((r2->>'id')::uuid, tok_b);

  ---------------------------------------------------------------- max holds per visitor
  r := public.place_hold('T20', '2030-06-01', '2030-06-03', tok_a);
  r := public.place_hold('T21', '2030-06-01', '2030-06-03', tok_a);
  assert r->>'status' = 'held';
  r2 := public.place_hold('T22', '2030-06-01', '2030-06-03', tok_a);
  assert r2->>'status' = 'too_many_holds', 'third hold refused: ' || r2::text;
  -- Picking another plot releases the old hold.
  r2 := public.place_hold('T22', '2030-06-01', '2030-06-03', tok_a, (r->>'id')::uuid);
  assert r2->>'status' = 'held', 'replacing a hold works: ' || r2::text;

  ---------------------------------------------------------------- dates
  r := public.place_hold('T30', '2030-10-31', '2030-11-01', tok_b);
  assert r->>'status' = 'arrival_on_last_day', 'arrival on 31 October refused: ' || r::text;
  r := public.place_hold('T30', '2030-10-28', '2030-11-02', tok_b);
  assert r->>'status' = 'stay_crosses_season_end', 'stay across the season end refused: ' || r::text;
  r := public.place_hold('T30', '2030-07-10', '2030-07-08', tok_b);
  assert r->>'status' = 'departure_before_arrival', 'departure before arrival refused: ' || r::text;
  r := public.place_hold('T30', '2030-03-20', '2030-03-25', tok_b);
  assert r->>'status' = 'outside_season', 'stay in winter refused: ' || r::text;
  r := public.place_hold('T30', '2030-10-28', '2030-10-31', tok_b);
  assert r->>'status' = 'held', 'leaving on 31 October is allowed: ' || r::text;
  r := public.place_hold('T31', '2020-07-01', '2020-07-03', tok_b);
  assert r->>'status' = 'arrival_in_past', 'arrival in the past refused: ' || r::text;

  ---------------------------------------------------------------- blocks
  insert into public.plot_blocks (plot_id, period, reason) values ('C3', '[2030-05-01,2030-05-10)', 'Onderhoud');
  r := public.place_hold('C3', '2030-05-05', '2030-05-07', tok_b);
  assert r->>'status' = 'blocked', 'blocked plot refused: ' || r::text;
  select count(*) into n from public.availability('2030-05-05', '2030-05-07') a
    where a.plot_id = 'C3' and a.status = 'blocked';
  assert n = 1, 'availability shows the block';
  begin
    insert into public.plot_blocks (plot_id, period, reason) values ('T14', '[2030-07-11,2030-07-12)', 'x');
    raise exception 'block over a booking should fail';
  exception when raise_exception then
    if sqlerrm <> 'block_overlaps_reservation' then raise; end if;
  end;

  ---------------------------------------------------------------- phone booking
  insert into public.reservations (plot_id, stay, status, source, name, adults, phone)
  values ('S2', '[2030-09-01,2030-09-04)', 'confirmed', 'phone', 'Telefoon', 2, '0612345678');
  select count(*) into n from public.availability('2030-09-02', '2030-09-03') a
    where a.plot_id = 'S2' and a.status = 'taken';
  assert n = 1, 'a phone booking makes the plot taken at once';
  -- Cancelling frees the plot.
  update public.reservations set status = 'cancelled' where plot_id = 'S2' and source = 'phone';
  select count(*) into n from public.availability('2030-09-02', '2030-09-03') a
    where a.plot_id = 'S2' and a.status = 'free';
  assert n = 1, 'cancelling frees the plot';

  ---------------------------------------------------------------- invariant
  select count(*) into n
  from public.reservations a join public.reservations b
    on a.plot_id = b.plot_id and a.id < b.id and a.stay && b.stay
  where a.status <> 'cancelled' and b.status <> 'cancelled';
  assert n = 0, 'never more than one active booking per plot and night';

  raise notice 'booking tests passed';
end;
$$;
