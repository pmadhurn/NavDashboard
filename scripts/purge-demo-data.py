"""Empty the operational tables so a deployment starts clean.

Run:
    docker cp scripts/purge-demo-data.py navdashboard-backend-1:/tmp/purge.py
    docker exec navdashboard-backend-1 python /tmp/purge.py            # dry run
    docker exec navdashboard-backend-1 python /tmp/purge.py --confirm  # do it

Prints what it will delete BEFORE deleting anything, and does nothing at all
without --confirm. This replaces the old seeding module's "remove demo data",
which was dangerous for a different reason: it deleted only rows registered in
`seed_records`, and every row in the database was registered there.

DELIBERATELY NOT TOUCHED: users, roles, role_permissions, user_roles,
user_permission_overrides, alembic_version. Emptying those would lock everyone
out of the system this script is preparing.
"""
import asyncio
import sys

sys.path.insert(0, "/app")

from sqlalchemy import text  # noqa: E402

from core.database import async_session_factory  # noqa: E402

# Order matters: children before parents, or the foreign keys refuse.
TABLES = [
    # attendance & updates
    "comp_off_ledger", "attendance_days", "update_comments", "daily_updates",
    # finance
    "expense_members", "expenses", "expense_claims", "expense_batches",
    "fund_allocations",
    # projects
    "equipment_movement_items", "equipment_movements", "project_deployments",
    "project_timeline_entries", "project_members", "project_phases", "projects",
    # assets & materials
    "asset_reports", "asset_history", "assets", "asset_categories",
    "fitting_materials", "material_templates",
    # devices
    "troubleshoot_entries", "error_logs", "device_status_history", "devices",
    "location_history", "couples", "pairs", "locations",
    # downloads & documents
    "download_item_access", "download_versions", "download_items",
    "download_categories", "documents",
    # people (personnel records, NOT logins)
    "assignment_history", "personnel",
    # platform noise
    "chat_messages", "chat_sessions", "embedding_documents",
    "status_change_logs", "audit_logs",
]


async def main() -> int:
    confirm = "--confirm" in sys.argv

    async with async_session_factory() as db:
        counts = {}
        for table in TABLES:
            try:
                n = (
                    await db.execute(text(f"SELECT count(*) FROM {table}"))
                ).scalar_one()
            except Exception:
                continue  # table not present in this schema version
            if n:
                counts[table] = n

        if not counts:
            print("Nothing to purge — every operational table is already empty.")
            return 0

        total = sum(counts.values())
        print(f"{total} row(s) across {len(counts)} table(s):\n")
        for table, n in sorted(counts.items(), key=lambda kv: -kv[1]):
            print(f"  {n:>7}  {table}")
        print("\nNOT touched: users, roles, role_permissions, user_roles,")
        print("             user_permission_overrides, user_sessions, alembic_version")

        if not confirm:
            print("\nDry run. Re-run with --confirm to delete.")
            return 0

        print("\nDeleting…")
        for table in TABLES:
            if table in counts:
                await db.execute(text(f"DELETE FROM {table}"))
        await db.commit()

        left = 0
        for table in counts:
            left += (
                await db.execute(text(f"SELECT count(*) FROM {table}"))
            ).scalar_one()
        print(f"Done. {left} row(s) remain in those tables.")
        return 0 if left == 0 else 1


sys.exit(asyncio.run(main()))
