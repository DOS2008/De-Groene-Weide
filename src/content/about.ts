import type { Localized } from "@/lib/localized";

/** Over ons. Later editable blocks in the admin panel (F2.4, F5.8). */
export type Milestone = { id: string } & Localized<"year"> &
  Localized<"title"> &
  Localized<"text">;

export const milestones: Milestone[] = [
  {
    id: "farm",
    year_nl: "[jaar]",
    year_en: null,
    year_de: null,
    title_nl: "De boerderij",
    title_en: null,
    title_de: null,
    text_nl: "[Korte tekst van Bert over het begin van de boerderij.]",
    text_en: null,
    text_de: null,
  },
  {
    id: "last-cow",
    year_nl: "[jaar]",
    year_en: null,
    year_de: null,
    title_nl: "De laatste koe",
    title_en: null,
    title_de: null,
    text_nl: "[Waarom Bert stopte met melken.]",
    text_en: null,
    text_de: null,
  },
  {
    id: "first-tent",
    year_nl: "[jaar]",
    year_en: null,
    year_de: null,
    title_nl: "De eerste tent",
    title_en: null,
    title_de: null,
    text_nl: "[Hoe de camping begon.]",
    text_en: null,
    text_de: null,
  },
  {
    id: "now",
    year_nl: "Nu",
    year_en: null,
    year_de: null,
    title_nl: "60 plekken in de wei",
    title_en: null,
    title_de: null,
    text_nl: "Tent, caravan, camper of safaritent. Open van 1 april tot en met 31 oktober.",
    text_en: null,
    text_de: null,
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
    name_en: null,
    name_de: null,
    role_nl: "Campingboer · vraag hem naar de tractor",
    role_en: null,
    role_de: null,
  },
  {
    id: "reception",
    name_nl: "[Naam]",
    name_en: null,
    name_de: null,
    role_nl: "Receptie",
    role_en: null,
    role_de: null,
  },
  {
    id: "animation",
    name_nl: "[Naam]",
    name_en: null,
    name_de: null,
    role_nl: "Animatie",
    role_en: null,
    role_de: null,
  },
  {
    id: "chicken",
    isChicken: true,
    name_nl: "De kip",
    name_en: null,
    name_de: null,
    role_nl: "Gids, plekkenkenner, eierleverancier",
    role_en: null,
    role_de: null,
  },
];
