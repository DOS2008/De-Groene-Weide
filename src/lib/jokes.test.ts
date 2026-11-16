import { describe, expect, it } from "vitest";
import type { Joke } from "@/content/jokes";
import { jokeOfTheDay } from "./jokes";

const joke = (id: string, nl: string, active = true, en: string | null = null): Joke => ({
  id,
  active,
  text_nl: nl,
  text_en: en,
  text_de: null,
});

describe("jokeOfTheDay", () => {
  const jokes = [joke("a", "A"), joke("b", "B"), joke("off", "X", false)];

  it("keeps the same joke all day and changes it the next day", () => {
    const today = jokeOfTheDay(jokes, "2027-05-01", "nl");
    expect(jokeOfTheDay(jokes, "2027-05-01", "nl")).toBe(today);
    expect(jokeOfTheDay(jokes, "2027-05-02", "nl")).not.toBe(today);
  });

  it("skips inactive jokes", () => {
    const seen = new Set(
      ["2027-05-01", "2027-05-02", "2027-05-03"].map((d) => jokeOfTheDay(jokes, d, "nl")),
    );
    expect(seen.has("X")).toBe(false);
  });

  it("only uses jokes written in the page's language", () => {
    const mixed = [joke("a", "A"), joke("b", "B", true, "English B")];
    expect(jokeOfTheDay(mixed, "2027-05-01", "en")).toBe("English B");
    expect(jokeOfTheDay([joke("a", "A")], "2027-05-01", "de")).toBeNull();
  });
});
