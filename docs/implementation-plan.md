# Implementation plan – De Groene Weide Online

Step-by-step build plan derived from [Plan.md](../Plan.md) and [CLAUDE.md](../CLAUDE.md).
Work is cut into **epics → features → tasks**. Each task is small enough for one branch / one PR.

- **Priority:** M = Must, S = Should, C = Could. Finish all Musts before starting Shoulds.
- **IDs:** `E<epic>.<feature>.<task>`, e.g. `E5.2.3`. Use the ID in branch names (`feature/E5.2-hold-plot`) and PR titles.
- **Done means:** code + tests + works in NL/EN/DE + keyboard/screen-reader OK + works at phone width.
- **Design reference:** the hi-fi pages in the design canvas (see CLAUDE.md). Every screen in this plan has an artboard there.

---

## Milestones (build order)

| # | Milestone | Epics | Outcome |
| --- | --- | --- | --- |
| 1 | Foundation | E0, E1 | Repo, stack, CI, design tokens, i18n routing, database schema with RLS and the no-double-booking constraint |
| 2 | Public site | E2, E3 | All 7 pages + footer pages in 3 languages, events agenda, SEO basics |
| 3 | Map | E4 | Clickable SVG map in explore mode, with list view and facility details |
| 4 | Booking level 1 | E5 (part) | Guests pick a plot and send a request; plot is held 15 min; Bert confirms |
| 5 | Admin panel | E6 | Bert maintains bookings, plots, prices, content, events, users |
| 6 | Booking level 2 | E5 (rest) | Instant confirmation + automatic email in the guest's language |
| 7 | Quality & launch | E7, E8 | WCAG 2.2 AA audit, technical booking tests, hosting, handover |
| 8 | Shoulds | E9 | Plekmatch, reminder mail, version history/audit log, Facebook, Google review |
| 9 | Coulds | E10 | iDEAL, plot editor, farm passport, games … only if time/budget allows |

Gate between milestones: Bert/testers approve before the next one starts (Plan.md, *Planning en rolverdeling*).

---

## E0 – Foundation (M)

### E0.1 Stack decision and repo setup
- [ ] **E0.1.1** Decide stack: Next.js (App Router) or SvelteKit + Supabase, vs. WordPress fallback. Record the decision and reasons in CLAUDE.md. *Recommendation: Next.js + Supabase (EU region), TypeScript.*
- [ ] **E0.1.2** Scaffold the app (TypeScript strict, ESLint, Prettier). Folder layout: `app/[locale]/…` (site), `app/admin/…` (panel), `lib/`, `components/`, `supabase/migrations/`.
- [ ] **E0.1.3** Test tooling: Vitest (unit), Playwright (e2e), axe-core in Playwright (a11y), a Postgres test DB for constraint tests.
- [ ] **E0.1.4** CI (GitHub Actions): lint, typecheck, unit, e2e on every PR to `dev`.
- [ ] **E0.1.5** Environments: local Supabase (CLI), preview deploy per PR, production. All in the EU. Secrets in env vars only.
- [ ] **E0.1.6** Record setup/build/test/run commands in CLAUDE.md.

### E0.2 Design system in code
- [ ] **E0.2.1** CSS variables for all tokens from the Stijlgids (colours, radii, spacing, focus ring). Lint rule or review check: no hex values in components.
- [ ] **E0.2.2** Self-hosted fonts: Bricolage Grotesque 600/800, Atkinson Hyperlegible 400/700 (no Google Fonts request → no third-party tracking).
- [ ] **E0.2.3** Base components: `Button` (primary / secondary / surface, 44 px min, CTA 52–60 px), `Link`, `Field` (label + input + help + error), `Select`, `Checkbox`, `Card`, `Pill/Badge`, `Alert`, `Dialog` (confirm), `Tabs`, `Stepper`.
- [ ] **E0.2.4** Mascot: chicken as inline SVG component with variants (head, full, waving, confused for 404).
- [ ] **E0.2.5** Event/facility icon set as inline SVG components (chickens, tractor, pool, milking parlour, shop, sanitary, reception).
- [ ] **E0.2.6** Motion: one `useCalm()` hook reading the Rustknop setting + `prefers-reduced-motion`; all animation goes through it.

### E0.3 Internationalisation
- [ ] **E0.3.1** Locale routing `/nl/…`, `/en/…`, `/de/…` with localised slugs (e.g. `/nl/reserveren`, `/en/book`, `/de/buchen`). `/` redirects by `Accept-Language`, default NL.
- [ ] **E0.3.2** UI string catalogue per language (buttons, labels, errors). Missing key fails the build.
- [ ] **E0.3.3** Language switcher that keeps the current page; `hreflang` alternates on every page.
- [ ] **E0.3.4** Date/number/currency formatting per locale.

---

## E1 – Data model and security (M)

### E1.1 Schema (Supabase migrations)
- [ ] **E1.1.1** `profiles` (user id, email, role enum: `beheerder`, `receptie`, `animatie`, `seizoenskracht`).
- [ ] **E1.1.2** `plots` (`code` T1…S8, type, electricity, surface, level, shade, wheelchair, max_persons, price_group, map_x/map_y/shape id, `gecontroleerd`, photo, active).
- [ ] **E1.1.3** `facilities` (key, name/description per language, photo, opening hours, accessibility, map position).
- [ ] **E1.1.4** `price_groups`, `seasons` (1 Apr–31 Oct, peak Jul–Aug), `prices` (price group × period → price per night), extra fees (open question to Bert).
- [ ] **E1.1.5** `reserveringen` (plot, `stay daterange`, persons, accommodation type, status: `vastgehouden` / `aangevraagd` / `bevestigd` / `geannuleerd`, contact fields, locale, remarks, `vastgehouden_tot`, `hold_token`, `manage_token`, source: web/phone/desk).
- [ ] **E1.1.6** `plot_blocks` (plot, date range, reason, created_by).
- [ ] **E1.1.7** `events` (title/body per language, start, end, recurrence rule, location, age, icon, photo, status draft/published).
- [ ] **E1.1.8** `pages` + `blocks` (page, block type, locale, text, media, order, status), `media` (file, alt text per language), `messages` (sender, email, text, status), `settings` (key, value per language), `jokes` (locale, text, active).
- [ ] **E1.1.9** Content tables store text per language (`*_nl`, `*_en`, `*_de` or a translations table — decide in E1.1, document it).

### E1.2 No double bookings (critical)
- [ ] **E1.2.1** `btree_gist` + exclusion constraint on `reserveringen`: `EXCLUDE USING gist (plot_id WITH =, stay WITH &&) WHERE (status IN ('vastgehouden','aangevraagd','bevestigd'))`. Holds count as occupying.
- [ ] **E1.2.2** Same check against `plot_blocks` (trigger or a second constraint via a shared occupancy table).
- [ ] **E1.2.3** Expired holds never block: a scheduled job (pg_cron, every minute) sets expired `vastgehouden` rows to `verlopen`; availability queries also ignore `vastgehouden_tot < now()`.
- [ ] **E1.2.4** Check constraints: departure > arrival, stay inside the season, persons ≤ plot max.
- [ ] **E1.2.5** DB tests: overlapping insert fails, back-to-back stays (depart = next arrive) succeed, expired hold frees the plot, two concurrent transactions → exactly one wins.

### E1.3 Role access in the database (RLS)
- [ ] **E1.3.1** RLS on every table. Public (anon) may read published content, plots, facilities, prices, published events, and an availability view without personal data.
- [ ] **E1.3.2** Policies per role (beheerder all · receptie bookings, messages, events, plot blocks · animatie events, media · seizoenskracht read only).
- [ ] **E1.3.3** Guests create holds/bookings only through server functions (RPC `hold_plot`, `confirm_booking`) — no direct table insert.
- [ ] **E1.3.4** RLS tests per role (role X tries forbidden action → denied).

### E1.4 Seed data
- [ ] **E1.4.1** 60 plots (T1–T40, C1–C12, S1–S8) with placeholder attributes, all `gecontroleerd = false` until Bert's walk-through.
- [ ] **E1.4.2** Facilities, a sample season with prices, sample events, sample jokes per language, page blocks.

---

## E2 – Public website (M)

### E2.1 Site shell
- [ ] **E2.1.1** Header: logo + chicken, main nav (7 pages), language switcher, Rustknop. Mobile: menu button with a disclosure panel.
- [ ] **E2.1.2** Season/announcement banner from settings ("zwembad vandaag dicht").
- [ ] **E2.1.3** Footer: footer pages, contact summary, Facebook link.
- [ ] **E2.1.4** Rustknop: toggles calm mode (no motion, no sound), stored in a functional cookie / localStorage, announced via `aria-live`.
- [ ] **E2.1.5** Cookie banner: only shown if non-essential cookies exist; non-essential off by default.
- [ ] **E2.1.6** Skip link, landmark structure, visible focus everywhere.

### E2.2 Content rendering
- [ ] **E2.2.1** Block renderer (hero, text, text+image, feature cards, CTA band, FAQ list) reading `blocks` for page + locale.
- [ ] **E2.2.2** Fallback when a translation is missing: show NL + flag it in admin (never auto-translate).
- [ ] **E2.2.3** Images through an image component that requires alt text.

### E2.3 Pages (each in NL/EN/DE)
- [ ] **E2.3.1** Home: hero, joke of the day, activities teaser, Plekmatch band, upcoming events (3), route block, CTA "Boek je plekje in de wei".
- [ ] **E2.3.2** Terrein & activiteiten: blocks per facility with photo, icon, times, accessibility.
- [ ] **E2.3.3** Plattegrond: map in explore mode (built in E4).
- [ ] **E2.3.4** Evenementen: agenda (built in E3).
- [ ] **E2.3.5** Over ons: Bert's story, team, vision.
- [ ] **E2.3.6** Contact: form (name, email, message) with honeypot + time-trap + rate limit (no tracking captcha), phone, email, address, route link, reception hours. Stores in `messages`, notifies Bert.
- [ ] **E2.3.7** Footer pages: Toegankelijkheid (site + terrain accessibility), Huisregels & FAQ, Privacy & cookies.
- [ ] **E2.3.8** 404 "Deze koe is ontsnapt." per language with own joke, and a 500 page.

### E2.4 SEO (M)
- [ ] **E2.4.1** Per page title/description per language, canonical, `hreflang`, Open Graph.
- [ ] **E2.4.2** `sitemap.xml` with all locales, `robots.txt`.
- [ ] **E2.4.3** Structured data: `Campground` / `LocalBusiness` with address, season, contact; `Event` for events.
- [ ] **E2.4.4** Performance budget (Lighthouse ≥ 90 on mobile) — SSR, image sizes, no blocking scripts.

---

## E3 – Events (M)

- [ ] **E3.1.1** Public agenda: day and week view, filter by age / type, icon per type, time, place, age.
- [ ] **E3.1.2** Recurrence expansion (daily/weekly with until-date) on the server.
- [ ] **E3.1.3** Event detail (dialog or page) + `Event` structured data.
- [ ] **E3.1.4** Home teaser: next 3 published events.
- [ ] **E3.2.x** Admin side is in E6.5.

---

## E4 – Site map (M)

### E4.1 SVG map
- [ ] **E4.1.1** Draw the farm as SVG (meadows, yard, milking parlour, house, play meadow, pool, sanitary) based on Bert's plan. One element per plot and facility with an `id` matching the DB.
- [ ] **E4.1.2** `SiteMap` component: plots rendered as `<button>` with `aria-label` ("Plek T14, vrij"), state = colour **plus** pattern/icon (Vrij, Bezet stripes, Geblokkeerd ✕, Jouw keuze ✓ + thick border, Tip ★).
- [ ] **E4.1.3** Zoom/pan with buttons (+/−), touch pinch and keyboard; tap targets ≥ 44 px at default zoom on phones.
- [ ] **E4.1.4** Keyboard: Tab to the map, arrow keys move between plots, Enter selects.
- [ ] **E4.1.5** Legend always visible.

### E4.2 List view (always available)
- [ ] **E4.2.1** Toggle Kaart / Lijst; list is a table of plots with the same filters and states, fully screen-reader friendly.
- [ ] **E4.2.2** Filters: type, electricity, wheelchair, max persons.

### E4.3 Details and distances
- [ ] **E4.3.1** Plot detail panel (number, type, electricity, surface, level, shade, wheelchair / "niet gecontroleerd", max persons, photo, distances; price for chosen dates in book mode).
- [ ] **E4.3.2** Facility detail panel (photo, text, times, accessibility).
- [ ] **E4.3.3** Distance calculation from SVG coordinates (build step or DB function) → stored as derived data, never entered by hand.

### E4.4 Modes
- [ ] **E4.4.1** Explore mode (no dates, everything clickable).
- [ ] **E4.4.2** Book mode: availability for chosen dates; booked/blocked plots visible but disabled; live refresh (poll or realtime) with `aria-live` announcements.

---

## E5 – Booking flow (M, level 1 → level 2)

### E5.1 Steps UI (7 steps, URL per step and per language)
- [ ] **E5.1.1** Stepper component + state kept in the URL/session (back button works, refresh keeps state).
- [ ] **E5.1.2** Step 1 Datum: arrival/departure with an accessible date picker, season limits, minimum nights (Bert's rule), nights count.
- [ ] **E5.1.3** Step 2 Personen & verblijf: adults, children (count only, no child data), accommodation type, electricity.
- [ ] **E5.1.4** Step 3 Plekmatch: in M scope only a "Kies zelf / Vraag het de kip" choice; the quiz itself is E9.1.
- [ ] **E5.1.5** Step 4 Plek kiezen: map in book mode + list + detail + price.
- [ ] **E5.1.6** Step 5 Gegevens: name, email, phone, remarks (only these fields), language preselected, privacy consent text, spam protection.
- [ ] **E5.1.7** Step 6 Controleren: summary, price breakdown, conditions, edit links per step.
- [ ] **E5.1.8** Step 7 Bevestiging: level 1 "aanvraag ontvangen" / level 2 "geboekt!", what happens next, add-to-calendar, route.

### E5.2 Availability, hold and confirm (server)
- [ ] **E5.2.1** `GET availability(from, to, persons, type)` → plot states without personal data.
- [ ] **E5.2.2** `hold_plot` RPC: creates `vastgehouden` row with `vastgehouden_tot = now() + 15 min`; replaces visitor's previous hold; max N concurrent holds per visitor/IP; countdown shown in UI.
- [ ] **E5.2.3** Release on change of plot/dates and on expiry (E1.2.3).
- [ ] **E5.2.4** `confirm_booking` RPC: converts the hold → `aangevraagd` (level 1) or `bevestigd` (level 2) in one transaction; constraint violation → typed error.
- [ ] **E5.2.5** Conflict screen: "Deze plek is net weg" → back to map with 3 free alternatives of the same type.
- [ ] **E5.2.6** Price calculation on the server (price group × period × nights + fees), shown before confirmation.
- [ ] **E5.2.7** Booking level switch in settings (1 or 2).

### E5.3 Emails (transactional, per language)
- [ ] **E5.3.1** Pick EU mail provider; templates in NL/EN/DE with chicken, plot, dates, price, route, rules.
- [ ] **E5.3.2** Level 1: "aanvraag ontvangen" to guest + notification to Bert; "bevestigd" after Bert's click.
- [ ] **E5.3.3** Level 2: confirmation immediately.
- [ ] **E5.3.4** Personal manage link (`manage_token`): view, change, cancel under Bert's conditions.

---

## E6 – Admin panel (M)

### E6.1 Access
- [ ] **E6.1.1** Login (email + password), mandatory TOTP 2FA, password reset, session timeout.
- [ ] **E6.1.2** Admin layout: dark-green side nav, items filtered by role (UI) — enforcement stays in RLS.
- [ ] **E6.1.3** Every field has a short help text with an example; every delete asks for confirmation.

### E6.2 Dashboard
- [ ] **E6.2.1** Greeting + four quick actions (Nieuw evenement, Reservering toevoegen, Plek blokkeren, Melding plaatsen).
- [ ] **E6.2.2** Widgets: bookings to confirm, arrivals today, new messages, missing translations, today's settings.

### E6.3 Bookings
- [ ] **E6.3.1** List with search/filter (status, date, plot, language) + confirm/cancel actions.
- [ ] **E6.3.2** Calendar/occupancy view (plots × days).
- [ ] **E6.3.3** Booking detail: edit dates/plot (through the same RPCs and constraint), cancel, resend email.
- [ ] **E6.3.4** Manual booking for phone/desk using the same map component and rules.
- [ ] **E6.3.5** Export to Excel (.xlsx/.csv) for the accountant.

### E6.4 Plots, blocks and facilities
- [ ] **E6.4.1** Plot list + edit form (all plot fields, photo, `gecontroleerd` checkbox with date).
- [ ] **E6.4.2** Block a plot for a date range with reason (visible on map as Geblokkeerd).
- [ ] **E6.4.3** Facility edit (text per language, photo, times, accessibility).

### E6.5 Events
- [ ] **E6.5.1** List (draft/published), create/edit with title + text per language, time, place, age, icon, photo.
- [ ] **E6.5.2** Recurrence ("elke dag kippen voeren"), copy event, publish/unpublish.

### E6.6 Content and media
- [ ] **E6.6.1** Page editor: blocks with NL/EN/DE side by side, "vertaling ontbreekt" labels, reorder blocks.
- [ ] **E6.6.2** Preview before publishing.
- [ ] **E6.6.3** Media library: upload, crop, alt text per language required.

### E6.7 Prices and seasons
- [ ] **E6.7.1** Season dates, periods (low/peak), price per price group per period, fees.
- [ ] **E6.7.2** Stay rules (min nights, arrival/departure times, change days) — values from Bert.

### E6.8 Messages, settings, users
- [ ] **E6.8.1** Messages inbox: read, mark handled, reply via mail link.
- [ ] **E6.8.2** Settings: contact details, reception hours, announcement banner, jokes list per language, Plekmatch on/off, booking level.
- [ ] **E6.8.3** Users & roles: invite, change role, revoke; only beheerder.

---

## E7 – Accessibility, privacy and quality (M)

- [ ] **E7.1** Automated axe checks on every page in e2e; zero serious violations.
- [ ] **E7.2** Manual keyboard + screen reader (NVDA/VoiceOver) pass on map, booking flow, admin.
- [ ] **E7.3** Contrast check of all token combinations (≥ 4.5:1 text).
- [ ] **E7.4** Technical booking tests from Plan.md: double booking (2 browsers), hold expiry, invalid dates, phone booking visible instantly, languages, roles.
- [ ] **E7.5** Privacy: privacy statement in 3 languages, retention job (term from Bert), no personal data of children, cookie-less analytics.
- [ ] **E7.6** User tests round 2 with the four test groups; feed findings back.

## E8 – Launch and handover (M)

- [ ] **E8.1** Production hosting in the EU, custom domain, SSL, daily backups verified.
- [ ] **E8.2** Cookie-less analytics, Google Search Console, Google Business Profile.
- [ ] **E8.3** One-page manual for Bert (screenshots), handover document (accounts on Bert's name, renewal dates), recurring tasks list.
- [ ] **E8.4** Training session with Bert and reception.
- [ ] **E8.5** Spend limit / alerts at the hosting provider.

---

## E9 – Shoulds (after all Musts)

- [ ] **E9.1 Plekmatch** — 5 questions by the chicken (persons+kids, type, electricity, accessibility, preference); filter on requirements → score preferences (distance, quiet, shade, level) → top 3 free plots with one reason each; never recommend a non-`gecontroleerd` plot as accessible; near-match with alternative dates; answers not linked to a person; on/off in settings. Unit-tested scoring function.
- [ ] **E9.2 Reminder email** — scheduled job N days before arrival, route + arrival times, per language.
- [ ] **E9.3 Version history + audit log** — content versions with restore; log who changed what.
- [ ] **E9.4 Facebook integration** — show Bert's latest posts (without tracking pixels; server-side fetch).
- [ ] **E9.5 Google review button** — in the farewell email and on the site.

## E10 – Coulds (only with time/budget)

iDEAL payment (level 3, provider-hosted), plot editor, farm passport with QR (offline), "De Ontsnapte Kippen" game, "Welk boerenbeest ben jij" quiz, live meadow page, farm assistant, extras (colouring pages, photo spot, postcard, newsletter, family code).

---

## Open questions that block tasks

| Blocks | Question for Bert (Plan.md) |
| --- | --- |
| E1.4, E4.1 | Plot count, numbering and a drawing of the yard |
| E5.2.7 | Level 1 or level 2 at launch |
| E1.2.4, E6.7.2 | Minimum nights, arrival/departure times, change days |
| E5.3.4 | Change/cancel conditions |
| E1.1.4, E5.2.6 | Price groups and fees (tourist tax, electricity, dog) |
| E6.8.3 | Who works in the admin panel |
| E1.4.1 | Which plots are level and wheelchair-accessible (walk-through) |
| E7.5 | Retention period for bookings and messages |
