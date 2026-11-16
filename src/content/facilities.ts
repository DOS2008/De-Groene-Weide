import type { Localized } from "@/lib/localized";

export type FacilityIcon = "chicken" | "tractor" | "pool" | "shop" | "barn" | "shower";

/**
 * Facilities on the terrain. Later the `facilities` table (F5.10).
 * Texts in brackets are placeholders for Bert.
 */
export type Facility = {
  id: string;
  icon: FacilityIcon;
  /** Surface colour of the illustration tile (a token name). */
  surface: "stro" | "gras" | "water";
  /** Shown on the home page teaser. */
  onHome: boolean;
  /** Label for the hours row: "when" (activities) or "open" (places). */
  hoursLabel: "when" | "open";
} & Localized<"name"> &
  Localized<"summary"> &
  Localized<"description"> &
  Localized<"hours"> &
  Localized<"access"> &
  Localized<"location">;

export const facilities: Facility[] = [
  {
    id: "kippen",
    icon: "chicken",
    surface: "stro",
    onHome: true,
    hoursLabel: "when",
    name_nl: "De kippen",
    name_en: null,
    name_de: null,
    summary_nl: "Eieren rapen en mee helpen voeren.",
    summary_en: null,
    summary_de: null,
    description_nl:
      "Help mee met voeren en kijk of er al eieren liggen. De kippen lopen vrij over het erf.",
    description_en: null,
    description_de: null,
    hours_nl: "elke ochtend voeren, [tijd]",
    hours_en: null,
    hours_de: null,
    access_nl: "vlak pad tot aan het hok",
    access_en: null,
    access_de: null,
    location_nl: "naast Weide A",
    location_en: null,
    location_de: null,
  },
  {
    id: "speelweide",
    icon: "tractor",
    surface: "gras",
    onHome: true,
    hoursLabel: "when",
    name_nl: "Speelweide met tractor",
    name_en: null,
    name_de: null,
    summary_nl: "Klimmen, rennen en spelen op de oude tractor.",
    summary_en: null,
    summary_de: null,
    description_nl:
      "Klimmen op de oude tractor, rennen, voetballen. Ouders zien alles vanaf de picknicktafels.",
    description_en: null,
    description_de: null,
    hours_nl: "de hele dag, tot zonsondergang",
    hours_en: null,
    hours_de: null,
    access_nl: "gras, deels hobbelig",
    access_en: null,
    access_de: null,
    location_nl: "tussen Weide A en Weide B",
    location_en: null,
    location_de: null,
  },
  {
    id: "zwembad",
    icon: "pool",
    surface: "water",
    onHome: true,
    hoursLabel: "open",
    name_nl: "Buitenzwembad",
    name_en: null,
    name_de: null,
    summary_nl: "Even afkoelen na een dag op het erf.",
    summary_en: null,
    summary_de: null,
    description_nl:
      "Even afkoelen na een dag op het erf. Met een ondiep deel voor de kleintjes.",
    description_en: null,
    description_de: null,
    hours_nl: "[maand] t/m [maand], [tijden]",
    hours_en: null,
    hours_de: null,
    access_nl: "[tillift ja/nee, Bert controleert]",
    access_en: null,
    access_de: null,
    location_nl: "naast de camperplaatsen",
    location_en: null,
    location_de: null,
  },
  {
    id: "winkeltje",
    icon: "shop",
    surface: "stro",
    onHome: false,
    hoursLabel: "open",
    name_nl: "Het winkeltje",
    name_en: null,
    name_de: null,
    summary_nl: "Verse eieren, melk, kaas en jam van boeren uit de buurt.",
    summary_en: null,
    summary_de: null,
    description_nl:
      "Verse eieren, melk, kaas en jam van boeren uit de buurt. Ook voor de vergeten tandenborstel.",
    description_en: null,
    description_de: null,
    hours_nl: "[tijden], bij de receptie",
    hours_en: null,
    hours_de: null,
    access_nl: "drempelvrij",
    access_en: null,
    access_de: null,
    location_nl: "bij de ingang, in de receptie",
    location_en: null,
    location_de: null,
  },
  {
    id: "kantine",
    icon: "barn",
    surface: "stro",
    onHome: true,
    hoursLabel: "open",
    name_nl: "Kantine in de oude melkstal",
    name_en: null,
    name_de: null,
    summary_nl: "Met een winkeltje vol producten van lokale boeren.",
    summary_en: null,
    summary_de: null,
    description_nl:
      "Waar vroeger de koeien gemolken werden, drink je nu koffie. Met spelletjes voor regenachtige dagen.",
    description_en: null,
    description_de: null,
    hours_nl: "[tijden]",
    hours_en: null,
    hours_de: null,
    access_nl: "ingang met hellingbaan",
    access_en: null,
    access_de: null,
    location_nl: "midden op het erf",
    location_en: null,
    location_de: null,
  },
  {
    id: "sanitair",
    icon: "shower",
    surface: "gras",
    onHome: false,
    hoursLabel: "open",
    name_nl: "Sanitair & wasruimte",
    name_en: null,
    name_de: null,
    summary_nl: "Warme douches, een familiedouche en wasmachines.",
    summary_en: null,
    summary_de: null,
    description_nl:
      "Warme douches, een familiedouche, een babyruimte en wasmachines.",
    description_en: null,
    description_de: null,
    hours_nl: "dag en nacht",
    hours_en: null,
    hours_de: null,
    access_nl: "aangepaste douche en toilet",
    access_en: null,
    access_de: null,
    location_nl: "tussen Weide A en Weide B",
    location_en: null,
    location_de: null,
  },
];
