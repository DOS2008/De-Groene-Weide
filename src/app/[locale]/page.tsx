import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPageLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getEvents, getFacilityContent, getJokes, getSite, routePlannerUrl } from "@/lib/data/content";
import { Chicken } from "@/components/Chicken";
import { FacilityTile } from "@/components/FacilityTile";
import { FarmIllustration } from "@/components/FarmIllustration";
import { EventIconFor } from "@/components/icons";
import { JsonLd } from "@/components/JsonLd";
import { Fact, Missing } from "@/components/Placeholder";
import { kindSurface, recurrenceText } from "@/components/events/format";
import { nextOfEach } from "@/lib/events";
import { jokeOfTheDay } from "@/lib/jokes";
import { FacebookNews } from "@/components/facebook/FacebookNews";
import { text } from "@/lib/localized";
import { firstOpenDay } from "@/lib/season";
import { pageMetadata, siteUrl } from "@/lib/seo";
import { getToday } from "@/lib/today";
import styles from "./home.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const t = await getTranslations("meta");
  return {
    ...pageMetadata({ route: "/", locale, description: t("defaultDescription") }),
    title: { absolute: t("defaultTitle") },
  };
}

export default async function HomePage() {
  const [events, facilities, jokes, site] = await Promise.all([getEvents(), getFacilityContent(), getJokes(), getSite()]);
  const locale = await getPageLocale();
  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const te = await getTranslations("events");
  const tm = await getTranslations("meta");

  const today = await getToday();
  const joke = jokeOfTheDay(jokes, today, locale);
  const firstDay = firstOpenDay(site.season, today);
  const upcoming = nextOfEach(events, site.season, firstDay, 3);
  const routeUrl = routePlannerUrl(site);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Campground",
          name: tm("siteName"),
          description: tm("defaultDescription"),
          url: `${siteUrl()}/`,
          ...(site.address
            ? { address: { "@type": "PostalAddress", streetAddress: site.address.join(", "), addressCountry: "NL" } }
            : {}),
          ...(site.phone ? { telephone: site.phone } : {}),
          amenityFeature: facilities.map((f) => ({
            "@type": "LocationFeatureSpecification",
            name: text(f, "name", locale),
            value: true,
          })),
        }}
      />

      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <span className={styles.badge}>{t("badge")}</span>
            <h1 className={styles.heroTitle}>{t("title")}</h1>
            <p className={styles.heroLead}>{t("lead")}</p>
            <div className="btn-row">
              <Link href="/book" className="btn btn-primary btn-large">
                {tc("bookCta")}
              </Link>
              <RouteButton url={routeUrl} label={tc("routeCta")} large />
            </div>
          </div>
          <div className={styles.heroArt}>
            <FarmIllustration label={t("illustration")} className={styles.farm} />
            {joke ? (
              <p className={styles.joke}>
                <strong>{t("jokeLabel")}</strong>
                {joke}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="container section" aria-labelledby="activities-title">
        <div className="section-head">
          <div className="stack">
            <span className="eyebrow">{t("activitiesEyebrow")}</span>
            <h2 id="activities-title">{t("activitiesTitle")}</h2>
          </div>
          <Link href="/activities" className={styles.more}>
            {t("activitiesMore")} <span aria-hidden="true">→</span>
          </Link>
        </div>
        <ul className={`grid-cards ${styles.plainList}`}>
          {facilities
            .filter((f) => f.onHome)
            .map((f) => (
              <li key={f.id}>
                <Link href={{ pathname: "/activities", hash: f.id }} className={styles.activity}>
                  <FacilityTile facility={f} />
                  <span className={styles.activityText}>
                    <span className={styles.activityTitle}>{text(f, "name", locale)}</span>
                    <span className="muted">{text(f, "summary", locale)}</span>
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </section>

      <section className="container" aria-labelledby="plots-title">
        <div className={`band band-sun ${styles.plots}`}>
          <Chicken size={112} />
          <div>
            <span className={styles.plotsEyebrow}>{t("plotsEyebrow")}</span>
            <h2 id="plots-title">{t("plotsTitle")}</h2>
            <p>{t("plotsText")}</p>
          </div>
          <Link href="/site-map" className="btn btn-ink">
            {t("plotsCta")}
          </Link>
        </div>
      </section>

      <section className={styles.eventsBand} aria-labelledby="events-title">
        <div className="container section">
          <div className="section-head">
            <div className="stack">
              <span className="eyebrow">{t("eventsEyebrow")}</span>
              <h2 id="events-title">{t("eventsTitle")}</h2>
            </div>
            <Link href="/events" className={styles.more}>
              {t("eventsAll")} <span aria-hidden="true">→</span>
            </Link>
          </div>
          {firstDay !== today ? <p className={styles.eventsNote}>{t("eventsFromSeason")}</p> : null}
          <ul className={`grid-cards ${styles.plainList}`}>
            {upcoming.map(({ event }) => (
              <li key={event.id} className={styles.event}>
                <span className={styles.eventIcon} style={{ background: kindSurface[event.kind] }}>
                  <EventIconFor kind={event.kind} size={36} />
                </span>
                <span className="stack">
                  <h3>{text(event, "title", locale)}</h3>
                  <span className="muted">
                    {recurrenceText(event, locale, {
                      everyDay: te("everyDay"),
                      everyWeekday: (weekday) => te("everyWeekday", { weekday }),
                    })}{" "}
                    · {event.startTime}
                  </span>
                  <span className="muted">
                    {text(event, "location", locale)} · {te(`ageText.${event.ageGroup}`)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FacebookNews locale={locale} />

      <section className={`container section ${styles.find}`} aria-labelledby="find-title">
        <RouteDrawing />
        <div className={styles.findText}>
          <h2 id="find-title">{t("findTitle")}</h2>
          <p>
            {site.address ? site.address.join(", ") : <Missing what="ADRES" />}
            <br />
            {t("findReception")}: <Fact value={site.reception.weekdays} what="TIJDEN" />
            <br />
            {t("findSeason")}
          </p>
          <div className="btn-row">
            <RouteButton url={routeUrl} label={tc("routeCta")} primary />
            <Link href="/contact" className="btn btn-secondary">
              {tc("messageCta")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/** "Plan je route": a route planner once the address is known, else the contact page. */
async function RouteButton({
  url,
  label,
  large,
  primary,
}: {
  url: string | null;
  label: string;
  large?: boolean;
  primary?: boolean;
}) {
  const tc = await getTranslations("common");
  const className = `btn ${primary ? "btn-primary" : "btn-secondary"} ${large ? "btn-large" : ""}`;
  if (url) {
    return (
      <a href={url} className={className} rel="noopener">
        {label}
        <span className="visually-hidden"> ({tc("newWindow")})</span>
      </a>
    );
  }
  return (
    <Link href={{ pathname: "/contact", hash: "route" }} className={className}>
      {label}
    </Link>
  );
}

/** A small drawn road map. Decorative: the address is in the text next to it. */
function RouteDrawing() {
  return (
    <svg viewBox="0 0 440 260" className={styles.routeArt} aria-hidden="true" focusable="false">
      <rect width="440" height="260" rx="24" fill="var(--color-plot-free)" />
      <path d="M-10 200 C90 180 140 120 230 130 S380 70 450 60" stroke="var(--color-white)" strokeWidth="18" fill="none" />
      <path d="M120 270 C140 200 170 160 230 130" stroke="var(--color-white)" strokeWidth="12" fill="none" />
      <path d="M-10 200 C90 180 140 120 230 130 S380 70 450 60" stroke="var(--color-stro)" strokeWidth="2" strokeDasharray="10 10" fill="none" />
      <circle cx="80" cy="70" r="22" fill="var(--color-hill-light)" />
      <circle cx="350" cy="190" r="30" fill="var(--color-hill-light)" />
      <g transform="translate(212 70)">
        <path d="M18 0 C8 0 0 8 0 18 C0 32 18 50 18 50 S36 32 36 18 C36 8 28 0 18 0 Z" fill="var(--color-weidegroen)" />
        <circle cx="18" cy="18" r="7" fill="var(--color-white)" />
      </g>
    </svg>
  );
}
