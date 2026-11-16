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
    name_en: null,
    name_de: null,
    description_nl: "Op het gras in Weide A of Weide B. Veel plekken hebben stroom.",
    description_en: null,
    description_de: null,
  },
  {
    id: "camper",
    prefix: "C",
    count: 12,
    pricePerNight: null,
    maxPersons: null,
    name_nl: "Camper",
    name_en: null,
    name_de: null,
    description_nl: "Halfverharde plekken met stroom, dicht bij het zwembad.",
    description_en: null,
    description_de: null,
  },
  {
    id: "safari_tent",
    prefix: "S",
    count: 8,
    pricePerNight: null,
    maxPersons: null,
    name_nl: "Safaritent",
    name_en: null,
    name_de: null,
    description_nl: "Een ingerichte tent met bedden. Zelf niks opzetten.",
    description_en: null,
    description_de: null,
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
    name_en: null,
    name_de: null,
    unit_nl: "per persoon per nacht",
    unit_en: null,
    unit_de: null,
  },
  {
    id: "electricity",
    amount: null,
    name_nl: "Stroom",
    name_en: null,
    name_de: null,
    unit_nl: "per nacht",
    unit_en: null,
    unit_de: null,
  },
  {
    id: "dog",
    amount: null,
    name_nl: "Hond",
    name_en: null,
    name_de: null,
    unit_nl: "per nacht",
    unit_en: null,
    unit_de: null,
  },
];
