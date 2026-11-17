import { describe, expect, it } from "vitest";
import { excerpt } from "./facebook";

describe("excerpt", () => {
  it("keeps short texts and tidies spaces", () => {
    expect(excerpt("Tok!\n\nDe  kippen  leggen weer.")).toBe("Tok! De kippen leggen weer.");
  });

  it("cuts long texts at a word", () => {
    const out = excerpt("woord ".repeat(100), 40);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(41);
    expect(out).not.toMatch(/wo…$/);
  });
});
