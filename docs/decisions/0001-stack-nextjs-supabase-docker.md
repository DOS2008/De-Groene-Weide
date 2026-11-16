# 0001 – Stack: Next.js + Supabase, self-hosted in Docker

- **Status:** accepted
- **Date:** 2026-11-16
- **Replaces:** the stack proposal in Plan.md (*Techniek en gegevens*) and the hosting rows of the *Assumed stack* table in [roadmap.md](../roadmap.md)

## Decision

| Layer | Choice |
| --- | --- |
| Website and admin panel | **Next.js** (App Router, TypeScript), server-side rendering |
| Database, login, files | **Supabase**, the official self-hosted Docker setup (PostgreSQL 17, Auth, PostgREST, Storage, Studio) |
| Running it | **Docker Compose**, for development and on the server. Everything is self-hosted, with no managed cloud services |
| HTTPS on the server | **Caddy** with automatic Let's Encrypt certificates |
| Email in development | **Mailpit**, which catches every email locally |

## Why

The choice follows from four hard rules in CLAUDE.md and Plan.md.

1. **No double bookings, enforced by the database.** PostgreSQL has date-range types and exclusion constraints (`EXCLUDE USING gist (plot_id WITH =, stay WITH &&)`). The database itself refuses overlapping stays, even when two guests click at the same moment. MySQL has neither, so you'd need a one-row-per-night workaround that makes holds, changes and cancellations clumsy.
2. **Role access enforced in the database.** PostgreSQL has row-level security (RLS). Supabase links RLS to the logged-in user, their role and their 2FA level (`aal2`). MySQL only has permissions per table or column, so you can't give reception, animation and seasonal workers different rows without building it yourself.
3. **Admin accounts use 2FA.** Supabase Auth includes TOTP (authenticator app) out of the box. With plain PostgreSQL the team would have to build login, 2FA, password reset and invites itself, and there is no dedicated backend person on the team (Plan.md, *Risico's*).
4. **SEO in three languages, and one codebase for the site and the admin panel.** Next.js renders pages on the server, so Google reads complete HTML, with a URL per language. The booking actions, emails and admin panel live in the same project.

### Alternatives considered

| Option | Why not |
| --- | --- |
| Plain HTML/CSS | Fine for static pages, but booking, the map with availability, login and the admin panel all need a server, so you'd end up with two projects. |
| Plain React (SPA) | Pages are built in the browser, which is weaker for SEO. It also still needs a separate backend. Next.js *is* React, with the server part included. |
| MySQL | It can't enforce the two database rules above cleanly. |
| Plain PostgreSQL | It meets the database rules, but the team would build login, 2FA, file storage and an admin view itself. Supabase is PostgreSQL with those parts included. |
| Managed Supabase + Vercel (the earlier proposal) | Replaced by self-hosting, so everything runs in Docker under the campsite's own control, the same way on a laptop and on the server. |
| WordPress with a booking plugin | Plan.md's fallback for booking level 1. Plot choice on our own drawn map and Plekmatch would be hard, and we'd depend on the plugin. |

## How it is set up

- [compose.yaml](../../compose.yaml) is the **development** stack. `docker compose up --watch` syncs code changes into the container, and Next.js Fast Refresh shows them right away. Compose Watch is used instead of a bind mount because file changes on a Windows drive don't reach a container reliably.
- [compose.prod.yaml](../../compose.prod.yaml) is the **server** stack, with the production Next.js image (`output: "standalone"`), Supabase and Caddy. Only ports 80 and 443 are open to the outside.
- [infra/supabase/](../../infra/supabase/) is an **unchanged copy** of the official `docker/` folder from the Supabase repository (the version is in `UPSTREAM.txt`). Our changes live in [infra/supabase.override.yml](../../infra/supabase.override.yml) and [infra/supabase.prod.yml](../../infra/supabase.prod.yml), so upgrading means replacing the folder with a newer upstream copy.
- [Dockerfile](../../Dockerfile) has two targets: `dev` and `runner`.

## Consequences

- **The team owns operations.** Self-hosting has no automatic backups, updates or monitoring. These become tasks: a nightly `pg_dump` copied off the server, regular image updates, and uptime monitoring. They belong in the launch hardening (Prio 6 in [mvp.md](../mvp.md)) and in the handover's list of recurring tasks.
- **Costs change.** Instead of Supabase Pro plus Vercel (Plan.md, *Budget*), there is one EU server. The Supabase stack needs about 4 GB of RAM, so a VPS with 4–8 GB is the target. That is an estimate to check against real prices, well under the €350 a month limit.
- **The server and the domain are registered in Bert's or the campsite's name**, as Plan.md requires.
- **Development needs Docker Desktop.** The full stack runs about 13 containers on a laptop.
- Edge Functions and Realtime are part of the upstream setup but aren't used yet. We use Next.js server code instead of Edge Functions.
