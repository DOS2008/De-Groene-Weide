import { describe, expect, it } from "vitest";
import { nextDelayMinutes } from "./outbox";

describe("nextDelayMinutes", () => {
  it("waits longer after each failed try", () => {
    expect([2, 3, 4, 5].map(nextDelayMinutes)).toEqual([15, 60, 240, 240]);
  });

  it("gives up after six tries", () => {
    expect(nextDelayMinutes(7)).toBeNull();
  });
});
