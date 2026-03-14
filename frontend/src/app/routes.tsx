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

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="devices" element={<PlaceholderPage title="Devices" icon={<ApiOutlined />} />} />
        <Route path="devices/:id" element={<PlaceholderPage title="Device Detail" />} />
        <Route path="couples" element={<PlaceholderPage title="Couples" icon={<LinkOutlined />} />} />
        <Route path="couples/:id" element={<PlaceholderPage title="Couple Detail" />} />
        <Route path="pairs" element={<PlaceholderPage title="Pairs" icon={<SwapOutlined />} />} />
        <Route path="pairs/:id" element={<PlaceholderPage title="Pair Detail" />} />
        <Route path="map" element={<PlaceholderPage title="Map" icon={<EnvironmentOutlined />} />} />
        <Route path="troubleshooting" element={<PlaceholderPage title="Troubleshooting" icon={<ToolOutlined />} />} />
        <Route path="ai" element={<PlaceholderPage title="AI Assistant" icon={<RobotOutlined />} />} />
        <Route path="location-history" element={<PlaceholderPage title="Location History" icon={<HistoryOutlined />} />} />
        <Route path="documents" element={<PlaceholderPage title="Documents" icon={<FileOutlined />} />} />
        <Route path="reports" element={<PlaceholderPage title="Reports" icon={<BarChartOutlined />} />} />
        <Route path="audit" element={<PlaceholderPage title="Audit Trail" icon={<AuditOutlined />} />} />
        <Route path="search" element={<PlaceholderPage title="Search" icon={<SearchOutlined />} />} />
        <Route path="comparison" element={<PlaceholderPage title="Comparison" icon={<DiffOutlined />} />} />
        <Route path="backup" element={<PlaceholderPage title="Backup" icon={<CloudDownloadOutlined />} />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" icon={<SettingOutlined />} />} />
      </Route>
      <Route path="login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}