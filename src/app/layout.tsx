import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "De Groene Weide – familiecamping op de boerderij",
  description:
    "Kamperen op de boerderij bij Boer Bert. Kippen, een speelweide met tractor en een buitenzwembad. Open van 1 april tot en met 31 oktober.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
