import { describe, expect, it } from "vitest";
import { applyOverrides, checkText, flatten, placeholders } from "./texts";

describe("flatten", () => {
  it("lists every text leaf with its path, arrays included", () => {
    expect(flatten({ a: "x", b: { c: "y" }, d: [{ e: "z" }] })).toEqual([
      ["a", "x"],
      ["b.c", "y"],
      ["d.0.e", "z"],
    ]);
  });
});

describe("applyOverrides", () => {
  const tree = { home: { title: "Welkom", values: [{ title: "Rust" }] } };

  it("replaces a published override and leaves the rest", () => {
    const out = applyOverrides(tree, [{ key: "home.title", value: "Hallo" }]);
    expect(out.home.title).toBe("Hallo");
    expect(out.home.values[0].title).toBe("Rust");
    expect(tree.home.title).toBe("Welkom");
  });

  it("reaches into arrays", () => {
    expect(applyOverrides(tree, [{ key: "home.values.0.title", value: "Stilte" }]).home.values[0].title).toBe("Stilte");
  });

  it("ignores nulls, unknown keys and keys that point at a group", () => {
    const out = applyOverrides(tree, [
      { key: "home.title", value: null },
      { key: "home.nope", value: "x" },
      { key: "home", value: "x" },
      { key: "x.y.z", value: "x" },
    ]);
    expect(out).toEqual(tree);
  });
});

describe("checkText", () => {
  it("finds placeholder names, also in plurals", () => {
    expect(placeholders("Hallo {name}, {nights, plural, one {# nacht} other {# nachten}}")).toEqual(["name", "nights"]);
  });

  it("accepts the same placeholders in other words", () => {
    expect(checkText("Hallo {name},", "Hoi {name}!")).toBeNull();
  });

  it("refuses a missing or renamed placeholder", () => {
    expect(checkText("Hallo {name},", "Hallo daar")).toBe("placeholders");
    expect(checkText("Hallo {name},", "Hallo {naam}")).toBe("placeholders");
  });

  it("refuses unbalanced braces", () => {
    expect(checkText("Hallo {name}", "Hallo {name")).toBe("braces");
    expect(checkText("x", "}{")).toBe("braces");
  });
});
