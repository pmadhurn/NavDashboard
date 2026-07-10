#!/bin/sh
# Apply pending migrations before serving. The app maps columns (users.status,
# users.auth_provider, ...) that only exist once migrations have run, so an
# unmigrated database makes every query fail at runtime rather than at boot.
#
# Failing here is deliberate: a backend that answers health checks while its
# schema is stale is harder to diagnose than one that refuses to start.
set -e

echo "[entrypoint] Applying database migrations..."
alembic upgrade head
echo "[entrypoint] Migrations up to date."

exec "$@"
