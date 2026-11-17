import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPageLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { InfoPage } from "@/components/InfoPage";
import { WithPlaceholders } from "@/components/Placeholder";
import { pageMetadata } from "@/lib/seo";
import styles from "../info.module.css";
import { TableWrap } from "@/components/TableWrap";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const t = await getTranslations("accessibility");
  return pageMetadata({
    route: "/accessibility",
    locale,
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

type Status = "yes" | "partly" | "unchecked";
type Row = { facility: string; wheelchair: Status; stroller: Status; notes: string };

// Status always as a symbol plus a word, never colour alone.
const symbol: Record<Status, string> = { yes: "✓", partly: "~", unchecked: "?" };

export default async function AccessibilityPage() {
  const t = await getTranslations("accessibility");
  const rows = t.raw("terrainRows") as Row[];
  const faq = t.raw("faq") as { q: string; a: string }[];

  const status = (s: Status) => (
    <span className={styles.status} data-status={s}>
      <span aria-hidden="true">{symbol[s]}</span> {t(s)}
    </span>
  );

  return (
    <InfoPage current="/accessibility" eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")}>
      <h2>{t("siteTitle")}</h2>
      <ul>
        {(t.raw("site") as string[]).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>{t("terrainTitle")}</h2>
      <TableWrap label={t("terrainTitle")}>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">{t("facility")}</th>
              <th scope="col">{t("wheelchair")}</th>
              <th scope="col">{t("stroller")}</th>
              <th scope="col">{t("notes")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.facility}>
                <th scope="row">{r.facility}</th>
                <td>{status(r.wheelchair)}</td>
                <td>{status(r.stroller)}</td>
                <td>
                  <WithPlaceholders text={r.notes} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <p>
        <WithPlaceholders text={t("plotsNote")} />
      </p>

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
          <p>{t("reportText")}</p>
        </div>
        <Link href="/contact" className="btn btn-primary">
          {t("reportCta")}
        </Link>
      </div>
    </InfoPage>
  );
}
