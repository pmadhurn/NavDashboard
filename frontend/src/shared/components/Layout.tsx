import React, { useEffect } from 'react';
import { Layout as AntLayout } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import { useUiStore } from '@/shared/stores/uiStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { useLogout } from '@/modules/auth/hooks/useAuth';
import { getRoleColor } from '@/shared/utils/colors';
import ErrorBoundary from './ErrorBoundary';

const { Sider, Header, Content } = AntLayout;

export default function Layout() {
  const navigate = useNavigate();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const currentPageTitle = useUiStore((s) => s.currentPageTitle);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { mutate: logout } = useLogout();

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  if (!token) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const roleColor = user?.role ? getRoleColor(user.role) : '#7A7A7A';

  return (
    <AntLayout style={{ minHeight: '100vh', background: '#0A0A0A' }}>
      <Sider
        collapsed={collapsed}
        width={240}
        collapsedWidth={64}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          background: 'transparent',
          borderRight: '1px solid rgba(255, 255, 255, 0.04)',
          overflow: 'hidden',
        }}
        trigger={null}
      >
        <Sidebar />
      </Sider>
      <AntLayout
        style={{
          marginLeft: collapsed ? 64 : 240,
          transition: 'margin-left 0.3s ease',
          background: '#0A0A0A',
        }}
      >
        <Header
          className="glass-header"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            height: 56,
            lineHeight: '56px',
            background: 'rgba(10, 10, 10, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: '#F2F2F2' }}>
            {currentPageTitle}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserOutlined style={{ color: '#B8B8B8', fontSize: 14 }} />
              <span style={{ color: '#F2F2F2', fontSize: 13, fontWeight: 500 }}>
                {user?.full_name || user?.username || 'User'}
              </span>
              {user?.role && (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 500,
                    color: roleColor,
                    background: `rgba(${hexToRgb(roleColor)}, 0.12)`,
                    border: `1px solid rgba(${hexToRgb(roleColor)}, 0.2)`,
                  }}
                >
                  {user.role}
                </span>
              )}
            </div>
            <div
              onClick={handleLogout}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 6,
                color: '#7A7A7A',
                transition: 'all 0.3s ease',
                fontSize: 13,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#F2F2F2';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#7A7A7A';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogoutOutlined style={{ fontSize: 14 }} />
              <span>Logout</span>
            </div>
          </div>
        </Header>
        <Content
          style={{
            padding: 24,
            minHeight: 'calc(100vh - 56px)',
            background: '#0A0A0A',
          }}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}