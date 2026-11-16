# Implementation roadmap – De Groene Weide Online

This roadmap turns [Plan.md](../Plan.md) into features and tasks you can build one at a time. The [CLAUDE.md](../CLAUDE.md) hard rules apply to every task. The hi-fi screens are on the design canvas (page *High-fidelity (bouw)*).

- **Milestones** (M0–M8) follow the plan's gates. Finish a milestone and get Bert's or the testers' OK before starting the next one. M0–M6 are the **Musts**, M7 the **Shoulds**, M8 the **Coulds**.
- **Features** (F-numbers) are about the size of one pull request or a few. Each one lists its tasks, its design screen and what "done" means.
- The user stories with acceptance criteria are in [user-stories.md](user-stories.md), and each one names its feature number.
- Tasks marked **(Bert)** wait on an answer from *Open vragen voor Bert*. Build them with placeholder values and keep the value in settings, not in code.

## Assumed stack (confirm before M0)

CLAUDE.md marks the stack as a proposal. These are the defaults this roadmap assumes. Change them here first if the team decides otherwise.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js (App Router) + TypeScript**, server components and server actions | SSR for SEO, one codebase for the site and `/admin` |
| Styling | CSS variables from the Stijlgids + CSS Modules | Tokens as variables (hard rule). No hex values in components |
| i18n | `next-intl` with `/nl`, `/en`, `/de` route prefixes and slugs per language | A URL per language, hreflang |
| Database, auth, files | **Supabase** (EU region), Postgres, RLS, Auth with TOTP MFA, Storage | Exclusion constraint, roles in the database |
| Email | Transactional service with an EU region (for example Brevo, or Resend in the EU) plus `react-email` templates | Templates per language |
| Hosting | Vercel with functions in `fra1`, or another EU host | EU hosting, SSL, previews per PR |
| Analytics | Plausible (EU, no cookies) | No tracking cookies |
| Spam protection | Honeypot field + server-side rate limit (optionally Friendly Captcha, EU) | No tracking |
| Fonts | **Self-hosted** Bricolage Grotesque and Atkinson Hyperlegible (`next/font/local`) | Loading from Google Fonts sends visitor IPs to Google (AVG) |
| Tests | Vitest (logic), pgTAP or SQL tests (constraints, RLS), Playwright + axe-core (flows, accessibility) | The technical tests from the plan |

## Dependencies at a glance

```
M0 Foundations ─┬─> M1 Data & security ─┬─> M3 Site map ──> M4 Booking ──┐
                │                       └─> M5 Admin panel ─────────────┤
                └─> M2 Public website (static content first) ───────────┴─> M6 Launch ─> M7 Shoulds ─> M8 Coulds
```

M2 can start right after M0 with hard-coded content and switch to database content once M1 is in. M3, M4 and M5 can run in parallel once M1 is merged. M4's admin booking (F5.4) needs the map from M3.

---

## M0 – Foundations

### F0.1 Project setup and tooling
- [ ] Scaffold Next.js with TypeScript in strict mode, ESLint and Prettier.
- [ ] Add Vitest, Playwright and `@axe-core/playwright`.
- [ ] Set up a GitHub Actions workflow on every PR: lint, type check, unit tests, build, e2e against a local Supabase.
- [ ] Add `.env.example` and keep secrets out of git.
- [ ] Record the setup, build, test and run commands in CLAUDE.md (required by CLAUDE.md).

**Done:** `npm run dev`, `npm test` and `npm run e2e` work on a fresh clone, and CI is green.

### F0.2 Supabase project and migrations
- [ ] Create the Supabase project in an EU region, under Bert's or the campsite's account (see risks in the plan).
- [ ] Set up the local Supabase CLI, `supabase/migrations/` and `supabase/seed.sql`.
- [ ] Generate database types into `src/lib/database.types.ts` with an npm script.

**Done:** `supabase db reset` builds the whole schema and seed data from scratch.

### F0.3 Design tokens and base components
*Design: Hi · Stijlgids*
- [ ] Write `tokens.css` with all Stijlgids colours, fonts, radii, spacing and the focus ring, plus the map state styles (Vrij, Bezet, Geblokkeerd, Jouw keuze, Tip).
- [ ] Self-host the fonts: headings 600/800, body text 400/700, 18 px with line height 1.6.
- [ ] Build `Button` and `ButtonLink` (pill, 44 px minimum, CTA 52–60 px), `Field` (label, hint, error, `aria-describedby`), `Select`, `Checkbox`, `Card`, `Pill`, `Notice` and `Dialog` (focus trap, confirm on delete).
- [ ] Build `Chicken`, an inline SVG mascot with a few poses (default, waving, 404) and `aria-hidden` when it is decoration.
- [ ] Add a `SkipLink` and a visually hidden `VisuallyHidden` helper.
- [ ] Build the **Rustknop**: a `CalmProvider` sets `data-calm="true"` on `<html>` and stores the choice in an essential cookie. CSS turns off every transition and animation under `[data-calm]` and under `prefers-reduced-motion`. No sound plays anywhere by default.

**Done:** a `/dev/components` page (dev only) shows every component, and axe reports no issues on it.

### F0.4 Language routing
- [ ] Set up `next-intl` routes for `/nl`, `/en` and `/de`, with `/` sending visitors to `/nl`. Suggest the browser's language, but never redirect automatically.
- [ ] Translate slugs per language (for example `/nl/reserveren`, `/en/book`, `/de/buchen`) and add a helper that maps the current page to its URL in another language.
- [ ] Keep UI string catalogs in `messages/{nl,en,de}.json` and write the jokes per language, not as translations.
- [ ] Set `lang` on `<html>` and `hreflang` alternates on every page.

**Done:** every route exists in three languages, and the language switcher keeps you on the same page.

### F0.5 Site shell
*Design: header and footer on every Hi website screen, Hi · Home (phone)*
- [ ] Build the header with the logo, the 7-item main navigation, the language switcher and the Rustknop. On a phone it becomes a menu button with a full-width panel.
- [ ] Add a slot for the seasonal banner (text comes from settings in M5).
- [ ] Build the footer with the footer pages, Facebook link, address and reception hours.
- [ ] Build the cookie banner. Non-essential cookies are off by default, and the choice can be changed later from the footer.

**Done:** the shell works at 320 px width, with the keyboard only, and with the Rustknop on.

---

## M1 – Data model and security

### F1.1 Schema
Text that guests read is stored **per language in separate columns** (`title_nl`, `title_en`, `title_de`). A view or helper reports missing translations.
- [ ] `plots`: code (T1…S8), type (`tent_caravan`, `camper`, `safari`), electricity, surface, level, shade, wheelchair, max_persons, price_group_id, map_x, map_y, `checked`, photo, active.
- [ ] `facilities`: key, name/description per language, photo, opening hours, accessibility per language, map_x, map_y.
- [ ] `plot_distances`: plot, facility, metres. **Calculated by script, never entered by hand.**
- [ ] `seasons` (start and end per year), `price_groups`, `prices` (group, period, price per night).
- [ ] `reservations`: plot, arrival, departure (stored as a `daterange` column `stay`), persons, accommodation, status (`held`, `requested`, `confirmed`, `cancelled`), name, email, phone, remarks, locale, `held_until`, `hold_token`, `source` (`web`, `phone`, `desk`), manage token hash, timestamps. **No payment fields.**
- [ ] `plot_blocks`: plot, period, reason, created_by.
- [ ] `events`: title and text per language, kind (icon), start, end, recurrence rule, location, age group, photo, status (`draft`, `published`).
- [ ] `pages` and `blocks`: page key, block type, order, text per language, media, status.
- [ ] `media`: storage path, alt text per language (required), focal point or crop.
- [ ] `messages`: name, email, text, locale, status (`new`, `done`), created_at.
- [ ] `jokes`: locale, text, active. `settings`: key, value (with per-language values where needed).
- [ ] `profiles`: user id, display name, role (`admin`, `reception`, `animation`, `seasonal`).

**Done:** the migrations run cleanly, and the generated types compile.

### F1.2 Booking integrity in the database
- [ ] Add `btree_gist` and an exclusion constraint on `reservations`: `EXCLUDE USING gist (plot_id WITH =, stay WITH &&) WHERE (status IN ('held','requested','confirmed'))`.
- [ ] Add check constraints: departure is after arrival, and the stay falls inside the season (1 April – 31 October, so the last departure is 1 November). Departure on 1 November is allowed, and staying across the season boundary is refused.
- [ ] Write the `place_hold(plot, stay, token)` function. In one transaction it deletes expired holds for that plot, counts the token's active holds (maximum 2, set in settings), checks `plot_blocks`, inserts a `held` row with `held_until = now() + 15 min` and returns it. On `23P01` (exclusion violation) it returns "taken".
- [ ] Write `confirm_reservation(hold_id, token, contact…)`. It moves the hold to `requested` or `confirmed`, depending on the booking level setting, but only if the hold hasn't expired.
- [ ] Blocks and reservations live in separate tables, so one constraint can't cover both. Both functions therefore lock the plot row (`SELECT … FOR UPDATE`) before checking blocks. A trigger on `plot_blocks` refuses a block that overlaps an active reservation unless the admin confirms it.
- [ ] Add a `pg_cron` job every minute that deletes expired holds, so they don't pile up. Correctness doesn't depend on this job, because `place_hold` also clears expired holds itself.
- [ ] Write `availability(stay)` as a security definer function. It returns only plot id and status (`free`, `taken`, `blocked`), never personal data.

**Done:** SQL tests prove that overlapping reservations are refused, two parallel `place_hold` calls give exactly one winner, expired holds no longer block a plot, and invalid dates are refused.

### F1.3 Roles with RLS
- [ ] Add a `current_role()` helper that reads `profiles.role` for `auth.uid()`. Admin policies also require `auth.jwt()->>'aal' = 'aal2'` (2FA).
- [ ] Write policies per table that follow the role matrix:

| Table | admin | reception | animation | seasonal | anon (guest) |
| --- | --- | --- | --- | --- | --- |
| reservations | all | all | – | read | only through the RPCs above |
| plot_blocks | all | all | – | read | – |
| plots, facilities | all | read | read | read | read (public columns) |
| prices, seasons | all | read | – | read | read |
| events | all | all | all | read | read published |
| media | all | read | all | read | read |
| pages, blocks, jokes, settings | all | read | read | read | read published |
| messages | all | all | – | – | insert (through a server action) |
| profiles | all | own | own | own | – |

- [ ] Write a test per role that tries the forbidden action (from the plan's *Rollen* test).

**Done:** the RLS tests pass for every role and table, and the UI hides what the role can't do.

### F1.4 Admin auth with 2FA
- [ ] Admin accounts are invite-only: email and password through Supabase Auth, with TOTP enrolment forced on first login.
- [ ] Add a login page, a 2FA code page and recovery instructions. Use a short session lifetime for admins.
- [ ] Middleware protects `/admin` and requires `aal2`.

**Done:** without a second factor, no admin data loads, even through the API.

### F1.5 Seed and content intake
- [ ] Seed 60 placeholder plots (T1–T40, C1–C12, S1–S8, numbering still to be confirmed **(Bert)**), the facilities, sample events, 5 jokes per language and placeholder prices.
- [ ] Make a content intake checklist for Bert: photos, texts, house rules, prices, plot list **(Bert)**.

---

## M2 – Public website (7 pages × 3 languages)

Each page loads its blocks from `pages`/`blocks` and falls back to NL with a visible "not yet translated" note only in preview, never on the live site. **One joke per screen.**

### F2.1 Home
*Design: Hi · Home, Hi · Home (phone)*
- [ ] Hero with the chicken, CTA "Boek je plekje in de wei", route button, joke of the day (random active joke in the page's language), activities teaser, Plekmatch teaser (hidden when Plekmatch is off), next 3 events, location block.

### F2.2 Terrein & activiteiten
*Design: Hi · Terrein & activiteiten*
- [ ] Blocks with photo, icon and text per facility (chickens, play meadow with tractor, pool, shop, canteen in the old milking parlour, toilets and laundry), each with a link to its spot on the map.

### F2.3 Evenementen
*Design: Hi · Evenementen*
- [ ] Expand recurring events into occurrences for the visible range (pure function, unit tested).
- [ ] Day and week view with a date picker, an icon per kind, and filters for age and location. Show "today" and "tomorrow" labels.

### F2.4 Over ons
*Design: Hi · Over ons*
- [ ] Bert's story, the team and the vision, as editable blocks.

### F2.5 Contact
*Design: Hi · Contact*
- [ ] Form with name, email, message and an optional booking number. Server action, honeypot, rate limit, success message with `aria-live`.
- [ ] Store the message in `messages` and email Bert. Show contact details, route, reception hours and FAQ links.

### F2.6 Footer pages and errors
*Design: Hi · Toegankelijkheid, Hi · 404*
- [ ] Toegankelijkheid (site and terrain information, plots that are checked accessible), Huisregels & FAQ (accordion with `<details>`), Privacy & cookies. All are editable text pages.
- [ ] 404 page "Deze koe is ontsnapt." with the chicken, in all three languages, each with its own joke. Add a friendly 500 page too.

### F2.7 SEO
- [ ] `generateMetadata` per page and language, canonical URLs and hreflang, `sitemap.xml` with all three languages, `robots.txt`.
- [ ] JSON-LD for `Campground` (address, season, price range) and `Event` for published events.
- [ ] OG images per page. A Google Business Profile checklist for Bert (not code).

### F2.8 Analytics and cookies
- [ ] Plausible script without cookies, a privacy statement section about it, and the cookie banner wired to the actual cookie use.

**Done for M2:** all pages exist in NL/EN/DE, Lighthouse scores at least 90 for accessibility and SEO, and Playwright with axe reports no serious issues.

---

## M3 – Site map

### F3.1 Map drawing and coordinate import
- [ ] The team draws the farm as one SVG (FE). Every plot is `<g id="plot-T14">` and every facility is `<g id="facility-pool">`.
- [ ] Write `scripts/import-map.ts`. It reads the SVG, computes the centre of each shape, updates `plots.map_x/map_y` and `facilities.map_x/map_y` and recalculates `plot_distances`. Distances are never entered by hand.
- [ ] Unit test the distance calculation.

### F3.2 Map component
*Design: Hi · Plattegrond (verkennen), Hi · Reserveren (stap 4), Hi · Reserveren (telefoon)*
- [ ] The SVG drawing is the background, and each plot is an absolutely positioned HTML `<button>` with `aria-label="Plek T14, vrij"` and `aria-pressed` for the chosen plot. Buttons are at least 44 px when zoomed in.
- [ ] States use colour **plus** a pattern or icon (stripes, ✕, ✓, ★) and come with a legend.
- [ ] Zoom buttons and pinch zoom, without zooming automatically. Arrow-key navigation between neighbouring plots.
- [ ] A **list view** toggle with the same data, filtering and selection. It's always available.
- [ ] A detail panel for plots (all fields, distances, price for the chosen dates) and for facilities (photo, text, hours, accessibility). It is a side panel on desktop and a bottom sheet on a phone, and announces changes with `aria-live`.

### F3.3 Plattegrond page (explore mode)
- [ ] No dates and everything clickable. A "check availability" CTA carries the plot over into the booking flow.

**Done:** you can explore the whole map with the keyboard and with a screen reader through the list view, and it works at 360 px.

---

## M4 – Booking (levels 1 and 2)

### F4.1 Price calculation
- [ ] `calculatePrice(plot, stay, persons)` as a pure function: price per night by price group and period (peak in July and August), plus extras such as tourist tax, electricity or a dog **(Bert)**. Unit tests cover the season edges.

### F4.2 Booking flow (7 steps)
*Design: Hi · Reserveren stap 1, 2, 4, 5, 6, 7, list view, plot taken, phone*
- [ ] Route `/[locale]/reserveren` with the step kept in the URL (`?stap=…`), so the back button and refresh both work. Move focus to the step heading and announce each step change.
- [ ] Step 1 Datum: calendar with season limits, minimum nights **(Bert)** and the number of nights shown.
- [ ] Step 2 Personen & verblijf: adults, children, accommodation type, electricity yes or no.
- [ ] Step 3 Plekmatch: until M7, a skippable "Kies zelf op de kaart" screen.
- [ ] Step 4 Plek kiezen: map in book mode, where taken and blocked plots are visible but disabled.
- [ ] Step 5 Gegevens: name, email, phone, remarks, with the hold countdown visible.
- [ ] Step 6 Controleren: summary, price breakdown and house rules checkbox.
- [ ] Step 7 Bevestiging: request sent (level 1) or booked (level 2), plus the next steps.

### F4.3 Hold
- [ ] Choosing a plot calls `place_hold`. The anonymous `hold_token` lives in an essential, httpOnly cookie.
- [ ] Show a countdown with a polite `aria-live` warning at 2 minutes. When the hold expires, explain this and go back to step 4. Picking another plot releases the old hold.
- [ ] Limit holds per visitor (setting, default 2) and rate limit `place_hold` per IP.

### F4.4 Confirming and handling conflicts
- [ ] A server action calls `confirm_reservation`. If the plot was taken in the meantime, go back to the map with the **3 nearest free plots of the same type** highlighted (Design: Hi · Reserveren, plek bezet).
- [ ] Booking level setting: level 1 sets `requested` and Bert confirms in the admin panel. Level 2 sets `confirmed` straight away.

### F4.5 Emails
*Design: Hi · Bevestigingsmail*
- [ ] Templates in NL, EN and DE: request received, booking confirmed, cancelled, plus a new-booking notice to Bert. Each one has the chicken, plot, dates, price, route, rules and the manage link.
- [ ] Always send in the guest's `locale`. Log failed sends and retry them.

### F4.6 Manage link
- [ ] A signed, single-purpose token in the email opens `/[locale]/mijn-reservering/[token]`. It shows the booking and lets the guest cancel it under Bert's conditions **(Bert)**.

### F4.7 Technical tests from the plan
- [ ] **Dubbel boeken:** Playwright with two browser contexts picks the same plot at the same time, and only one succeeds. A SQL test confirms there is never more than one active row per plot and night.
- [ ] **Plek vasthouden:** move time forward 15 minutes (DB function with an injectable `now`, or a test helper), and the plot is free again.
- [ ] **Datums:** arrival on 31 October, a stay across the season, departure before arrival. All are refused with a clear message.
- [ ] **Telefoonreservering:** an admin booking makes the plot taken right away on the public map.
- [ ] **Talen:** the full flow in NL, EN and DE has no missing keys (the CI check fails on missing translations).

**Done:** all tests from the plan's *Technische tests* table are automated and green in CI.

---

## M5 – Admin panel

Every screen is in plain Dutch, with a short hint and example next to each field, a preview before publishing, and confirmation before deleting. The UI hides actions the role can't do, and RLS enforces it.

| Feature | What | Design |
| --- | --- | --- |
| **F5.1 Shell and login** | Login, 2FA code, nav that adapts to the role, the user's name and role, logout | Hi · Admin login & 2FA |
| **F5.2 Start** | 4 quick actions (new event, add booking, block plot, post notice), bookings waiting for confirmation, new messages, missing translations | Hi · Admin panel |
| **F5.3 Reserveringen** | List with filters (date, status, plot, language), week calendar per plot, detail, confirm, edit, cancel, CSV/Excel export for the accountant | Hi · Admin reserveringen |
| **F5.4 Reservering toevoegen** | Same map and same RPCs as guests, with `source = phone/desk`; sends the guest's email when an address is given | Hi · Admin reservering toevoegen |
| **F5.5 Plekken** | List of 60 plots with filters, edit all fields, `gecontroleerd` toggle with date, block a plot for a period with a reason | Hi · Admin plekken |
| **F5.6 Prijzen & seizoenen** | Season dates, price groups, periods (peak), price per night, extras | Hi · Admin prijzen |
| **F5.7 Evenementen** | List and week view, create, edit, copy, recurrence ("elke dag"), draft or published, NL/EN/DE tabs with missing-language labels | Hi · Admin evenement bewerken |
| **F5.8 Pagina's & teksten** | Block editor per page, NL/EN/DE side by side, missing translation label, preview, publish | Hi · Admin pagina's & teksten |
| **F5.9 Foto's & media** | Upload to Supabase Storage, crop, **alt text required** per language, see where each photo is used | Hi · Admin media |
| **F5.10 Voorzieningen** | Text, photo, hours and accessibility per facility | (same pattern as Plekken) |
| **F5.11 Berichten** | Inbox, read, mark as done, reply by email | Hi · Admin berichten |
| **F5.12 Instellingen** | Contact details, reception hours, temporary notices, joke list per language, Plekmatch on/off, booking level 1/2, holds per visitor, retention period **(Bert)** | Hi · Admin instellingen |
| **F5.13 Gebruikers & rollen** | Invite, change role, revoke, see 2FA status | Hi · Admin gebruikers |

**Done:** Bert and the reception complete the four test tasks without help (post an event, block a plot, enter a phone booking, change a price), and the role tests pass.

---

## M6 – Hardening and launch

- [ ] **Accessibility:** automatic axe checks on every page in CI, a manual keyboard and screen reader pass (NVDA + Firefox, VoiceOver + Safari), checks at 320 px width and 200 % zoom. Fix every blocking WCAG 2.2 AA issue.
- [ ] **Performance:** optimised images (`next/image`, AVIF/WebP), Core Web Vitals in the green on a mid-range phone.
- [ ] **Security:** review RLS and server actions, add security headers (CSP, HSTS), check that the rate limits work, keep dependencies up to date (Dependabot).
- [ ] **Privacy:** privacy statement in three languages, a retention job that anonymises old bookings and messages after Bert's retention period **(Bert)**, and a record of the processors used (host, Supabase, email).
- [ ] **Operations:** daily backups checked with a restore test, uptime monitoring, a spending limit with the host, and an emergency plan (export bookings to Excel).
- [ ] **Handover:** a one-page manual with screenshots, a technical README, a handover document with all accounts in Bert's name, a practice session with Bert and the reception, and a list of recurring tasks.
- [ ] **User tests round 2** with the four test groups from the plan, then feed the findings back into the design.

---

## M7 – Shoulds (only after the Musts are done)

### F7.1 Plekmatch
*Design: Hi · Plekmatch (telefoon)*
- [ ] `plekmatch(answers, stay)` as a pure function. Filter on requirements (free, persons, type, electricity, accessibility, where accessibility counts **only for `checked` plots**), then score preferences (distance to the play meadow, toilets or pool from `plot_distances`, quiet, shade, level ground) and return the top 3, each with a generated reason in the page's language.
- [ ] Near-match: when no plot meets every requirement, show the nearest similar plot and the dates on which the ideal plot is free.
- [ ] The chicken UI asks 5 questions as big buttons, with progress and a back button. Stars appear on the map. Answers are never stored with a person; count only an anonymous "picked a tip yes/no".
- [ ] Unit tests on fixed fixtures. Add the admin on/off setting.

### F7.2 Reminder email
- [ ] A daily cron job sends a reminder with the route and arrival times X days before arrival **(Bert)**, in the guest's language.

### F7.3 Version history and audit log
- [ ] Write triggers that log changes to `audit_log` (who, what, when, old and new values). Add version history for blocks with "zet terug" (restore).

### F7.4 Facebook integration
- [ ] Show Bert's latest Facebook posts on the site through the Graph API page feed (server-side and cached, no Facebook scripts or cookies), with a fallback when the API fails.

### F7.5 Google review button
- [ ] A review link in the farewell email and on the site. The plan's satisfaction question (chicken icons) goes in the reminder or farewell email.

---

## M8 – Coulds (only if Bert wants them and time allows)

Booking level 3 (iDEAL through a provider such as Mollie, deposit or full payment, webhooks, no payment data stored), plot editor (drag plots on the map in the admin panel), Boerenpaspoort with QR codes (offline PWA), the chicken game *De Ontsnapte Kippen*, the quiz *Welk boerenbeest ben jij*, meadow page or cam, Boerenassistent FAQ, and the small extras. Each gets its own feature breakdown once it is picked.

---

## Definition of done (every feature)

- It works in NL, EN and DE with no missing strings, and jokes are written per language.
- It works with the keyboard only and at phone width. Tap targets are at least 44 px, contrast is at least 4.5:1, and it works with the Rustknop and `prefers-reduced-motion`.
- Data rules are enforced in the database (constraint or RLS), not only in the UI.
- It has tests that fit the feature (unit, SQL, e2e), and CI is green.
- Code, identifiers and commits are in English, and colours come only from CSS variables.

## Suggested split by role

| Role | First tasks |
| --- | --- |
| Backend (still to assign) | F0.2, F1.1–F1.4, then F4.3–F4.7 |
| FE | F0.3, F0.5, F3.1 drawing, F3.2, M2 pages |
| BIM | F0.4, F1.5 content intake, F2.7 SEO, translations |
| UX | User tests round 1 on the hi-fi designs, the M5 admin flows, F6 accessibility |
| GAME | Jokes per language, chicken poses, F7.1 Plekmatch questions and reasons |
