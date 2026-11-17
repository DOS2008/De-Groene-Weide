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
    text_en: "Our rooster has never once pressed snooze. We've checked.",
    text_de: "Unser Hahn kennt keinen Sonntag. Und keine Schlummertaste.",
  },
  {
    id: "chicken-crossing",
    active: true,
    text_nl: "Waarom stak de kip het erf over? Om te kijken wie er in haar plekje stond.",
    text_en: "Why did the chicken cross the farmyard? To inspect your tent pegs, of course.",
    text_de: "Warum läuft das Huhn über den Hof? Es macht die Platzkontrolle.",
  },
  {
    id: "tractor-age",
    active: true,
    text_nl: "De tractor is ouder dan Bert. Dat zegt de tractor tenminste.",
    text_en: "Bert says the tractor is vintage. The tractor says Bert is.",
    text_de: "Der Traktor hat mehr Stunden auf dem Buckel als Bert. Behauptet zumindest der Traktor.",
  },
  {
    id: "wifi",
    active: true,
    text_nl: "De wifi is hier soms zwak. De verbinding met de natuur is altijd sterk.",
    text_en: "The wifi can be patchy here. The stars, however, have full signal.",
    text_de: "Das WLAN ist manchmal schwach. Dafür haben die Sterne hier vollen Empfang.",
  },
  {
    id: "weekend-eggs",
    active: true,
    text_nl: "Verse eieren bij het ontbijt? Onze kippen werken ook in het weekend.",
    text_en: "Fresh eggs on a Sunday? Our hens don't do days off.",
    text_de: "Frische Eier am Sonntag? Unsere Hühner haben keinen freien Tag. Wir haben gefragt.",
  },
];
