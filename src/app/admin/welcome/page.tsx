import type { Metadata } from "next";
import Link from "next/link";
import { WelcomeForm } from "./WelcomeForm";

export const metadata: Metadata = { title: "Welkom" };

/** Landing page of the invite and new-password mails. */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ token?: string; type?: string }> }) {
  const q = await searchParams;
  if (!q.token) {
    return (
      <div className="admin-login">
        <h1>Deze link is niet compleet</h1>
        <p>Open de link uit de mail opnieuw, of vraag Bert om een nieuwe uitnodiging.</p>
        <Link href="/admin/login">Naar inloggen</Link>
      </div>
    );
  }
  return <WelcomeForm token={q.token} type={q.type === "recovery" ? "recovery" : "invite"} />;
}
