#!/usr/bin/env bash
set -uo pipefail
APP=http://localhost:8080
TOKEN=$(curl -sS -X POST "$APP/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@navdashboard.com","password":"admin123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
AUTH="Authorization: Bearer $TOKEN"

echo "--- downloads: upload a file with a new category ---"
echo "hello nav team v1" > /tmp/nav-smoke.txt
ITEM=$(curl -sS -X POST "$APP/api/v1/downloads/upload" -H "$AUTH" \
  -F "file=@/tmp/nav-smoke.txt" -F "title=Smoke Manual" -F "new_category=Manuals" \
  -F "item_type=SOFTWARE" -F "version_label=v1.0")
echo "$ITEM" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("item:",d["title"],"| category:",d["category"]["name"],"| versions:",[v["version_label"] for v in d["versions"]])'
ITEM_ID=$(echo "$ITEM" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
VER_ID=$(echo "$ITEM" | python3 -c 'import sys,json;print(json.load(sys.stdin)["versions"][0]["id"])')

echo "--- downloads: add v2 to same item ---"
echo "hello nav team v2" > /tmp/nav-smoke2.txt
curl -sS -X POST "$APP/api/v1/downloads/upload" -H "$AUTH" \
  -F "file=@/tmp/nav-smoke2.txt" -F "existing_item_id=$ITEM_ID" -F "version_label=v2.0" \
  -F "item_type=SOFTWARE" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("versions now:",[v["version_label"] for v in d["versions"]])'

echo "--- downloads: download the file back ---"
curl -sS "$APP/api/v1/downloads/versions/$VER_ID/download" -H "$AUTH"

echo "--- documents: upload + share link + anonymous download ---"
DOC=$(curl -sS -X POST "$APP/api/v1/documents/upload" -H "$AUTH" -F "file=@/tmp/nav-smoke.txt")
DOC_ID=$(echo "$DOC" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
LINK=$(curl -sS -X POST "$APP/api/v1/documents/$DOC_ID/share-link" -H "$AUTH" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["url"])')
echo "share link: ${LINK:0:60}..."
echo -n "anonymous download: " && curl -sS "$APP$LINK"

echo "--- equipment: send asset to project, receive back damaged ---"
ASSET_ID=$(curl -sS "$APP/api/v1/assets/?search=Smoke" -H "$AUTH" | python3 -c 'import sys,json;print(json.load(sys.stdin)["items"][0]["id"])')
PROJECT_ID=$(curl -sS "$APP/api/v1/projects/?search=Smoke" -H "$AUTH" | python3 -c 'import sys,json;print(json.load(sys.stdin)["items"][0]["id"])')
MOVE=$(curl -sS -X POST "$APP/api/v1/projects/$PROJECT_ID/movements" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"direction\":\"OUTWARD\",\"received_by_name\":\"Field team\",\"items\":[{\"asset_id\":\"$ASSET_ID\"}]}")
echo "$MOVE" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("outward items:",[(i["asset"]["asset_code"],i["item_status"]) for i in d["items"]])'
ITEM_MOVE_ID=$(echo "$MOVE" | python3 -c 'import sys,json;print(json.load(sys.stdin)["items"][0]["id"])')
curl -sS "$APP/api/v1/assets/$ASSET_ID" -H "$AUTH" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("asset after outward:",d["status"])'
curl -sS -X PUT "$APP/api/v1/projects/movements/items/$ITEM_MOVE_ID" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"item_status":"DAMAGED","condition_note":"cracked casing"}' > /dev/null
curl -sS "$APP/api/v1/assets/$ASSET_ID" -H "$AUTH" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("asset after damaged return:",d["status"])'
curl -sS "$APP/api/v1/assets/$ASSET_ID/history" -H "$AUTH" | python3 -c 'import sys,json;print("history:",[(h["event_type"],h["new_status"]) for h in json.load(sys.stdin)])'
curl -sS "$APP/api/v1/projects/$PROJECT_ID/timeline" -H "$AUTH" | python3 -c 'import sys,json;print("timeline:",[i["title"][:50] for i in json.load(sys.stdin)["items"]])'
