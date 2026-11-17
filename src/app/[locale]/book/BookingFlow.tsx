"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Chicken } from "@/components/Chicken";
import { SiteMap, type PlotStatus } from "@/components/map/SiteMap";
import type { MapFacility, MapPlot } from "@/lib/data/map";
import type { BookingRules, PriceInfo } from "@/lib/data/booking";
import { nightCount, plotSuits, validateStay, type Accommodation, type StayError } from "@/lib/booking-rules";
import { calculatePrice, type PriceResult } from "@/lib/pricing";
import { isIsoDate, todayAtCampsite, formatDate } from "@/lib/dates";
import {
  currentHold,
  dropHold,
  holdPlot,
  loadAvailability,
  submitBooking,
  type HoldState,
  type PlotStatusMap,
} from "./actions";
import { Countdown } from "./Countdown";
import { Plekmatch } from "./Plekmatch";
import styles from "./flow.module.css";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const ACCOMMODATIONS: Accommodation[] = ["tent", "caravan", "camper", "safari_tent"];

type Details = { name: string; email: string; phone: string; remarks: string };
type Done = { status: "requested" | "confirmed"; code: string; email: string; plotId: string };

type Props = {
  plots: MapPlot[];
  facilities: MapFacility[];
  rules: BookingRules;
  prices: PriceInfo;
  /** Price list and season info, shown under step 1. */
  info: ReactNode;
};

function int(v: string | null, fallback: number, min: number, max: number) {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

export function BookingFlow({ plots, facilities, rules, prices, info }: Props) {
  const t = useTranslations("booking");
  const tm = useTranslations("map");
  const locale = useLocale();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ------------------------------------------------------------ URL state
  const arrival = params.get("aankomst") ?? "";
  const departure = params.get("vertrek") ?? "";
  const adults = int(params.get("volw"), 2, 1, 20);
  const children = int(params.get("kind"), 0, 0, 20);
  const dogs = int(params.get("hond"), 0, 0, 5);
  const accommodationParam = params.get("verblijf") as Accommodation | null;
  const accommodation: Accommodation = ACCOMMODATIONS.includes(accommodationParam!) ? accommodationParam! : "tent";
  const electricity = accommodation === "safari_tent" || params.get("stroom") === "1";
  const wantedPlot = params.get("plek");
  const persons = adults + children;

  const update = useCallback(
    (changes: Record<string, string | number | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, String(v));
      }
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  // ------------------------------------------------------------ app state
  const [hold, setHold] = useState<HoldState | null>(null);
  const [status, setStatus] = useState<PlotStatusMap | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [busyPlot, setBusyPlot] = useState<string | null>(null);
  const [tips, setTips] = useState<Record<string, string>>({});
  const [taken, setTaken] = useState<{ plotId: string; alternatives: string[] } | null>(null);
  const [details, setDetails] = useState<Details>({ name: "", email: "", phone: "", remarks: "" });
  const [done, setDone] = useState<Done | null>(null);
  const today = todayAtCampsite();

  const stayError: StayError | null = isIsoDate(arrival) && isIsoDate(departure)
    ? validateStay(arrival, departure, rules, today)
    : "departure_before_arrival";
  const datesOk = stayError === null;
  const holdMatches = !!hold && hold.arrival === arrival && hold.departure === departure;

  const requested = int(params.get("stap"), 1, 1, 7) as Step;
  const maxStep: Step = done ? 7 : !datesOk ? 1 : !holdMatches ? 4 : 6;
  const step: Step = done ? 7 : (Math.min(requested, maxStep) as Step);
  const go = (s: Step) => update({ stap: s });

  // Restore the hold after a reload.
  useEffect(() => {
    let live = true;
    currentHold().then((h) => live && h && setHold(h));
    return () => {
      live = false;
    };
  }, []);

  // Free/taken/blocked for the chosen dates.
  const autoPicked = useRef(false);
  function refreshStatus() {
    if (!datesOk) return;
    loadAvailability(arrival, departure).then(onStatus);
  }

  function onStatus(s: PlotStatusMap | null) {
    setStatus(s);
    setStatusError(s === null);
    // From the Plattegrond: "Is deze plek vrij?" carries ?plek=T14 along.
    if (s && wantedPlot && !autoPicked.current && !holdMatches && step === 4) {
      autoPicked.current = true;
      const plot = plotById(wantedPlot);
      if (plot && s[plot.id] === "free" && plotSuits(plot, wish)) void choose(plot);
    }
  }

  useEffect(() => {
    if (step < 3 || step > 4 || !datesOk) return;
    let live = true;
    loadAvailability(arrival, departure).then((s) => live && onStatus(s));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, arrival, departure, datesOk]);

  // ------------------------------------------------------------ focus and announce
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const wish = { accommodation, persons, electricity };
  const mapStatus = useMemo(() => {
    const out: Record<string, PlotStatus> = {};
    for (const p of plots) {
      const s = status?.[p.id] ?? "free";
      out[p.id] = s === "free" && !plotSuits(p, wish) && p.id !== hold?.plotId ? "unsuitable" : s;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plots, status, accommodation, persons, electricity, hold?.plotId]);

  const plotById = (id: string | undefined | null) => plots.find((p) => p.id === id);
  const heldPlot = holdMatches ? plotById(hold!.plotId) : undefined;

  const priceOf = (plot: MapPlot): PriceResult =>
    calculatePrice(
      { priceGroupId: plot.priceGroupId, arrival, departure, adults, children, dogs, electricity },
      prices,
    );
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });
  const nights = datesOk ? nightCount(arrival, departure) : 0;

  // ------------------------------------------------------------ actions
  async function choose(plot: MapPlot) {
    if (!datesOk) return;
    if (!plotSuits(plot, wish)) {
      setMessage(t("notThisPlot"));
      return;
    }
    if (holdMatches && hold!.plotId === plot.id) return;
    setBusyPlot(plot.id);
    setMessage(t("holding", { id: plot.id }));
    const r = await holdPlot(plot.id, arrival, departure);
    setBusyPlot(null);
    if (r.status === "held" && "hold" in r) {
      setHold(r.hold);
      setTaken(null);
      setMessage("");
      return;
    }
    const key = ["taken", "blocked", "too_many_holds", "rate_limited"].includes(r.status) ? r.status : "error";
    // Dynamic keys: the typed t() only knows each key's own params.
    const tx = t as unknown as (key: string, values: Record<string, string | number>) => string;
    setMessage(tx(`holdStatus.${key}`, { id: plot.id, max: rules.maxHolds }));
    refreshStatus();
  }

  const onExpire = useCallback(() => {
    const id = hold?.plotId ?? "";
    setHold(null);
    setMessage(t("expired", { id }));
    dropHold();
    go(4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hold?.plotId]);

  // ------------------------------------------------------------ render
  const title =
    step === 7 && done?.status === "confirmed" ? t("titleConfirmed") : t(`titles.${step - 1}`);
  const stepNames = t.raw("steps") as string[];

  return (
    <div className={styles.flow}>
      <div className={styles.head}>
        <span className="eyebrow">{t("stepOf", { step })}</span>
        <h1 ref={heading} tabIndex={-1} className={styles.title}>
          {title}
        </h1>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {t("announce", { step, title })}
      </p>

      <ol aria-label={t("stepsLabel")} className={styles.steps}>
        {stepNames.map((name, i) => {
          const n = (i + 1) as Step;
          const state = n < step ? "done" : n === step ? "current" : "todo";
          return (
            <li key={name} className={styles[`step_${state}`]} aria-current={n === step ? "step" : undefined}>
              <span className={styles.dot} aria-hidden="true">
                {state === "done" ? "✓" : n}
              </span>
              {name}
              {state === "done" && <span className="visually-hidden">, {t("stepDone")}</span>}
            </li>
          );
        })}
      </ol>

      {step >= 3 && step <= 6 && (
        <div className={styles.summaryBar}>
          <span>
            {formatDate(arrival, locale, { weekday: "short", day: "numeric", month: "short" })} –{" "}
            {formatDate(departure, locale, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
            {t("summaryBar", {
              nights: t("nights", { count: nights }),
              persons,
              accommodation: t(`accommodationValue.${accommodation}`),
            })}
          </span>
          <button type="button" className="btn btn-quiet" onClick={() => go(1)}>
            {t("change")}
          </button>
        </div>
      )}

      {holdMatches && heldPlot && step >= 4 && step <= 6 && (
        <Countdown heldUntil={hold!.heldUntil} plotId={hold!.plotId} onExpire={onExpire} />
      )}

      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}

      {step === 1 && (
        <StepDates
          arrival={arrival}
          departure={departure}
          rules={rules}
          today={today}
          onChange={(a, d) => update({ aankomst: a, vertrek: d })}
          onNext={() => go(2)}
          info={info}
        />
      )}

      {step === 2 && (
        <StepGroup
          adults={adults}
          kids={children}
          dogs={dogs}
          accommodation={accommodation}
          electricity={electricity}
          onChange={update}
          onBack={() => go(1)}
          onNext={() => go(3)}
        />
      )}

      {step === 3 &&
        (rules.plekmatch ? (
          <Plekmatch
            plots={plots}
            facilities={facilities}
            wish={wish}
            status={status}
            arrival={arrival}
            departure={departure}
            onPick={(plotId, newTips) => {
              setTips(newTips);
              const plot = plotById(plotId);
              if (plot) void choose(plot);
              go(4);
            }}
            onSkip={(newTips) => {
              if (newTips) setTips(newTips);
              go(4);
            }}
            onDates={(a, d) => update({ aankomst: a, vertrek: d, stap: 3 })}
            onBack={() => go(2)}
          />
        ) : (
          <section className={`card ${styles.match}`}>
            <Chicken size={96} />
            <div className="stack">
              <h2>{t("matchTitle")}</h2>
              <p>{t("matchText")}</p>
              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={() => go(2)}>
                  {t("back")}
                </button>
                <button type="button" className="btn btn-primary btn-large" onClick={() => go(4)}>
                  {t("matchSkip")}
                </button>
              </div>
            </div>
          </section>
        ))}

      {step === 4 && (
        <div className="stack">
          {taken && (
            <section className={`card ${styles.taken}`} aria-labelledby="taken-title">
              <h2 id="taken-title">{t("takenTitle", { id: taken.plotId })}</h2>
              {taken.alternatives.length > 0 ? (
                <>
                  <p>{t("takenText")}</p>
                  <div className="btn-row">
                    {taken.alternatives.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          const p = plotById(id);
                          if (p) void choose(p);
                        }}
                      >
                        ★ {t("pickAlternative", { id })}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p>{t("takenNone")}</p>
              )}
            </section>
          )}
          {statusError ? (
            <div className="card stack">
              <p>{t("mapError")}</p>
              <button type="button" className="btn btn-secondary" onClick={refreshStatus}>
                {t("retry")}
              </button>
            </div>
          ) : !status ? (
            <p role="status">{t("loadingMap")}</p>
          ) : (
            <SiteMap
              plots={plots}
              facilities={facilities}
              mode="book"
              status={mapStatus}
              tips={tips}
              selectedPlotId={holdMatches ? hold!.plotId : null}
              onChoosePlot={(p) => void choose(p)}
              plotFooter={(p) => {
                const price = priceOf(p);
                const mine = holdMatches && hold!.plotId === p.id;
                return (
                  <div className={styles.plotFooter}>
                    <div className={styles.priceRow}>
                      <span>{t("priceFor", { nights: t("nights", { count: nights }) })}</span>
                      <strong>{price.total === null ? t("priceUnknown") : money.format(price.total)}</strong>
                    </div>
                    {mine ? (
                      <>
                        <p className={styles.heldNote}>
                          {t.rich("heldFor", {
                            minutes: rules.holdMinutes,
                            strong: (c) => <strong>{c}</strong>,
                          })}
                        </p>
                        <button type="button" className="btn btn-primary btn-large" onClick={() => go(5)}>
                          {t("toDetails")}
                        </button>
                      </>
                    ) : busyPlot === p.id ? (
                      <p role="status">{t("holding", { id: p.id })}</p>
                    ) : mapStatus[p.id] === "unsuitable" ? (
                      <p className="muted small">{t("notThisPlot")}</p>
                    ) : null}
                  </div>
                );
              }}
            />
          )}
          <div className="btn-row">
            <button type="button" className="btn btn-secondary" onClick={() => go(3)}>
              {t("back")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => (holdMatches ? go(5) : setMessage(t("pickFirst")))}
            >
              {t("toDetails")}
            </button>
          </div>
          <p className="muted small">{tm("keyboardHint")}</p>
        </div>
      )}

      {step === 5 && heldPlot && (
        <StepDetails
          details={details}
          onChange={setDetails}
          onBack={() => go(4)}
          onNext={() => go(6)}
        />
      )}

      {step === 6 && heldPlot && (
        <StepReview
          plot={heldPlot}
          arrival={arrival}
          departure={departure}
          adults={adults}
          kids={children}
          dogs={dogs}
          accommodation={accommodation}
          electricity={electricity}
          details={details}
          price={priceOf(heldPlot)}
          prices={prices}
          level={rules.bookingLevel}
          onBack={() => go(5)}
          onSubmit={async (houseRules, website) => {
            const r = await submitBooking({
              plotId: heldPlot.id,
              arrival,
              departure,
              adults,
              children,
              dogs,
              accommodation,
              electricity,
              ...details,
              houseRules,
              website,
              locale,
            });
            if (r.status === "requested" || r.status === "confirmed") {
              const ok = r as Done;
              setDone({ ...ok, plotId: heldPlot.id });
              setHold(null);
              update({ stap: 7, plek: null });
              return null;
            }
            if (r.status === "taken" && "alternatives" in r) {
              setHold(null);
              setTaken({ plotId: heldPlot.id, alternatives: r.alternatives });
              setTips(Object.fromEntries(r.alternatives.map((id) => [id, t("pickAlternative", { id })])));
              go(4);
              return null;
            }
            if (r.status === "expired") {
              setHold(null);
              setMessage(t("submitError.expired"));
              go(4);
              return null;
            }
            const known = ["rate_limited", "invalid"].includes(r.status);
            const dbError = (t.raw("errors") as Record<string, string>)[r.status];
            return dbError ?? t(`submitError.${known ? r.status : "error"}`);
          }}
        />
      )}

      {step === 7 && done && <StepDone done={done} />}
    </div>
  );
}

// ---------------------------------------------------------------- step 1

function StepDates({
  arrival,
  departure,
  rules,
  today,
  onChange,
  onNext,
  info,
}: {
  arrival: string;
  departure: string;
  rules: BookingRules;
  today: string;
  onChange: (arrival: string, departure: string) => void;
  onNext: () => void;
  info: ReactNode;
}) {
  const t = useTranslations("booking");
  const [tried, setTried] = useState(false);
  const [a, setA] = useState(arrival);
  const [d, setD] = useState(departure);
  const last = rules.seasons.at(-1)?.endsOn;
  const localError = isIsoDate(a) && isIsoDate(d) ? validateStay(a, d, rules, today) : "departure_before_arrival";
  const show = tried || (isIsoDate(a) && isIsoDate(d)) ? localError : null;
  const nights = !localError ? nightCount(a, d) : 0;

  return (
    <div className="stack">
      <form
        className={`card ${styles.form}`}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          onChange(a, d);
          if (!localError) onNext();
        }}
      >
        <div className={styles.fields2}>
          <div className={styles.field}>
            <label htmlFor="arrival">{t("arrival")}</label>
            <input
              id="arrival"
              type="date"
              value={a}
              min={today}
              max={last}
              aria-describedby="dates-hint dates-error"
              aria-invalid={!!show}
              onChange={(e) => setA(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="departure">{t("departure")}</label>
            <input
              id="departure"
              type="date"
              value={d}
              min={a || today}
              max={last}
              aria-describedby="dates-hint dates-error"
              aria-invalid={!!show}
              onChange={(e) => setD(e.target.value)}
            />
          </div>
        </div>
        <p id="dates-hint" className="muted small">
          {t("arrivalHint")} {rules.minNights > 1 && t("minNights", { count: rules.minNights })}
        </p>
        <p id="dates-error" className={styles.error} aria-live="polite">
          {show &&
            t(`errors.${show}`, { min: rules.minNights, max: rules.maxNights })}
        </p>
        {nights > 0 && <p className={styles.nights}>{t("nights", { count: nights })}</p>}
        <div className="btn-row">
          <button type="submit" className="btn btn-primary btn-large">
            {t("next")}
          </button>
        </div>
        <p className="muted small">
          {t("phoneAlternative")} <Link href="/contact">{t("phoneAlternativeLink")}</Link>
        </p>
      </form>
      {info}
    </div>
  );
}

// ---------------------------------------------------------------- step 2

function Stepper({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const t = useTranslations("booking");
  return (
    <div className={styles.stepper} role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className={styles.stepperLabel}>
        {label}
      </span>
      <div className={styles.stepperControls}>
        <button
          type="button"
          className={styles.round}
          aria-label={t("fewer", { what: label })}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <output aria-live="polite" className={styles.count}>
          {value}
        </output>
        <button
          type="button"
          className={styles.round}
          aria-label={t("more", { what: label })}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

function StepGroup({
  adults,
  kids,
  dogs,
  accommodation,
  electricity,
  onChange,
  onBack,
  onNext,
}: {
  adults: number;
  kids: number;
  dogs: number;
  accommodation: Accommodation;
  electricity: boolean;
  onChange: (c: Record<string, string | number | null>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("booking");
  return (
    <form
      className={`card ${styles.form}`}
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
    >
      <div className={styles.steppers}>
        <Stepper id="adults" label={t("adults")} value={adults} min={1} max={10} onChange={(v) => onChange({ volw: v })} />
        <Stepper id="kids" label={t("children")} value={kids} min={0} max={10} onChange={(v) => onChange({ kind: v })} />
        <Stepper id="dogs" label={t("dogs")} value={dogs} min={0} max={3} onChange={(v) => onChange({ hond: v })} />
      </div>

      <fieldset className={styles.choices}>
        <legend>{t("accommodation")}</legend>
        <div className={styles.choiceGrid}>
          {ACCOMMODATIONS.map((a) => (
            <label key={a} className={styles.choice}>
              <input
                type="radio"
                name="accommodation"
                value={a}
                checked={accommodation === a}
                onChange={() => onChange({ verblijf: a })}
              />
              <span>
                <strong>{t(`accommodationValue.${a}`)}</strong>
                <span className="muted small">{t(`accommodationHint.${a}`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.choices}>
        <legend>{t("electricity")}</legend>
        {accommodation === "safari_tent" ? (
          <p className="muted">{t("safariHasPower")}</p>
        ) : (
          <div className={styles.choiceGrid}>
            {[true, false].map((v) => (
              <label key={String(v)} className={styles.choice}>
                <input
                  type="radio"
                  name="electricity"
                  checked={electricity === v}
                  onChange={() => onChange({ stroom: v ? 1 : null })}
                />
                <span>
                  <strong>{v ? t("electricityYes") : t("electricityNo")}</strong>
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          {t("back")}
        </button>
        <button type="submit" className="btn btn-primary btn-large">
          {t("next")}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- step 5

function StepDetails({
  details,
  onChange,
  onBack,
  onNext,
}: {
  details: Details;
  onChange: (d: Details) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("booking");
  const [tried, setTried] = useState(false);
  const errors = {
    name: !details.name.trim() ? t("required") : "",
    email: !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(details.email.trim()) ? t("emailInvalid") : "",
  };
  const field = (k: keyof Details, v: string) => onChange({ ...details, [k]: v });

  return (
    <form
      className={`card ${styles.form}`}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (errors.name || errors.email) {
          document.getElementById(errors.name ? "name" : "email")?.focus();
          return;
        }
        onNext();
      }}
    >
      <div className={styles.fields2}>
        <div className={styles.field}>
          <label htmlFor="name">{t("name")}</label>
          <input
            id="name"
            autoComplete="name"
            value={details.name}
            maxLength={120}
            aria-invalid={tried && !!errors.name}
            aria-describedby="name-error"
            onChange={(e) => field("name", e.target.value)}
          />
          <p id="name-error" className={styles.error}>
            {tried && errors.name}
          </p>
        </div>
        <div className={styles.field}>
          <label htmlFor="email">{t("email")}</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={details.email}
            maxLength={200}
            aria-invalid={tried && !!errors.email}
            aria-describedby="email-error"
            onChange={(e) => field("email", e.target.value)}
          />
          <p id="email-error" className={styles.error}>
            {tried && errors.email}
          </p>
        </div>
        <div className={styles.field}>
          <label htmlFor="phone">
            {t("phone")} <span className="muted">{t("optional")}</span>
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={details.phone}
            maxLength={30}
            aria-describedby="phone-hint"
            onChange={(e) => field("phone", e.target.value)}
          />
          <p id="phone-hint" className="muted small">
            {t("phoneHint")}
          </p>
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="remarks">
          {t("remarks")} <span className="muted">{t("optional")}</span>
        </label>
        <textarea
          id="remarks"
          rows={4}
          maxLength={2000}
          value={details.remarks}
          aria-describedby="remarks-hint"
          onChange={(e) => field("remarks", e.target.value)}
        />
        <p id="remarks-hint" className="muted small">
          {t("remarksHint")}
        </p>
      </div>
      <p className="muted small">{t("privacyNote")}</p>
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          {t("back")}
        </button>
        <button type="submit" className="btn btn-primary btn-large">
          {t("next")}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- step 6

function StepReview({
  plot,
  arrival,
  departure,
  adults,
  kids,
  dogs,
  accommodation,
  electricity,
  details,
  price,
  prices,
  level,
  onBack,
  onSubmit,
}: {
  plot: MapPlot;
  arrival: string;
  departure: string;
  adults: number;
  kids: number;
  dogs: number;
  accommodation: Accommodation;
  electricity: boolean;
  details: Details;
  price: PriceResult;
  prices: PriceInfo;
  level: 1 | 2;
  onBack: () => void;
  onSubmit: (houseRules: boolean, website: string) => Promise<string | null>;
}) {
  const t = useTranslations("booking");
  const tm = useTranslations("map");
  const locale = useLocale();
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" });
  const [rules, setRules] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const website = useRef<HTMLInputElement>(null);
  const date = (d: string) => formatDate(d, locale, { weekday: "long", day: "numeric", month: "long" });

  return (
    <form
      className="stack"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setTried(true);
        if (!rules) {
          document.getElementById("house-rules")?.focus();
          return;
        }
        setBusy(true);
        setError("");
        const err = await onSubmit(true, website.current?.value ?? "");
        setBusy(false);
        if (err) setError(err);
      }}
    >
      <div className={styles.review}>
        <section className="card" aria-labelledby="review-title">
          <h2 id="review-title">{t("reviewTitle")}</h2>
          <dl className={styles.dl}>
            <div>
              <dt>{t("reviewStay")}</dt>
              <dd>
                {date(arrival)} – {date(departure)} ({t("nights", { count: price.nights })})
              </dd>
            </div>
            <div>
              <dt>{t("reviewPlot")}</dt>
              <dd>
                {tm("plotTitle", { id: plot.id })} · {tm(`type.${plot.type}`)} · {t(`accommodationValue.${accommodation}`)}
                {electricity && `, ${t("withElectricity")}`}
              </dd>
            </div>
            <div>
              <dt>{t("reviewGuests")}</dt>
              <dd>{t("persons", { adults, children: kids, dogs })}</dd>
            </div>
            <div>
              <dt>{t("reviewContact")}</dt>
              <dd>
                {details.name}
                <br />
                {details.email}
                {details.phone && (
                  <>
                    <br />
                    {details.phone}
                  </>
                )}
                {details.remarks && (
                  <>
                    <br />
                    <span className="muted">{details.remarks}</span>
                  </>
                )}
              </dd>
            </div>
          </dl>
          <button type="button" className="btn btn-quiet" onClick={onBack}>
            {t("change")}
          </button>
        </section>

        <section className="card" aria-labelledby="price-title">
          <h2 id="price-title">{t("priceTitle")}</h2>
          <table className={styles.priceTable}>
            <tbody>
              {price.lines.map((l) => (
                <tr key={l.kind === "nights" ? `n-${l.periodId}` : `e-${l.id}`}>
                  <th scope="row">
                    {l.kind === "nights"
                      ? t("priceNights", { nights: l.nights, period: prices.periodNames[l.periodId] ?? "" })
                      : t("priceExtra", { name: prices.extraNames[l.id]?.name ?? l.id, quantity: l.quantity })}
                  </th>
                  <td>{l.amount === null ? <span className="placeholder">{t("priceUnknown")}</span> : money.format(l.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{t("total")}</th>
                <td>{price.total === null ? <span className="placeholder">{t("priceUnknown")}</span> : money.format(price.total)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="muted small">{t("priceNote")}</p>
        </section>
      </div>

      <div className="card stack">
        <label className={styles.check}>
          <input
            id="house-rules"
            type="checkbox"
            checked={rules}
            aria-invalid={tried && !rules}
            aria-describedby="house-rules-error"
            onChange={(e) => setRules(e.target.checked)}
          />
          <span>
            {t.rich("houseRules", {
              link: (c) => (
                <Link href="/house-rules" target="_blank">
                  {c}
                </Link>
              ),
            })}
          </span>
        </label>
        <p id="house-rules-error" className={styles.error}>
          {tried && !rules && t("houseRulesRequired")}
        </p>
        {/* Honeypot: hidden from people and screen readers, bots fill it in. */}
        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" ref={website} tabIndex={-1} autoComplete="off" />
        </div>
        <p className={styles.error} role="alert">
          {error}
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={onBack} disabled={busy}>
            {t("back")}
          </button>
          <button type="submit" className="btn btn-primary btn-large" disabled={busy}>
            {busy ? t("submitting") : level === 2 ? t("submitBook") : t("submitRequest")}
          </button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- step 7

function StepDone({ done }: { done: Done }) {
  const t = useTranslations("booking");
  const next = t.raw("doneSteps") as string[];
  return (
    <div className={styles.done}>
      <section className="card stack">
        <p>
          {done.status === "confirmed"
            ? t("doneConfirmed", { plot: done.plotId })
            : t("doneRequested", { plot: done.plotId })}
        </p>
        <div className={styles.code}>
          <span>{t("doneCode")}</span>
          <strong>{done.code}</strong>
        </div>
        <p>{t("doneMail", { email: done.email })}</p>
        <h2>{t("doneNext")}</h2>
        <ul>
          {next.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <div className="btn-row">
          <Link href="/" className="btn btn-secondary">
            {t("doneHome")}
          </Link>
          <Link href="/events" className="btn btn-primary">
            {t("doneEvents")}
          </Link>
        </div>
      </section>
      <figure className={styles.joke}>
        <Chicken size={120} />
        <figcaption>{t("joke")}</figcaption>
      </figure>
    </div>
  );
}
