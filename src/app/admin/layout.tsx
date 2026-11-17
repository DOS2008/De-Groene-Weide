import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { body, heading } from "../fonts";
import { AdminShell } from "./AdminShell";
import "../globals.css";
import "./admin.css";

/** The admin panel is Dutch only and never indexed. */
export const metadata: Metadata = {
  title: { default: "Beheer", template: "%s · Beheer · De Groene Weide" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#24502f" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${heading.variable} ${body.variable}`}>
      <body className="admin-body">
        <a href="#inhoud" className="skip-link">
          Naar de inhoud
        </a>
        <Suspense fallback={<main id="inhoud" className="admin-main" />}>
          <AdminShell>{children}</AdminShell>
        </Suspense>
      </body>
    </html>
  );
}
