"use client";

import { useMemo, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { MapFacility, MapPlot, Zone } from "@/lib/data/map";
import { FacilityIconFor } from "@/components/icons";
import type { FacilityIcon } from "@/content/facilities";
import { WithPlaceholders } from "@/components/Placeholder";
import { CloseIcon } from "@/components/icons";
import styles from "./SiteMap.module.css";

/** Availability of a plot for the chosen dates (book mode only). */
export type PlotStatus = "free" | "taken" | "blocked" | "unsuitable";

type Filter = "all" | "electricity" | "wheelchair" | "shade";

type Props = {
  plots: MapPlot[];
  facilities: MapFacility[];
  /** explore: no dates, everything clickable. book: taken and blocked are disabled. */
  mode: "explore" | "book";
  status?: Record<string, PlotStatus>;
  /** Plekmatch tips: plot id → one-line reason. */
  tips?: Record<string, string>;
  /** The guest's chosen (held) plot. */
  selectedPlotId?: string | null;
  onChoosePlot?: (plot: MapPlot) => void;
  /** Extra content at the bottom of the plot panel (price, CTA). */
  plotFooter?: (plot: MapPlot) => ReactNode;
  /** Shown above the map (date bar in the booking flow). */
  toolbarExtra?: ReactNode;
};

const ZONES: Zone[] = ["A", "B", "C", "S"];
const ZOOM = [48, 60, 76];

type Focus = { kind: "plot"; id: string } | { kind: "facility"; id: string } | null;

export function SiteMap({
  plots,
  facilities,
  mode,
  status = {},
  tips = {},
  selectedPlotId = null,
  onChoosePlot,
  plotFooter,
  toolbarExtra,
}: Props) {
  const t = useTranslations("map");
  const [view, setView] = useState<"map" | "list">("map");
  const [zoom, setZoom] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [picked, setPicked] = useState<Focus>(null);
  const [sheetClosed, setSheetClosed] = useState(false);

  // /plattegrond#pool opens that facility (links from Terrein & activiteiten).
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const hashFocus: Focus = facilities.some((f) => f.id === hash)
    ? { kind: "facility", id: hash }
    : plots.some((p) => p.id === hash)
      ? { kind: "plot", id: hash }
      : null;
  const focus: Focus = picked ?? hashFocus ?? (selectedPlotId ? { kind: "plot", id: selectedPlotId } : null);
  const sheetOpen = !sheetClosed && (picked !== null || hashFocus !== null);

  const matches = useMemo(() => {
    const test = (p: MapPlot) => {
      switch (filter) {
        case "electricity":
          return p.electricity;
        case "wheelchair":
          return p.wheelchair && p.checked;
        case "shade":
          return p.shade === "lots";
        default:
          return true;
      }
    };
    return new Set(plots.filter(test).map((p) => p.id));
  }, [plots, filter]);

  const byZone = useMemo(() => {
    const map = new Map<Zone, MapPlot[]>();
    for (const z of ZONES) map.set(z, []);
    for (const p of plots) map.get(p.zone)?.push(p);
    return map;
  }, [plots]);

  const facility = (id: string) => facilities.find((f) => f.id === id);

  function stateOf(p: MapPlot) {
    const raw = mode === "book" ? (status[p.id] ?? "free") : "free";
    const disabled = mode === "book" && raw !== "free" && p.id !== selectedPlotId;
    const unsuitable = raw === "unsuitable";
    const s = unsuitable ? "free" : raw;
    let visual: "free" | "taken" | "blocked" | "selected" | "tip" = s;
    const isSelected = mode === "book" ? p.id === selectedPlotId : focus?.kind === "plot" && focus.id === p.id;
    if (isSelected) visual = "selected";
    else if (s === "free" && tips[p.id]) visual = "tip";
    const dimmed = unsuitable || (filter !== "all" && !matches.has(p.id));
    return { visual, disabled, dimmed, isSelected, unsuitable };
  }

  function plotLabel(p: MapPlot) {
    const { visual, dimmed, unsuitable } = stateOf(p);
    const state =
      mode === "explore" && visual !== "selected"
        ? t(`type.${p.type}`)
        : unsuitable
          ? t("state.unsuitable")
          : t(`state.${visual}`);
    return t("plotAria", { id: p.id, state }) + (dimmed && !unsuitable ? `, ${t("state.dimmed")}` : "");
  }

  function openPlot(p: MapPlot) {
    setPicked({ kind: "plot", id: p.id });
    setSheetClosed(false);
    if (mode === "book" && onChoosePlot) onChoosePlot(p);
  }

  function openFacility(id: string) {
    setPicked({ kind: "facility", id });
    setSheetClosed(false);
  }

  // Arrow keys move to the neighbouring plot in the same zone.
  function onGridKey(e: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!keys.includes(e.key)) return;
    const current = document.activeElement as HTMLElement | null;
    if (!current?.dataset.plot) return;
    const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-plot]")).filter(
      (b) => !b.disabled,
    );
    const here = current.getBoundingClientRect();
    let best: HTMLButtonElement | null = null;
    let bestScore = Infinity;
    for (const b of buttons) {
      if (b === current) continue;
      const r = b.getBoundingClientRect();
      const dx = r.left - here.left;
      const dy = r.top - here.top;
      const ok =
        (e.key === "ArrowRight" && dx > 4 && Math.abs(dy) < here.height / 2) ||
        (e.key === "ArrowLeft" && dx < -4 && Math.abs(dy) < here.height / 2) ||
        (e.key === "ArrowDown" && dy > 4) ||
        (e.key === "ArrowUp" && dy < -4);
      if (!ok) continue;
      const score = e.key === "ArrowUp" || e.key === "ArrowDown" ? Math.abs(dy) * 4 + Math.abs(dx) : Math.abs(dx);
      if (score < bestScore) {
        best = b;
        bestScore = score;
      }
    }
    if (best) {
      e.preventDefault();
      best.focus();
    }
  }

  const plotButtons = (zone: Zone) => (
    <div className={styles.plots} onKeyDown={onGridKey}>
      {(byZone.get(zone) ?? []).map((p) => {
        const { visual, disabled, dimmed, isSelected } = stateOf(p);
        const num = p.id.slice(1);
        return (
          <button
            key={p.id}
            type="button"
            data-plot={p.id}
            className={`${styles.plot} ${styles[visual]} ${dimmed ? styles.dimmed : ""}`}
            aria-label={plotLabel(p)}
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => openPlot(p)}
          >
            <span aria-hidden="true">
              {visual === "blocked" ? "✕" : visual === "selected" ? `✓${num}` : visual === "tip" ? `★${num}` : num}
            </span>
          </button>
        );
      })}
    </div>
  );

  const facilityTile = (id: string, tall = false) => {
    const f = facility(id);
    if (!f) return null;
    const on = focus?.kind === "facility" && focus.id === id;
    return (
      <button
        type="button"
        className={`${styles.fac} ${styles[`fac_${id}`] ?? ""} ${tall ? styles.facTall : ""}`}
        aria-pressed={on}
        aria-label={t("showFacility", { name: f.name })}
        onClick={() => openFacility(id)}
      >
        <FacilityIconFor icon={f.icon as FacilityIcon} size={tall ? 40 : 30} />
        <span>{f.name}</span>
      </button>
    );
  };

  if (plots.length === 0) {
    return <p className="placeholder">{t("empty")}</p>;
  }

  const focusedPlot = focus?.kind === "plot" ? plots.find((p) => p.id === focus.id) : undefined;
  const focusedFacility = focus?.kind === "facility" ? facility(focus.id) : undefined;

  return (
    <div className={styles.wrap}>
      {toolbarExtra}
      <div className={styles.toolbar}>
        <div role="group" aria-label={t("filterLabel")} className={styles.chips}>
          {(["all", "electricity", "wheelchair", "shade"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={styles.chip}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {t(
                f === "all"
                  ? "filterAll"
                  : f === "electricity"
                    ? "filterElectricity"
                    : f === "wheelchair"
                      ? "filterWheelchair"
                      : "filterShade",
              )}
            </button>
          ))}
        </div>
        <div className={styles.tools}>
          <div role="group" aria-label={t("viewLabel")} className={styles.segment}>
            <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>
              {t("viewMap")}
            </button>
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
              {t("viewList")}
            </button>
          </div>
          {view === "map" && (
            <>
              <button
                type="button"
                className={styles.square}
                aria-label={t("zoomIn")}
                disabled={zoom === ZOOM.length - 1}
                onClick={() => setZoom((z) => Math.min(ZOOM.length - 1, z + 1))}
              >
                +
              </button>
              <button
                type="button"
                className={styles.square}
                aria-label={t("zoomOut")}
                disabled={zoom === 0}
                onClick={() => setZoom((z) => Math.max(0, z - 1))}
              >
                −
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.layout}>
        <section aria-label={t("regionLabel")} className={styles.main}>
          {view === "map" ? (
            <>
              <div className={styles.map} style={{ ["--plot-min" as string]: `${ZOOM[zoom]}px` }}>
                <div className={styles.row3}>
                  <Zone title={t("zoneTitle.A")}>{plotButtons("A")}</Zone>
                  {facilityTile("playground", true)}
                  <Zone title={t("zoneTitle.B")}>{plotButtons("B")}</Zone>
                </div>
                <div className={styles.row5}>
                  {["chickens", "canteen", "sanitary", "pool", "shop"].map((id) => (
                    <div key={id} className={styles.facCell}>
                      {facilityTile(id)}
                    </div>
                  ))}
                </div>
                <div className={styles.row2}>
                  <Zone title={t("zoneTitle.C")}>{plotButtons("C")}</Zone>
                  <Zone title={t("zoneTitle.S")}>{plotButtons("S")}</Zone>
                </div>
              </div>
              <p className="muted small">{t("keyboardHint")}</p>
              <Legend
                mode={mode}
                hasTips={Object.keys(tips).length > 0}
                hasUnsuitable={Object.values(status).includes("unsuitable")}
              />
            </>
          ) : (
            <ListView
              plots={plots.filter((p) => filter === "all" || matches.has(p.id))}
              facilities={facilities}
              mode={mode}
              status={status}
              tips={tips}
              selectedPlotId={selectedPlotId}
              onPlot={openPlot}
              onFacility={openFacility}
            />
          )}
        </section>

        <aside
          aria-label={t("detailLabel")}
          aria-live="polite"
          className={`${styles.panel} ${sheetOpen && focus ? styles.panelOpen : ""}`}
        >
          {focus && (
            <button type="button" className={styles.close} aria-label={t("close")} onClick={() => setSheetClosed(true)}>
              <CloseIcon size={22} />
            </button>
          )}
          {focusedPlot ? (
            <PlotDetail
              plot={focusedPlot}
              facilities={facilities}
              tip={tips[focusedPlot.id]}
              footer={plotFooter?.(focusedPlot)}
            />
          ) : focusedFacility ? (
            <FacilityDetail facility={focusedFacility} />
          ) : (
            <p className="muted">{t("pickSomething")}</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHash() {
  return decodeURIComponent(window.location.hash.slice(1));
}

function Zone({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.zone}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Legend({
  mode,
  hasTips,
  hasUnsuitable,
}: {
  mode: "explore" | "book";
  hasTips: boolean;
  hasUnsuitable: boolean;
}) {
  const t = useTranslations("map");
  return (
    <div className={styles.legend}>
      <h3 className="visually-hidden">{t("legend")}</h3>
      <ul>
        <li>
          <span className={`${styles.swatch} ${styles.free}`} aria-hidden="true">12</span>
          {t("legendFree")}
        </li>
        {mode === "book" && (
          <>
            <li>
              <span className={`${styles.swatch} ${styles.taken}`} aria-hidden="true" />
              {t("legendTaken")}
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.blocked}`} aria-hidden="true">✕</span>
              {t("legendBlocked")}
            </li>
          </>
        )}
        <li>
          <span className={`${styles.swatch} ${styles.selected}`} aria-hidden="true">✓</span>
          {t("legendSelected")}
        </li>
        {hasUnsuitable && (
          <li>
            <span className={`${styles.swatch} ${styles.unsuitableSwatch}`} aria-hidden="true" />
            {t("legendUnsuitable")}
          </li>
        )}
        {hasTips && (
          <li>
            <span className={`${styles.swatch} ${styles.tip}`} aria-hidden="true">★</span>
            {t("legendTip")}
          </li>
        )}
      </ul>
    </div>
  );
}

function features(p: MapPlot, t: ReturnType<typeof useTranslations<"map">>): string {
  const list: string[] = [];
  if (p.electricity) list.push(t("featureElectricity"));
  if (p.level) list.push(t("featureLevel"));
  if (p.shade === "lots") list.push(t("featureShade"));
  if (p.wheelchair && p.checked) list.push(t("featureWheelchair"));
  return list.join(", ");
}

function ListView({
  plots,
  facilities,
  mode,
  status,
  tips,
  selectedPlotId,
  onPlot,
  onFacility,
}: {
  plots: MapPlot[];
  facilities: MapFacility[];
  mode: "explore" | "book";
  status: Record<string, PlotStatus>;
  tips: Record<string, string>;
  selectedPlotId: string | null;
  onPlot: (p: MapPlot) => void;
  onFacility: (id: string) => void;
}) {
  const t = useTranslations("map");
  return (
    <div className="stack">
      <div className="table-wrap">
        <table className="table">
          <caption className="visually-hidden">{t("listCaption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("colPlot")}</th>
              <th scope="col">{t("colType")}</th>
              <th scope="col">{t("colZone")}</th>
              <th scope="col">{t("colFeatures")}</th>
              {mode === "book" && <th scope="col">{t("colStatus")}</th>}
              <th scope="col">
                <span className="visually-hidden">{t("colAction")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {plots.length === 0 && (
              <tr>
                <td colSpan={6}>{t("noMatches")}</td>
              </tr>
            )}
            {plots.map((p) => {
              const s = status[p.id] ?? "free";
              const mine = p.id === selectedPlotId;
              const disabled = mode === "book" && s !== "free" && !mine;
              return (
                <tr key={p.id}>
                  <th scope="row">
                    {tips[p.id] ? "★ " : ""}
                    {p.id}
                  </th>
                  <td>{t(`type.${p.type}`)}</td>
                  <td>{t(`zone.${p.zone}`)}</td>
                  <td>{features(p, t) || "–"}</td>
                  {mode === "book" && <td>{mine ? t("state.selected") : t(`state.${s}`)}</td>}
                  <td>
                    <button
                      type="button"
                      className="btn btn-quiet"
                      disabled={disabled}
                      aria-pressed={mine}
                      onClick={() => onPlot(p)}
                    >
                      {t("showPlot", { id: p.id })}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {mode === "explore" && (
        <section className="stack">
          <h3>{t("facilitiesCaption")}</h3>
          <ul className={styles.facList}>
            {facilities.map((f) => (
              <li key={f.id}>
                <button type="button" className="btn btn-quiet" onClick={() => onFacility(f.id)}>
                  <FacilityIconFor icon={f.icon as FacilityIcon} size={22} />
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PlotDetail({
  plot,
  facilities,
  tip,
  footer,
}: {
  plot: MapPlot;
  facilities: MapFacility[];
  tip?: string;
  footer?: ReactNode;
}) {
  const t = useTranslations("map");
  const yesNo = (v: boolean) => (v ? t("yes") : t("no"));
  const wheelchair = !plot.checked ? t("notChecked") : yesNo(plot.wheelchair);
  const near = ["playground", "sanitary", "pool"]
    .map((id) => ({ f: facilities.find((x) => x.id === id), m: plot.distances[id] }))
    .filter((x) => x.f && x.m !== undefined);

  return (
    <div className={styles.detail}>
      <span className="eyebrow">{t("plotKind", { type: t(`type.${plot.type}`) })}</span>
      <h2>{t("plotTitle", { id: plot.id })}</h2>
      {tip && <p className={styles.tipBox}>★ {tip}</p>}
      {plot.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={plot.photoUrl} alt={t("plotTitle", { id: plot.id })} className={styles.photo} />
      ) : (
        <div className={styles.photo}>
          <span className="placeholder">{t("photoMissing")}</span>
        </div>
      )}
      <dl className={styles.facts}>
        <div>
          <dt>{t("electricity")}</dt>
          <dd>{yesNo(plot.electricity)}</dd>
        </div>
        <div>
          <dt>{t("surface")}</dt>
          <dd>{t(`surfaceValue.${plot.surface}`)}</dd>
        </div>
        <div>
          <dt>{t("level")}</dt>
          <dd>{plot.level ? t("yes") : t("levelNo")}</dd>
        </div>
        <div>
          <dt>{t("shade")}</dt>
          <dd>{t(`shadeValue.${plot.shade}`)}</dd>
        </div>
        <div>
          <dt>{t("wheelchair")}</dt>
          <dd>{wheelchair}</dd>
        </div>
        <div>
          <dt>{t("maxPersons")}</dt>
          <dd>{plot.maxPersons}</dd>
        </div>
      </dl>
      {near.length > 0 && (
        <div className={styles.near}>
          <h3>{t("distancesTitle")}</h3>
          <ul>
            {near.map(({ f, m }) => (
              <li key={f!.id}>
                {f!.name}: <strong>{t("metres", { m: m! })}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
      {plot.note && <p>{plot.note}</p>}
      {!plot.checked && <p className="muted small">{t("sampleNote")}</p>}
      {footer}
    </div>
  );
}

function FacilityDetail({ facility }: { facility: MapFacility }) {
  const t = useTranslations("map");
  return (
    <div className={styles.detail}>
      <span className="eyebrow">{t("facilityKind")}</span>
      <h2>{facility.name}</h2>
      {facility.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={facility.photoUrl} alt={facility.name} className={styles.photo} />
      ) : (
        <div className={styles.photo}>
          <span className="placeholder">{t("photoMissing")}</span>
        </div>
      )}
      <p>{facility.description}</p>
      <ul className={styles.factList}>
        <li>
          <strong>{facility.hoursLabel === "when" ? t("when") : t("open")}</strong>{" "}
          <WithPlaceholders text={facility.hours} />
        </li>
        <li>
          <strong>{t("access")}</strong> <WithPlaceholders text={facility.access} />
        </li>
        <li>
          <strong>{t("where")}</strong> <WithPlaceholders text={facility.location} />
        </li>
      </ul>
    </div>
  );
}
