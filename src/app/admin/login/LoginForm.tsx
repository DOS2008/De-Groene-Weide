"use client";

import { useActionState } from "react";
import { Chicken } from "@/components/Chicken";
import { signIn, type AuthState } from "../auth-actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  return (
    <form action={action} className="admin-login">
      <Chicken size={72} />
      <h1>Inloggen bij het beheer</h1>
      <p className="admin-hint">Alleen voor Bert en het team. Daarna vragen we de code uit je app.</p>
      <div className="admin-field">
        <label htmlFor="email">E-mailadres</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="admin-field">
        <label htmlFor="password">Wachtwoord</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <p className="admin-error" role="alert">
        {state.error}
      </p>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Even geduld…" : "Inloggen"}
      </button>
      <p className="admin-hint">
        Wachtwoord vergeten of telefoon kwijt? Vraag Bert om een link voor een nieuw wachtwoord. Bert zelf: zie de
        handleiding, &ldquo;Toegang kwijt&rdquo;.
      </p>
    </form>
  );
}
