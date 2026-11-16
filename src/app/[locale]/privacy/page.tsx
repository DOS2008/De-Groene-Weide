import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPageLocale } from "@/i18n/locale";
import { InfoPage } from "@/components/InfoPage";
import { WithPlaceholders } from "@/components/Placeholder";
import { CookieSettingsButton } from "@/components/shell/CookieBanner";
import { pageMetadata } from "@/lib/seo";
import styles from "../info.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const t = await getTranslations("privacy");
  return pageMetadata({
    route: "/privacy",
    locale,
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const sections = t.raw("sections") as { title: string; paragraphs: string[] }[];

  return (
    <InfoPage current="/privacy" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <p className={styles.updated}>
        <WithPlaceholders text={t("updated")} />
      </p>
      {sections.map((section) => (
        <section key={section.title} className="prose">
          <h2>{section.title}</h2>
          {section.paragraphs.map((p) => (
            <p key={p}>
              <WithPlaceholders text={p} />
            </p>
          ))}
        </section>
      ))}
      <p>
        <CookieSettingsButton className="btn btn-secondary" />
      </p>
    </InfoPage>
  );
}
