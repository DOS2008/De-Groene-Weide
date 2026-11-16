# MVP and priority order – De Groene Weide Online

This file sets the **build order**. [Plan.md](../Plan.md) holds the scope and the rules. [roadmap.md](roadmap.md) holds the feature details (F-numbers), and [user-stories.md](user-stories.md) holds the acceptance criteria. When the order in those files differs from this one, this file wins. The [CLAUDE.md](../CLAUDE.md) hard rules apply to every priority, the MVP included.

## Language rules

| Where | Language |
| --- | --- |
| Code, identifiers, commits, database (tables, columns, enum values, functions) | **English** (`reservations`, `held_until`, `checked`, `admin`, `reception`) |
| Everything a guest or Bert reads on the site, in the admin panel and in emails | **Dutch first.** English and German follow in Prio 4 |

- **URLs:** `/` is the Dutch homepage, and Dutch pages have no prefix (`/reserveren`, `/plattegrond`). English and German get a prefix and their own slugs (`/en/book`, `/de/buchen`). Visiting `/` never redirects.
- **Build for three languages from day one, fill Dutch only.** Content has a field per language from the start (`title_nl`, `title_en`, `title_de`), UI strings live in `messages/nl.json`, and `reservations.locale` is stored on every booking. Prio 4 then adds content, not structure.
- `/en` and `/de` stay switched off until their translation is complete. A page is never live half in Dutch.
- The admin panel stays in Dutch only. Plan.md asks for "gewoon Nederlands".

## The MVP in one sentence

**A guest finds De Groene Weide online, sees what there is to do and where everything is, and sends a booking request for a numbered plot they picked on the map. A double booking can't happen, and Bert confirms the request with one click.** The MVP is in Dutch.

That covers the problems from last season that Plan.md names:

| Problem from last season | Solved by |
| --- | --- |
| No website, so 300 Facebook followers have nowhere to go | Prio 1 |
| Late phone calls about prices, route, rules and availability | Prio 1 (info), Prio 3 (availability) |
| Double-booked plots | Prio 3 (database constraint) |
| Bookings kept in an Excel file | Prio 3 (bookings list in the admin panel) |
| German and English guests can't read about the campsite | Prio 4 |

**MVP = Prio 1 + Prio 2 + Prio 3.** Everything after that is still a Must (Prio 4 to 6) or comes later (Shoulds and Coulds). The rule from CLAUDE.md still holds: **all Musts are finished before any Should starts.**

## Priority order at a glance

| Prio | Name | Release | What a guest or Bert gets | Must/Should/Could |
| --- | --- | --- | --- | --- |
| **1** | **Public website (NL)** | R1: the site is live | 7 pages + footer pages in Dutch, findable in Google, accessible | Must · **MVP** |
| **2** | **Clickable site map** | R2 | Explore plots and facilities on the map or in the list | Must · **MVP** |
| **3** | **Booking level 1** + minimal admin | R3: **MVP complete** | Pick a plot, send a request, Bert confirms; phone bookings use the same map | Must · **MVP** |
| 4 | English and German | R4 | The whole site, the booking flow and the emails in EN and DE | Must |
| 5 | Admin panel for content | R5 | Bert maintains events, texts, photos, plots, prices and settings himself, in all three languages | Must |
| 6 | Booking level 2 + launch hardening | R6: delivery | Instant confirmation, manage link, full audit and handover | Must |
| 7 | Shoulds | R7+ | Plekmatch, reminder email, audit log, review button, Facebook | Should |
| 8 | Coulds | when Bert wants it | iDEAL, plot editor, farm passport, games … | Could |

Each priority ends in a release to production, after a gate: Bert or the testers approve before the next priority starts (Plan.md, *Planning en rolverdeling*).

```
Prio 1 Website (NL) ─> Prio 2 Map ─> Prio 3 Booking L1 ══ MVP ══> Prio 4 EN + DE ─> Prio 5 Admin ─> Prio 6 Booking L2 + launch ─> Prio 7 Shoulds ─> Prio 8 Coulds
```

---

## Prio 1 – Public website (Dutch)

**Goal:** Bert has a real website. Guests read about the campsite, find prices, events, route and contact details, and can ask a question. **This release has no database and no admin panel yet.**

**Content source in Prio 1:** typed content files in the repo (`content/`), with the same shape as the later database tables, so every text field already exists per language and only `_nl` is filled. In Prio 5 only the loader changes, not the components. The trade-off: until Prio 5 the team edits content on Bert's behalf.

### In scope

| Order | What | Roadmap |
| --- | --- | --- |
| 1.0 | Settle the open decisions below and record the stack and commands in CLAUDE.md | F0.1 |
| 1.1 | Project setup, CI (lint, types, unit, build, Playwright + axe) | F0.1 |
| 1.2 | Design tokens, self-hosted fonts, base components, chicken SVG, **Rustknop** | F0.3 |
| 1.3 | Language routing set up for NL/EN/DE, with Dutch at `/` without a prefix and `/en` and `/de` switched off. The language switcher stays hidden until Prio 4 | F0.4 |
| 1.4 | Site shell: header, 7-item nav, footer with the Facebook link, cookie banner | F0.5 |
| 1.5 | **Home** at `/`: hero, chicken, joke of the day, next 3 events, route button. The main CTA goes to Reserveren | F2.1 |
| 1.6 | **Terrein & activiteiten**: a block per facility with photo, icon, text, times and accessibility | F2.2 |
| 1.7 | **Evenementen**: day and week view, icon per kind, recurring events expanded (pure function, unit tested) | F2.3 |
| 1.8 | **Over ons** | F2.4 |
| 1.9 | **Contact**: form with honeypot and rate limit that emails Bert, plus phone, address, route and reception hours | F2.5 |
| 1.10 | **Reserveren (info version)**: season, prices per plot type, house rules and "book by phone or email". Online booking replaces this in Prio 3 | – |
| 1.11 | **Plattegrond (static version)**: the drawn map as an image with alt text, plus a text list of the facilities. Prio 2 makes it clickable | – |
| 1.12 | Footer pages: Toegankelijkheid, Huisregels & FAQ, Privacy & cookies. Plus the 404 "Deze koe is ontsnapt." and a 500 page | F2.6 |
| 1.13 | SEO: Dutch metadata per page, sitemap.xml, robots.txt, JSON-LD `Campground` and `Event`, OG images | F2.7 |
| 1.14 | Cookieless analytics, EU hosting, domain, SSL. A Google Business Profile checklist for Bert | F2.8, M6 |

### Out of scope in Prio 1
English and German, Supabase, the admin panel, messages stored in a database, the seasonal notice banner (the slot exists but stays off), the Plekmatch teaser.

### Done when
- All pages exist in Dutch, each with its own URL, and `/` is the homepage.
- Lighthouse scores at least 90 for accessibility and SEO on mobile, and axe reports no serious issues.
- Every page works at 320 px, with the keyboard only, and with the Rustknop and `prefers-reduced-motion`.
- User stories: *Turn off motion and sound*, *Home*, *Activities*, *Event calendar*, *Bert and the team*, *Contact*, *Accessibility info*, *Error page*, *Search engines*, *Cookies*, all in Dutch.

### Needs from Bert
Photos, texts, house rules, current prices, contact details and reception hours. Also the domain name, and the retention period for contact messages (needed for the privacy statement).

---

## Prio 2 – Clickable site map (explore mode)

**Goal:** guests see where everything is before they book. **This is where the database starts**, with public, read-only data only.

### In scope

| Order | What | Roadmap |
| --- | --- | --- |
| 2.1 | Supabase project in the EU, migrations and seed, generated types | F0.2 |
| 2.2 | Tables `plots`, `facilities` and `plot_distances`, with RLS for public read of public columns | F1.1 (part), F1.3 (part) |
| 2.3 | Seed 60 placeholder plots (T1–T40, C1–C12, S1–S8), all `checked = false` | F1.5 |
| 2.4 | The SVG drawing of the farm, and `import-map` to compute positions and distances (never entered by hand) | F3.1 |
| 2.5 | Map component: each plot is a `<button>` with an `aria-label` ("Plek T14, vrij"), states use colour **plus** pattern, legend, zoom, arrow keys | F3.2 |
| 2.6 | **List view**, always available, with filters | F3.2 |
| 2.7 | Detail panel for plots and facilities (side panel on desktop, bottom sheet on a phone) | F3.2 |
| 2.8 | Plattegrond page in explore mode. Terrein & activiteiten links to each facility on the map | F3.3, F2.2 |

### Out of scope in Prio 2
Book mode (the Bezet, Jouw keuze and Tip states), prices for chosen dates, editing plots in an admin panel.

### Done when
- You can explore the whole map with the keyboard, and with a screen reader through the list view.
- It works at 360 px with tap targets of at least 44 px.
- The distance calculation has unit tests.
- User stories: *Explore the site map*, *Use a list instead of the map*.

### Needs from Bert
The plot count and numbering, a drawing or plan of the yard, and the walk-through of the terrain to record plot features (it can happen during Prio 2 and 3, since `checked` stays false until then).

---

## Prio 3 – Booking level 1 + minimal admin (MVP complete)

**Goal:** a guest picks a free numbered plot and sends a request. The database makes a double booking impossible. Bert or the reception confirms the request and enters phone bookings with the same map and the same rules.

The admin panel in this priority is **only what bookings need**. The rest of the panel comes in Prio 5.

### In scope

| Order | What | Roadmap |
| --- | --- | --- |
| 3.1 | Tables `reservations`, `plot_blocks`, `seasons`, `price_groups`, `prices`, `settings` and `profiles` | F1.1 (rest) |
| 3.2 | **No double bookings:** the exclusion constraint, date checks, `place_hold`, `confirm_reservation`, `availability`, expired-hold cleanup | F1.2 |
| 3.3 | RLS and role tests for `reservations`, `plot_blocks` and `profiles` | F1.3 (part) |
| 3.4 | Admin login with email, password and **forced TOTP 2FA**, invite only. Middleware requires `aal2` | F1.4, F5.1 |
| 3.5 | Price calculation as a pure function, with unit tests at the season and peak edges | F4.1 |
| 3.6 | Booking flow, 7 steps. Step 3 is a skippable "Kies zelf op de kaart" screen until Plekmatch arrives in Prio 7 | F4.2 |
| 3.7 | 15-minute hold with a countdown, a maximum number of holds per visitor, and a rate limit | F4.3 |
| 3.8 | Confirming, and the "plek bezet" screen with 3 free alternatives of the same type. Level 1 only: status `requested` | F4.4 |
| 3.9 | Dutch emails: request received, confirmed, cancelled, plus a new-request notice to Bert. Templates are picked by `locale`, so EN and DE slot in later | F4.5 (part) |
| 3.10 | Admin **bookings list** with filters, confirm and cancel (each sends the guest's email) | F5.3 (part) |
| 3.11 | Admin **phone or desk booking** with the same map and the same RPCs | F5.4 |
| 3.12 | Admin **block a plot** for a period with a reason | F5.5 (part) |
| 3.13 | The technical tests from the plan: double booking, hold, dates, phone booking, roles. The language test follows in Prio 4 | F4.7 |

### Out of scope in Prio 3
English and German, level 2 (instant confirmation), the guest's manage link (guests cancel by contacting Bert), the bookings calendar view, Excel export, Plekmatch. Prices change through the seed until Prio 5.

### Done when
- **Two browsers picking the same plot at the same time give exactly one winner**, and a SQL test proves there is never more than one active booking per plot and night.
- A hold frees up by itself after 15 minutes.
- Invalid dates are refused with a clear message: arrival on 31 October, a stay across the season boundary, or departure before arrival.
- A phone booking makes the plot taken on the public map right away.
- The whole flow works on a phone.
- Reception can confirm a request. A seasonal worker can't, even through the API.
- User stories: *Choose my dates and group*, *Choose a numbered plot*, *Have my plot held*, *Enter my details*, *Get a booking confirmation* (level 1), *Never book a plot that is already taken*, *Book on my phone*, *Log in safely*, *Enter a phone or desk booking*.

### Needs from Bert
The minimum number of nights, arrival and departure times, change days in the peak season, price groups and extras (tourist tax, electricity, a dog), and who works in the admin panel.

---

## After the MVP

### Prio 4 – English and German (Must)

**Goal:** German and English guests read the whole site and book in their own language. The structure from Prio 1 is already there, so this priority is about content and checking it.

1. English and German UI strings (`messages/en.json`, `messages/de.json`). CI fails on a missing key.
2. All content in the content files and the database, in EN and DE.
3. **Jokes written per language**, never translated word for word. The 404 page gets its own joke in each language.
4. Translated slugs, the language switcher (it keeps you on the same page), `hreflang` on every page, and EN and DE in sitemap.xml.
5. The booking flow and emails in EN and DE. Each email goes out in the booking's `locale`.
6. Date, number and currency formatting per language.
7. Native speakers check the texts and the humour.
8. Switch on `/en` and `/de`.

**Done when** the language test from the plan passes: the same booking in NL, EN and DE shows the right language on every screen and in the email, with no missing texts. User story: *Choose my language*.

**Needs from Bert:** who can check the English and German texts.

### Prio 5 – Admin panel for content (Must)

**Goal:** Bert maintains the site himself, without a developer. The content files from Prio 1 move to the database, and each page's loader switches over. The panel is in Dutch, and every content screen shows NL, EN and DE side by side with a label for any missing translation.

The order follows how often Bert does each task:

1. **F5.2 Start screen** with the four quick actions.
2. **F5.7 Evenementen**: create, copy, repeat, draft or published.
3. **F5.12 Instellingen**: temporary notices (the banner slot from Prio 1 turns on), jokes per language, contact details, reception hours, holds per visitor.
4. **F5.11 Berichten**: contact form messages are stored and shown in an inbox.
5. **F5.5 Plekken (full)** with the `checked` toggle, plus **F5.10 Voorzieningen**.
6. **F5.6 Prijzen & seizoenen**.
7. **F5.8 Pagina's & teksten** with a preview, plus **F5.9 Media** with required alt text.
8. **F5.13 Gebruikers & rollen**.
9. **F5.3 (rest)**: the bookings calendar and the Excel export.
10. RLS policies and role tests for every remaining table (F1.3).

**Done when** Bert and the reception complete the four test tasks from the plan without help: post an event, block a plot, enter a phone booking and change a price.

### Prio 6 – Booking level 2 + launch hardening (Must)

1. Booking level 1/2 switch in the settings. Level 2 confirms straight away and sends the email automatically (F4.4, F4.5).
2. **Manage link** for the guest: view and cancel under Bert's conditions (F4.6).
3. Hardening from M6: full accessibility audit (NVDA, VoiceOver, 200 % zoom), performance, security headers, retention job, backup restore test, spending limit.
4. User test round 2 with the four test groups.
5. Handover: a one-page manual, a handover document with all accounts in Bert's name, and a practice session.

**Needs from Bert:** the change and cancellation conditions, and the choice between level 1 and level 2 at launch.

### Prio 7 – Shoulds (only after all Musts)

1. **Plekmatch** (F7.1), which replaces the placeholder in step 3. Rule-based, never recommends a plot that isn't checked as accessible, and never links answers to a person.
2. **Reminder email** before arrival (F7.2).
3. **Version history and audit log** (F7.3).
4. **Google review button** (F7.5).
5. **Facebook integration** (F7.4), server-side and without Facebook scripts.

### Prio 8 – Coulds (only if Bert wants it and time allows)

Online payment (level 3) comes first if Bert wants it. Then the plot editor, the farm passport, the chicken game, the quiz, the meadow page, the farm assistant and the small extras. Each one gets its own breakdown when it is picked.

---

## Decisions

### Settled
- **Code and database are in English**, including tables, columns, enum values and functions. Statuses are `held`, `requested`, `confirmed`, `cancelled`. Roles are `admin` (Bert), `reception`, `animation`, `seasonal`. Dutch only appears in UI texts.
- **Site content is Dutch first**, then English and German (Prio 4).
- **`/` is the Dutch homepage.** Dutch has no URL prefix, EN and DE do, and there is no automatic redirect.
- **Stack: Next.js + self-hosted Supabase, all in Docker** ([decision 0001](decisions/0001-stack-nextjs-supabase-docker.md)). Task 1.0 is done for the stack, and the Docker setup for development and the server is in place.

### Still open (settle before Prio 3)

| Topic | Options | Recommendation |
| --- | --- | --- |
| Expired holds | Delete them (roadmap.md), or set them to `expired` (implementation-plan.md) | Delete them, because a hold isn't a booking and stores no personal data worth keeping |
