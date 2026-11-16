# De Groene Weide

School project (HMW 2): **De Groene Weide Online**, a website plus admin panel for Bert's family campsite on a farm (season 1 April – 31 October). Guests read about the campsite, see events, explore a clickable site map and **book a numbered plot they pick on the map**. Bert maintains almost everything himself in the admin panel.

## Sources of truth

- **Plan:** [Plan.md](Plan.md), in Dutch (online: https://claude.ai/artifact/C5VRLX81zqcXyAHxZ3Htsj#0d8f06ac-43c8.mj2drskz17b.16048). It covers scope, rules, data model, tests, budget and open questions. Read the relevant section before building a feature.
- **Design:** https://claude.ai/artifact/SXWHgyViiegf9Hydgdezrf#page-8424d452da33. Build from the page *High-fidelity (bouw)*: Stijlgids, Home, Reserveren, Plekmatch (phone), Admin panel. The *Mid-fidelity* page holds the pitch wireframes.

## Tech stack (proposal, not final)

Next.js or SvelteKit with SSR, one codebase for the site and the admin panel. PostgreSQL via Supabase (auth, 2FA, storage). An SVG site map. A transactional mail service. EU hosting. Analytics without tracking cookies. The alternative is WordPress with a booking plugin for level 1. **Record the final choice here, plus the setup, build, test and run commands, once the code exists.**

## Hard rules

**Booking**
- **No double bookings, enforced by the database.** `reserveringen` must reject overlapping nights for the same plot (in Postgres, an exclusion constraint on plot plus date range). Never rely on app-side checks alone.
- A chosen plot is **held for 15 minutes** (`vastgehouden_tot`), then frees up automatically. Set a maximum number of held plots per visitor.
- If the plot is taken at confirmation, send the guest back to the map with free alternatives.
- Admin bookings (phone or desk) go through the same rules and the same map.
- Collect only name, email, phone, number of persons, accommodation type and remarks. Never store payment data.

**Security**
- **Role access is enforced in the database** (Supabase RLS), not only in the UI.
- Roles: Bert/beheerder (everything) · Receptie (bookings, messages, events, blocking plots) · Animatie (events, photos) · Seizoenskracht (read only).
- Admin accounts use 2FA. Spam protection on forms without tracking.

**Languages**
- NL (first), EN and DE. Separate text fields per language and **a URL per language**. No automatic translation.
- Content tables store their text per language. Emails go out in the guest's language.
- Every language gets its own joke. Never translate jokes word for word.
- Code, identifiers and commits are in English.

**Accessibility (WCAG 2.2 AA)**
- Text contrast is at least 4.5:1. Full keyboard support. Tap targets are at least 44 px.
- Use real `<button>`, `<a>` and `<label>` elements, alt text on every image, and `aria-live` for dynamic updates.
- Every plot on the map is a button with an `aria-label` (e.g. "Plek T14, vrij"). There is **always a list view** as an alternative to the map.
- Map states use colour **plus** a pattern or icon.
- No automatic animation or sound. The **Rustknop** turns off motion and sound, and `prefers-reduced-motion` is respected.
- Layouts must work at phone width.

**Privacy (AVG):** EU hosting, a cookie banner with non-essential cookies off by default, and no personal data of children.

## Domain

- **60 plots:** T1–T40 tent/caravan, C1–C12 camper, S1–S8 safari tent. The numbering is still to be confirmed by Bert.
- **Plot fields:** type, electricity, surface, level (vlak), shade, wheelchair access, max persons, price group, map position, checked (`gecontroleerd`).
- **Distances** to facilities are calculated from the SVG coordinates and never entered by hand.
- **The map has two modes:** explore (no dates, everything clickable) and book (booked plots are visible but disabled).
- **Booking flow (7 steps):** Datum → Personen & verblijf → Plekmatch → Plek kiezen → Gegevens → Controleren → Bevestiging.
- **Booking levels:** 1 = request that Bert confirms (Must) · 2 = instant confirmation with an automatic email (Must) · 3 = online payment via iDEAL (Could).
- **Plekmatch:** the chicken asks 5 questions and shows the 3 best free plots, each with one reason.
  - **Rule-based, no AI.** Filter on requirements (persons, type, electricity, accessibility), then score preferences (distance, quiet, shade, level ground).
  - A plot that isn't `gecontroleerd` is never recommended as accessible.
  - Answers are never linked to a person.

## Priorities

- **Must:** the 7 pages in 3 languages (Home, Terrein & activiteiten, Plattegrond, Reserveren, Evenementen, Over ons, Contact), plus the footer pages. Also the admin panel with roles, events, the clickable map, booking levels 1 and 2, SEO, and accessibility with the Rustknop.
- **Should:** Plekmatch, the reminder email, version history and audit log, Facebook integration, a Google review button.
- **Could:** see Plan.md, under "Onderdelen en prioriteit".

Finish the Musts before starting on the Shoulds.

## Design system (hi-fi Stijlgids)

Define these as CSS variables. Never hard-code hex values in components.

| Token | Hex | Use |
| --- | --- | --- |
| Weidegroen | `#2F6B3E` | buttons, links (hover `#24502F`) |
| Gras licht | `#E4F0DE` | surfaces |
| Schuurbruin | `#5A3E26` | accent text |
| Stro | `#F2E8DC` | warm surfaces |
| Eigeel | `#F5C84B` | surfaces only |
| Kam-oranje | `#EE8A3C` | surfaces only |
| Inkt | `#1E2A21` | text |
| Melk | `#FBFAF6` | page background |
| Muted | `#4B574E` | small text |
| Border | `#D9DDD3` | borders |
| Dark green | `#24502F` | footer, admin nav |

- **Never use yellow or orange as text on white.** Use them only as surfaces, with `#1E2A21` text on top.
- **Fonts:** headings in Bricolage Grotesque 600/800. Body text in Atkinson Hyperlegible 400/700, 18 px, line height 1.6.
- **Buttons:** pill shape, at least 44 px tall (main CTAs 52–60 px). Focus ring is 3 px `#1E2A21` with a 2 px offset.
- **Map states:** Vrij (light green) · Bezet (grey stripes) · Geblokkeerd (brown ✕) · Jouw keuze (orange ✓, thick border) · Tip (yellow ★).
- **Mascot:** a hand-drawn chicken (inline SVG). It shows up in Plekmatch, buttons, the 404 page and emails.
- **Tone:** warm, short sentences, **one joke per screen**. Examples: "Boek je plekje in de wei", 404 "Deze koe is ontsnapt.", "Vraag het de kip".
