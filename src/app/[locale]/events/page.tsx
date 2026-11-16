import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPageLocale } from "@/i18n/locale";
import { events } from "@/content/events";
import { EventIconFor } from "@/components/icons";
import { PageIntro } from "@/components/PageIntro";
import { kindSurface } from "@/components/events/format";
import type { EventKind } from "@/lib/events";
import { pageMetadata } from "@/lib/seo";
import { Agenda, type AgendaQuery } from "./Agenda";
import styles from "./events.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const t = await getTranslations("events");
  return pageMetadata({
    route: "/events",
    locale,
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

const kinds: EventKind[] = ["animals", "play", "pool", "food"];

export default async function EventsPage({ searchParams }: { searchParams: Promise<AgendaQuery> }) {
  const t = await getTranslations("events");
  const hasSamples = events.some((e) => e.sample);

  return (
    <div className="container section">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />

      {/* The agenda depends on the URL (?view=&date=&age=), so it streams in. */}
      <Suspense fallback={<div className={styles.loading} aria-hidden="true" />}>
        <Agenda searchParams={searchParams} />
      </Suspense>

      <div className={styles.legend}>
        <h2 className="visually-hidden">{t("legend")}</h2>
        <ul>
          {kinds.map((kind) => (
            <li key={kind}>
              <span className={styles.legendIcon} style={{ background: kindSurface[kind] }}>
                <EventIconFor kind={kind} size={20} />
              </span>
              {t(`kind.${kind}`)}
            </li>
          ))}
        </ul>
        {hasSamples ? <p className="muted small">{t("sampleNote")}</p> : null}
      </div>
    </div>
  );
}
