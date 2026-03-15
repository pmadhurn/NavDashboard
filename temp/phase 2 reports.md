## PHASE 2 TECHNICAL REPORT

### 1. Files created/modified
**27 files total.**

| Type | Files |
|------|-------|
| **Backend new (8)** | `core/security.py`, `core/dependencies.py`, `modules/auth/__init__.py`, `modules/auth/models.py`, `modules/auth/schemas.py`, `modules/auth/repository.py`, `modules/auth/service.py`, `modules/auth/router.py` |
| **Backend modified (3)** | `main.py`, `requirements.txt`, `migrations/env.py` |
| **Frontend new/replaced (15)** | `package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/vite-env.d.ts`, `src/app/App.tsx`, `src/app/routes.tsx`, `src/app/providers.tsx`, `src/styles/global.css`, `src/shared/api/client.ts`, `src/shared/stores/authStore.ts`, `src/shared/types/common.ts`, `src/modules/auth/hooks/useAuth.ts`, `src/modules/auth/pages/LoginPage.tsx`, `src/modules/dashboard/pages/DashboardPage.tsx` |
| **Docker modified (1)** | `docker-compose.yml` |

### 2. Database state
- **Tables:** `alembic_version`, `audit_logs`, `users` + PostGIS system tables (untouched)
- **Migrations:** `3845f6ceaac9_initial_audit_logs` → `ca3abdffb9ae_add_users_table`
- **Default data:** 1 admin user (`admin@navdashboard.com` / `admin123`, role=ADMIN)

### 3. API surface

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/v1/health` | Public |
| POST | `/api/v1/auth/login` | Public |
| POST | `/api/v1/auth/register` | ADMIN only |
| GET | `/api/v1/auth/me` | Authenticated |
| PUT | `/api/v1/auth/me` | Authenticated |
| PUT | `/api/v1/auth/me/password` | Authenticated |
| GET | `/api/v1/auth/users` | ADMIN only |
| GET | `/api/v1/auth/users/{id}` | ADMIN only |
| PUT | `/api/v1/auth/users/{id}` | ADMIN only |
| DELETE | `/api/v1/auth/users/{id}` | ADMIN only |

### 4. Auth flow
1. User POSTs `{email, password}` → `/api/v1/auth/login`
2. Backend verifies credentials, returns `{access_token, token_type, user}`
3. Frontend stores token in `localStorage` + Zustand store
4. Axios request interceptor attaches `Authorization: Bearer <token>` to all requests
5. Backend `get_current_user` dependency decodes JWT, loads user from DB
6. `require_role("ADMIN")` dependency wraps `get_current_user` with role check
7. On 401 response, axios response interceptor clears token and redirects to `/login`

### 5. Frontend state
- **Libraries:** React 18, React Router 6, Ant Design 5, Axios, Zustand 5, TanStack React Query 5, dayjs
- **Routes:** `/login` (public), `/` (protected dashboard), `*` → redirect to `/`
- **State management:** Zustand auth store with localStorage persistence
- **Theme:** Dark mode with glass-card styling, Ant Design `darkAlgorithm`

### 6. Issues and fixes during deployment
| Issue | Fix |
|-------|-----|
| `postgis/postgis:16-3.4` amd64-only | Changed to `imresamu/postgis:16-3.5` (multi-arch arm64) |
| `ModuleNotFoundError: jose` | Rebuilt containers with `--build` to install new requirements |
| nginx mount: `nginx.conf` vs `default.conf` | Renamed file + removed Docker-created directory |
| `Settings has no attribute DATABASE_URL` | Changed `env.py` to use `settings.async_database_url` |
| `.env` password mismatch with docker-compose | Aligned `.env` values: `navdashboard` / `navdashboard` |
| Alembic detecting PostGIS tiger tables as removals | Added `reflected and compare_to is None` filter in `include_object` |
| Pydantic `EmailStr` rejecting `.local` domain | Changed admin email to `@navdashboard.com`, relaxed `LoginRequest.email` to `str` |
| passlib/bcrypt version incompatibility | Pinned `bcrypt==4.0.1` in requirements.txt |

### 7. Phase 3 needs
- **App shell layout:** Sidebar navigation, top header with user menu, breadcrumbs
- **Shared components:** GlassCard, PageHeader, DataTable, StatusBadge
- **Additional routes:** Navigation items, vessels, equipment modules
- **Role-based menu:** Sidebar visibility based on `user.role`
- **Ant Design Layout:** `Sider`, `Header`, `Content` composition replacing placeholder dashboard
