#!/usr/bin/env bash
# Full NavOS regression across phases A–G.
set -uo pipefail
APP=http://localhost:8080
pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; FAILED=1; }
FAILED=0

ADMIN=$(curl -sS -X POST "$APP/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@navdashboard.com","password":"admin123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
A="Authorization: Bearer $ADMIN"

check() { # name method path expected
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' -X "$2" "$APP/api/v1$3" -H "$A")
  [ "$code" = "$4" ] && pass "$1 ($code)" || fail "$1 (got $code, want $4)"
}

echo "── A: shell & landing"
check "GET /dashboard/home" GET /dashboard/home 200

echo "── B: people unified"
check "POST /personnel/backfill-links" POST /personnel/backfill-links 200
curl -sS "$APP/api/v1/personnel/?size=1" -H "$A" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);p=d["items"][0];print("  ✓ person linked to login" if p.get("user_id") else "  ✗ person NOT linked")'

echo "── C: device↔inventory↔deployed"
check "POST /assets/backfill-devices" POST /assets/backfill-devices 200
check "GET  /assets/deployed"        GET  /assets/deployed 200
curl -sS "$APP/api/v1/assets/?source=device&size=1" -H "$A" \
  | python3 -c 'import sys,json;print("  ✓", json.load(sys.stdin)["total"], "device mirrors in inventory")'

echo "── D: outward conflict engine"
PID=$(curl -sS "$APP/api/v1/projects/?size=1" -H "$A" | python3 -c 'import sys,json;print(json.load(sys.stdin)["items"][0]["id"])')
SW=$(curl -sS -X POST "$APP/api/v1/assets/" -H "$A" -H 'Content-Type: application/json' \
  -d '{"name":"Regression Switch","item_kind":"BULK","quantity":1}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
curl -sS -X POST "$APP/api/v1/projects/$PID/outward/preview" -H "$A" -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"asset_id\":\"$SW\",\"quantity\":5}]}" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("  ✓ over-issue flagged INSUFFICIENT" if d["has_conflicts"] and d["lines"][0]["conflict"]=="INSUFFICIENT" else "  ✗ conflict not detected")'
code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$APP/api/v1/projects/$PID/outward" -H "$A" -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"asset_id\":\"$SW\",\"quantity\":5}]}")
[ "$code" = "400" ] && pass "unconfirmed over-issue refused (400)" || fail "over-issue not refused (got $code)"

echo "── E: finance advances/claims/settlement"
check "GET /finance/my"         GET /finance/my 200
check "GET /finance/settlement" GET /finance/settlement 200
check "GET /finance/claims"     GET /finance/claims 200
check "GET /finance/advances"   GET /finance/advances 200

echo "── F: export engine"
for fmt in pdf xlsx zip; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$APP/api/v1/finance/export?format=$fmt" -H "$A")
  [ "$code" = "200" ] && pass "export $fmt" || fail "export $fmt ($code)"
done
code=$(curl -sS -o /dev/null -w '%{http_code}' "$APP/api/v1/finance/export?format=pdf&include_images=true" -H "$A")
[ "$code" = "200" ] && pass "export pdf+receipt images" || fail "export pdf+images ($code)"

echo "── permission boundary (viewer: finance VIEW only)"
VT=$(curl -sS -X POST "$APP/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"viewer@test.com","password":"viewer123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))' 2>/dev/null)
if [ -n "$VT" ]; then
  c1=$(curl -sS -o /dev/null -w '%{http_code}' "$APP/api/v1/finance/my" -H "Authorization: Bearer $VT")
  c2=$(curl -sS -o /dev/null -w '%{http_code}' "$APP/api/v1/finance/settlement" -H "Authorization: Bearer $VT")
  [ "$c1" = "200" ] && pass "viewer sees own finance" || fail "viewer own finance ($c1)"
  [ "$c2" = "403" ] && pass "viewer blocked from settlement" || fail "viewer settlement not blocked ($c2)"
fi

echo
[ $FAILED -eq 0 ] && echo "ALL CHECKS PASSED" || { echo "SOME CHECKS FAILED"; exit 1; }
