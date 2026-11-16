#!/bin/sh
#
# Creates .env for docker compose: the official Supabase settings plus our app
# settings, with fresh secrets. Run once per machine (dev laptop or server):
#
#   sh scripts/init-env.sh
#
# Needs openssl (included in Git Bash, WSL, macOS and Linux).

set -e
cd "$(dirname "$0")/.."

if [ -f .env ]; then
    echo ".env already exists. Delete it first to start over."
    echo "Note: new secrets don't match an existing database. Also run: docker compose down -v"
    exit 1
fi

cat infra/supabase/.env.example .env.app.example > .env

# Project defaults on top of the upstream example.
sed -i.bak \
    -e '/^COMPOSE_FILE=/d' \
    -e 's|^DISABLE_SIGNUP=.*|DISABLE_SIGNUP=true|' \
    -e 's|^ENABLE_PHONE_SIGNUP=.*|ENABLE_PHONE_SIGNUP=false|' \
    -e 's|^SMTP_HOST=.*|SMTP_HOST=mailpit|' \
    -e 's|^SMTP_PORT=.*|SMTP_PORT=1025|' \
    -e 's|^SMTP_SENDER_NAME=.*|SMTP_SENDER_NAME=De Groene Weide|' \
    -e 's|^POOLER_TENANT_ID=.*|POOLER_TENANT_ID=groene-weide|' \
    -e 's|^STUDIO_DEFAULT_ORGANIZATION=.*|STUDIO_DEFAULT_ORGANIZATION=De Groene Weide|' \
    -e 's|^STUDIO_DEFAULT_PROJECT=.*|STUDIO_DEFAULT_PROJECT=De Groene Weide|' \
    -e 's|^OPENAI_API_KEY=.*|OPENAI_API_KEY=|' \
    .env
rm -f .env.bak

# Fresh secrets and API keys (official Supabase script).
sh infra/supabase/utils/generate-keys.sh --update-env > /dev/null
rm -f .env.old

echo "Created .env with fresh secrets."
echo "Dashboard login: see DASHBOARD_USERNAME and DASHBOARD_PASSWORD in .env"
