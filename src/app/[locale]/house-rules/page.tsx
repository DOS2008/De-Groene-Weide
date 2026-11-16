import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPageLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { InfoPage } from "@/components/InfoPage";
import { WithPlaceholders } from "@/components/Placeholder";
import { pageMetadata } from "@/lib/seo";
import styles from "../info.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const t = await getTranslations("houseRules");
  return pageMetadata({
    route: "/house-rules",
    locale,
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function HouseRulesPage() {
  const t = await getTranslations("houseRules");
  const faq = t.raw("faq") as { q: string; a: string }[];

  return (
    <InfoPage current="/house-rules" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <h2>{t("rulesTitle")}</h2>
      <ol>
        {(t.raw("rules") as string[]).map((rule) => (
          <li key={rule}>
            <WithPlaceholders text={rule} />
          </li>
        ))}
      </ol>
      <p className="muted small">{t("rulesNote")}</p>

      <h2>{t("faqTitle")}</h2>
      <div className="faq">
        {faq.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>
              <WithPlaceholders text={item.a} />
            </p>
          </details>
        ))}
      </div>

      <div className={`band band-grass ${styles.report}`}>
        <div>
          <p>{t("moreText")}</p>
        </div>
        <Link href="/contact" className="btn btn-primary">
          {t("moreCta")}
        </Link>
      </div>
    </InfoPage>
  );
}
