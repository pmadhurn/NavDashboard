import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  ApiOutlined,
  LinkOutlined,
  SwapOutlined,
  EnvironmentOutlined,
  ToolOutlined,
  RobotOutlined,
  HistoryOutlined,
  FileOutlined,
  BarChartOutlined,
  AuditOutlined,
  SearchOutlined,
  DiffOutlined,
  CloudDownloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import Layout from '@/shared/components/Layout';
import PlaceholderPage from '@/shared/components/PlaceholderPage';
import LoginPage from '@/modules/auth/pages/LoginPage';
import DashboardPage from '@/modules/dashboard/pages/DashboardPage';
import DeviceListPage from '@/modules/devices/pages/DeviceListPage';
import DeviceDetailPage from '@/modules/devices/pages/DeviceDetailPage';
import CoupleListPage from '@/modules/couples/pages/CoupleListPage';
import CoupleDetailPage from '@/modules/couples/pages/CoupleDetailPage';
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
        <Route path="search" element={<SearchPage />} />
        <Route path="audit" element={<AuditTrailPage />} />
        <Route path="comparison" element={<ComparisonPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="backup" element={<BackupPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="ai" element={<AIChatPage />} />
        <Route path="location-history" element={<PlaceholderPage title="Location History" icon={<HistoryOutlined />} />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" icon={<SettingOutlined />} />} />
      </Route>
      <Route path="login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}