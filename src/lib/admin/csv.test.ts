import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("writes semicolons, comma decimals and a BOM", () => {
    expect(toCsv(["Plek", "Prijs"], [["T1", 12.5]])).toBe("﻿Plek;Prijs\r\nT1;12,5\r\n");
  });

  it("quotes cells with separators, quotes or line breaks", () => {
    expect(toCsv(["a"], [['Jan; "de Boer"\nzoon']])).toBe('﻿a\r\n"Jan; ""de Boer""\nzoon"\r\n');
  });

  it("defuses text that Excel would run as a formula", () => {
    expect(toCsv(["a"], [["=HYPERLINK(1)"], ["-5"], ["@x"]])).toBe("﻿a\r\n'=HYPERLINK(1)\r\n'-5\r\n'@x\r\n");
  });
});
