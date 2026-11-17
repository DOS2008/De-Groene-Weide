# Build progress – 17 November 2026

Where the build of Prio 2 to 8 ([mvp.md](mvp.md)) stands. Work stopped partway through Prio 5. Prio 2 is in `9ae0583`, and Prio 3, 4 and the start of Prio 5 are in `73a9ef8`, both on `feature/implementation-roadmap`. All checks pass (see *Tests*).

## Summary

| Prio | Status | Committed |
| --- | --- | --- |
| 1 Public website (NL) | Done earlier | Yes (`a2decbd`) |
| 2 Clickable site map | Done | Yes (`9ae0583`) |
| 3 Booking level 1 + minimal admin | Built. All database and e2e tests pass | Yes (`73a9ef8`) |
| 4 English and German | Built. Native-speaker check still to do | Yes (`73a9ef8`) |
| 5 Admin panel for content | Built. All database, unit and e2e tests pass | Yes |
| 6 Booking level 2 + launch hardening | Not started (the DB function already supports level 2) | – |
| 7 Shoulds | Not started | – |
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

## Tests and how far they are verified

| Check | Command | Last result (17 November, late evening) |
| --- | --- | --- |
| Database rules: double booking, holds, dates, blocks, phone booking, roles, content roles, last admin, 3-way race | `docker compose run --rm --entrypoint sh migrate /scripts/test.sh` | **All pass** |
| Unit tests (pricing, booking rules, geometry, messages, texts, CSV, earlier tests) | `docker compose exec web npm test` | **65/65 pass** |
| Types / lint | `npm run typecheck` · `npm run lint` (in `web`) | **Clean** |
| End-to-end (Playwright + axe) | `docker compose --profile test run --rm e2e` | **25/25 pass**: booking on a phone, EN and DE booking with email, two-browser race, invalid dates, admin phone booking, no admin without 2FA, Plattegrond hand-over, axe on all 11 public pages at phone width, plus the Prio 5 test tasks (post an event, block a plot, change a price), the inbox and reply, a role refusal and axe on 17 admin screens |

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

1. Prio 5 admin screens, in the order given in mvp.md.
2. Prio 6: the booking level switch in settings, the manage link page (`manageLinkParagraph` is a stub), security headers, a retention job, and backup and restore.
3. Prio 7: Plekmatch (the `Plekmatch` slot in `BookingFlow` is ready), the reminder email, the audit log, the review button and Facebook.
