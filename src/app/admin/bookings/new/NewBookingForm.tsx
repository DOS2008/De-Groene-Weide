"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteMap, type PlotStatus } from "@/components/map/SiteMap";
import type { MapFacility, MapPlot } from "@/lib/data/map";
import type { PriceInfo } from "@/lib/data/booking";
import { nightCount, plotSuits, type Accommodation } from "@/lib/booking-rules";
import { calculatePrice } from "@/lib/pricing";
import { isIsoDate } from "@/lib/dates";
import { adminAvailability, createBooking, type NewBooking } from "../actions";

const money = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export function NewBookingForm({
  plots,
  facilities,
  prices,
}: {
  plots: MapPlot[];
  facilities: MapFacility[];
  prices: PriceInfo;
}) {
  const [arrival, setArrival] = useState("");
  const [departure, setDeparture] = useState("");
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [dogs, setDogs] = useState(0);
  const [accommodation, setAccommodation] = useState<Accommodation>("tent");
  const [electricity, setElectricity] = useState(false);
  const [status, setStatus] = useState<Record<string, "free" | "taken" | "blocked"> | null>(null);
  const [plotId, setPlotId] = useState<string | null>(null);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", remarks: "" });
  const [locale, setLocale] = useState<"nl" | "en" | "de">("nl");
  const [source, setSource] = useState<"phone" | "desk">("phone");
  const [sendMail, setSendMail] = useState(true);
  const [result, setResult] = useState<{ ok?: string; error?: string; code?: string }>({});
  const [busy, setBusy] = useState(false);

  const datesOk = isIsoDate(arrival) && isIsoDate(departure) && departure > arrival;
  const wish = { accommodation, persons: adults + kids, electricity: electricity || accommodation === "safari_tent" };

  useEffect(() => {
    if (!datesOk) return;
    let live = true;
    adminAvailability(arrival, departure).then((s) => live && setStatus(s));
    return () => {
      live = false;
    };
  }, [arrival, departure, datesOk]);

  const mapStatus = useMemo(() => {
    const out: Record<string, PlotStatus> = {};
    for (const p of plots) {
      const s = status?.[p.id] ?? "free";
      out[p.id] = s === "free" && !plotSuits(p, wish) ? "unsuitable" : s;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plots, status, accommodation, adults, kids, electricity]);

  const plot = plots.find((p) => p.id === plotId);
  const price =
    plot && datesOk
      ? calculatePrice(
          { priceGroupId: plot.priceGroupId, arrival, departure, adults, children: kids, dogs, electricity: wish.electricity },
          prices,
        ).total
      : null;

  async function submit() {
    if (!plot || !datesOk) return;
    setBusy(true);
    const input: NewBooking = {
      plotId: plot.id,
      arrival,
      departure,
      adults,
      children: kids,
      dogs,
      accommodation,
      electricity: wish.electricity,
      ...contact,
      locale,
      source,
      sendMail,
    };
    const r = await createBooking(input);
    setBusy(false);
    setResult(r);
    if (r.ok) {
      setPlotId(null);
      adminAvailability(arrival, departure).then(setStatus);
    }
  }

  const num = (label: string, id: string, value: number, set: (n: number) => void, min: number, max: number) => (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" min={min} max={max} value={value} onChange={(e) => set(Number(e.target.value))} />
    </div>
  );

  return (
    <div className="admin-form">
      <section className="admin-card" aria-labelledby="stay-title">
        <h2 id="stay-title">1. Verblijf</h2>
        <div className="admin-fields">
          <div className="admin-field">
            <label htmlFor="arrival">Aankomst</label>
            <input id="arrival" type="date" value={arrival} onChange={(e) => setArrival(e.target.value)} />
          </div>
          <div className="admin-field">
            <label htmlFor="departure">Vertrek</label>
            <input id="departure" type="date" value={departure} min={arrival} onChange={(e) => setDeparture(e.target.value)} />
          </div>
          {num("Volwassenen", "adults", adults, setAdults, 1, 20)}
          {num("Kinderen", "kids", kids, setKids, 0, 20)}
          {num("Honden", "dogs", dogs, setDogs, 0, 5)}
          <div className="admin-field">
            <label htmlFor="acc">Verblijf</label>
            <select id="acc" value={accommodation} onChange={(e) => setAccommodation(e.target.value as Accommodation)}>
              <option value="tent">Tent</option>
              <option value="caravan">Caravan</option>
              <option value="camper">Camper</option>
              <option value="safari_tent">Safaritent</option>
            </select>
          </div>
          <label className="admin-inline">
            <input type="checkbox" checked={electricity} onChange={(e) => setElectricity(e.target.checked)} /> Stroom
          </label>
        </div>
        {datesOk && <p className="admin-hint">{nightCount(arrival, departure)} nachten</p>}
      </section>

      <section className="admin-card" aria-labelledby="plot-title">
        <h2 id="plot-title">2. Plek</h2>
        {!datesOk ? (
          <p className="admin-hint">Kies eerst de data, dan zie je welke plekken vrij zijn.</p>
        ) : !status ? (
          <p role="status">Vrije plekken ophalen…</p>
        ) : (
          <SiteMap
            plots={plots}
            facilities={facilities}
            mode="book"
            status={mapStatus}
            selectedPlotId={plotId}
            onChoosePlot={(p) => mapStatus[p.id] === "free" && setPlotId(p.id)}
            plotFooter={(p) =>
              p.id === plotId ? (
                <p className="admin-ok">
                  Gekozen: plek {p.id}
                  {price !== null && <>, {money.format(price)}</>}
                </p>
              ) : null
            }
          />
        )}
      </section>

      <section className="admin-card" aria-labelledby="guest-title">
        <h2 id="guest-title">3. Gast</h2>
        <div className="admin-fields">
          {(
            [
              ["name", "Naam", "text", "name"],
              ["email", "E-mailadres", "email", "email"],
              ["phone", "Telefoon", "tel", "tel"],
            ] as const
          ).map(([k, label, type, auto]) => (
            <div className="admin-field" key={k}>
              <label htmlFor={`g-${k}`}>{label}</label>
              <input
                id={`g-${k}`}
                type={type}
                autoComplete={auto}
                value={contact[k]}
                onChange={(e) => setContact({ ...contact, [k]: e.target.value })}
              />
            </div>
          ))}
          <div className="admin-field">
            <label htmlFor="g-locale">Taal van de gast (voor de mail)</label>
            <select id="g-locale" value={locale} onChange={(e) => setLocale(e.target.value as "nl" | "en" | "de")}>
              <option value="nl">Nederlands</option>
              <option value="en">Engels</option>
              <option value="de">Duits</option>
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="g-source">Hoe binnengekomen?</label>
            <select id="g-source" value={source} onChange={(e) => setSource(e.target.value as "phone" | "desk")}>
              <option value="phone">Telefoon</option>
              <option value="desk">Balie</option>
            </select>
          </div>
        </div>
        <div className="admin-field">
          <label htmlFor="g-remarks">Opmerkingen</label>
          <textarea
            id="g-remarks"
            rows={3}
            value={contact.remarks}
            onChange={(e) => setContact({ ...contact, remarks: e.target.value })}
          />
        </div>
        <label className="admin-inline">
          <input type="checkbox" checked={sendMail} onChange={(e) => setSendMail(e.target.checked)} /> Stuur de gast een
          bevestiging (als er een e-mailadres is)
        </label>
      </section>

      <div aria-live="polite">
        {result.ok && (
          <p className="admin-ok">
            {result.ok} <Link href="/admin/bookings">Naar de reserveringen</Link>
          </p>
        )}
        {result.error && <p className="admin-error">{result.error}</p>}
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-primary" disabled={!plot || !datesOk || busy} onClick={submit}>
          {busy ? "Bezig…" : plot ? `Boek plek ${plot.id}` : "Kies eerst een plek"}
        </button>
      </div>
    </div>
  );
}
