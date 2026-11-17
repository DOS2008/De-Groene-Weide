import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPageLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { PageIntro } from "@/components/PageIntro";
import { ExploreMap } from "./ExploreMap";
import { getFacilities, getPlots } from "@/lib/data/map";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const t = await getTranslations("siteMap");
  return pageMetadata({
    route: "/site-map",
    locale,
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function SiteMapPage() {
  const locale = await getPageLocale();
  const t = await getTranslations("siteMap");
  const [plots, facilities] = await Promise.all([getPlots(locale), getFacilities(locale)]);

  return (
    <div className="container section stack">
      <div className="section-head">
        <PageIntro eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
        <Link href="/book" className="btn btn-primary">
          {t("cta")}
        </Link>
      </div>
      <ExploreMap plots={plots} facilities={facilities} ctaLabel={t("plotCta")} />
      <p className="muted small">{t("exploreNote")}</p>
    </div>
  );
}
