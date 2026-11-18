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

   HTTPS comes from a reverse proxy. With **Nginx Proxy Manager** (the server's own proxy, on the external network `npm_shared`), add two proxy hosts: `SITE_DOMAIN` → `groene-weide-web` port `3000`, and `API_DOMAIN` → `groene-weide-api` port `8000` with *Websockets Support* on. Request a Let's Encrypt certificate for both. On a server **without** a proxy, use the built-in Caddy instead: add `--profile caddy` to every command, and remove the `npm_shared` network from `compose.prod.yaml` and `infra/supabase.prod.yml`.

5. Create Bert's account (prints a one-time password; 2FA is set up on the first login):

   ```sh
   docker compose -f compose.prod.yaml exec web node create-staff.ts bert@example.nl "Bert" admin
   ```

   In Portainer: open a *Console* on the web container (`/bin/sh`) and run `node create-staff.ts bert@example.nl "Bert" admin`.

   Invite everyone else from *Gebruikers & rollen*. Add a second admin, so Bert's 2FA can be reset if he loses his phone.

6. To update, run `git pull` and then the same command.

The stack also starts:

- `cron`, which calls `/api/jobs` every 15 minutes with `JOBS_SECRET` (mail retries, reminders, farewell mails);
- `backup`, which writes a nightly database dump and a copy of the photos to the `backups` volume (14 kept). Copy them off the server: `docker cp <project>-backup-1:/backups ./backups` (the project is `groene-weide`, or the stack name in Portainer). The restore test is `docker compose -f compose.prod.yaml run --rm backup sh /scripts/restore-check.sh`.

The server stack mounts nothing from the repository. Config files, migrations and scripts are copied into images at build time (`infra/supabase.prod.yml`, `x-db-tools-build` in `compose.prod.yaml`), so a change to them needs `--build`.

### Deploying with Portainer

Add a stack from a **Repository**: the repository URL, the branch as reference (`refs/heads/main`), and `compose.prod.yaml` as compose path. Paste the variables from a fresh `.env` (made with `scripts/init-env.sh`, server values filled in) in *Advanced mode*, without comment lines or quotes. Portainer builds the images itself. To update, use *Pull and redeploy*.

Portainer itself usually publishes port 8000 (Edge agents), so set `API_GW_HTTP_PORT` to a free port, for example `8100`. It is only the local port for an SSH tunnel to Studio; Nginx Proxy Manager reaches the gateway at `groene-weide-api:8000` either way. The same goes for `POOLER_PROXY_PORT_TRANSACTION` (6543). Don't change `POSTGRES_PORT`: the services inside the stack also use it to reach the database. If the server's port 5432 is taken, the pooler's host port needs its own setting.

If a deploy fails halfway, Portainer doesn't save the stack. Its containers then show up as a stack with *Limited* control: remove that stack and its volumes (`docker volume ls`, names start with the stack name) and deploy again.

The handover checklist (accounts, recurring tasks, emergency plan) is [docs/handover.md](docs/handover.md); the one-page manual for Bert is [docs/manual.md](docs/manual.md).

Only ports 80 and 443 are open to the outside. To reach the Studio dashboard, use `https://<API_DOMAIN>` with the dashboard login, or an SSH tunnel to port 8000.

## Upgrading Supabase

[infra/supabase/](infra/supabase/) is an unchanged copy of the official `docker/` folder from the Supabase repository. To upgrade, replace the folder with a newer copy, update `UPSTREAM.txt`, and check the upstream `CHANGELOG.md`. Our own changes are in `infra/supabase.override.yml` and `infra/supabase.prod.yml`. The `FROM` lines in `infra/supabase.prod.yml` (and `x-db-tools-build` in `compose.prod.yaml`) repeat image tags from the upstream `docker-compose.yml`: update them to the new tags, and check that the copied files still have the same names.
