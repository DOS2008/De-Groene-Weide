/** Validation for the contact form. Pure, so the rules have unit tests. */

export type ContactInput = { name: string; email: string; subject: string; message: string };
export type ContactField = keyof ContactInput;
export type ContactErrorKey =
  | "nameRequired"
  | "nameTooLong"
  | "emailRequired"
  | "emailInvalid"
  | "subjectTooLong"
  | "messageRequired"
  | "messageTooShort"
  | "messageTooLong";

export const limits = { name: 100, email: 200, subject: 150, messageMin: 10, messageMax: 5000 };

// Deliberately simple: something@something.something, no spaces.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readContactForm(form: FormData): ContactInput {
  const field = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  return {
    name: field("name"),
    email: field("email"),
    subject: field("subject"),
    message: field("message"),
  };
}

export function validateContact(input: ContactInput): Partial<Record<ContactField, ContactErrorKey>> {
  const errors: Partial<Record<ContactField, ContactErrorKey>> = {};
  if (!input.name) errors.name = "nameRequired";
  else if (input.name.length > limits.name) errors.name = "nameTooLong";

  if (!input.email) errors.email = "emailRequired";
  else if (input.email.length > limits.email || !EMAIL.test(input.email)) errors.email = "emailInvalid";

  if (input.subject.length > limits.subject) errors.subject = "subjectTooLong";

  if (!input.message) errors.message = "messageRequired";
  else if (input.message.length < limits.messageMin) errors.message = "messageTooShort";
  else if (input.message.length > limits.messageMax) errors.message = "messageTooLong";

  return errors;
}

/**
 * Spam check without cookies or puzzles: a hidden field that people never
 * fill in, and a minimum time between showing and sending the form. The
 * time stamp is set by the browser; when it is missing (no JavaScript, or
 * the form was just reset) only the hidden field counts, so a real person
 * is never dropped.
 */
export function looksLikeSpam(form: FormData, now: number, minMs = 3000): boolean {
  const honeypot = form.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") return true;
  const shownAt = Number(form.get("shownAt"));
  if (!Number.isFinite(shownAt) || shownAt <= 0) return false;
  return now - shownAt < minMs;
}
