import nodemailer from "nodemailer";

/**
 * Outgoing mail over SMTP. In development this goes to Mailpit
 * (http://localhost:8025); on the server to an EU mail provider.
 * Settings come from .env (see .env.app.example).
 */
function transport() {
  const port = Number(process.env.SMTP_PORT ?? 1025);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port,
    secure: port === 465,
    ...(user && pass ? { auth: { user, pass } } : {}),
  });
}

function sender() {
  const name = process.env.SMTP_SENDER_NAME ?? "De Groene Weide";
  const address = process.env.SMTP_ADMIN_EMAIL ?? "noreply@degroeneweide.example";
  return { name, address };
}

/** Where contact form messages and booking notices go: Bert's inbox. */
export function contactRecipient(): string {
  return process.env.CONTACT_EMAIL || sender().address;
}

export type Mail = { to: string; replyTo?: string; subject: string; text: string; html?: string };

export async function sendMail(message: Mail) {
  await transport().sendMail({ from: sender(), ...message });
}
