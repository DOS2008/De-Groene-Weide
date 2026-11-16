import { getTranslations } from "next-intl/server";
import { getPageLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import type { AnyLocale } from "@/i18n/routing";
import { events } from "@/content/events";
import { site } from "@/content/site";
import { ChevronLeftIcon, ChevronRightIcon, EventIconFor } from "@/components/icons";
import { kindSurface } from "@/components/events/format";
import { addDays, eachDay, formatDate, isIsoDate, startOfWeek, type IsoDate } from "@/lib/dates";
import { ageGroups, expandEvents, matchesAge, type AgeGroup, type Occurrence } from "@/lib/events";
import { text } from "@/lib/localized";
import { firstOpenDay, isInSeason } from "@/lib/season";
import { getToday } from "@/lib/today";
import styles from "./events.module.css";

export type AgendaQuery = { view?: string | string[]; date?: string | string[]; age?: string | string[] };
type View = "week" | "day";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** "woensdag 7 april" → "Woensdag 7 april" (only the first letter). */
function capitalize(s: string) {
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

export async function Agenda({ searchParams }: { searchParams: Promise<AgendaQuery> }) {
  const query = await searchParams;
  const locale = await getPageLocale();
  const t = await getTranslations("events");
  const today = await getToday();

  const view: View = one(query.view) === "day" ? "day" : "week";
  const ageParam = one(query.age);
  const age: AgeGroup = ageGroups.includes(ageParam as AgeGroup) ? (ageParam as AgeGroup) : "all";
  const dateParam = one(query.date);
  const firstDay = firstOpenDay(site.season, today);
  const date: IsoDate = isIsoDate(dateParam) ? dateParam : firstDay;

  const from = view === "week" ? startOfWeek(date) : date;
  const to = view === "week" ? addDays(from, 6) : date;
  const step = view === "week" ? 7 : 1;
  const occurrences = expandEvents(events, from, to).filter(
    (o) => isInSeason(site.season, o.date) && matchesAge(o.event, age),
  );
  const days = eachDay(from, to);
  const openDays = days.filter((d) => isInSeason(site.season, d));

  // Links keep the other settings; the date stays when switching view or age.
  const href = (next: Partial<{ view: View; date: IsoDate; age: AgeGroup }>) => {
    const q: Record<string, string> = {};
    const v = next.view ?? view;
    const d = next.date ?? date;
    const a = next.age ?? age;
    if (v !== "week") q.view = v;
    if (d !== firstDay) q.date = d;
    if (a !== "all") q.age = a;
    return { pathname: "/events" as const, query: q };
  };

  const title =
    view === "week"
      ? t("weekOf", { date: formatDate(from, locale, { day: "numeric", month: "long", year: "numeric" }) })
      : capitalize(formatDate(date, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }));

  const dayLabel = (d: IsoDate) =>
    d === today ? t("today") : d === addDays(today, 1) ? t("tomorrow") : null;

  return (
    <div className={styles.agenda}>
      <div className={styles.toolbar} role="group" aria-label={t("toolbar")}>
        <div className={styles.period}>
          <Link
            href={href({ date: addDays(date, -step) })}
            scroll={false}
            className={`btn btn-quiet ${styles.square}`}
            aria-label={view === "week" ? t("prevWeek") : t("prevDay")}
          >
            <ChevronLeftIcon size={20} />
          </Link>
          <h2 className={styles.periodTitle} aria-live="polite">
            {title}
          </h2>
          <Link
            href={href({ date: addDays(date, step) })}
            scroll={false}
            className={`btn btn-quiet ${styles.square}`}
            aria-label={view === "week" ? t("nextWeek") : t("nextDay")}
          >
            <ChevronRightIcon size={20} />
          </Link>
        </div>

        <nav aria-label={t("ageLabel")}>
          <ul className={styles.chips}>
            {ageGroups.map((a) => (
              <li key={a}>
                <Link
                  href={href({ age: a })}
                  scroll={false}
                  className={styles.chip}
                  aria-current={a === age ? "true" : undefined}
                >
                  {t(`age.${a}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t("viewLabel")}>
          <ul className={styles.toggle}>
            {(["week", "day"] as const).map((v) => (
              <li key={v}>
                <Link
                  href={href({ view: v })}
                  scroll={false}
                  className={styles.toggleLink}
                  aria-current={v === view ? "true" : undefined}
                >
                  {v === "week" ? t("week") : t("day")}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {openDays.length === 0 ? (
        <div className={styles.closed}>
          <p>{view === "week" ? t("closedWeek") : t("closedDay")}</p>
          <Link href={href({ date: firstOpenDay(site.season, date) })} scroll={false} className="btn btn-secondary">
            {t("toFirstWeek")}
          </Link>
        </div>
      ) : view === "week" ? (
        <div className={styles.week}>
          {days.map((d) => {
            const items = occurrences.filter((o) => o.date === d);
            const label = dayLabel(d);
            const open = isInSeason(site.season, d);
            return (
              <section key={d} className={styles.day} aria-labelledby={`day-${d}`}>
                <h3 id={`day-${d}`} className={styles.dayTitle} data-today={d === today || undefined}>
                  {capitalize(formatDate(d, locale, { weekday: "long", day: "numeric", month: "short" }))}
                  {label ? <span className={styles.badge}>{label}</span> : null}
                </h3>
                {!open ? (
                  <p className="muted small">{t("closed")}</p>
                ) : items.length === 0 ? (
                  <p className="muted small">{t("nothing")}</p>
                ) : (
                  <ul className={styles.dayList}>
                    {items.map((o) => (
                      <li key={o.event.id}>
                        <SmallEvent occurrence={o} locale={locale} ageText={t(`ageText.${o.event.ageGroup}`)} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className={styles.dayView}>
          {dayLabel(date) ? <span className={styles.badge}>{dayLabel(date)}</span> : null}
          {occurrences.length === 0 ? (
            <p className="muted">{age === "all" ? t("nothing") : t("nothingForAge")}</p>
          ) : (
            <ul className={styles.dayViewList}>
              {occurrences.map((o) => (
                <li key={o.event.id} className={styles.bigEvent}>
                  <span className={styles.bigIcon} style={{ background: kindSurface[o.event.kind] }}>
                    <EventIconFor kind={o.event.kind} size={30} />
                  </span>
                  <div className={styles.bigText}>
                    <div className={styles.bigHead}>
                      <h3>{text(o.event, "title", locale)}</h3>
                      <strong>{o.event.startTime}</strong>
                    </div>
                    <span className="muted">
                      {text(o.event, "location", locale)} · {t(`ageText.${o.event.ageGroup}`)}
                    </span>
                    <p>{text(o.event, "description", locale)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SmallEvent({
  occurrence,
  locale,
  ageText,
}: {
  occurrence: Occurrence;
  locale: AnyLocale;
  ageText: string;
}) {
  const { event } = occurrence;
  return (
    <div className={styles.smallEvent}>
      <span className={styles.time} style={{ background: kindSurface[event.kind] }}>
        <EventIconFor kind={event.kind} size={16} />
        {event.startTime}
      </span>
      <strong className={styles.smallTitle}>{text(event, "title", locale)}</strong>
      <span className={styles.smallMeta}>
        {text(event, "location", locale)} · {ageText}
      </span>
    </div>
  );
}
