import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";

// Self-hosted by next/font at build time: no request to Google from the browser.
export const heading = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

export const body = Atkinson_Hyperlegible({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});
