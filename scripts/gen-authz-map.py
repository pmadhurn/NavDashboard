import re, collections

rows = []
for line in open('/tmp/catalog_raw.txt'):
    m = re.match(r'\s*"([^"]+)": "[^"]+",\s*#\s*(\w+)\s+(\S+)', line)
    if m:
        rows.append((m.group(1), m.group(2), m.group(3)))

PUBLIC, AUTH = "PUBLIC", "AUTHENTICATED"
ACTION = {"GET": "read", "POST": "create", "PUT": "update", "PATCH": "update", "DELETE": "delete"}
# Backend module name -> catalog group. 'inventory' is fitting materials, not assets.
GROUP = {"inventory": "materials", "audit": "audit", "ai": "ai"}

# Endpoint short-name -> key. Applied per module; '*' matches any module.
OVR = {
  "health": {"health_check": PUBLIC},
  "auth": {
    "login": PUBLIC, "register": PUBLIC, "google_login": PUBLIC,
    "clerk_login": PUBLIC, "clerk_config": PUBLIC,
    "me": AUTH, "update_me": AUTH, "change_password": AUTH,
    "list_users": "users.read", "list_users_basic": "users.read",
    "list_pending_users": "users.read", "get_user": "users.read",
    "update_user": "users.update", "delete_user": "users.delete",
    "approve_user": "users.approve",
    "get_user_permissions": "users.permissions.read",
    "set_user_permissions": "users.permissions.manage",
  },
  "settings": {
    "list_users": "users.read", "create_user": "users.create",
    "update_user": "users.update", "delete_user": "users.delete",
    "list_settings": "settings.read", "system_info": "settings.read",
    "update_setting": "settings.update",
  },
  "audit": {"revert_audit_entry": "audit.revert"},
  "backup": {
    "export_csv": "backup.export", "export_xlsx": "backup.export",
    "import_csv": "backup.import", "import_xlsx": "backup.import",
    "create_backup": "backup.create", "restore_backup": "backup.restore",
    "delete_backup_file": "backup.delete", "download_backup": "backup.read",
    "backup_history": "backup.read", "table_counts": "backup.read",
  },
  "projects": {
    "add_member": "projects.members", "remove_member": "projects.members",
    "move_member": "projects.members",
    "list_phases": "projects.read", "create_phase": "projects.phases",
    "update_phase": "projects.phases",
    "list_movements": "projects.read", "create_movement": "projects.equipment",
    "update_movement_item": "projects.equipment",
    "outward_execute": "projects.equipment", "outward_preview": "projects.read",
    "list_deployments": "projects.read", "add_deployment": "projects.deployments",
    "remove_deployment": "projects.deployments",
    "deployments_for_entity": "projects.read",
    "close_project": "projects.close",
    "get_summary": "projects.read", "list_timeline": "projects.read",
    "create_timeline_entry": "projects.update",
  },
  "finance": {
    "list_advances": "finance.read", "create_advance": "finance.advances",
    "delete_advance": "finance.advances", "get_balance": "finance.read",
    "list_batches": "finance.read", "create_batch": "finance.create",
    "generate_bill": "finance.export",
    "list_claims": "finance.read", "create_claim": "finance.claims",
    "update_claim": "finance.claims", "submit_claim": "finance.claims",
    "settle_claim": "finance.settle", "settlement": "finance.settle",
    "export_expenses": "finance.export", "import_sheet": "finance.import",
    "my_finance": AUTH, "get_summary": "finance.summary",
    "set_expense_status": "finance.update",
  },
  "assets": {"backfill_devices": "assets.backfill"},
  "attendance": {
    "my_days": AUTH, "my_summary": AUTH, "my_comp_off": AUTH,
    "team_board": "attendance.board",
    "comp_off_balance": "attendance.compoff", "comp_off_ledger": "attendance.compoff",
    "adjust_comp_off": "attendance.adjust",
    "person_days": "attendance.read", "person_summary": "attendance.read",
  },
  "updates": {
    "my_updates": AUTH, "add_comment": "updates.comment",
    "delete_comment": "updates.comment",
  },
  "leadership": {"leadership_summary": "leadership.read"},
  "troubleshooting": {"resolve_error": "troubleshooting.resolve"},
  "documents": {"create_share_link": "documents.share"},
  "downloads": {"grant_access": "downloads.access", "revoke_access": "downloads.access"},
  "personnel": {"link_logins": "personnel.link"},
  "status": {"change_status": "status.change"},
  "reports": {"generate_report": "reports.generate"},
  # Comparing is a read that happens to take a POST body (the id list).
  "comparison": {"compare_devices_endpoint": "comparison.read",
                 "compare_couples_endpoint": "comparison.read",
                 "compare_pairs_endpoint": "comparison.read"},
}

out, unmapped = [], []
for qual, method, path in rows:
    seg = path.split('/api/v1/')[-1].split('/')[0]
    mod = GROUP.get(seg, seg)
    short = qual.rsplit('.', 1)[-1]
    key = OVR.get(seg, {}).get(short)
    if key is None:
        if 'categor' in short and mod in ('assets', 'downloads'):
            key = f"{mod}.categories"
        elif 'template' in short and mod == 'materials':
            key = "materials.templates"
        elif 'report' in short and mod == 'assets':
            key = "assets.reports"
        else:
            key = f"{mod}.{ACTION.get(method, 'read')}"
    out.append((qual, key, method, path))

# validate against catalog
import sys
sys.path.insert(0, '/home/ubuntu/NavDashboard/backend')
from core.authz_catalog import ALL_PERMISSIONS
bad = [(q, k) for q, k, _, _ in out if k not in (PUBLIC, AUTH) and k not in ALL_PERMISSIONS]
print("operations:", len(out), " unknown keys:", len(bad))
for q, k in bad[:30]:
    print("   MISSING:", k, "<-", q)

with open('/tmp/endpoints_body.txt', 'w') as f:
    for qual, key, method, path in sorted(out, key=lambda r: (r[3], r[2])):
        v = {"PUBLIC": "PUBLIC", "AUTHENTICATED": "AUTHENTICATED"}.get(key, f'"{key}"')
        f.write(f'    "{qual}": {v},  # {method} {path}\n')
print("wrote /tmp/endpoints_body.txt")
