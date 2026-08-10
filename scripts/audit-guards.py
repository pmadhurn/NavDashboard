"""Guard on every operation, read from the live FastAPI app.

This FastAPI version wraps include_router() results in _IncludedRouter, whose
real routes hang off `.original_router` and whose prefix is on
`.include_context.prefix`. A flat scan of app.routes finds exactly one route
and would report "everything is fine".
"""
import sys
sys.path.insert(0, "/app")
from collections import Counter
from main import app


def collect(routes, prefix=""):
    out = []
    for r in routes:
        if type(r).__name__ == "_IncludedRouter":
            p = getattr(r.include_context, "prefix", "") or ""
            out.extend(collect(r.original_router.routes, prefix + p))
            continue
        path = prefix + getattr(r, "path", "")
        methods = getattr(r, "methods", None)
        if methods and path.startswith("/api/v1"):
            out.append((r, path, methods))
    return out


def guard_of(route):
    guards = set()

    def walk(d, depth=0):
        if d is None or depth > 8:
            return
        for s in d.dependencies:
            name = getattr(s.call, "__name__", "")
            if name == "permission_checker":
                guards.add("permission")
            elif name == "role_checker":
                guards.add("role")
            elif name == "get_current_user":
                guards.add("authonly")
            walk(s, depth + 1)

    walk(getattr(route, "dependant", None))
    for k in ("permission", "role", "authonly"):
        if k in guards:
            return {"authonly": "AUTH-ONLY"}.get(k, k)
    return "PUBLIC"


rows = []
for r, path, methods in collect(app.routes):
    g = guard_of(r)
    for m in methods:
        if m in ("HEAD", "OPTIONS"):
            continue
        rows.append((g, m, path))

c = Counter(g for g, _, _ in rows)
print("=== totals ===")
for k in ("permission", "role", "AUTH-ONLY", "PUBLIC"):
    print(f"  {k:12} {c.get(k, 0)}")
print(f"  {'TOTAL':12} {len(rows)}")

print("\n=== NOT permission-guarded ===")
for g, m, p in sorted(rows, key=lambda x: (x[2], x[1])):
    if g != "permission":
        print(f"  {g:10} {m:7} {p}")
