import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/shared/components/Layout';
import LoginPage from '@/modules/auth/pages/LoginPage';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { useAuthStore, hasPermission, PermissionLevel } from '@/shared/stores/authStore';

// Every page below the shell is code-split. Layout and LoginPage stay eager —
// one of the two renders on first paint no matter where you land, so lazying
// them would only add a spinner to the critical path.
//
// This is what keeps leaflet (map, location-history) and recharts (dashboard,
// troubleshooting) out of the initial bundle; they are the two heaviest deps
// and most sessions never open those routes.
const DashboardPage = lazy(() => import('@/modules/dashboard/pages/DashboardPage'));
const DeviceListPage = lazy(() => import('@/modules/devices/pages/DeviceListPage'));
const DeviceDetailPage = lazy(() => import('@/modules/devices/pages/DeviceDetailPage'));
const CoupleListPage = lazy(() => import('@/modules/couples/pages/CoupleListPage'));
const CoupleDetailPage = lazy(() => import('@/modules/couples/pages/CoupleDetailPage'));
const PersonnelListPage = lazy(() => import('@/modules/personnel/pages/PersonnelListPage'));
const PairListPage = lazy(() => import('@/modules/pairs/pages/PairListPage'));
const PairDetailPage = lazy(() => import('@/modules/pairs/pages/PairDetailPage'));
const MapViewPage = lazy(() => import('@/modules/map/pages/MapViewPage'));
const TroubleshootingPage = lazy(() => import('@/modules/troubleshooting/pages/TroubleshootingPage'));
const SearchPage = lazy(() => import('@/modules/search/pages/SearchPage'));
const AuditTrailPage = lazy(() => import('@/modules/audit_trail/pages/AuditTrailPage'));
const ComparisonPage = lazy(() => import('@/modules/comparison/pages/ComparisonPage'));
const DocumentsPage = lazy(() => import('@/modules/documents/pages/DocumentsPage'));
const BackupPage = lazy(() => import('@/modules/backup/pages/BackupPage'));
const ReportsPage = lazy(() => import('@/modules/reports/pages/ReportsPage'));
const AIChatPage = lazy(() => import('@/modules/ai_chat/pages/AIChatPage'));
const LocationHistoryPage = lazy(() => import('@/modules/location_history/pages/LocationHistoryPage'));
const SettingsPage = lazy(() => import('@/modules/settings/pages/SettingsPage'));
const DownloadsPage = lazy(() => import('@/modules/downloads/pages/DownloadsPage'));
const AssetListPage = lazy(() => import('@/modules/inventory/pages/AssetListPage'));
const AssetDetailPage = lazy(() => import('@/modules/inventory/pages/AssetDetailPage'));
const DeployedPage = lazy(() => import('@/modules/inventory/pages/DeployedPage'));
const ProjectListPage = lazy(() => import('@/modules/projects/pages/ProjectListPage'));
const ProjectDetailPage = lazy(() => import('@/modules/projects/pages/ProjectDetailPage'));
const FinancePage = lazy(() => import('@/modules/finance/pages/FinancePage'));
const MyFinancePage = lazy(() => import('@/modules/finance/pages/MyFinancePage'));
const ClaimsPage = lazy(() => import('@/modules/finance/pages/ClaimsPage'));
const SettlementPage = lazy(() => import('@/modules/finance/pages/SettlementPage'));
const MyAttendancePage = lazy(() => import('@/modules/attendance/pages/MyAttendancePage'));
const AttendanceBoardPage = lazy(() => import('@/modules/attendance/pages/AttendanceBoardPage'));
const CompOffPage = lazy(() => import('@/modules/attendance/pages/CompOffPage'));
const UpdatesPage = lazy(() => import('@/modules/updates/pages/UpdatesPage'));
const LeadershipPage = lazy(() => import('@/modules/updates/pages/LeadershipPage'));

// Route guard: requires at least `level` on `section` (ADMIN always passes).
function RequirePermission({
  section,
  level = 'VIEW',
  children,
}: {
  section: string;
  level?: PermissionLevel;
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  // Fail *closed*. This previously read `if (user && !hasPermission(...))`, so a
  // null user — which is the state whenever the cached `auth_user` key is
  // missing but a token is present — rendered every guarded route.
  if (!user || !hasPermission(user, section, level)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RouteFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <LoadingSpinner size="md" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="devices" element={<DeviceListPage />} />
          <Route path="devices/:id" element={<DeviceDetailPage />} />
          <Route path="couples" element={<CoupleListPage />} />
          <Route path="couples/:id" element={<CoupleDetailPage />} />
          <Route path="pairs" element={<PairListPage />} />
          <Route path="pairs/:id" element={<PairDetailPage />} />
          <Route path="map" element={<MapViewPage />} />
          <Route path="troubleshooting" element={<TroubleshootingPage />} />
          <Route path="comparison" element={<ComparisonPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="location-history" element={<LocationHistoryPage />} />
          <Route path="downloads" element={<RequirePermission section="downloads"><DownloadsPage /></RequirePermission>} />
          <Route path="inventory/assets" element={<RequirePermission section="inventory"><AssetListPage /></RequirePermission>} />
          <Route path="inventory/assets/:id" element={<RequirePermission section="inventory"><AssetDetailPage /></RequirePermission>} />
          <Route path="inventory/deployed" element={<RequirePermission section="inventory"><DeployedPage /></RequirePermission>} />
          <Route path="projects" element={<RequirePermission section="projects"><ProjectListPage /></RequirePermission>} />
          <Route path="projects/:id" element={<RequirePermission section="projects"><ProjectDetailPage /></RequirePermission>} />
          <Route path="finance" element={<RequirePermission section="finance"><FinancePage /></RequirePermission>} />
          <Route path="finance/my" element={<RequirePermission section="finance"><MyFinancePage /></RequirePermission>} />
          <Route path="finance/claims" element={<RequirePermission section="finance"><ClaimsPage /></RequirePermission>} />
          <Route path="finance/settlement" element={<RequirePermission section="finance" level="MANAGE"><SettlementPage /></RequirePermission>} />
          {/* Permission-gated routes */}
          <Route path="me/attendance" element={<RequirePermission section="attendance"><MyAttendancePage /></RequirePermission>} />
          <Route path="attendance" element={<RequirePermission section="attendance"><AttendanceBoardPage /></RequirePermission>} />
          <Route path="compoff" element={<RequirePermission section="attendance"><CompOffPage /></RequirePermission>} />
          <Route path="updates" element={<RequirePermission section="updates"><UpdatesPage /></RequirePermission>} />
          <Route path="leadership" element={<RequirePermission section="leadership"><LeadershipPage /></RequirePermission>} />
          <Route path="personnel" element={<RequirePermission section="personnel"><PersonnelListPage /></RequirePermission>} />
          <Route path="search" element={<SearchPage />} />
          <Route path="audit" element={<RequirePermission section="admin"><AuditTrailPage /></RequirePermission>} />
          <Route path="backup" element={<RequirePermission section="admin"><BackupPage /></RequirePermission>} />
          <Route path="reports" element={<RequirePermission section="reports"><ReportsPage /></RequirePermission>} />
          <Route path="ai" element={<RequirePermission section="ai"><AIChatPage /></RequirePermission>} />
          <Route path="settings" element={<RequirePermission section="admin"><SettingsPage /></RequirePermission>} />
        </Route>
        <Route path="login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
