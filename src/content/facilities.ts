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
    id: "chickens",
    icon: "chicken",
    surface: "stro",
    onHome: true,
    hoursLabel: "when",
    name_nl: "De kippen",
    name_en: "The chickens",
    name_de: "Die Hühner",
    summary_nl: "Eieren rapen en mee helpen voeren.",
    summary_en: "Collect eggs and help feed them.",
    summary_de: "Eier sammeln und beim Füttern helfen.",
    description_nl:
      "Help mee met voeren en kijk of er al eieren liggen. De kippen lopen vrij over het erf.",
    description_en: "Help feed the chickens and see if they have laid any eggs yet. They roam freely around the farmyard.",
    description_de: "Hilf beim Füttern und schau, ob schon Eier im Nest liegen. Die Hühner laufen frei über den Hof.",
    hours_nl: "elke ochtend voeren, [tijd]",
    hours_en: "feeding every morning, [time]",
    hours_de: "Füttern jeden Morgen, [Uhrzeit]",
    access_nl: "vlak pad tot aan het hok",
    access_en: "level path up to the coop",
    access_de: "ebener Weg bis zum Stall",
    location_nl: "naast Weide A",
    location_en: "next to Meadow A",
    location_de: "neben Wiese A",
  },
  {
    id: "playground",
    icon: "tractor",
    surface: "gras",
    onHome: true,
    hoursLabel: "when",
    name_nl: "Speelweide met tractor",
    name_en: "Play meadow with tractor",
    name_de: "Spielwiese mit Traktor",
    summary_nl: "Klimmen, rennen en spelen op de oude tractor.",
    summary_en: "Climb, run and play on the old tractor.",
    summary_de: "Klettern, toben und spielen auf dem alten Traktor.",
    description_nl:
      "Klimmen op de oude tractor, rennen, voetballen. Ouders zien alles vanaf de picknicktafels.",
    description_en: "Climb on the old tractor, run around, play football. Parents can keep an eye on everything from the picnic tables.",
    description_de: "Auf den alten Traktor klettern, rennen, Fußball spielen. Eltern sehen von den Picknicktischen aus alles.",
    hours_nl: "de hele dag, tot zonsondergang",
    hours_en: "all day, until sunset",
    hours_de: "den ganzen Tag, bis Sonnenuntergang",
    access_nl: "gras, deels hobbelig",
    access_en: "grass, partly bumpy",
    access_de: "Rasen, teils uneben",
    location_nl: "tussen Weide A en Weide B",
    location_en: "between Meadow A and Meadow B",
    location_de: "zwischen Wiese A und Wiese B",
  },
  {
    id: "pool",
    icon: "pool",
    surface: "water",
    onHome: true,
    hoursLabel: "open",
    name_nl: "Buitenzwembad",
    name_en: "Outdoor pool",
    name_de: "Freibad",
    summary_nl: "Even afkoelen na een dag op het erf.",
    summary_en: "Cool off after a day on the farm.",
    summary_de: "Abkühlen nach einem Tag auf dem Hof.",
    description_nl:
      "Even afkoelen na een dag op het erf. Met een ondiep deel voor de kleintjes.",
    description_en: "Cool off after a day on the farm. With a shallow part for the little ones.",
    description_de: "Abkühlen nach einem Tag auf dem Hof. Mit einem flachen Bereich für die Kleinen.",
    hours_nl: "[maand] t/m [maand], [tijden]",
    hours_en: "[month] to [month], [times]",
    hours_de: "[Monat] bis [Monat], [Zeiten]",
    access_nl: "[tillift ja/nee, Bert controleert]",
    access_en: "[pool hoist yes/no, Bert will check]",
    access_de: "[Lifter ja/nein, Bert prüft das]",
    location_nl: "naast de camperplaatsen",
    location_en: "next to the motorhome pitches",
    location_de: "neben den Wohnmobilstellplätzen",
  },
  {
    id: "shop",
    icon: "shop",
    surface: "stro",
    onHome: false,
    hoursLabel: "open",
    name_nl: "Het winkeltje",
    name_en: "The farm shop",
    name_de: "Der Hofladen",
    summary_nl: "Verse eieren, melk, kaas en jam van boeren uit de buurt.",
    summary_en: "Fresh eggs, milk, cheese and jam from local farmers.",
    summary_de: "Frische Eier, Milch, Käse und Marmelade von Bauern aus der Gegend.",
    description_nl:
      "Verse eieren, melk, kaas en jam van boeren uit de buurt. Ook voor de vergeten tandenborstel.",
    description_en: "Fresh eggs, milk, cheese and jam from local farmers. Also for the toothbrush you forgot.",
    description_de: "Frische Eier, Milch, Käse und Marmelade von Bauern aus der Gegend. Auch für die vergessene Zahnbürste.",
    hours_nl: "[tijden], bij de receptie",
    hours_en: "[times], at reception",
    hours_de: "[Zeiten], an der Rezeption",
    access_nl: "drempelvrij",
    access_en: "step-free",
    access_de: "stufenlos",
    location_nl: "bij de ingang, in de receptie",
    location_en: "by the entrance, in the reception building",
    location_de: "am Eingang, in der Rezeption",
  },
  {
    id: "canteen",
    icon: "barn",
    surface: "stro",
    onHome: true,
    hoursLabel: "open",
    name_nl: "Kantine in de oude melkstal",
    name_en: "Canteen in the old milking parlour",
    name_de: "Kantine im alten Melkstall",
    summary_nl: "Met een winkeltje vol producten van lokale boeren.",
    summary_en: "With a little shop full of produce from local farms.",
    summary_de: "Mit einem kleinen Laden voller Produkte von Höfen aus der Gegend.",
    description_nl:
      "Waar vroeger de koeien gemolken werden, drink je nu koffie. Met spelletjes voor regenachtige dagen.",
    description_en: "Where the cows were once milked, you can now enjoy a coffee. With games for rainy days.",
    description_de: "Wo früher die Kühe gemolken wurden, trinkst du jetzt Kaffee. Mit Spielen für Regentage.",
    hours_nl: "[tijden]",
    hours_en: "[times]",
    hours_de: "[Zeiten]",
    access_nl: "ingang met hellingbaan",
    access_en: "entrance with a ramp",
    access_de: "Eingang mit Rampe",
    location_nl: "midden op het erf",
    location_en: "in the middle of the farmyard",
    location_de: "mitten auf dem Hof",
  },
  {
    id: "sanitary",
    icon: "shower",
    surface: "gras",
    onHome: false,
    hoursLabel: "open",
    name_nl: "Sanitair & wasruimte",
    name_en: "Toilets, showers & laundry",
    name_de: "Sanitär & Waschraum",
    summary_nl: "Warme douches, een familiedouche en wasmachines.",
    summary_en: "Hot showers, a family shower and washing machines.",
    summary_de: "Warme Duschen, eine Familiendusche und Waschmaschinen.",
    description_nl:
      "Warme douches, een familiedouche, een babyruimte en wasmachines.",
    description_en: "Hot showers, a family shower, a baby room and washing machines.",
    description_de: "Warme Duschen, eine Familiendusche, ein Babyraum und Waschmaschinen.",
    hours_nl: "dag en nacht",
    hours_en: "day and night",
    hours_de: "Tag und Nacht",
    access_nl: "aangepaste douche en toilet",
    access_en: "accessible shower and toilet",
    access_de: "barrierefreie Dusche und Toilette",
    location_nl: "tussen Weide A en Weide B",
    location_en: "between Meadow A and Meadow B",
    location_de: "zwischen Wiese A und Wiese B",
  },
];
