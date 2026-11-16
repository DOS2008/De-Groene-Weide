import { describe, expect, it } from "vitest";
import { looksLikeSpam, validateContact } from "./contact";
import { createRateLimit } from "./rate-limit";

const valid = {
  name: "Anna",
  email: "anna@example.nl",
  subject: "",
  message: "Is er nog plek in juli?",
};

describe("validateContact", () => {
  it("accepts a normal message, with or without a subject", () => {
    expect(validateContact(valid)).toEqual({});
    expect(validateContact({ ...valid, subject: "Juli" })).toEqual({});
  });

  it("requires name, email and message", () => {
    expect(validateContact({ name: "", email: "", subject: "", message: "" })).toEqual({
      name: "nameRequired",
      email: "emailRequired",
      message: "messageRequired",
    });
  });

  it("rejects an invalid email address", () => {
    expect(validateContact({ ...valid, email: "anna@" }).email).toBe("emailInvalid");
    expect(validateContact({ ...valid, email: "anna example.nl" }).email).toBe("emailInvalid");
  });

  it("checks lengths", () => {
    expect(validateContact({ ...valid, message: "Hoi" }).message).toBe("messageTooShort");
    expect(validateContact({ ...valid, message: "x".repeat(5001) }).message).toBe("messageTooLong");
    expect(validateContact({ ...valid, name: "x".repeat(101) }).name).toBe("nameTooLong");
  });
});

describe("looksLikeSpam", () => {
  const form = (fields: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.set(k, v);
    return f;
  };

  it("lets a person through", () => {
    expect(looksLikeSpam(form({ website: "", shownAt: "1000" }), 10_000)).toBe(false);
  });

  it("catches a filled honeypot", () => {
    expect(looksLikeSpam(form({ website: "http://spam", shownAt: "1000" }), 10_000)).toBe(true);
  });

  it("catches a form sent too fast", () => {
    expect(looksLikeSpam(form({ website: "", shownAt: "9000" }), 10_000)).toBe(true);
  });

  it("never drops a person whose time stamp is missing", () => {
    expect(looksLikeSpam(form({ website: "" }), 10_000)).toBe(false);
    expect(looksLikeSpam(form({ website: "", shownAt: "" }), 10_000)).toBe(false);
  });
});

describe("createRateLimit", () => {
  it("allows up to the limit per window, per key", () => {
    const allow = createRateLimit({ limit: 2, windowMs: 1000 });
    expect(allow("a", 0)).toBe(true);
    expect(allow("a", 10)).toBe(true);
    expect(allow("a", 20)).toBe(false);
    expect(allow("b", 20)).toBe(true);
    expect(allow("a", 1005)).toBe(true); // the first hit has expired
  });
});
