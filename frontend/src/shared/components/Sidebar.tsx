import React from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
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
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useUiStore } from '@/shared/stores/uiStore';

const navItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/devices', icon: <ApiOutlined />, label: 'Devices' },
  { key: '/couples', icon: <LinkOutlined />, label: 'Couples' },
  { key: '/personnel', icon: <TeamOutlined />, label: 'Personnel' },
  { key: '/pairs', icon: <SwapOutlined />, label: 'Pairs' },
  { key: '/map', icon: <EnvironmentOutlined />, label: 'Map' },
  { key: '/troubleshooting', icon: <ToolOutlined />, label: 'Troubleshooting' },
  { key: '/ai', icon: <RobotOutlined />, label: 'AI Assistant' },
  { key: '/location-history', icon: <HistoryOutlined />, label: 'Location History' },
  { key: '/documents', icon: <FileOutlined />, label: 'Documents' },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
  { key: '/audit', icon: <AuditOutlined />, label: 'Audit Trail' },
  { key: '/search', icon: <SearchOutlined />, label: 'Search' },
  { key: '/comparison', icon: <DiffOutlined />, label: 'Comparison' },
  { key: '/backup', icon: <CloudDownloadOutlined />, label: 'Backup' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const selectedKey = navItems.find(
    (item) =>
      item.key === location.pathname ||
      (item.key !== '/' && location.pathname.startsWith(item.key))
  )?.key || '/';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'rgba(15, 15, 15, 0.85)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: collapsed ? '16px 0' : '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : 12,
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          height: 64,
          boxSizing: 'border-box',
        }}
      >
        <img
          src="/logo.png"
          alt="NavDashboard Logo"
          style={{
            width: 32,
            height: 32,
            objectFit: 'contain',
            filter: 'drop-shadow(0px 2px 8px rgba(139, 195, 74, 0.3))',
          }}
        />
        {!collapsed && (
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#E6E6E6',
              letterSpacing: 1,
              textShadow: '0 0 20px rgba(230, 230, 230, 0.15)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            NavDashboard
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
        <Menu
          mode="inline"
          theme="dark"
          inlineCollapsed={collapsed}
          selectedKeys={[selectedKey]}
          items={navItems}
          onClick={({ key }) => navigate(key)}
          style={{ border: 'none', background: 'transparent' }}
        />
      </div>

      {/* Collapse Toggle */}
      <div
        style={{
          padding: 12,
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          textAlign: 'center',
        }}
      >
        <div
          onClick={toggleSidebar}
          style={{
            cursor: 'pointer',
            padding: '8px',
            borderRadius: 8,
            color: '#7A7A7A',
            transition: 'all 0.3s ease',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1A1A1A';
            e.currentTarget.style.color = '#F2F2F2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#7A7A7A';
          }}
        >
          {collapsed ? (
            <MenuUnfoldOutlined style={{ fontSize: 18 }} />
          ) : (
            <MenuFoldOutlined style={{ fontSize: 18 }} />
          )}
        </div>
      </div>
    </div>
  );
}