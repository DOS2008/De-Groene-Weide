"use client";

import { useActionState, useState } from "react";
import { Chicken } from "@/components/Chicken";
import { startSetup, verifyCode, type AuthState } from "../auth-actions";

function Code({ factorId, label }: { factorId: string; label: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyCode, {});
  return (
    <form action={action} className="admin-form">
      <input type="hidden" name="factorId" value={factorId} />
      <div className="admin-field">
        <label htmlFor="code">{label}</label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          aria-describedby="code-error"
        />
      </div>
      <p id="code-error" className="admin-error" role="alert">
        {state.error}
      </p>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Controleren…" : "Bevestigen"}
      </button>
    </form>
  );
}

export function CodeForm({ factorId }: { factorId: string }) {
  return (
    <div className="admin-login">
      <Chicken size={72} />
      <h1>Code uit je app</h1>
      <p className="admin-hint">Open je authenticator-app en vul de code van 6 cijfers in.</p>
      <Code factorId={factorId} label="Code" />
    </div>
  );
}

export function SetupForm() {
  const [setup, setSetup] = useState<AuthState | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="admin-login">
      <Chicken size={72} />
      <h1>Tweestapsverificatie instellen</h1>
      {!setup?.factorId ? (
        <>
          <p>
            Voor het beheer heb je een tweede stap nodig: een code uit een app op je telefoon, zoals Google
            Authenticator of Microsoft Authenticator. Dat stel je één keer in.
          </p>
          {setup?.error && (
            <p className="admin-error" role="alert">
              {setup.error}
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setSetup(await startSetup());
              setBusy(false);
            }}
          >
            Koppel mijn app
          </button>
        </>
      ) : (
        <>
          <ol>
            <li>Scan deze code met je authenticator-app.</li>
            <li>Lukt scannen niet? Typ dan deze sleutel over in de app.</li>
            <li>Vul hieronder de code van 6 cijfers in die de app toont.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="QR-code om je authenticator-app te koppelen" className="admin-qr" />
          <p className="admin-secret" aria-label="Sleutel om over te typen" data-testid="totp-secret">
            {setup.secret}
          </p>
          <Code factorId={setup.factorId} label="Code uit je app" />
        </>
      )}
    </div>
  );
}
