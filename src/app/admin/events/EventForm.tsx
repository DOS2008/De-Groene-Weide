"use client";

import { useState } from "react";
import { ActionForm, Submit } from "../ActionForm";
import { LangFields } from "../LangFields";
import { ageGroupNames, eventKindNames, weekdayNames } from "@/lib/admin/names";
import { saveEvent } from "./actions";

export type EventValues = Record<string, unknown> & {
  id?: string;
  recurrence?: { type: string; date?: string; from?: string; until?: string; weekdays?: number[] };
  skip_dates?: string[];
};

export type MediaOption = { path: string; alt: string };

export function EventForm({ event, media }: { event?: EventValues; media: MediaOption[] }) {
  const r = event?.recurrence;
  const [repeat, setRepeat] = useState(r?.type ?? "weekly");
  const v = (k: string) => (event?.[k] as string | undefined) ?? "";

  return (
    <ActionForm action={saveEvent} className="admin-form">
      {event?.id && <input type="hidden" name="id" value={event.id} />}

      <LangFields name="title" label="Titel" values={event as Record<string, string>} maxLength={120} hint="Kort en vrolijk, bijv. 'Kippen voeren'." />
      <LangFields
        name="description"
        label="Beschrijving"
        values={event as Record<string, string>}
        multiline
        required={false}
        hint="Eén of twee zinnen: wat gaan we doen, wat moet je meenemen?"
      />
      <LangFields name="location" label="Waar" values={event as Record<string, string>} required={false} maxLength={120} hint="Bijv. 'Kippenhok' of 'Speelweide'." />

      <div className="admin-fields">
        <div className="admin-field">
          <label htmlFor="kind">Soort</label>
          <select id="kind" name="kind" defaultValue={v("kind") || "play"}>
            {Object.entries(eventKindNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="age_group">Voor wie</label>
          <select id="age_group" name="age_group" defaultValue={v("age_group") || "all"}>
            {Object.entries(ageGroupNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="start_time">Begintijd</label>
          <input id="start_time" name="start_time" type="time" required defaultValue={v("start_time") || "14:00"} />
        </div>
        <div className="admin-field">
          <label htmlFor="photo_path">Foto</label>
          <select id="photo_path" name="photo_path" defaultValue={v("photo_path")}>
            <option value="">Geen foto</option>
            {media.map((m) => (
              <option key={m.path} value={m.path}>
                {m.alt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="admin-lang">
        <legend>Wanneer</legend>
        <div className="admin-fields">
          <div className="admin-field">
            <label htmlFor="repeat">Hoe vaak</label>
            <select id="repeat" name="repeat" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
              <option value="once">Eén keer</option>
              <option value="daily">Elke dag</option>
              <option value="weekly">Elke week, op vaste dagen</option>
            </select>
          </div>
          {repeat === "once" ? (
            <div className="admin-field">
              <label htmlFor="date">Datum</label>
              <input id="date" name="date" type="date" required defaultValue={r?.date} />
            </div>
          ) : (
            <>
              <div className="admin-field">
                <label htmlFor="from">Vanaf</label>
                <input id="from" name="from" type="date" required defaultValue={r?.from} />
              </div>
              <div className="admin-field">
                <label htmlFor="until">Tot en met (mag leeg)</label>
                <input id="until" name="until" type="date" defaultValue={r?.until} />
              </div>
            </>
          )}
        </div>
        {repeat === "weekly" && (
          <fieldset className="admin-lang">
            <legend>Op welke dagen</legend>
            <div className="admin-inline">
              {weekdayNames.map((name, i) => (
                <label key={name} className="admin-check">
                  <input type="checkbox" name="weekdays" value={i + 1} defaultChecked={r?.weekdays?.includes(i + 1)} />
                  {name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {repeat !== "once" && (
          <div className="admin-field">
            <label htmlFor="skip_dates">Dagen zonder dit evenement</label>
            <input
              id="skip_dates"
              name="skip_dates"
              defaultValue={(event?.skip_dates ?? []).join(", ")}
              placeholder="bijv. 2027-07-14, 2027-08-02"
              aria-describedby="skip-hint"
            />
            <p className="admin-hint" id="skip-hint">
              Bijvoorbeeld als Bert op vakantie is. Met komma&apos;s ertussen.
            </p>
          </div>
        )}
      </fieldset>

      <fieldset className="admin-lang">
        <legend>Zichtbaar voor gasten?</legend>
        <label className="admin-check">
          <input type="radio" name="status" value="draft" defaultChecked={v("status") !== "published"} />
          Concept (alleen in het beheer)
        </label>
        <label className="admin-check">
          <input type="radio" name="status" value="published" defaultChecked={v("status") === "published"} />
          Gepubliceerd (op de website)
        </label>
      </fieldset>

      <div>
        <Submit className="btn btn-primary">{event?.id ? "Opslaan" : "Evenement aanmaken"}</Submit>
      </div>
    </ActionForm>
  );
}
