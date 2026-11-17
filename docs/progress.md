# Build progress – 17 November 2026

Where the build of Prio 2 to 8 ([mvp.md](mvp.md)) stands. Work stopped partway through Prio 5. Only Prio 2 is committed (`9ae0583`); everything after that is in the working tree, uncommitted, on `feature/implementation-roadmap`.

## Summary

| Prio | Status | Committed |
| --- | --- | --- |
| 1 Public website (NL) | Done earlier | Yes (`a2decbd`) |
| 2 Clickable site map | Done | Yes (`9ae0583`) |
| 3 Booking level 1 + minimal admin | Built. Database tests pass; e2e partly green | No |
| 4 English and German | Built. Native-speaker check still to do | No |
| 5 Admin panel for content | Started: database, seed and loaders only, no admin screens | No |
| 6 Booking level 2 + launch hardening | Not started (the DB function already supports level 2) | – |
| 7 Shoulds | Not started | – |
| 8 Coulds | Skipped on purpose: only when Bert asks for them | – |

## Prio 2 – Clickable site map (committed)

- **Database:** migrations in `supabase/migrations/`, seed in `supabase/seed/`. A one-shot `migrate` service applies both on every `docker compose up`, in dev and on the server. Tables `plots`, `facilities`, `plot_distances`, `price_groups` and `profiles`, plus the `auth_role()` / `has_role()` helpers. These only return a role after 2FA (`aal2`).
- **60 placeholder plots** (T1–T40, C1–C12, S1–S8), all `checked = false`. Their features are examples until the walk-through with Bert.
- **Map drawing** in `src/content/map/terrain.svg`. `npm run import-map` computes positions and distances from it (`src/lib/map/geometry.ts`, unit tested) and writes `supabase/seed/03_map.sql`.
- **Map component** (`src/components/map/SiteMap.tsx`), built from the hi-fi design. Every plot is a `<button>` with an `aria-label`, and each state has a colour plus a pattern or icon. There is a legend, zoom, arrow-key navigation, filters, a list view, and a detail panel that becomes a bottom sheet on phones.
- **Plattegrond page** in explore mode. Facility links (`/plattegrond#pool`) open that facility, and "Is deze plek vrij?" carries the plot over into booking.

## Prio 3 – Booking level 1 + minimal admin (uncommitted)

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

## Prio 4 – English and German (uncommitted)

- `messages/en.json` and `messages/de.json` are complete. `src/lib/messages.test.ts` fails on a missing key, a different placeholder or an empty text, and **passes**.
- All content in `src/content` now has EN and DE. Jokes, the 404 title and other funny lines are written per language, not translated.
- `/en` and `/de` are switched on (`src/i18n/routing.ts`), with their own slugs, a language switcher in the header that stays on the same page, and hreflang and sitemap entries.
- The seed fills empty EN and DE columns without overwriting edits from the admin panel.
- **Still to do:** native speakers check the texts and the humour (mvp.md, Prio 4 step 7).

## Prio 5 – Admin panel for content (started)

Done:
- `0003_content.sql`: `events`, `jokes`, `messages`, `texts` (overrides for UI texts), `media` with the `media` storage bucket, RLS, `staff_overview()` and the `missing_translations` view. Applied in dev.
- The seed copies events, jokes and a `site` settings row (contact, reception hours, notice) from `src/content`.
- `src/lib/data/content.ts`: cached loaders that return the same shapes as `src/content`, with the files as fallback. Home, Activities, Events, Contact, Reserveren, the footer and the notice banner now read through them.

Not done:
- All admin screens: events, settings, messages inbox, editing plots and facilities, prices and seasons, pages and texts, media, users and roles, the bookings calendar, and the Excel/CSV export.
- The contact form doesn't store messages in `messages` yet.
- UI text overrides aren't merged into next-intl yet.
- Over ons still reads `src/content/about.ts`.
- RLS tests for the new tables.

## Tests and how far they are verified

| Check | Command | Last result |
| --- | --- | --- |
| Database rules: double booking, holds, dates, blocks, phone booking, roles, 3-way race | `docker compose run --rm --entrypoint sh migrate /scripts/test.sh` | **All pass** |
| Unit tests (pricing, booking rules, geometry, messages, earlier tests) | `docker compose exec web npm test` | Passed per file; not re-run as a full suite after the last edits |
| Types / lint | `npm run typecheck` · `npm run lint` | Clean before the Prio 5 loader switch; type check after it printed no errors, but this wasn't double-checked |
| End-to-end (Playwright + axe) | `docker compose --profile test run --rm e2e` | Last run, interrupted: passed without-2FA redirect, date errors, **two-browser race (one winner)**, Plattegrond hand-over and axe on 3 pages. Failed: phone booking, EN/DE booking and the admin phone booking. That run overlapped with my edits to the pages, so these failures may not be real. **Re-run before committing.** |

I couldn't check anything visually: the Chrome extension wasn't connected. Nobody has looked at the new screens in a browser yet.

## Known issues and notes

- **Compose Watch stops syncing after a container restart.** Before testing, run `node scripts/dev/check-sync.mjs --fix`.
- **Proxy matcher escaping:** it must read `.*\\..*`. With one backslash, only `/` runs through the proxy and every Dutch URL gives a 404. This cost a lot of time today and is now noted in CLAUDE.md.
- Vitest doesn't run on the Windows host; run it in the container.
- In dev mode the 404 page renders as Next's error document, so axe flags `html-has-lang`. Check this against a production build.
- The admin nav only links to screens that exist (`ADMIN_ROUTES` in `src/app/admin/AdminShell.tsx`). Extend it as Prio 5 screens are added.

## Where work stopped (end of 17 November)

Nothing changed in the code after the sections above. The rest of the day went into getting a test run, and none got through:

- **The host machine ran out of memory:** about 400 MB free of 16 GB, with 2.2 GB of compressed memory. `docker ps` took 10–90 s, and one `docker exec` into `web` took 72 s. Docker Desktop was restarted, but the containers still showed "Up 5–7 hours", so the VM itself didn't restart. The user is restarting the whole machine.
- **`scripts/dev/check-sync.mjs`** replaces the old `check-sync.sh`, which had a syntax error. Its first run failed inside the container: the output ended in a Node stack trace, and the full error is not looked at yet. The last run of the old `.sh` reported `supabase/migrations/0003_content.sql` and `supabase/seed/02_content.sql` as out of sync in the container. `supabase/` is in the watch ignore list, so that may be expected; check it.
- No unit test, type check, lint or e2e run happened after the Prio 5 loader switch.

### Resume here

From `C:\dev\De-Groene-Weide`, with an uppercase `C:`, in PowerShell:

1. Start the stack with `docker compose up --watch`. Check that `docker ps` answers within a few seconds. If memory is still tight, stop the Supabase services the tests don't need (`studio`, `functions`, `realtime`, `imgproxy`).
2. Run `node scripts/dev/check-sync.mjs --fix` and fix its error inside the container first. Until then, `docker compose up --build web` gives a container with the current files.
3. In the `web` container, one at a time: `npm run typecheck`, then `npm run lint`, then `npm test`.
4. Run the database tests: `docker compose run --rm --entrypoint sh migrate /scripts/test.sh`.
5. Run the e2e tests: `docker compose --profile test run --rm e2e`. The ones to watch failed last time: the phone booking, the EN/DE booking and the admin phone booking.
6. Fix the real failures, then commit Prio 3 and Prio 4, separately if possible, and update the tests table above.

## Next steps

1. See "Resume here" above.
2. Prio 5 admin screens, in the order given in mvp.md.
3. Prio 6: the booking level switch in settings, the manage link page (`manageLinkParagraph` is a stub), security headers, a retention job, and backup and restore.
4. Prio 7: Plekmatch (the `Plekmatch` slot in `BookingFlow` is ready), the reminder email, the audit log, the review button and Facebook.
