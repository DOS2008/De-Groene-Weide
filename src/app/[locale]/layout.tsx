import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getLayoutLocale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo";
import { CALM_KEY } from "@/components/shell/calm";
import { CookieBanner } from "@/components/shell/CookieBanner";
import { NoticeBanner } from "@/components/shell/NoticeBanner";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { SiteHeader } from "@/components/shell/SiteHeader";
import "../globals.css";

// Self-hosted by next/font at build time: no request to Google from the browser.
const heading = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const body = Atkinson_Hyperlegible({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});

// Applies the Rustknop before the first paint, so nothing moves first.
const calmScript = `try{if(localStorage.getItem(${JSON.stringify(CALM_KEY)})==="1")document.documentElement.dataset.calm="true"}catch(e){}`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#24502f",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("defaultTitle"), template: t("titleTemplate") },
    description: t("defaultDescription"),
    applicationName: t("siteName"),
    openGraph: { siteName: t("siteName"), type: "website" },
  };
}

export default async function LocaleLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLayoutLocale();
  const t = await getTranslations("common");

  return (
    <html
      lang={locale}
      className={`${heading.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Script id="calm" strategy="beforeInteractive">
          {calmScript}
        </Script>
        <NextIntlClientProvider>
          <a href="#inhoud" className="skip-link">
            {t("skipToContent")}
          </a>
          <CookieBanner />
          <NoticeBanner locale={locale} />
          <SiteHeader />
          <main id="inhoud" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
