import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPageLocale, type Locale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { Chicken } from "@/components/Chicken";
import { PageIntro } from "@/components/PageIntro";
import { publicDb } from "@/lib/supabase/public";
import { formatDate } from "@/lib/dates";
import { CancelForm } from "./CancelForm";
import styles from "./manage.module.css";

// One guest's own booking: nothing to prerender, it always renders per
// request (like the catch-all 404).
export const instant = false;

/** A guest's own booking: never indexed, never in the sitemap. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("manage");
  return { title: t("metaTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

type Booking = {
  code: string;
  plot_id: string;
  arrival: string;
  departure: string;
  status: "requested" | "confirmed" | "cancelled";
  name: string;
  adults: number;
  children: number;
  dogs: number;
  price_total: number | null;
  cancel_until: string;
  can_cancel: boolean;
};

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const locale = await getPageLocale();
  return (
    <div className="container section">
      <Suspense fallback={<p className="muted">…</p>}>
        <Booking params={params} locale={locale} />
      </Suspense>
    </div>
  );
}

async function Booking({ params, locale }: { params: Promise<{ token: string }>; locale: Locale }) {
  const { token } = await params;
  const t = await getTranslations("manage");
  const { data } = await publicDb().rpc("manage_lookup", { p_token: token });
  const b = (data as Booking[] | null)?.[0];
  const long = (d: string) => formatDate(d, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (!b) {
    return (
      <div className={styles.wrap}>
        <PageIntro eyebrow={t("eyebrow")} title={t("notFoundTitle")} lead={t("notFoundText")} />
        <div className="btn-row">
          <Link href="/contact" className="btn btn-primary">
            {t("contact")}
          </Link>
          <Link href="/" className="btn btn-secondary">
            {t("home")}
          </Link>
        </div>
      </div>
    );
  }

  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });
  return (
    <div className={styles.wrap}>
      <PageIntro eyebrow={t("eyebrow")} title={t("title", { code: b.code })} lead={t("intro")} />
      <section className="card stack" aria-labelledby="booking-facts">
        <h2 id="booking-facts" className="visually-hidden">
          {t("title", { code: b.code })}
        </h2>
        <dl className={styles.facts}>
          <dt>{t("statusLabel")}</dt>
          <dd>
            <span className={styles.status} data-status={b.status}>
              {t(`status.${b.status}`)}
            </span>
          </dd>
          <dt>{t("plot")}</dt>
          <dd>{b.plot_id}</dd>
          <dt>{t("arrival")}</dt>
          <dd>{long(b.arrival)}</dd>
          <dt>{t("departure")}</dt>
          <dd>{long(b.departure)}</dd>
          <dt>{t("persons")}</dt>
          <dd>{t("personsValue", { adults: b.adults, children: b.children, dogs: b.dogs })}</dd>
          <dt>{t("price")}</dt>
          <dd>{b.price_total === null ? t("priceUnknown") : money.format(Number(b.price_total))}</dd>
        </dl>
        <p className={`muted ${styles.joke}`}>
          <Chicken size={40} /> {t("joke")}
        </p>
      </section>

      {b.status !== "cancelled" && <CancelSection b={b} token={token} long={long} />}

      <div className="btn-row">
        <Link href="/contact" className="btn btn-secondary">
          {t("contact")}
        </Link>
      </div>
    </div>
  );
}

async function CancelSection({ b, token, long }: { b: Booking; token: string; long: (d: string) => string }) {
  const t = await getTranslations("manage");
  const days = Math.round((Date.parse(b.arrival) - Date.parse(b.cancel_until)) / 86_400_000);
  return (
    <section className="card stack" aria-labelledby="cancel-title">
      <h2 id="cancel-title">{t("cancelTitle")}</h2>
      {days <= 0 ? (
        <p>{t("cancelOffline")}</p>
      ) : b.can_cancel ? (
        <>
          <p>{t("cancelUntil", { date: long(b.cancel_until) })}</p>
          <CancelForm token={token} />
        </>
      ) : (
        <p>{t("cancelTooLate", { date: long(b.cancel_until) })}</p>
      )}
    </section>
  );
}
