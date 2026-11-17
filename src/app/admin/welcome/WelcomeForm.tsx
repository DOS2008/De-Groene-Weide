"use client";

import { useActionState } from "react";
import { Chicken } from "@/components/Chicken";
import { setPassword, type WelcomeState } from "./actions";

export function WelcomeForm({ token, type }: { token: string; type: "invite" | "recovery" }) {
  const [state, action, pending] = useActionState<WelcomeState, FormData>(setPassword, {});
  return (
    <form action={action} className="admin-login">
      <Chicken size={72} />
      <h1>{type === "invite" ? "Welkom bij het beheer" : "Nieuw wachtwoord"}</h1>
      <p className="admin-hint">Kies een wachtwoord. Daarna koppel je een app voor inlogcodes op je telefoon.</p>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="type" value={type} />
      <div className="admin-field">
        <label htmlFor="password">Nieuw wachtwoord (minstens 12 tekens)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
      </div>
      <div className="admin-field">
        <label htmlFor="repeat">Nog een keer</label>
        <input id="repeat" name="repeat" type="password" autoComplete="new-password" minLength={12} required />
      </div>
      <p className="admin-error" role="alert">
        {state.error}
      </p>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Even geduld…" : "Wachtwoord opslaan"}
      </button>
    </form>
  );
}
