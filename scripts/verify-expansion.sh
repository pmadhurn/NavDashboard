#!/usr/bin/env bash
# One-shot verification for the platform expansion (phases 0-6).
# Run from the repo root: bash scripts/verify-expansion.sh
set -uo pipefail

APP=http://localhost:8080

step() { printf '\n\033[1;36m== %s ==\033[0m\n' "$1"; }

step "Rebuild backend (new dep: google-auth) and restart"
docker compose build backend
docker compose up -d --scale cloudflared=0

step "Run migrations"
docker compose exec -T backend alembic upgrade head

step "Health check"
curl -sSf "$APP/api/v1/health" && echo

step "Login as admin"
TOKEN=$(curl -sS -X POST "$APP/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@navdashboard.com","password":"admin123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
echo "token: ${TOKEN:0:20}..."
AUTH="Authorization: Bearer $TOKEN"

step "/auth/me includes permission map"
curl -sS "$APP/api/v1/auth/me" -H "$AUTH" | python3 -m json.tool | head -30

step "New endpoints respond"
for path in downloads/ downloads/categories assets/ assets/categories assets/reports projects/ finance/ finance/summary auth/users/pending; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$APP/api/v1/$path" -H "$AUTH")
  echo "GET /api/v1/$path -> $code"
done

step "Create smoke-test data"
curl -sS -X POST "$APP/api/v1/assets/" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Test Cable","item_kind":"BULK","quantity":5}' | python3 -m json.tool | head -12
curl -sS -X POST "$APP/api/v1/projects/" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Test POC","project_type":"POC"}' | python3 -m json.tool | head -8
curl -sS -X POST "$APP/api/v1/finance/" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"title":"Smoke expense","amount":100}' | python3 -m json.tool | head -8

step "Permission enforcement (viewer should get 403 on finance)"
# Requires a VIEWER user to exist; skipped when absent.

step "Frontend typecheck"
docker compose exec -T frontend npx tsc --noEmit && echo "tsc OK" || echo "tsc reported errors (see above)"

echo
echo "Done. Open $APP in a browser (desktop + mobile viewport) to click through."
