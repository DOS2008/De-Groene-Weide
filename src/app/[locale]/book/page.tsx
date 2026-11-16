import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPageLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { extras, plotTypes } from "@/content/plots";
import { site } from "@/content/site";
import { Chicken } from "@/components/Chicken";
import { CheckIcon, MailIcon, PhoneIcon } from "@/components/icons";
import { PageIntro } from "@/components/PageIntro";
import { Fact, Missing } from "@/components/Placeholder";
import { text } from "@/lib/localized";
import { pageMetadata } from "@/lib/seo";
import styles from "./book.module.css";

// Prio 1: information only. The 7-step booking flow replaces this in Prio 3.

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
  const t = await getTranslations("book");
  const tc = await getTranslations("common");
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });

  return (
    <div className="container section">
      <div className={styles.top}>
        <PageIntro eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
        <figure className={styles.joke}>
          <Chicken size={96} />
          <figcaption>{t("joke")}</figcaption>
        </figure>
      </div>

      <div className={styles.grid}>
        <section className={`card ${styles.how}`} aria-labelledby="how-title">
          <h2 id="how-title">{t("howTitle")}</h2>
          <p>{t("howText")}</p>
          <div className="btn-row">
            {site.phone ? (
              <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="btn btn-primary btn-large">
                <PhoneIcon size={20} />
                {t("call")}: {site.phone}
              </a>
            ) : (
              <p className={styles.contactLine}>
                <PhoneIcon size={20} />
                {t("call")}: <Missing what="TELEFOON" />
              </p>
            )}
            {site.email ? (
              <a href={`mailto:${site.email}`} className="btn btn-secondary btn-large">
                <MailIcon size={20} />
                {t("mail")}
              </a>
            ) : (
              <p className={styles.contactLine}>
                <MailIcon size={20} />
                {t("mail")}: <Missing what="E-MAIL" />
              </p>
            )}
          </div>
          <p>
            <Link href="/contact">{t("orForm")}</Link>
          </p>
        </section>

        <section className={`card ${styles.need}`} aria-labelledby="need-title">
          <h2 id="need-title">{t("needTitle")}</h2>
          <ul className={styles.checks}>
            {(t.raw("need") as string[]).map((item) => (
              <li key={item}>
                <CheckIcon size={20} className={styles.check} />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

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
                <th scope="col">{t("maxPersons")}</th>
                <th scope="col">{t("price")}</th>
              </tr>
            </thead>
            <tbody>
              {plotTypes.map((p) => (
                <tr key={p.id}>
                  <th scope="row">
                    {text(p, "name", locale)}
                    <span className={styles.rowNote}>{text(p, "description", locale)}</span>
                  </th>
                  <td>
                    {p.prefix}1–{p.prefix}
                    {p.count}
                  </td>
                  <td>{p.maxPersons ?? <Missing what="aantal" />}</td>
                  <td>{p.pricePerNight !== null ? money.format(p.pricePerNight) : <Missing what="PRIJS" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className={styles.h3}>{t("extrasTitle")}</h3>
        <ul className={styles.extras}>
          {extras.map((e) => (
            <li key={e.id}>
              <strong>{text(e, "name", locale)}</strong>:{" "}
              {e.amount !== null ? money.format(e.amount) : <Missing what="PRIJS" />} {text(e, "unit", locale)}
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
    </div>
  );
}
