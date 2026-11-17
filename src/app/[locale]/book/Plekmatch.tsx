"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Chicken } from "@/components/Chicken";
import type { MapFacility, MapPlot } from "@/lib/data/map";
import { nightCount, plotTypeFor, type Accommodation } from "@/lib/booking-rules";
import { plekmatch, type Answers, type Reason } from "@/lib/plekmatch";
import { formatDate } from "@/lib/dates";
import { countPlekmatch, nextFreeStay, type PlotStatusMap } from "./actions";
import styles from "./flow.module.css";

type Question = keyof Answers;
const QUESTIONS: { id: Question; options: string[] }[] = [
  { id: "near", options: ["playground", "sanitary", "pool", "none"] },
  { id: "mood", options: ["quiet", "lively", "none"] },
  { id: "shade", options: ["lots", "some", "sun", "none"] },
  { id: "level", options: ["yes", "no"] },
  { id: "wheelchair", options: ["no", "yes"] },
];

export type PlekmatchProps = {
  plots: MapPlot[];
  facilities: MapFacility[];
  wish: { accommodation: Accommodation; persons: number; electricity: boolean };
  status: PlotStatusMap | null;
  arrival: string;
  departure: string;
  onPick: (plotId: string, tips: Record<string, string>) => void;
  /** To the map; with tips, they show as stars. */
  onSkip: (tips?: Record<string, string>) => void;
  onDates: (arrival: string, departure: string) => void;
  onBack: () => void;
};

/**
 * Plekmatch (F7.1): five questions as big buttons, then the three best free
 * plots, each with one reason. The answers stay in this component; only an
 * anonymous "shown" / "picked" count goes to the server.
 */
export function Plekmatch({ plots, facilities, wish, status, arrival, departure, onPick, onSkip, onDates, onBack }: PlekmatchProps) {
  const t = useTranslations("plekmatch");
  const locale = useLocale();
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [index, setIndex] = useState(0);
  // null while looking it up, "none" when nothing is free.
  const [nextFree, setNextFree] = useState<{ arrival: string; departure: string } | "none" | null>(null);
  const askedFor = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const counted = useRef(false);
  const done = index >= QUESTIONS.length;

  // Move focus to each new question or the results, so keyboard and
  // screen reader users follow along (no animation).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [index]);

  const result = useMemo(() => {
    if (!done || !status) return null;
    return plekmatch(plots, (id) => status[id] === "free", { type: plotTypeFor(wish.accommodation), persons: wish.persons, electricity: wish.electricity }, answers as Answers);
  }, [done, status, plots, wish.accommodation, wish.persons, wish.electricity, answers]);

  useEffect(() => {
    if (result?.kind === "tips" && !counted.current) {
      counted.current = true;
      void countPlekmatch("shown");
    }
    if (result?.kind === "near" && result.ideal && askedFor.current !== result.ideal) {
      askedFor.current = result.ideal;
      nextFreeStay(result.ideal, nightCount(arrival, departure), arrival).then((r) => setNextFree(r ?? "none"));
    }
  }, [result, arrival, departure]);

  const facilityName = (id: string) => facilities.find((f) => f.id === id)?.name ?? id;
  const reasonText = (r: Reason): string => {
    switch (r.key) {
      case "near":
        return t("reason.near", { metres: r.metres, facility: facilityName(r.facility) });
      case "shade":
        return t(r.shade === "lots" ? "reason.shadeLots" : "reason.shadeSome");
      case "fits":
        return t("reason.fits", { persons: r.persons });
      default:
        return t(`reason.${r.key}`);
    }
  };
  const date = (d: string) => formatDate(d, locale, { weekday: "short", day: "numeric", month: "long" });

  function answer(q: Question, option: string) {
    const value = q === "level" || q === "wheelchair" ? option === "yes" : option;
    setAnswers((a) => ({ ...a, [q]: value }));
    setIndex((i) => i + 1);
  }

  function restart() {
    setAnswers({});
    setNextFree(null);
    askedFor.current = null;
    counted.current = false;
    setIndex(0);
  }

  return (
    <section className={`card ${styles.match}`} aria-labelledby="plekmatch-q">
      <Chicken size={96} />
      <div className="stack">
        {!done ? (
          <>
            <p className="muted">{index === 0 ? t("intro") : t("progress", { n: index + 1, total: QUESTIONS.length })}</p>
            {index === 0 && <p className="visually-hidden">{t("progress", { n: 1, total: QUESTIONS.length })}</p>}
            <h2 id="plekmatch-q" ref={heading} tabIndex={-1}>
              {t(`q.${QUESTIONS[index].id}.title`)}
            </h2>
            <div className={styles.answers} role="group" aria-labelledby="plekmatch-q">
              {QUESTIONS[index].options.map((o) => (
                <button key={o} type="button" className="btn btn-secondary btn-large" onClick={() => answer(QUESTIONS[index].id, o)}>
                  {t(`q.${QUESTIONS[index].id}.${o}` as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-quiet" onClick={() => (index === 0 ? onBack() : setIndex((i) => i - 1))}>
                {t("back")}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => onSkip()}>
                {t("skip")}
              </button>
            </div>
            <p className="muted small">{t("joke")}</p>
          </>
        ) : !result ? (
          <h2 id="plekmatch-q" ref={heading} tabIndex={-1} aria-live="polite">
            {t("loading")}
          </h2>
        ) : result.kind === "tips" ? (
          <>
            <h2 id="plekmatch-q" ref={heading} tabIndex={-1}>
              {t("resultsTitle", { count: result.tips.length })}
            </h2>
            <ol className={styles.tips}>
              {result.tips.map((tip) => (
                <li key={tip.plotId} className={styles.tip}>
                  <span className={styles.tipStar} aria-hidden="true">
                    ★
                  </span>
                  <span className={styles.tipText}>
                    <strong>{tip.plotId}</strong>
                    <span>{reasonText(tip.reason)}</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      void countPlekmatch("picked");
                      onPick(tip.plotId, Object.fromEntries(result.tips.map((x) => [x.plotId, reasonText(x.reason)])));
                    }}
                  >
                    {t("pick", { id: tip.plotId })}
                  </button>
                </li>
              ))}
            </ol>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onSkip(Object.fromEntries(result.tips.map((x) => [x.plotId, reasonText(x.reason)])))}
              >
                {t("seeOnMap")}
              </button>
              <button type="button" className="btn btn-quiet" onClick={restart}>
                {t("again")}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="plekmatch-q" ref={heading} tabIndex={-1}>
              {result.closest || result.ideal ? t("nearTitle") : t("noneAtAll")}
            </h2>
            {result.closest && (
              <div className={styles.tip}>
                <span className={styles.tipStar} aria-hidden="true">
                  ★
                </span>
                <span className={styles.tipText}>
                  <span>{t("nearClosest", { id: result.closest.plotId })}</span>
                  {result.misses.includes("electricity") && <span>{t("missesElectricity")}</span>}
                  {result.misses.includes("wheelchair") && <span>{t("missesWheelchair")}</span>}
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onPick(result.closest!.plotId, { [result.closest!.plotId]: t("nearClosest", { id: result.closest!.plotId }) })}
                >
                  {t("pick", { id: result.closest.plotId })}
                </button>
              </div>
            )}
            {result.closest && !result.ideal && <p>{t("noIdeal")}</p>}
            {result.ideal && (
              <p aria-live="polite">
                {nextFree === null
                  ? t("loading")
                  : nextFree === "none"
                    ? t("nearIdealNone")
                    : t("nearIdeal", { id: result.ideal, from: date(nextFree.arrival), to: date(nextFree.departure) })}
              </p>
            )}
            <div className="btn-row">
              {nextFree && nextFree !== "none" && (
                <button type="button" className="btn btn-secondary" onClick={() => onDates(nextFree.arrival, nextFree.departure)}>
                  {t("tryDates")}
                </button>
              )}
              <button type="button" className="btn btn-quiet" onClick={() => onSkip()}>
                {t("skip")}
              </button>
              <button type="button" className="btn btn-quiet" onClick={restart}>
                {t("again")}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
