import type { Localized } from "@/lib/localized";

/**
 * Plot types with their numbering and prices. Later `plots`,
 * `price_groups` and `prices` (Prio 2 and 3). The numbering is still to be
 * confirmed by Bert. null = price or number still to come.
 */
export type PlotType = {
  id: "tent_caravan" | "camper" | "safari_tent";
  prefix: "T" | "C" | "S";
  count: number;
  pricePerNight: number | null;
  maxPersons: number | null;
} & Localized<"name"> &
  Localized<"description">;

export const plotTypes: PlotType[] = [
  {
    id: "tent_caravan",
    prefix: "T",
    count: 40,
    pricePerNight: null,
    maxPersons: null,
    name_nl: "Tent of caravan",
    name_en: "Tent or caravan",
    name_de: "Zelt oder Wohnwagen",
    description_nl: "Op het gras in Weide A of Weide B. Veel plekken hebben stroom.",
    description_en: "On the grass in Meadow A or Meadow B. Many pitches have electricity.",
    description_de: "Auf der Wiese A oder B. Viele Plätze haben Strom.",
  },
  {
    id: "camper",
    prefix: "C",
    count: 12,
    pricePerNight: null,
    maxPersons: null,
    name_nl: "Camper",
    name_en: "Motorhome",
    name_de: "Wohnmobil",
    description_nl: "Halfverharde plekken met stroom, dicht bij het zwembad.",
    description_en: "Semi-paved pitches with electricity, close to the pool.",
    description_de: "Halbbefestigte Plätze mit Strom, nah am Freibad.",
  },
  {
    id: "safari_tent",
    prefix: "S",
    count: 8,
    pricePerNight: null,
    maxPersons: null,
    name_nl: "Safaritent",
    name_en: "Safari tent",
    name_de: "Safarizelt",
    description_nl: "Een ingerichte tent met bedden. Zelf niks opzetten.",
    description_en: "A furnished tent with beds. Nothing to pitch yourself.",
    description_de: "Ein eingerichtetes Zelt mit Betten. Nichts selbst aufbauen.",
  },
];

/** Extra costs per night or per stay. Amounts follow from Bert. */
export type Extra = { id: string; amount: number | null } & Localized<"name"> &
  Localized<"unit">;

export const extras: Extra[] = [
  {
    id: "tourist_tax",
    amount: null,
    name_nl: "Toeristenbelasting",
    name_en: "Tourist tax",
    name_de: "Kurtaxe",
    unit_nl: "per persoon per nacht",
    unit_en: "per person per night",
    unit_de: "pro Person und Nacht",
  },
  {
    id: "electricity",
    amount: null,
    name_nl: "Stroom",
    name_en: "Electricity",
    name_de: "Strom",
    unit_nl: "per nacht",
    unit_en: "per night",
    unit_de: "pro Nacht",
  },
  {
    id: "dog",
    amount: null,
    name_nl: "Hond",
    name_en: "Dog",
    name_de: "Hund",
    unit_nl: "per nacht",
    unit_en: "per night",
    unit_de: "pro Nacht",
  },
];
