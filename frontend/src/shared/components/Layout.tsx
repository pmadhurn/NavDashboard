import { useEffect, useState } from 'react';
import { Layout as AntLayout, Drawer, Input } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogoutOutlined, UserOutlined, MenuOutlined, SearchOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import WorkspaceRail from './WorkspaceRail';
import { useUiStore } from '@/shared/stores/uiStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { useLogout, useCurrentUser } from '@/modules/auth/hooks/useAuth';
import { getRoleColor } from '@/shared/utils/colors';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { workspaceForPath, workspaceByKey } from '@/shared/config/workspaces';
import ErrorBoundary from './ErrorBoundary';

const { Sider, Header, Content } = AntLayout;
const RAIL_WIDTH = 60;

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const currentPageTitle = useUiStore((s) => s.currentPageTitle);
  const mobileMenuOpen = useUiStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUiStore((s) => s.setMobileMenuOpen);
  const activeWorkspace = useUiStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useUiStore((s) => s.setActiveWorkspace);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const isMobile = useIsMobile();
  const [searchValue, setSearchValue] = useState('');

  // Revalidate the locally cached user against the server: role and permissions
  // may have changed since the token was issued. A 401 here logs the user out
  // via the api client's response interceptor.
  useCurrentUser();

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  // Keep the active workspace in sync when the route changes (deep links, back/forward)
  useEffect(() => {
    const ws = workspaceForPath(location.pathname);
    if (ws && ws.key !== activeWorkspace) {
      setActiveWorkspace(ws.key);
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) {
    return null;
  }

  const handleLogout = () => logout();
  const roleColor = user?.role ? getRoleColor(user.role) : '#7A7A7A';
  const accent = workspaceByKey(activeWorkspace)?.accent ?? '#9FA3A8';
  const sidebarLeft = isMobile ? 0 : RAIL_WIDTH;
  const contentMargin = isMobile ? 0 : RAIL_WIDTH + (collapsed ? 64 : 240);

  const runSearch = () => {
    const q = searchValue.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <AntLayout style={{ minHeight: '100vh', background: '#0A0A0A' }}>
      {isMobile ? (
        <Drawer
          placement="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          width={280}
          closable={false}
          styles={{ body: { padding: 0, background: '#0F0F0F' } }}
        >
          <Sidebar showWorkspaceChips onNavigate={() => setMobileMenuOpen(false)} />
        </Drawer>
      ) : (
        <>
          {/* Workspace switcher rail */}
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 101 }}>
            <WorkspaceRail />
          </div>
          {/* Contextual sidebar */}
          <Sider
            collapsed={collapsed}
            width={240}
            collapsedWidth={64}
            style={{
              position: 'fixed',
              left: sidebarLeft,
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
        </>
      )}

      <AntLayout
        style={{
          marginLeft: contentMargin,
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
            padding: isMobile ? '0 12px' : '0 24px',
            height: 56,
            lineHeight: '56px',
            background: 'rgba(10, 10, 10, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: `1px solid rgba(${hexToRgb(accent)}, 0.18)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {isMobile && (
              <MenuOutlined
                onClick={() => setMobileMenuOpen(true)}
                style={{ fontSize: 18, color: '#F2F2F2', cursor: 'pointer', padding: 4 }}
              />
            )}
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#F2F2F2',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentPageTitle}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
            {!isMobile && (
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onPressEnter={runSearch}
                placeholder="Search everything…"
                prefix={<SearchOutlined style={{ color: '#7A7A7A' }} />}
                style={{
                  width: 240,
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserOutlined style={{ color: '#B8B8B8', fontSize: 14 }} />
              {!isMobile && (
                <span style={{ color: '#F2F2F2', fontSize: 13, fontWeight: 500 }}>
                  {user?.full_name || user?.username || 'User'}
                </span>
              )}
              {user?.role && !isMobile && (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 500,
                    lineHeight: '18px',
                    color: roleColor,
                    background: `rgba(${hexToRgb(roleColor)}, 0.12)`,
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
              {!isMobile && <span>Logout</span>}
            </div>
          </div>
        </Header>
        <Content
          style={{
            padding: isMobile ? 12 : 24,
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
