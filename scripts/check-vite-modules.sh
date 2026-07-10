#!/usr/bin/env bash
# Ask the running Vite dev server to transform each new module; a 200 means it
# parsed/compiled, a 500 means a build error in that file.
set -uo pipefail
APP=http://localhost:8080
paths=(
  /src/app/routes.tsx
  /src/shared/components/Sidebar.tsx
  /src/shared/components/Layout.tsx
  /src/shared/components/ShareButton.tsx
  /src/shared/components/DataTable.tsx
  /src/shared/components/StatusBadge.tsx
  /src/shared/components/GlassInput.tsx
  /src/shared/components/GlassButton.tsx
  /src/shared/hooks/useIsMobile.ts
  /src/shared/stores/authStore.ts
  /src/shared/api/client.ts
  /src/modules/auth/pages/LoginPage.tsx
  /src/modules/auth/components/GoogleSignInButton.tsx
  /src/modules/downloads/pages/DownloadsPage.tsx
  /src/modules/downloads/components/UploadDownloadModal.tsx
  /src/modules/inventory/pages/AssetListPage.tsx
  /src/modules/inventory/pages/AssetDetailPage.tsx
  /src/modules/inventory/components/AssetFormModal.tsx
  /src/modules/inventory/components/AssetReportsPanel.tsx
  /src/modules/projects/pages/ProjectListPage.tsx
  /src/modules/projects/pages/ProjectDetailPage.tsx
  /src/modules/finance/pages/FinancePage.tsx
  /src/modules/settings/components/UserManagement.tsx
  /src/modules/settings/components/PermissionMatrixModal.tsx
)
fail=0
for p in "${paths[@]}"; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$APP$p")
  [ "$code" != "200" ] && { echo "FAIL $code $p"; fail=1; } || echo "ok   $p"
done
exit $fail
