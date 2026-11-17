import type { Metadata } from "next";
import { requireStaff } from "@/lib/admin/staff";
import { staffDb } from "@/lib/supabase/staff";
import { addDays, todayAtCampsite } from "@/lib/dates";
import { ActionForm, Submit } from "../ActionForm";
import { LangFields } from "../LangFields";
import { deleteJoke, saveBookingSettings, saveContact, saveJoke, saveNotice, saveOtherSettings } from "./actions";

export const metadata: Metadata = { title: "Instellingen" };

type Site = {
  phone?: string | null;
  email?: string | null;
  address?: string[] | null;
  facebookUrl?: string | null;
  reception?: { weekdays?: string | null; weekend?: string | null };
  arrivalFrom?: string | null;
  departureUntil?: string | null;
  notice?: ({ active: boolean } & Record<string, string | boolean | null>) | null;
};

const languages = [
  ["nl", "Nederlands"],
  ["en", "Engels"],
  ["de", "Duits"],
] as const;

export default async function SettingsPage() {
  await requireStaff("admin");
  const db = await staffDb();
  const since = addDays(todayAtCampsite(), -30);
  const [{ data: settings }, { data: jokes }, { data: stats }] = await Promise.all([
    db.from("settings").select("key, value"),
    db.from("jokes").select("*").order("created_at"),
    db.from("plekmatch_stats").select("shown, picked").gte("day", since),
  ]);
  const shown = (stats ?? []).reduce((n, r) => n + r.shown, 0);
  const picked = (stats ?? []).reduce((n, r) => n + r.picked, 0);
  const get = (k: string) => settings?.find((s) => s.key === k)?.value;
  const site = (get("site") ?? {}) as Site;
  const n = (k: string, d: number) => String(get(k) ?? d);

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Instellingen</span>
          <h1>Instellingen</h1>
        </div>
      </div>

      <section className="admin-card" id="mededeling" aria-labelledby="notice-title">
        <h2 id="notice-title">Mededeling bovenaan de website</h2>
        <p className="admin-hint">Voor tijdelijk nieuws, bijv. &quot;Het zwembad is dicht tot 1 juni.&quot; Zet hem uit als het niet meer geldt.</p>
        <ActionForm action={saveNotice} className="admin-form">
          <label className="admin-check">
            <input type="checkbox" name="active" defaultChecked={Boolean(site.notice?.active)} />
            Laat de mededeling zien
          </label>
          <LangFields name="text" label="Mededeling" values={(site.notice ?? {}) as Record<string, string>} required={false} maxLength={300} />
          <div>
            <Submit>Mededeling opslaan</Submit>
          </div>
        </ActionForm>
      </section>

      <section className="admin-card" aria-labelledby="contact-title">
        <h2 id="contact-title">Contactgegevens en tijden</h2>
        <p className="admin-hint">Staan in de footer, op de contactpagina en in de mails. Leeg = &quot;volgt nog&quot; op de site.</p>
        <ActionForm action={saveContact} className="admin-form">
          <div className="admin-fields">
            <div className="admin-field">
              <label htmlFor="phone">Telefoon</label>
              <input id="phone" name="phone" type="tel" defaultValue={site.phone ?? ""} placeholder="bijv. 0512 345 678" />
            </div>
            <div className="admin-field">
              <label htmlFor="email">E-mailadres</label>
              <input id="email" name="email" type="email" defaultValue={site.email ?? ""} />
            </div>
            <div className="admin-field">
              <label htmlFor="reception_weekdays">Receptie doordeweeks</label>
              <input id="reception_weekdays" name="reception_weekdays" defaultValue={site.reception?.weekdays ?? ""} placeholder="bijv. 9:00–12:00 en 16:00–18:00" />
            </div>
            <div className="admin-field">
              <label htmlFor="reception_weekend">Receptie in het weekend</label>
              <input id="reception_weekend" name="reception_weekend" defaultValue={site.reception?.weekend ?? ""} placeholder="bijv. 10:00–12:00" />
            </div>
            <div className="admin-field">
              <label htmlFor="arrivalFrom">Aankomst vanaf</label>
              <input id="arrivalFrom" name="arrivalFrom" type="time" defaultValue={site.arrivalFrom ?? ""} />
            </div>
            <div className="admin-field">
              <label htmlFor="departureUntil">Vertrek tot</label>
              <input id="departureUntil" name="departureUntil" type="time" defaultValue={site.departureUntil ?? ""} />
            </div>
          </div>
          <div className="admin-fields">
            <div className="admin-field">
              <label htmlFor="address">Adres (één regel per rij)</label>
              <textarea id="address" name="address" rows={3} defaultValue={(site.address ?? []).join("\n")} />
            </div>
            <div className="admin-field">
              <label htmlFor="facebookUrl">Facebookpagina</label>
              <input id="facebookUrl" name="facebookUrl" type="url" defaultValue={site.facebookUrl ?? ""} placeholder="https://www.facebook.com/…" />
            </div>
          </div>
          <div>
            <Submit>Contactgegevens opslaan</Submit>
          </div>
        </ActionForm>
      </section>

      <section className="admin-card" aria-labelledby="booking-title">
        <h2 id="booking-title">Reserveren</h2>
        <ActionForm action={saveBookingSettings} className="admin-form">
          <fieldset className="admin-lang">
            <legend>Boekingsniveau</legend>
            <label className="admin-check">
              <input type="radio" name="booking_level" value="1" defaultChecked={n("booking_level", 1) !== "2"} />
              Niveau 1: gasten sturen een aanvraag, jij bevestigt
            </label>
            <label className="admin-check">
              <input type="radio" name="booking_level" value="2" defaultChecked={n("booking_level", 1) === "2"} />
              Niveau 2: direct bevestigd, de gast krijgt meteen een mail
            </label>
          </fieldset>
          <div className="admin-fields">
            <NumberField id="hold_minutes" label="Plek vasthouden (minuten)" value={n("hold_minutes", 15)} min={5} max={60} />
            <NumberField id="max_holds_per_visitor" label="Plekken per bezoeker tegelijk" value={n("max_holds_per_visitor", 2)} min={1} max={5} />
            <NumberField id="min_nights" label="Minimaal aantal nachten" value={n("min_nights", 1)} min={1} max={14} />
            <NumberField id="max_nights" label="Maximaal aantal nachten" value={n("max_nights", 28)} min={1} max={90} />
            <NumberField
              id="cancel_free_days"
              label="Gast annuleert zelf tot … dagen voor aankomst"
              value={n("cancel_free_days", 14)}
              min={0}
              max={90}
              hint="0 = gasten kunnen niet online annuleren, alleen via jou."
            />
            <NumberField
              id="reminder_days_before"
              label="Herinneringsmail … dagen voor aankomst"
              value={n("reminder_days_before", 3)}
              min={0}
              max={30}
              hint="0 = geen herinnering."
            />
          </div>
          <div>
            <Submit>Opslaan</Submit>
          </div>
        </ActionForm>
      </section>

      <section className="admin-card" aria-labelledby="other-title">
        <h2 id="other-title">Overig</h2>
        <ActionForm action={saveOtherSettings} className="admin-form">
          <label className="admin-check">
            <input type="checkbox" name="plekmatch_enabled" defaultChecked={get("plekmatch_enabled") !== false} />
            Plekmatch aan (de kip helpt gasten een plek kiezen)
          </label>
          <p className="admin-hint">
            Afgelopen 30 dagen: {shown} keer tips getoond, {picked} keer een tip gekozen. Alleen deze aantallen worden bewaard,
            nooit de antwoorden of wie het was.
          </p>
          <div className="admin-fields">
            <NumberField
              id="retention_months"
              label="Gastgegevens bewaren (maanden na vertrek)"
              value={n("retention_months", 24)}
              min={6}
              max={120}
              hint="Daarna haalt het systeem naam, e-mail en telefoon automatisch weg. Berichten ook."
            />
            <div className="admin-field">
              <label htmlFor="review_url">Link voor een Google-review</label>
              <input id="review_url" name="review_url" type="url" defaultValue={(get("review_url") as string | null) ?? ""} placeholder="https://g.page/r/…" />
            </div>
            <div className="admin-field">
              <label htmlFor="facebook_page_id">Facebook-pagina-ID</label>
              <input id="facebook_page_id" name="facebook_page_id" defaultValue={(get("facebook_page_id") as string | null) ?? ""} aria-describedby="fb-hint" />
              <p className="admin-hint" id="fb-hint">
                Voor de nieuwste berichten op de site. Werkt pas als de beheerder ook de toegangssleutel op de server heeft gezet.
              </p>
            </div>
          </div>
          <div>
            <Submit>Opslaan</Submit>
          </div>
        </ActionForm>
      </section>

      <section className="admin-card" id="grappen" aria-labelledby="jokes-title">
        <h2 id="jokes-title">Grappen</h2>
        <p className="admin-hint">
          Eén grap per scherm. Elke taal krijgt een eigen grap: vertaal niet woord voor woord. Een lege taal laat deze grap in die
          taal gewoon weg.
        </p>
        <ul className="admin-list">
          {(jokes ?? []).map((j, i) => (
            <li key={j.id}>
              <JokeForm joke={j} index={i + 1} />
            </li>
          ))}
          <li>
            <JokeForm index={(jokes?.length ?? 0) + 1} />
          </li>
        </ul>
      </section>
    </>
  );
}

function NumberField({ id, label, value, min, max, hint }: { id: string; label: string; value: string; min: number; max: number; hint?: string }) {
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} type="number" inputMode="numeric" min={min} max={max} required defaultValue={value} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && (
        <p className="admin-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

function JokeForm({ joke, index }: { joke?: Record<string, string | boolean | null>; index: number }) {
  const prefix = joke ? `joke-${joke.id}` : "joke-new";
  return (
    <div className="admin-grow">
      <ActionForm action={saveJoke} className="admin-form">
        {joke && <input type="hidden" name="id" value={String(joke.id)} />}
        <fieldset className="admin-lang">
          <legend>{joke ? `Grap ${index}` : "Nieuwe grap"}</legend>
          <div className="admin-lang-cols">
            {languages.map(([l, name]) => (
              <div className="admin-field" key={l}>
                <label htmlFor={`${prefix}-${l}`}>
                  <span className="visually-hidden">{joke ? `Grap ${index}` : "Nieuwe grap"} </span>
                  {name}
                </label>
                <textarea id={`${prefix}-${l}`} name={`text_${l}`} rows={2} maxLength={300} defaultValue={(joke?.[`text_${l}`] as string) ?? ""} />
              </div>
            ))}
          </div>
          <label className="admin-check">
            <input type="checkbox" name="active" defaultChecked={joke ? Boolean(joke.active) : true} />
            Laten zien op de site
          </label>
        </fieldset>
        <div className="admin-row-actions">
          <Submit>{joke ? "Opslaan" : "Grap toevoegen"}</Submit>
        </div>
      </ActionForm>
      {joke && (
        <ActionForm action={deleteJoke} confirm="Deze grap verwijderen?">
          <input type="hidden" name="id" value={String(joke.id)} />
          <Submit className="btn btn-quiet admin-btn-small">Grap verwijderen</Submit>
        </ActionForm>
      )}
    </div>
  );
}
