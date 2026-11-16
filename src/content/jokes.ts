import type { Localized } from "@/lib/localized";

/**
 * Joke of the day. Later the `jokes` table (F5.12). Each language gets its
 * own jokes: never translate these word for word.
 */
export type Joke = { id: string; active: boolean } & Localized<"text">;

export const jokes: Joke[] = [
  {
    id: "rooster-alarm",
    active: true,
    text_nl: "Onze haan is de beste wekker van het land. Alleen snoozen zit er niet op.",
    text_en: null,
    text_de: null,
  },
  {
    id: "chicken-crossing",
    active: true,
    text_nl: "Waarom stak de kip het erf over? Om te kijken wie er in haar plekje stond.",
    text_en: null,
    text_de: null,
  },
  {
    id: "tractor-age",
    active: true,
    text_nl: "De tractor is ouder dan Bert. Dat zegt de tractor tenminste.",
    text_en: null,
    text_de: null,
  },
  {
    id: "wifi",
    active: true,
    text_nl: "De wifi is hier soms zwak. De verbinding met de natuur is altijd sterk.",
    text_en: null,
    text_de: null,
  },
  {
    id: "weekend-eggs",
    active: true,
    text_nl: "Verse eieren bij het ontbijt? Onze kippen werken ook in het weekend.",
    text_en: null,
    text_de: null,
  },
];
