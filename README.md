# De Groene Weide Online

Website and admin panel for De Groene Weide, Bert's family campsite on a farm. The plan is in [Plan.md](Plan.md), and the build order is in [docs/mvp.md](docs/mvp.md).

**Stack:** Next.js + self-hosted Supabase, all in Docker. The reasons are in [docs/decisions/0001-stack-nextjs-supabase-docker.md](docs/decisions/0001-stack-nextjs-supabase-docker.md).

## Development

You need Docker Desktop and Git Bash (or WSL, macOS, Linux).

```sh
sh scripts/init-env.sh        # once: creates .env with fresh secrets
docker compose up --watch     # starts everything, with live reload
```

| What | URL |
| --- | --- |
| Website | http://localhost:3000 |
| Supabase API and Studio dashboard | http://localhost:8000 (login: `DASHBOARD_USERNAME` and `DASHBOARD_PASSWORD` in `.env`) |
| Mail catcher (every email sent in development) | http://localhost:8025 |
| Postgres (local tools only) | `127.0.0.1:5432`, user `postgres.groene-weide`, password `POSTGRES_PASSWORD` in `.env` |

When you save a file in `src/`, the change shows up in the browser right away. When you change `package.json`, the web container is rebuilt automatically.

Other commands:

```sh
docker compose up -d                    # start in the background, without live reload
docker compose logs -f web              # follow the website logs
docker compose down                     # stop everything (the data stays)
docker compose down -v                  # stop and delete all data (database, uploads)
docker compose exec web npm run lint
docker compose exec web npm run typecheck
docker compose exec web npm test        # unit tests (Vitest)
```

`docker compose up --watch` keeps the container in sync. If you started the stack without `--watch`, run `docker compose watch web --no-up` in a second terminal.

### Content and placeholders

Site texts are in `messages/nl.json`. Facilities, events, jokes, prices and contact details are in `src/content/`. Anything Bert still has to supply (address, phone, prices, times) is `null` or written as `[…]` there, and the site shows it as a marked placeholder. Search for `[` and `null` in `src/content/` to find them.

### Troubleshooting on Windows

**The build stops with `failed to execute bake: exit status 1`.** Your terminal's path probably starts with a lowercase `c:\` (VS Code sometimes opens it that way), and Docker Compose then refuses to read the Dockerfile. Switch to the uppercase path and try again:

```powershell
cd C:\dev\De-Groene-Weide
```

**Saved changes don't show up in the browser.** Nothing is syncing your files into the container. In VS Code, the task "Sync files to Docker" ([.vscode/tasks.json](.vscode/tasks.json)) starts `docker compose watch` when you open the folder (allow automatic tasks once when VS Code asks). You can also start it by hand with Terminal → Run Task. If `docker compose watch` says `cannot take exclusive lock … process with PID … is still running`, an earlier watch died and left a lock behind. Delete `%LOCALAPPDATA%\docker-compose\groene-weide.pid` and start it again (the VS Code task does this for you).

## Deploying

The server stack is [compose.prod.yaml](compose.prod.yaml): the production website, Supabase and Caddy for HTTPS.

1. Get an EU server with Docker, at least 4 GB of RAM, in Bert's or the campsite's name.
2. Point two DNS records at the server, for example `degroeneweide.nl` and `api.degroeneweide.nl`.
3. Clone the repository and run `sh scripts/init-env.sh`. Then edit `.env`:
   - `SITE_DOMAIN` and `API_DOMAIN`
   - `SITE_URL=https://<SITE_DOMAIN>`
   - `SUPABASE_PUBLIC_URL=https://<API_DOMAIN>`
   - `API_EXTERNAL_URL=https://<API_DOMAIN>/auth/v1`
   - the `SMTP_*` values for a real EU mail provider
   - `CONTACT_EMAIL`, the inbox that receives the contact form
4. Start it:

   ```sh
   docker compose -f compose.prod.yaml up -d --build
   ```

5. Create Bert's account (prints a one-time password; 2FA is set up on the first login):

   ```sh
   docker compose -f compose.prod.yaml run --rm --no-deps \
     -v ./scripts/create-staff.ts:/app/create-staff.ts:ro \
     web node create-staff.ts bert@example.nl "Bert" admin
   ```

   Invite everyone else from *Gebruikers & rollen*. Add a second admin, so Bert's 2FA can be reset if he loses his phone.

6. To update, run `git pull` and then the same command.

The stack also starts:

- `cron`, which calls `/api/jobs` every 15 minutes with `JOBS_SECRET` (mail retries, reminders, farewell mails);
- `backup`, which writes a nightly database dump and a copy of the photos to `./backups` (14 kept). Copy that folder off the server. The restore test is `docker compose -f compose.prod.yaml run --rm backup sh /scripts/restore-check.sh`.

The handover checklist (accounts, recurring tasks, emergency plan) is [docs/handover.md](docs/handover.md); the one-page manual for Bert is [docs/manual.md](docs/manual.md).

Only ports 80 and 443 are open to the outside. To reach the Studio dashboard, use `https://<API_DOMAIN>` with the dashboard login, or an SSH tunnel to port 8000.

## Upgrading Supabase

[infra/supabase/](infra/supabase/) is an unchanged copy of the official `docker/` folder from the Supabase repository. To upgrade, replace the folder with a newer copy, update `UPSTREAM.txt`, and check the upstream `CHANGELOG.md`. Our own changes are in `infra/supabase.override.yml` and `infra/supabase.prod.yml`.
