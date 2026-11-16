import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPageLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { routePlannerUrl, site } from "@/content/site";
import { MailIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { PageIntro } from "@/components/PageIntro";
import { Fact, Missing } from "@/components/Placeholder";
import { pageMetadata } from "@/lib/seo";
import { ContactForm } from "./ContactForm";
import styles from "./contact.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const t = await getTranslations("contact");
  return pageMetadata({
    route: "/contact",
    locale,
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function ContactPage() {
  const t = await getTranslations("contact");
  const tc = await getTranslations("common");
  const routeUrl = routePlannerUrl();

  return (
    <div className="container section">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />

      <div className={styles.layout}>
        <ContactForm />

        <aside className={styles.aside}>
          <section className={`card ${styles.block}`} aria-labelledby="direct-title">
            <h2 id="direct-title">{t("directTitle")}</h2>
            <div className={styles.contactRow}>
              <span className={styles.contactIcon}>
                <PhoneIcon size={22} />
              </span>
              <div>
                <strong>{t("phone")}</strong>
                <br />
                {site.phone ? (
                  <a href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a>
                ) : (
                  <Missing what="TELEFOON" />
                )}
              </div>
            </div>
            <div className={styles.contactRow}>
              <span className={styles.contactIcon}>
                <MailIcon size={22} />
              </span>
              <div>
                <strong>{t("email")}</strong>
                <br />
                {site.email ? <a href={`mailto:${site.email}`}>{site.email}</a> : <Missing what="E-MAIL" />}
              </div>
            </div>
            <div className={styles.contactRow}>
              <span className={styles.contactIcon}>
                <PinIcon size={22} />
              </span>
              <div>
                <strong>{t("address")}</strong>
                <br />
                <address className={styles.address}>
                  {site.address ? site.address.map((l) => <span key={l}>{l}</span>) : <Missing what="ADRES" />}
                </address>
              </div>
            </div>
          </section>

          <section className={`card ${styles.block}`} aria-labelledby="reception-title">
            <h2 id="reception-title">{t("receptionTitle")}</h2>
            <table className={styles.hours}>
              <tbody>
                <tr>
                  <th scope="row">{t("weekdays")}</th>
                  <td>
                    <Fact value={site.reception.weekdays} what="TIJDEN" />
                  </td>
                </tr>
                <tr>
                  <th scope="row">{t("weekend")}</th>
                  <td>
                    <Fact value={site.reception.weekend} what="TIJDEN" />
                  </td>
                </tr>
                <tr>
                  <th scope="row">{t("arrival")}</th>
                  <td>
                    {site.arrivalFrom ? t("arrivalFrom", { time: site.arrivalFrom }) : <Missing what="TIJD" />}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="muted small">{t("season")}</p>
          </section>

          <section id="route" className={`card ${styles.block}`} aria-labelledby="route-title">
            <h2 id="route-title">{t("routeTitle")}</h2>
            <p>{t("routeText")}</p>
            {routeUrl ? (
              <a href={routeUrl} className="btn btn-secondary" rel="noopener">
                {tc("routeCta")}
                <span className="visually-hidden"> ({tc("newWindow")})</span>
              </a>
            ) : (
              <p className="muted small">
                {tc("routeCta")}: <Missing what="ADRES" />
              </p>
            )}
          </section>
        </aside>
      </div>

      <section className={`band band-straw ${styles.faq}`} aria-label={t("faqCta")}>
        <div>
          <p>{t("faqText")}</p>
        </div>
        <Link href="/house-rules" className="btn btn-secondary">
          {t("faqCta")}
        </Link>
      </section>
    </div>
  );
}
