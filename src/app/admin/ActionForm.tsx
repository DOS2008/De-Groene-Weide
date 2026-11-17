"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type FormState = { ok?: string; error?: string };
type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** A form for a server action that shows its result in an aria-live region. */
export function ActionForm({
  action,
  children,
  className,
  confirm,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  /** Asked before submitting, for deletes and cancellations. */
  confirm?: string;
}) {
  const [state, run] = useActionState<FormState, FormData>(action, {});
  return (
    <form
      action={run}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <span aria-live="polite" className="admin-result">
        {state.ok && <span className="admin-ok">{state.ok}</span>}
        {state.error && <span className="admin-error">{state.error}</span>}
      </span>
    </form>
  );
}

export function Submit({ children, className = "btn btn-primary admin-btn-small" }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Bezig…" : children}
    </button>
  );
}
