#!/usr/bin/env bash
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."

if [[ "$(git remote get-url origin)" != 'https://github.com/tungnv107/dongquy.git' ]]; then
  echo 'Unexpected deployment repository' >&2
  exit 1
fi
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo 'Working tree has local changes; refusing to overwrite them' >&2
  exit 1
fi
git pull --ff-only origin main

if [[ ! -f .env.production ]]; then
  python3 - <<'PY'
import os
import secrets
from pathlib import Path
owner, app = secrets.token_hex(32), secrets.token_hex(32)
env = '\n'.join([
    'DOMAIN=dongquy.online',
    'APP_PORT=3004',
    'NPM_NETWORK=npm_proxy',
    f'DB_OWNER_PASSWORD={owner}',
    f'DB_APP_PASSWORD={app}',
    f'MIGRATION_DATABASE_URL=postgresql://dongquy_owner:{owner}@db:5432/dongquy?schema=public',
    f'DATABASE_URL=postgresql://dongquy_app:{app}@db:5432/dongquy?schema=public',
    'GOOGLE_CLIENT_ID=',
    'GOOGLE_CLIENT_SECRET=',
    'BANK_WEBHOOK_SECRET=',
]) + '\n'
fd = os.open('.env.production', os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as output:
    output.write(env)
PY
fi
chmod 600 .env.production
docker network inspect npm_proxy >/dev/null
compose=(docker compose -f compose.npm.yml --env-file .env.production)
"${compose[@]}" config --quiet
"${compose[@]}" build app migrate
"${compose[@]}" up -d app
for attempt in $(seq 1 40); do
  if curl --fail --silent http://127.0.0.1:3004/api/health >/dev/null; then
    break
  fi
  sleep 3
done
curl --fail --silent http://127.0.0.1:3004/api/health
printf '\nDeployed commit: '
git rev-parse HEAD
"${compose[@]}" ps
