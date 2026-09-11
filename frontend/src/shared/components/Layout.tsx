import { useEffect } from 'react';
import { capturePageview } from '@/shared/lib/analytics';
import { Layout as AntLayout, Drawer } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav, { TOPNAV_HEIGHT } from './TopNav';
import MobileTabBar, { TABBAR_HEIGHT } from './MobileTabBar';
import ViewAsBar from './ViewAsBar';
import { useUiStore } from '@/shared/stores/uiStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { useCurrentUser } from '@/modules/auth/hooks/useAuth';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { workspaceForPath, workspaceByKey, hasContextualNav } from '@/shared/config/workspaces';
import ErrorBoundary from './ErrorBoundary';
import { isDemo, exitDemo, DEMO_BANNER_HEIGHT } from '@/shared/demo/demo';

const { Sider, Content } = AntLayout;

/**
 * Shell: a full-width top bar switches workspaces, a contextual sidebar below it
 * lists that workspace's pages. On mobile the sidebar becomes a drawer and
 * workspace switching moves to a bottom tab bar.
 */
export default function Layout() {
  // react-router changes the URL without a page load, so PostHog would
  // otherwise record one pageview per session.
  const location = useLocation();
  useEffect(() => {
    capturePageview(location.pathname);
  }, [location.pathname]);

  const navigate = useNavigate();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const mobileMenuOpen = useUiStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUiStore((s) => s.setMobileMenuOpen);
  const activeWorkspace = useUiStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useUiStore((s) => s.setActiveWorkspace);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isMobile = useIsMobile();

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

  // A workspace whose only entry is its own landing page gets no sidebar — the
  // dashboard and the downloads library use the full width instead.
  const showSidebar = hasContextualNav(workspaceByKey(activeWorkspace), user);
  const sidebarWidth = collapsed ? 64 : 240;
  const contentMargin = isMobile || !showSidebar ? 0 : sidebarWidth;

  // In demo mode a slim read-only banner sits above the top nav; everything
  // fixed to the top slides down by its height so nothing is covered.
  const demo = isDemo();
  const topOffset = TOPNAV_HEIGHT + (demo ? DEMO_BANNER_HEIGHT : 0);

  return (
    <AntLayout style={{ minHeight: '100dvh', background: 'var(--bg-main)' }}>
      {demo && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: DEMO_BANNER_HEIGHT,
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '0 12px',
            background: 'rgba(182, 138, 60, 0.22)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--status-not-working)',
            color: 'var(--text-primary)',
            fontSize: 12,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <strong>Demo mode</strong>
            {isMobile ? ' — sample data, read-only.' : ' — sample data, read-only. Nothing here is real.'}
          </span>
          <button
            type="button"
            onClick={() => exitDemo()}
            style={{
              flexShrink: 0,
              border: '1px solid var(--status-not-working)',
              background: 'transparent',
              color: 'var(--text-primary)',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              lineHeight: '18px',
              padding: '0 10px',
              cursor: 'pointer',
            }}
          >
            Exit demo
          </button>
        </div>
      )}
      <TopNav />

      {isMobile ? (
        <Drawer
          placement="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          width={280}
          closable={false}
          styles={{ body: { padding: 0, background: 'var(--bg-sidebar)' } }}
        >
          <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
        </Drawer>
      ) : (
        showSidebar && (
          <Sider
            collapsed={collapsed}
            width={240}
            collapsedWidth={64}
            style={{
              position: 'fixed',
              left: 0,
              top: topOffset,
              bottom: 0,
              zIndex: 100,
              background: 'transparent',
              borderRight: '1px solid var(--overlay-subtle)',
              overflow: 'hidden',
            }}
            trigger={null}
          >
            <Sidebar />
          </Sider>
        )
      )}

      <AntLayout
        style={{
          marginLeft: contentMargin,
          marginTop: topOffset,
          transition: 'margin-left 0.3s ease',
          background: 'var(--bg-main)',
        }}
      >
        <Content
          style={{
            padding: isMobile ? 12 : 24,
            // Leave room for the bottom tab bar so the last row is never
            // trapped underneath it.
            paddingBottom: isMobile ? TABBAR_HEIGHT + 16 : 24,
            minHeight: `calc(100dvh - ${topOffset}px)`,
            background: 'var(--bg-main)',
          }}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Content>
      </AntLayout>

      {isMobile && <MobileTabBar />}
      <ViewAsBar />
    </AntLayout>
  );
}
