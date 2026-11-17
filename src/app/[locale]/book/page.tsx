import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getPageLocale, type Locale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { plotTypes } from "@/content/plots";
import { getSite, type Site } from "@/lib/data/content";
import { Fact, Missing } from "@/components/Placeholder";
import { text } from "@/lib/localized";
import { pageMetadata } from "@/lib/seo";
import { getBookingRules, getPriceInfo, type PriceInfo } from "@/lib/data/booking";
import { getFacilities, getPlots } from "@/lib/data/map";
import { BookingFlow } from "./BookingFlow";
import styles from "./book.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const t = await getTranslations("book");
  return pageMetadata({
    route: "/book",
    locale,
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function BookPage() {
  const locale = await getPageLocale();
  const [plots, facilities, rules, prices] = await Promise.all([
    getPlots(locale),
    getFacilities(locale),
    getBookingRules(),
    getPriceInfo(locale),
  ]);

  return (
    <div className="container section">
      {/* The flow reads its step from the URL, so it renders in the browser. */}
      <Suspense fallback={<p className="muted">…</p>}>
        <BookingFlow
          plots={plots}
          facilities={facilities}
          rules={rules}
          prices={prices}
          info={<BookInfo locale={locale} prices={prices} site={await getSite()} />}
        />
      </Suspense>
    </div>
  );
}

/** Prices, season and house rules: shown under step 1. */
async function BookInfo({ locale, prices, site }: { locale: Locale; prices: PriceInfo; site: Site }) {

  const t = await getTranslations({ locale, namespace: "book" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });
  const priceOf = (group: string, period: string) =>
    prices.prices.find((p) => p.priceGroupId === group && p.periodId === period)?.pricePerNight ?? null;

  return (
    <>
      <section className="section" aria-labelledby="prices-title">
        <h2 id="prices-title" className={styles.h2}>
          {t("pricesTitle")}
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t("plotType")}</th>
                <th scope="col">{t("plots")}</th>
                {prices.periods.map((p) => (
                  <th scope="col" key={p.id}>
                    {prices.periodNames[p.id] ?? p.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plotTypes.map((p) => (
                <tr key={p.id}>
                  <th scope="row">
                    {prices.groupNames[p.id] ?? text(p, "name", locale)}
                    <span className={styles.rowNote}>{text(p, "description", locale)}</span>
                  </th>
                  <td>
                    {p.prefix}1–{p.prefix}
                    {p.count}
                  </td>
                  {prices.periods.map((period) => {
                    const v = priceOf(p.id, period.id);
                    return <td key={period.id}>{v !== null ? money.format(v) : <Missing what="PRIJS" />}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className={styles.h3}>{t("extrasTitle")}</h3>
        <ul className={styles.extras}>
          {prices.extras.map((e) => (
            <li key={e.id}>
              <strong>{prices.extraNames[e.id]?.name ?? e.id}</strong>:{" "}
              {e.amount !== null ? money.format(e.amount) : <Missing what="PRIJS" />}{" "}
              {prices.extraNames[e.id]?.unit}
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.grid}>
        <section className="card" aria-labelledby="season-title">
          <h2 id="season-title" className={styles.h2}>
            {t("seasonTitle")}
          </h2>
          <dl className={styles.facts}>
            <dt>{t("seasonOpen")}</dt>
            <dd>{tc("season")}</dd>
            <dt>{t("arrival")}</dt>
            <dd>
              {site.arrivalFrom ? t("arrivalFrom", { time: site.arrivalFrom }) : <Fact value={null} what="TIJD" />}
            </dd>
            <dt>{t("departure")}</dt>
            <dd>
              {site.departureUntil ? (
                t("departureUntil", { time: site.departureUntil })
              ) : (
                <Fact value={null} what="TIJD" />
              )}
            </dd>
          </dl>
        </section>

        <section className="card" aria-labelledby="rules-title">
          <h2 id="rules-title" className={styles.h2}>
            {t("rulesTitle")}
          </h2>
          <p>{t("rulesText")}</p>
          <p>
            <Link href="/house-rules" className="btn btn-secondary">
              {t("rulesCta")}
            </Link>
          </p>
        </section>
      </div>
    </>
  );
}
