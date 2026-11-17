# Build progress – 18 November 2026

Where the build of Prio 2 to 8 ([mvp.md](mvp.md)) stands. Prio 2 to 7 are built, on `feature/implementation-roadmap`: Prio 2 in `9ae0583`, Prio 3 and 4 in `73a9ef8`, Prio 5 in `db14d63`, Prio 6 in `759db9b`, Prio 7 in the commit after it. What's left needs Bert or real users (see *Next steps*). All checks pass (see *Tests*).

## Summary

| Prio | Status | Committed |
| --- | --- | --- |
| 1 Public website (NL) | Done earlier | Yes (`a2decbd`) |
| 2 Clickable site map | Done | Yes (`9ae0583`) |
| 3 Booking level 1 + minimal admin | Built. All database and e2e tests pass | Yes (`73a9ef8`) |
| 4 English and German | Built. Native-speaker check still to do | Yes (`73a9ef8`) |
| 5 Admin panel for content | Built. All database, unit and e2e tests pass | Yes (`db14d63`) |
| 6 Booking level 2 + launch hardening | Built. Manual checks with Bert and real users still to do | Yes (`759db9b`) |
| 7 Shoulds | Built. Facebook needs Bert's page token to show posts | Yes |
| 8 Coulds | Skipped on purpose: only when Bert asks for them | – |

## Prio 2 – Clickable site map (committed)

- **Database:** migrations in `supabase/migrations/`, seed in `supabase/seed/`. A one-shot `migrate` service applies both on every `docker compose up`, in dev and on the server. Tables `plots`, `facilities`, `plot_distances`, `price_groups` and `profiles`, plus the `auth_role()` / `has_role()` helpers. These only return a role after 2FA (`aal2`).
- **60 placeholder plots** (T1–T40, C1–C12, S1–S8), all `checked = false`. Their features are examples until the walk-through with Bert.
- **Map drawing** in `src/content/map/terrain.svg`. `npm run import-map` computes positions and distances from it (`src/lib/map/geometry.ts`, unit tested) and writes `supabase/seed/03_map.sql`.
- **Map component** (`src/components/map/SiteMap.tsx`), built from the hi-fi design. Every plot is a `<button>` with an `aria-label`, and each state has a colour plus a pattern or icon. There is a legend, zoom, arrow-key navigation, filters, a list view, and a detail panel that becomes a bottom sheet on phones.
- **Plattegrond page** in explore mode. Facility links (`/plattegrond#pool`) open that facility, and "Is deze plek vrij?" carries the plot over into booking.

## Prio 3 – Booking level 1 + minimal admin

**Database** (`0002_booking.sql`):
- Tables `reservations`, `plot_blocks`, `seasons`, `price_periods`, `prices`, `extras` and `settings`.
- **No double bookings:** an exclusion constraint on plot + `daterange`.
- A guard trigger checks the season, the minimum and maximum nights and plot blocks, locks the plot row, and clears expired holds. It applies to guest and admin bookings alike.
- Functions `place_hold` (15 minutes, at most 2 holds per visitor), `confirm_reservation` (level 1 gives `requested`, level 2 gives `confirmed`; returns a manage token, only its hash is stored), `availability`, `release_hold` and `hold_info`.
- pg_cron deletes expired holds every minute.
- RLS follows the role matrix. Guests never read the table, only the functions.

**Date rule:** the plan's test says arrival on 31 October must be refused, so the last departure day is **31 October**. Roadmap F1.2 says departure on 1 November is allowed. I followed Plan.md. Please confirm with Bert.

**Price calculation:** `src/lib/pricing.ts`, a pure function with unit tests at the peak and season edges. Prices are `null` until Bert supplies them, and the site then shows "Prijs volgt".

**Booking flow:** `/reserveren`, 7 steps.
- The step and trip choices live in the URL; personal details stay in memory only.
- Focus moves to the step heading and each step is announced.
- A countdown with a warning at 2 minutes, and an anonymous hold token in an httpOnly cookie.
- A "plek bezet" screen with the 3 nearest free plots of the same type.
- A honeypot and rate limits.
- Step 3 is the placeholder "Kies zelf op de kaart" until Plekmatch.

**Emails:** `src/lib/email/booking.ts`.
- Request received, confirmed and cancelled, plus a notice to Bert.
- Written in the booking's `locale`, with text and HTML and the chicken.
- A failed send is logged and never fails the booking. There is no retry queue yet (Prio 6).

**Admin panel** (`/admin`, Dutch only, own root layout):
- Login with email and password, then **forced TOTP setup** on first login, then the code on later logins.
- `src/proxy.ts` refreshes the session and redirects anyone without 2FA. Pages also call `requireStaff()`.
- Start screen, bookings list with filters, confirm and cancel (each emails the guest), and phone/desk booking on the same map with the same rules.
- Blocking plots, on Plekken.
- `npm run create-staff -- <email> "<name>" <role>` creates the first account. There is no public sign-up.

**Auth settings** in `infra/supabase.override.yml`: TOTP on, sessions time out after 8 hours of inactivity and after 24 hours at most.

## Prio 4 – English and German

- `messages/en.json` and `messages/de.json` are complete. `src/lib/messages.test.ts` fails on a missing key, a different placeholder or an empty text, and **passes**.
- All content in `src/content` now has EN and DE. Jokes, the 404 title and other funny lines are written per language, not translated.
- `/en` and `/de` are switched on (`src/i18n/routing.ts`), with their own slugs, a language switcher in the header that stays on the same page, and hreflang and sitemap entries.
- The seed fills empty EN and DE columns without overwriting edits from the admin panel.
- **Still to do:** native speakers check the texts and the humour (mvp.md, Prio 4 step 7).

## Prio 5 – Admin panel for content

Every screen from mvp.md, Prio 5, in the order Bert uses them. All are Dutch, with NL, EN and DE side by side and a "Vertaling ontbreekt" label (`src/app/admin/LangFields.tsx`). The nav shows what the role may do; RLS decides.

- **Start (F5.2):** four quick actions (nieuw evenement, reservering toevoegen, plek blokkeren, mededeling plaatsen), bookings to confirm, new messages, and missing translations per section.
- **Evenementen (F5.7):** list and week view, create, edit, copy (as a draft), once / daily / weekly with days to skip, draft or published, photo.
- **Instellingen (F5.12):** notice banner, contact details and times, booking level 1/2, hold minutes, holds per visitor, min/max nights, free cancellation days, reminder days, Plekmatch on/off, retention, review link, Facebook page, and the jokes per language.
- **Berichten (F5.11):** the contact form now also stores each message (`messages`). Inbox with new/done, reply by email from the panel (in a mail with the chicken), delete (admin only).
- **Plekken (F5.5)** with filters, every feature editable, and the "gecontroleerd" toggle; a trigger records when and by whom. **Voorzieningen (F5.10):** text, photo, hours, access per facility. New facilities still come from the map drawing.
- **Prijzen & seizoenen (F5.6):** price per night per group and period, extras, the peak period dates and names, season dates per year.
- **Pagina's & teksten (F5.8):** every UI text of 12 pages, as a draft, with a before/after preview and Publiceren. A text must keep its `{placeholders}` (`src/lib/texts.ts`, unit tested). Published texts are merged into next-intl in `src/i18n/request.ts`. Over ons (timeline and team) moved to `about_blocks`.
- **Foto's & media (F5.9):** upload with cropping in the browser (shape and position, resized to WebP), Dutch alt text required, shows where each photo is used, delete only when unused.
- **Gebruikers & rollen (F5.13):** invite by email (own link, `/admin/welcome`), change role, revoke, reset 2FA, new password link, 2FA status. The database refuses to remove or demote the last admin.
- **Reserveringen (F5.3, rest):** booking detail page with edit (same rules, price recalculated), a two-week calendar per plot, and a CSV download that Dutch Excel opens directly.

Migration `0004_admin.sql`. Database tests `03_content_roles.sql` cover every new table per role.

Fixed on the way:
- **Guests couldn't call `auth_role()`.** Policies like `status = 'published' or has_role(...)` failed for guests as soon as a draft row existed, and the site silently fell back to `src/content`. Admin edits to events would never have shown. `0004` grants it to anon.
- **The login rate limit counted per IP for password and code together**, so the sixth login from one address was refused. It now counts per account (10 per 15 minutes) with a cap of 60 per address.
- `scripts/dev/check-sync.mjs` failed inside the container (a `
` in the script became a real line break). It works now and is the way to sync while Compose Watch doesn't.
- `02_roles.sql` assumed an empty reservations table.

Noted: after a save, another visitor can see the old page once while the cache refreshes (seconds). The editor sees the change straight away.

## Prio 6 – Booking level 2 + launch hardening

- **Level 1/2** is a setting (Instellingen → Reserveren). Level 2 confirms at once and mails the guest automatically; tested in the database and end to end.
- **Manage link (F4.6):** `/mijn-reservering/<token>` (`/en/my-booking`, `/de/meine-buchung`), not indexed. Shows the booking and lets the guest cancel up to `cancel_free_days` before arrival (0 = only through Bert). The token is an HMAC of the booking id (`MANAGE_LINK_SECRET`), so Bert's confirmation, a change and the reminder can all include the same link; the database keeps only its sha256 (`manage_lookup`, `manage_cancel` in `0005_launch.sql`). Bert gets a mail when a guest cancels.
- **Mail retries:** a failed mail goes to `mail_outbox`; `/api/jobs` retries it after 5 min, 15 min, 1 h, 4 h, 4 h, then gives up.
- **Jobs:** the `cron` service (curl) calls `POST /api/jobs` every 15 minutes with `JOBS_SECRET`.
- **Retention (AVG):** `apply_retention()` runs nightly in pg_cron. After `retention_months` it removes name, email, phone and remarks from bookings (the row stays for the figures, `anonymised_at`) and deletes old messages and mail. The privacy text says so (the period is still `[termijn]`).
- **Security headers** in `next.config.ts`: CSP (own origin only; `'unsafe-inline'` scripts because nonces would make every page dynamic), HSTS in production, nosniff, frame-ancestors none, Referrer- and Permissions-Policy. No `X-Powered-By`.
- **Backups:** the `backup` service in `compose.prod.yaml` dumps the database and the photos nightly (14 kept). `scripts/db/restore-check.sh` restores the newest dump into a scratch database and compares row counts; tested in development.
- **Reflow:** a new e2e test loads every public page and every admin screen at 320 px. It found the events week navigation 23 px too wide (fixed).
- **Handover:** [manual.md](manual.md) (one page for Bert, in Dutch) and [handover.md](handover.md) (accounts, backups, recurring tasks, emergency plan). `scripts/create-staff.ts` no longer needs packages, so it also runs in the production image.

Not done, because it needs people: the NVDA/VoiceOver pass, user test round 2, the practice session with Bert, the spending limit with the host, and Bert's answers (cancellation conditions, retention period, level at launch).

## Prio 7 – Shoulds

- **Plekmatch (F7.1)** in step 3 (`src/app/[locale]/book/Plekmatch.tsx`, rules in `src/lib/plekmatch.ts` with 10 unit tests). Five questions as big buttons (near what, quiet or lively, shade, level, wheelchair), progress, back, focus on each question. Requirements filter first (free, type, persons, electricity, wheelchair only for `checked` plots), then the preferences are scored from `plot_distances`. The top 3 show with one reason each and as stars on the map. When nothing fits: the closest similar free plot, what it misses, and when the ideal plot is free next (`next_free_stay`). Only anonymous day counts are stored (`plekmatch_stats`, shown in Instellingen). On/off in Instellingen.
- **Reminder mail (F7.2):** the jobs endpoint sends it `reminder_days_before` days ahead, in the guest's language, with the route, arrival times and the manage link. Each booking is claimed before sending, so it goes out once.
- **Audit log and version history (F7.3):** triggers on 15 tables write who, what and when with old and new values to `audit_log`. Guests' names, emails, phones and remarks are left out, and holds aren't logged. *Geschiedenis* in the admin panel, with *Zet terug* for texts, Over ons, events, facilities, jokes, settings, prices and blocks. The log follows the retention period.
- **Review button (F7.5):** in the footer when Bert sets the link, and in the farewell mail (from 11:00 on the day of departure, with the chicken question).
- **Facebook (F7.4):** "Nieuws van het erf" on the homepage, fetched on the server through the Graph API (`FACEBOOK_PAGE_TOKEN` in `.env`, page ID in Instellingen), cached for an hour. No Facebook script. Photos come from Facebook's servers, so they only show after the visitor turns on "Extra's" in the cookie settings. Without a token, or when Facebook fails, it links to the page.

Fixed: the manage page (Prio 6) broke `next build`, because the header's `usePathname()` can't be prerendered for an unknown token. It is now a blocking route (`export const instant = false`, like the catch-all 404); `next build` passes.

Not tested end to end: the farewell mail (it needs a departure in the last three days, and it's outside the season now) and Facebook with a real token.

Prio 8 (Coulds) is not built, on purpose: only when Bert asks for one.

## Tests and how far they are verified

| Check | Command | Last result (18 November) |
| --- | --- | --- |
| Database rules: double booking, holds, dates, blocks, phone booking, roles, content roles, last admin, manage link, retention, level 2, audit log, Plekmatch counts, next free stay, 3-way race | `docker compose run --rm --entrypoint sh migrate /scripts/test.sh` | **All pass** |
| Unit tests (pricing, booking rules, geometry, messages, texts, CSV, earlier tests) | `docker compose exec web npm test` | **79/79 pass** |
| Types / lint | `npm run typecheck` · `npm run lint` (in `web`) | **Clean** |
| End-to-end (Playwright + axe) | `docker compose --profile test run --rm e2e` | **31/31 pass**: booking on a phone, EN and DE booking with email, two-browser race, invalid dates, admin phone booking, no admin without 2FA, Plattegrond hand-over, axe on all 11 public pages at phone width, plus the Prio 5 test tasks (post an event, block a plot, change a price), the inbox and reply, a role refusal, axe and 320 px reflow on 17 admin screens and all public pages, level 2 with cancelling through the manage link, Plekmatch (tips and the wheelchair rule), the reminder job and restoring from the history |

Only the Playwright screenshots have been looked at. Nobody has clicked through the new screens in a real browser yet.

## Known issues and notes

- **Compose Watch stops syncing after a container restart.** Before testing, run `node scripts/dev/check-sync.mjs --fix`.
- **Proxy matcher escaping:** it must read `.*\\..*`. With one backslash, only `/` runs through the proxy and every Dutch URL gives a 404. This cost a lot of time today and is now noted in CLAUDE.md.
- Vitest doesn't run on the Windows host; run it in the container.
- In dev mode the 404 page renders as Next's error document, so axe flags `html-has-lang`. Check this against a production build.
- **Compose Watch didn't sync at all in this session** (`docker compose watch` said "Watch enabled" and copied nothing). `node scripts/dev/check-sync.mjs --fix` after each edit works.
- In dev, the admin routes log `Date.now() while prerendering` from the Supabase client in `AdminShell`. It was there before Prio 5 (also on `/admin/2fa`), and `next build` passes.

## Fixed after the restart (17 November, evening)

After the machine restart the stack started normally and every check ran. The fixes:

- **The page scrolled sideways on a phone in the list view.** The `visually-hidden` text inside the table is absolutely positioned and escaped the scroll box of `.table-wrap`, so the page became 554 px wide on a 412 px screen. `.table-wrap` is now `position: relative`. The phone booking test checks that the page never gets wider than the screen.
- **Wide tables weren't reachable by keyboard** (axe `scrollable-region-focusable`). New `src/components/TableWrap.tsx`: a named region with `tabIndex=0`, used for all five tables.
- **The e2e service needed `node_modules` on the host**, which the Windows host doesn't have. It now installs its packages into its own volume and only reinstalls when `package-lock.json` changes.
- **Test fixes, not app bugs:** the EN/DE test clicked "continue" before the hold had landed; `Next` also matched the Next.js dev tools button (now `exact: true`); on a phone the cookie banner (z 50) sits over the bottom sheet (z 40), so the phone test answers it first, like a guest would.
- The cookie banner stays above the bottom sheet on purpose: putting the sheet on top would hide the banner's buttons from keyboard users (WCAG 2.4.11).
- `scripts/dev/check-sync.mjs` wasn't needed: starting with `docker compose up -d --build` gives a `web` container with the current files. Its error inside the container is still not looked at.

## Next steps

1. With Bert: the open answers in [handover.md](handover.md) ("Nog nodig van Bert"), the terrain walk-through (numbering, features, `checked`), prices and texts.
2. Native speakers check EN and DE, including the new Plekmatch, manage page and Facebook texts.
3. The manual accessibility pass (NVDA + Firefox, VoiceOver + Safari) and user test round 2 with the four test groups.
4. Set up the server (README, "Deploying"), run the restore test there and fill in the accounts table in handover.md.
