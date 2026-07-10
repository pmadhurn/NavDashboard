#!/usr/bin/env bash
set -uo pipefail
APP=http://localhost:8080
TOKEN=$(curl -sS -X POST "$APP/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@navdashboard.com","password":"admin123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
AUTH="Authorization: Bearer $TOKEN"

echo "--- GET endpoints ---"
for path in downloads/ downloads/categories assets/ assets/categories assets/reports projects/ finance/ finance/summary auth/users/pending auth/users/basic ai/health; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$APP/api/v1/$path" -H "$AUTH")
  echo "GET /$path -> $code"
done

echo "--- create asset ---"
curl -sS -X POST "$APP/api/v1/assets/" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Test Cable","item_kind":"BULK","quantity":5}' \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("asset_code"),d.get("name"),d.get("status"))'

echo "--- create project ---"
PROJECT_ID=$(curl -sS -X POST "$APP/api/v1/projects/" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Test POC","project_type":"POC"}' \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["id"])')
echo "project: $PROJECT_ID"

echo "--- log timeline entry ---"
curl -sS -X POST "$APP/api/v1/projects/$PROJECT_ID/timeline" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"entry_type":"CALL","title":"Client called about the demo"}' \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("timeline:",d.get("entry_type"),d.get("title"))'

echo "--- get timeline ---"
curl -sS "$APP/api/v1/projects/$PROJECT_ID/timeline" -H "$AUTH" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("entries:",[i["title"] for i in d["items"]])'

echo "--- create expense linked to project ---"
curl -sS -X POST "$APP/api/v1/finance/" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Smoke taxi\",\"amount\":450,\"project_id\":\"$PROJECT_ID\"}" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("expense:",d.get("title"),d.get("amount"))'

echo "--- finance summary ---"
curl -sS "$APP/api/v1/finance/summary" -H "$AUTH" | python3 -m json.tool

echo "--- create limited user (VIEWER, no finance) and test 403 ---"
curl -sS -X POST "$APP/api/v1/auth/register" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"email":"viewer@test.com","username":"viewertest","password":"viewer123","full_name":"Viewer Test","role":"VIEWER"}' > /dev/null
VTOKEN=$(curl -sS -X POST "$APP/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"viewer@test.com","password":"viewer123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
for path in "finance/" "projects/" "devices/"; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$APP/api/v1/$path" -H "Authorization: Bearer $VTOKEN")
  echo "viewer GET /$path -> $code"
done
