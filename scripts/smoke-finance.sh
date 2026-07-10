#!/usr/bin/env bash
# Phase E verification: advances → expenses → balance → claim → settle.
set -uo pipefail
APP=http://localhost:8080
TOKEN=$(curl -sS -X POST "$APP/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@navdashboard.com","password":"admin123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
AUTH="Authorization: Bearer $TOKEN"
JSON='Content-Type: application/json'

PERSON=$(curl -sS "$APP/api/v1/personnel/?size=1" -H "$AUTH" | python3 -c 'import sys,json;print(json.load(sys.stdin)["items"][0]["id"])')
echo "person (linked to admin login): $PERSON"

echo "--- log a 50,000 advance from office ---"
curl -sS -X POST "$APP/api/v1/finance/advances" -H "$AUTH" -H "$JSON" \
  -d "{\"person_id\":\"$PERSON\",\"amount\":50000,\"source_note\":\"Site trip float\"}" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("advance:",d["amount"],d["source_note"])'

echo "--- balance (advances - spent) ---"
curl -sS "$APP/api/v1/finance/balance/$PERSON" -H "$AUTH" | python3 -m json.tool

echo "--- add two expenses (Hotel 8000, Cab 2000) ---"
E1=$(curl -sS -X POST "$APP/api/v1/finance/" -H "$AUTH" -H "$JSON" \
  -d '{"title":"Hotel Mumbai","amount":8000,"category":"Hotel"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
E2=$(curl -sS -X POST "$APP/api/v1/finance/" -H "$AUTH" -H "$JSON" \
  -d '{"title":"Airport cab","amount":2000,"category":"Cab"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "expenses: $E1 $E2"

echo "--- balance after spending (should drop by 10,000 + earlier 450) ---"
curl -sS "$APP/api/v1/finance/balance/$PERSON" -H "$AUTH" | python3 -m json.tool

echo "--- my finance dashboard ---"
curl -sS "$APP/api/v1/finance/my" -H "$AUTH" | python3 -m json.tool

echo "--- team lead bundles both into a claim ---"
CLAIM=$(curl -sS -X POST "$APP/api/v1/finance/claims" -H "$AUTH" -H "$JSON" \
  -d "{\"title\":\"Mumbai site trip\",\"expense_ids\":[\"$E1\",\"$E2\"]}" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["id"])')
curl -sS "$APP/api/v1/finance/claims" -H "$AUTH" | python3 -c 'import sys,json;print("claims:",[(c["title"],c["status"],c["total"],c["expense_count"]) for c in json.load(sys.stdin)])'

echo "--- submit to finance ---"
curl -sS -X POST "$APP/api/v1/finance/claims/$CLAIM/submit" -H "$AUTH" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("status:",d["status"])'

echo "--- settlement dashboard (pending) ---"
curl -sS "$APP/api/v1/finance/settlement" -H "$AUTH" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("pending:",d["total_pending"],"paid:",d["total_paid"]);print("by_person:",[(p["name"],p["pending"],p["advances"],p["balance"]) for p in d["by_person"]])'

echo "--- finance marks the claim PAID (cascades to its expenses) ---"
curl -sS -X POST "$APP/api/v1/finance/claims/$CLAIM/settle" -H "$AUTH" -H "$JSON" -d '{"status":"PAID"}' \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("claim:",d["status"],"total:",d["total"])'
curl -sS "$APP/api/v1/finance/$E1" -H "$AUTH" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("expense1 status:",d["status"],"paid_at set:",d["paid_at"] is not None)'

echo "--- settlement after payment ---"
curl -sS "$APP/api/v1/finance/settlement" -H "$AUTH" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("pending:",d["total_pending"],"paid:",d["total_paid"])'
