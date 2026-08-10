import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/shared/components/Layout';
import LoginPage from '@/modules/auth/pages/LoginPage';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { useAuthStore, can } from '@/shared/stores/authStore';

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
const AccessControlPage = lazy(() => import('@/modules/access/pages/AccessControlPage'));
const UpdatesPage = lazy(() => import('@/modules/updates/pages/UpdatesPage'));
const LeadershipPage = lazy(() => import('@/modules/updates/pages/LeadershipPage'));

/**
 * Route guard. Requires one permission key.
 *
 * This hides a page; it does not secure it. Every request the page makes is
 * checked again on the server, which is what makes typing the URL directly
 * fail rather than merely look untidy.
 */
function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  // Fails closed: a null user is the state when the cached auth_user entry is
  // missing, and treating that as "allow" is how a guard stops being one.
  if (!can(user, permission)) {
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
          <Route path="downloads" element={<RequirePermission permission="downloads.read"><DownloadsPage /></RequirePermission>} />
          <Route path="inventory/assets" element={<RequirePermission permission="assets.read"><AssetListPage /></RequirePermission>} />
          <Route path="inventory/assets/:id" element={<RequirePermission permission="assets.read"><AssetDetailPage /></RequirePermission>} />
          <Route path="inventory/deployed" element={<RequirePermission permission="assets.read"><DeployedPage /></RequirePermission>} />
          <Route path="projects" element={<RequirePermission permission="projects.read"><ProjectListPage /></RequirePermission>} />
          <Route path="projects/:id" element={<RequirePermission permission="projects.read"><ProjectDetailPage /></RequirePermission>} />
          <Route path="finance" element={<RequirePermission permission="finance.read"><FinancePage /></RequirePermission>} />
          <Route path="finance/my" element={<RequirePermission permission="finance.read"><MyFinancePage /></RequirePermission>} />
          <Route path="finance/claims" element={<RequirePermission permission="finance.read"><ClaimsPage /></RequirePermission>} />
          <Route path="finance/settlement" element={<RequirePermission permission="finance.settle"><SettlementPage /></RequirePermission>} />
          {/* Permission-gated routes */}
          <Route path="me/attendance" element={<RequirePermission permission="attendance.read"><MyAttendancePage /></RequirePermission>} />
          <Route path="attendance" element={<RequirePermission permission="attendance.read"><AttendanceBoardPage /></RequirePermission>} />
          <Route path="compoff" element={<RequirePermission permission="attendance.read"><CompOffPage /></RequirePermission>} />
          <Route path="updates" element={<RequirePermission permission="updates.read"><UpdatesPage /></RequirePermission>} />
          <Route path="leadership" element={<RequirePermission permission="leadership.read"><LeadershipPage /></RequirePermission>} />
          <Route path="personnel" element={<RequirePermission permission="personnel.read"><PersonnelListPage /></RequirePermission>} />
          <Route path="search" element={<SearchPage />} />
          <Route path="audit" element={<RequirePermission permission="settings.read"><AuditTrailPage /></RequirePermission>} />
          <Route path="backup" element={<RequirePermission permission="settings.read"><BackupPage /></RequirePermission>} />
          <Route path="reports" element={<RequirePermission permission="reports.read"><ReportsPage /></RequirePermission>} />
          <Route path="ai" element={<RequirePermission permission="ai.read"><AIChatPage /></RequirePermission>} />
          <Route path="settings/access" element={<RequirePermission permission="users.read"><AccessControlPage /></RequirePermission>} />
          <Route path="settings" element={<RequirePermission permission="settings.read"><SettingsPage /></RequirePermission>} />
        </Route>
        <Route path="login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
