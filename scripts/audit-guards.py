"""Report the permission key protecting every API operation.

Run:
    docker cp scripts/audit-guards.py navdashboard-backend-1:/tmp/ag.py
    docker exec navdashboard-backend-1 python /tmp/ag.py

Since 2026-08-11 authorization is a single app-level dependency
(`core.authz.enforce_permissions`) plus the map in `core/authz_endpoints.py`,
NOT a per-route dependency. An earlier version of this script looked for
`permission_checker` in each route's dependants and, after the migration,
reported 233 operations as "unguarded" — every one of which is in fact guarded.
Measuring the wrong thing is worse than not measuring: it invites someone to
"fix" a system that is working.

What actually matters is: does every operation have a catalog entry, and is any
operation reachable without one. `assert_full_coverage()` enforces that at
startup; this script prints the same picture for a human.
"""
import sys
from collections import Counter, defaultdict

sys.path.insert(0, "/app")

from core.authz import iter_api_routes, permission_for_route  # noqa: E402
from core.authz_catalog import AUTHENTICATED, PUBLIC  # noqa: E402
from main import app  # noqa: E402

rows = []
for route, path, methods in iter_api_routes(app):
    key = permission_for_route(route)
    for m in sorted(methods):
        if m in ("HEAD", "OPTIONS"):
            continue
        rows.append((key, m, path))

kinds = Counter(
    "PUBLIC" if k == PUBLIC else "AUTHENTICATED" if k == AUTHENTICATED
    else "unmapped" if k is None else "permission"
    for k, _, _ in rows
)

print("=== totals ===")
for label in ("permission", "AUTHENTICATED", "PUBLIC", "unmapped"):
    print(f"  {label:16} {kinds.get(label, 0)}")
print(f"  {'TOTAL':16} {len(rows)}")

unmapped = [(m, p) for k, m, p in rows if k is None]
if unmapped:
    print("\n!!! UNMAPPED — these would be denied at runtime and block startup:")
    for m, p in unmapped:
        print(f"    {m:7} {p}")
else:
    print("\nEvery operation is mapped. Startup would not be blocked.")

print("\n=== unauthenticated (public) ===")
for k, m, p in sorted(rows, key=lambda r: r[2]):
    if k == PUBLIC:
        print(f"    {m:7} {p}")

print("\n=== signed-in, self-service only (no permission required) ===")
for k, m, p in sorted(rows, key=lambda r: r[2]):
    if k == AUTHENTICATED:
        print(f"    {m:7} {p}")

by_key = defaultdict(list)
for k, m, p in rows:
    if k not in (PUBLIC, AUTHENTICATED) and k is not None:
        by_key[k].append(f"{m} {p}")

print(f"\n=== {len(by_key)} permission keys in use ===")
for key in sorted(by_key):
    print(f"  {key:32} {len(by_key[key])} operation(s)")
