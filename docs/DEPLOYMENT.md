# NavDashboard — Deployment

**NavDashboard** is the internal operating platform of **Nav Wireless Technologies Pvt Ltd** ([navwireless.com](https://www.navwireless.com)), built by **Raj Patel**, Head of Operations — raj@navwireless.com.

---

## Before you deploy

### 1. Rotate the credentials that have been in git

The Cloudflare tunnel token that used to sit in `docker-compose.yml` is **still valid and still in git history**. Removing the line does not revoke it.

- [ ] Revoke that tunnel token in the Cloudflare dashboard and issue a new one.
- [ ] Rotate `SECRET_KEY`. Every existing session dies, which is the intent.
- [ ] Confirm `backend/.env` and `frontend/.env` are untracked (`git check-ignore -v backend/.env`).

> Tokens are passed by environment, never by compose file: `TUNNEL_TOKEN=${TUNNEL_TOKEN}`.

### 2. Start from clean data

```bash
docker cp scripts/purge-demo-data.py navdashboard-backend-1:/tmp/purge.py
docker exec navdashboard-backend-1 python /tmp/purge.py            # dry run — prints what it would delete
docker exec navdashboard-backend-1 python /tmp/purge.py --confirm  # do it
```

It never touches users, roles, role assignments, permission overrides or sessions — emptying those would lock everyone out of the system it is preparing.

### 3. Set up the people

1. Sign in as the seeded admin.
2. **Settings → Access Control → People** — create accounts and give each a role.
3. **Personnel** — create a record per field member and **link it to their login**. Until a login is linked, that person has no attendance, no tasks and no equipment custody. This is the single most common setup mistake.
4. Change the seeded admin's password, or delete the account once a real one exists.

> An account whose legacy role is `ADMIN` is granted everything regardless of its permission checkboxes. Use a real role for everyone who is not an administrator; the Access Control screen says so on any ADMIN account.

### 4. Stock the inventory

**Inventory → Locations** already has Office, R&D, Storeroom and Halol Factory — add any others. Then add equipment, or let devices flow in automatically: every device gets an inventory record on creation, and startup reconciles any that are missing.

---

## Running it

```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml build backend frontend
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d
```

Migrations run automatically on backend start. **The frontend is a static build** — code changes need `build`, not `restart`.

## Checking it

`/system` (Developer role) reports database, schema revision, file storage, AI service, authorization coverage, disk, activity and data consistency — each with what happened, why it matters and what to do.

The startup log must show `Authorization coverage: N/N operations mapped`. If an operation is unmapped the app refuses to start, which is deliberate: an endpoint without a permission must never ship.

## Backup

Settings → Backup, or `POST /api/v1/backup/export/xlsx` with `{"tables": null}`. The workbook covers **every business table** — 53 sheets. Excluded on purpose: `alembic_version`, PostGIS internals, chat history, embeddings, sessions and the audit log.

Take one before any upgrade.

## Verification suite

None of these may be run as ADMIN — the legacy ADMIN role short-circuits every permission check, so an admin run proves nothing. All of them either write nothing or clean up after themselves, so they are safe against the live stack.

See [`STATUS.md`](./STATUS.md) for the full list and current baselines.
