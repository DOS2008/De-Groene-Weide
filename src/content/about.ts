import type { Localized } from "@/lib/localized";

/** Over ons. Later editable blocks in the admin panel (F2.4, F5.8). */
export type Milestone = { id: string } & Localized<"year"> &
  Localized<"title"> &
  Localized<"text">;

export const milestones: Milestone[] = [
  {
    id: "farm",
    year_nl: "[jaar]",
    year_en: "[year]",
    year_de: "[Jahr]",
    title_nl: "De boerderij",
    title_en: "The farm",
    title_de: "Der Hof",
    text_nl: "[Korte tekst van Bert over het begin van de boerderij.]",
    text_en: "[Short text by Bert about how the farm began.]",
    text_de: "[Kurzer Text von Bert über die Anfänge des Hofes.]",
  },
  {
    id: "last-cow",
    year_nl: "[jaar]",
    year_en: "[year]",
    year_de: "[Jahr]",
    title_nl: "De laatste koe",
    title_en: "The last cow",
    title_de: "Die letzte Kuh",
    text_nl: "[Waarom Bert stopte met melken.]",
    text_en: "[Why Bert stopped milking.]",
    text_de: "[Warum Bert mit dem Melken aufgehört hat.]",
  },
  {
    id: "first-tent",
    year_nl: "[jaar]",
    year_en: "[year]",
    year_de: "[Jahr]",
    title_nl: "De eerste tent",
    title_en: "The first tent",
    title_de: "Das erste Zelt",
    text_nl: "[Hoe de camping begon.]",
    text_en: "[How the campsite began.]",
    text_de: "[Wie der Campingplatz angefangen hat.]",
  },
  {
    id: "now",
    year_nl: "Nu",
    year_en: "Now",
    year_de: "Heute",
    title_nl: "60 plekken in de wei",
    title_en: "60 pitches in the meadow",
    title_de: "60 Plätze auf der Wiese",
    text_nl: "Tent, caravan, camper of safaritent. Open van 1 april tot en met 31 oktober.",
    text_en: "Tent, caravan, motorhome or safari tent. Open from 1 April to 31 October.",
    text_de: "Zelt, Wohnwagen, Wohnmobil oder Safarizelt. Geöffnet vom 1. April bis 31. Oktober.",
  },
];

export type TeamMember = {
  id: string;
  /** The chicken has a drawing instead of a photo. */
  isChicken?: boolean;
} & Localized<"name"> &
  Localized<"role">;

export const team: TeamMember[] = [
  {
    id: "bert",
    name_nl: "Bert",
    name_en: "Bert",
    name_de: "Bert",
    role_nl: "Campingboer · vraag hem naar de tractor",
    role_en: "Campsite farmer · ask him about the tractor",
    role_de: "Campingbauer · frag ihn nach dem Traktor",
  },
  {
    id: "reception",
    name_nl: "[Naam]",
    name_en: "[Name]",
    name_de: "[Name]",
    role_nl: "Receptie",
    role_en: "Reception",
    role_de: "Rezeption",
  },
  {
    id: "animation",
    name_nl: "[Naam]",
    name_en: "[Name]",
    name_de: "[Name]",
    role_nl: "Animatie",
    role_en: "Activities",
    role_de: "Animation",
  },
  {
    id: "chicken",
    isChicken: true,
    name_nl: "De kip",
    name_en: "The chicken",
    name_de: "Das Huhn",
    role_nl: "Gids, plekkenkenner, eierleverancier",
    role_en: "Guide, pitch expert, egg supplier",
    role_de: "Führerin, Platzexpertin, Eierlieferantin",
  },
];
