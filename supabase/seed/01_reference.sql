-- Reference data: price groups and the 60 placeholder plots.
-- Runs on every `docker compose up` and never overwrites rows that exist, so
-- changes made in the admin panel stay.
--
-- The numbering (T1–T40, C1–C12, S1–S8) is still to be confirmed by Bert, and
-- every feature below is an example until the terrain walk-through. That is
-- why every plot starts with checked = false.

insert into public.price_groups (id, name_nl, name_en, name_de, sort) values
  ('tent_caravan', 'Tent of caravan', 'Tent or caravan', 'Zelt oder Wohnwagen', 1),
  ('camper', 'Camper', 'Motorhome', 'Wohnmobil', 2),
  ('safari_tent', 'Safaritent', 'Safari tent', 'Safarizelt', 3)
on conflict (id) do nothing;

-- Tent and caravan plots: Weide A (T1–T20) and Weide B (T21–T40), on grass.
insert into public.plots (id, type, zone, electricity, surface, level, shade, wheelchair, max_persons, price_group_id, sort)
select
  'T' || n,
  'tent_caravan',
  case when n <= 20 then 'A' else 'B' end,
  n % 3 <> 0,
  'grass',
  n % 4 <> 1,
  (array['none', 'some', 'lots']::public.shade_level[])[n % 3 + 1],
  n % 4 <> 1 and n % 2 = 0,
  6,
  'tent_caravan',
  n
from generate_series(1, 40) as n
on conflict (id) do nothing;

-- Camper plots C1–C12: semi-paved, all with electricity.
insert into public.plots (id, type, zone, electricity, surface, level, shade, wheelchair, max_persons, price_group_id, sort)
select
  'C' || n, 'camper', 'C', true, 'semi_paved', true,
  (array['none', 'some']::public.shade_level[])[n % 2 + 1],
  true, 6, 'camper', 100 + n
from generate_series(1, 12) as n
on conflict (id) do nothing;

-- Safari tents S1–S8: furnished tents with beds.
insert into public.plots (id, type, zone, electricity, surface, level, shade, wheelchair, max_persons, price_group_id, sort)
select
  'S' || n, 'safari_tent', 'S', true, 'grass', true, 'lots', n <= 2, 5, 'safari_tent', 200 + n
from generate_series(1, 8) as n
on conflict (id) do nothing;

-- Booking settings. min_nights and the booking level are Bert's choice.
insert into public.settings (key, value, public) values
  ('booking_level', '1', true),
  ('hold_minutes', '15', true),
  ('max_holds_per_visitor', '2', true),
  ('min_nights', '1', true),
  ('max_nights', '28', true)
on conflict (key) do nothing;

-- Season 1 April to 31 October. The last night is 30 October.
insert into public.seasons (year, starts_on, ends_on)
select y, make_date(y, 4, 1), make_date(y, 10, 31)
from generate_series(2026, 2030) as y
on conflict (year) do nothing;

insert into public.price_periods (id, starts_md, ends_md, name_nl, name_en, name_de, sort) values
  ('low', null, null, 'Voor- en naseizoen', 'Low season', 'Vor- und Nachsaison', 1),
  ('peak', '07-01', '08-31', 'Hoogseizoen (juli en augustus)', 'High season (July and August)', 'Hauptsaison (Juli und August)', 2)
on conflict (id) do nothing;

-- Prices per night stay null until Bert supplies them.
insert into public.prices (price_group_id, period_id, price_per_night)
select g.id, p.id, null
from public.price_groups g cross join public.price_periods p
on conflict do nothing;

insert into public.extras (id, amount, per, name_nl, name_en, name_de, unit_nl, unit_en, unit_de, sort) values
  ('tourist_tax', null, 'person_night', 'Toeristenbelasting', 'Tourist tax', 'Kurtaxe', 'per persoon per nacht', 'per person per night', 'pro Person und Nacht', 1),
  ('electricity', null, 'night', 'Stroom', 'Electricity', 'Strom', 'per nacht', 'per night', 'pro Nacht', 2),
  ('dog', null, 'night', 'Hond', 'Dog', 'Hund', 'per hond per nacht', 'per dog per night', 'pro Hund und Nacht', 3)
on conflict (id) do nothing;
