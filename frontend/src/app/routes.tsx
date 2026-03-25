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
import { useAuthStore } from '@/shared/stores/authStore';

// Route guard for admin-only pages
function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user && user.role !== 'ADMIN') {
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
        {/* Admin-only routes */}
        <Route path="personnel" element={<AdminRoute><PersonnelListPage /></AdminRoute>} />
        <Route path="search" element={<AdminRoute><SearchPage /></AdminRoute>} />
        <Route path="audit" element={<AdminRoute><AuditTrailPage /></AdminRoute>} />
        <Route path="backup" element={<AdminRoute><BackupPage /></AdminRoute>} />
        <Route path="reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
        <Route path="ai" element={<AdminRoute><AIChatPage /></AdminRoute>} />
        <Route path="settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
      </Route>
      <Route path="login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}