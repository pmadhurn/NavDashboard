import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/shared/components/Layout';
import LoginPage from '@/modules/auth/pages/LoginPage';
import DashboardPage from '@/modules/dashboard/pages/DashboardPage';
import DeviceListPage from '@/modules/devices/pages/DeviceListPage';
import DeviceDetailPage from '@/modules/devices/pages/DeviceDetailPage';
import CoupleListPage from '@/modules/couples/pages/CoupleListPage';
import CoupleDetailPage from '@/modules/couples/pages/CoupleDetailPage';
import PersonnelListPage from '@/modules/personnel/pages/PersonnelListPage';
import PairListPage from '@/modules/pairs/pages/PairListPage';
import PairDetailPage from '@/modules/pairs/pages/PairDetailPage';
import MapViewPage from '@/modules/map/pages/MapViewPage';
import TroubleshootingPage from '@/modules/troubleshooting/pages/TroubleshootingPage';
import SearchPage from '@/modules/search/pages/SearchPage';
import AuditTrailPage from '@/modules/audit_trail/pages/AuditTrailPage';
import ComparisonPage from '@/modules/comparison/pages/ComparisonPage';
import DocumentsPage from '@/modules/documents/pages/DocumentsPage';
import BackupPage from '@/modules/backup/pages/BackupPage';
import ReportsPage from '@/modules/reports/pages/ReportsPage';
import AIChatPage from '@/modules/ai_chat/pages/AIChatPage';
import LocationHistoryPage from '@/modules/location_history/pages/LocationHistoryPage';
import SettingsPage from '@/modules/settings/pages/SettingsPage';
import DownloadsPage from '@/modules/downloads/pages/DownloadsPage';
import AssetListPage from '@/modules/inventory/pages/AssetListPage';
import AssetDetailPage from '@/modules/inventory/pages/AssetDetailPage';
import DeployedPage from '@/modules/inventory/pages/DeployedPage';
import ProjectListPage from '@/modules/projects/pages/ProjectListPage';
import ProjectDetailPage from '@/modules/projects/pages/ProjectDetailPage';
import FinancePage from '@/modules/finance/pages/FinancePage';
import MyFinancePage from '@/modules/finance/pages/MyFinancePage';
import ClaimsPage from '@/modules/finance/pages/ClaimsPage';
import SettlementPage from '@/modules/finance/pages/SettlementPage';
import { useAuthStore, hasPermission, PermissionLevel } from '@/shared/stores/authStore';

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
  if (user && !hasPermission(user, section, level)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function AppRoutes() {
  return (
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
  );
}