# De Groene Weide

School project (HMW 2): **De Groene Weide Online**, a website plus admin panel for Bert's family campsite on a farm (season 1 April – 31 October). Guests read about the campsite, see events, explore a clickable site map and **book a numbered plot they pick on the map**. Bert maintains almost everything himself in the admin panel.

## Sources of truth

- **Plan:** [Plan.md](Plan.md), in Dutch (online: https://claude.ai/artifact/C5VRLX81zqcXyAHxZ3Htsj#0d8f06ac-43c8.mj2drskz17b.16048). It covers scope, rules, data model, tests, budget and open questions. Read the relevant section before building a feature.
- **Design:** https://claude.ai/artifact/SXWHgyViiegf9Hydgdezrf#page-8424d452da33. Build from the page *High-fidelity (bouw)*: Stijlgids, Home, Reserveren, Plekmatch (phone), Admin panel. The *Mid-fidelity* page holds the pitch wireframes.

## Tech stack (decided)

**Next.js 16** (App Router, TypeScript, `output: "standalone"`) for the site and the admin panel in one codebase. **Self-hosted Supabase** (PostgreSQL 17, Auth with TOTP 2FA, Storage, Studio). **Everything runs in Docker Compose**, both in development and on the server, with no managed cloud services. Caddy handles HTTPS on the server and Mailpit catches email in development. Plus an SVG site map and analytics without tracking cookies. The reasons are in [docs/decisions/0001-stack-nextjs-supabase-docker.md](docs/decisions/0001-stack-nextjs-supabase-docker.md).

- [compose.yaml](compose.yaml) is development. [compose.prod.yaml](compose.prod.yaml) is the server. [Dockerfile](Dockerfile) has the targets `dev` and `runner`.
- [infra/supabase/](infra/supabase/) is an **unchanged** copy of the upstream Supabase `docker/` folder. Never edit it: put changes in `infra/supabase.override.yml` (dev and server) or `infra/supabase.prod.yml` (server only).
- Server code reaches Supabase at `SUPABASE_URL` (`http://api-gw:8000`, inside Docker). The browser uses `NEXT_PUBLIC_SUPABASE_URL`.
- `.env` is generated and never committed. New settings go in `.env.app.example`.
- **Database:** migrations in `supabase/migrations/` (numbered, applied once each), seed in `supabase/seed/` (insert-if-missing, runs every time). Server code reads public data with `publicDb()`, the admin panel with `staffDb()` (the staff JWT, so RLS applies), jobs with `serviceDb()`. Loaders in `src/lib/data/` use `"use cache"` with a `cacheTag`; admin actions call `revalidateTag`.

### Commands

| What | Command |
| --- | --- |
| Set up (once) | `sh scripts/init-env.sh` |
| Run dev with live reload | `docker compose up --watch` (site :3000, Supabase/Studio :8000, mail :8025) |
| Lint / type check | `docker compose exec web npm run lint` · `docker compose exec web npm run typecheck` |
| Unit tests (Vitest) | `docker compose exec web npm test` |
| Apply migrations + seed | runs on every `docker compose up` (service `migrate`); by hand: `docker compose run --rm migrate` |
| Map positions and distances | edit `src/content/map/terrain.svg`, then `npm run import-map` (writes `supabase/seed/03_map.sql`) |
| Content seed from `src/content` | `npm run seed-content` (writes `supabase/seed/02_content.sql`) |
| Stop / reset data | `docker compose down` · `docker compose down -v` |
| Server deploy | `docker compose -f compose.prod.yaml up -d --build` (see README, "Deploying") |

Update this table when tests, migrations or new scripts are added.

### Code layout

- Pages live in `src/app/[locale]/<route>/`, with **English folder names** (`book`, `site-map`). The public slug per language is set in [src/i18n/routing.ts](src/i18n/routing.ts) (`/book` → `/reserveren`). Link with the internal route: `<Link href="/book">` from `@/i18n/navigation`.
- Read the language with `getPageLocale()` from `@/i18n/locale` (root params), never through the `params` prop: that keeps pages static and navigation instant.
- UI strings are in `messages/nl.json`. Content (facilities, events, jokes, prices, settings) is in `src/content/`, with a field per language (`title_nl`, `title_en`, `title_de`) until it moves to the database in Prio 5.
- Facts that Bert still has to supply are `null` or `[…]` in the content, and show on the site as a marked placeholder.
- Never import a constant from a `"use client"` file into a server component: it arrives as a client reference, not the value. Put shared constants in a plain module.

On Windows, run `docker compose` builds from a working directory that starts with an uppercase `C:\`. With a lowercase `c:\`, Compose's bake builder fails with `failed to execute bake` (see README, "Troubleshooting on Windows").

## Hard rules

**Booking**
- **No double bookings, enforced by the database.** `reservations` must reject overlapping nights for the same plot (in Postgres, an exclusion constraint on plot plus date range). Never rely on app-side checks alone.
- A chosen plot is **held for 15 minutes** (`held_until`), then frees up automatically. Set a maximum number of held plots per visitor.
- If the plot is taken at confirmation, send the guest back to the map with free alternatives.
- Admin bookings (phone or desk) go through the same rules and the same map.
- Collect only name, email, phone, number of persons, accommodation type and remarks. Never store payment data.

**Security**
- **Role access is enforced in the database** (Supabase RLS), not only in the UI.
- Roles: Bert/beheerder (everything) · Receptie (bookings, messages, events, blocking plots) · Animatie (events, photos) · Seizoenskracht (read only). In the database: `admin`, `reception`, `animation`, `seasonal`.
- Admin accounts use 2FA. Spam protection on forms without tracking.

**Languages**
- NL, EN and DE. Separate text fields per language and **a URL per language**. No automatic translation.
- **Dutch first:** the MVP launches in Dutch only, and EN and DE follow (see [docs/mvp.md](docs/mvp.md)). Build the structure for all three languages from the start, but keep `/en` and `/de` off until their translation is complete.
- **URLs:** `/` is the Dutch homepage and Dutch pages have no prefix (`/reserveren`). EN and DE use `/en/…` and `/de/…` with their own slugs. Never redirect `/` automatically.
- The admin panel is in Dutch only.
- Content tables store their text per language. Emails go out in the guest's language.
- Every language gets its own joke. Never translate jokes word for word.
- Code, identifiers, commits and the database (tables, columns, enum values, functions) are in English. Dutch only appears in texts that users read.

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
- **Plot fields:** type, electricity, surface, level (vlak), shade, wheelchair access, max persons, price group, map position, checked (`checked`, "gecontroleerd" in the UI).
- **Distances** to facilities are calculated from the SVG coordinates and never entered by hand.
- **The map has two modes:** explore (no dates, everything clickable) and book (booked plots are visible but disabled).
- **Booking flow (7 steps):** Datum → Personen & verblijf → Plekmatch → Plek kiezen → Gegevens → Controleren → Bevestiging.
- **Booking levels:** 1 = request that Bert confirms (Must) · 2 = instant confirmation with an automatic email (Must) · 3 = online payment via iDEAL (Could).
- **Plekmatch:** the chicken asks 5 questions and shows the 3 best free plots, each with one reason.
  - **Rule-based, no AI.** Filter on requirements (persons, type, electricity, accessibility), then score preferences (distance, quiet, shade, level ground).
  - A plot that isn't `checked` is never recommended as accessible.
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
