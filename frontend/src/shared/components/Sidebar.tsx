import { Menu } from 'antd';
import { HomeOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUiStore } from '@/shared/stores/uiStore';
import { useAuthStore } from '@/shared/stores/authStore';
import {
  visibleWorkspaces,
  visibleItems,
  workspaceByKey,
  Workspace,
} from '@/shared/config/workspaces';

interface SidebarProps {
  /** Called after navigating (used by the mobile drawer to close itself). */
  onNavigate?: () => void;
  /** Show a horizontal workspace selector at the top (mobile drawer). */
  showWorkspaceChips?: boolean;
}

export default function Sidebar({ onNavigate, showWorkspaceChips }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const inDrawer = Boolean(onNavigate);
  const collapsed = useUiStore((s) => s.sidebarCollapsed) && !inDrawer;
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const activeWorkspaceKey = useUiStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useUiStore((s) => s.setActiveWorkspace);
  const user = useAuthStore((s) => s.user);

  const workspaces = visibleWorkspaces(user);
  // Prefer the active workspace, but only if the user can actually see items in
  // it; otherwise fall back to the first workspace they have access to.
  const activeCandidate = workspaceByKey(activeWorkspaceKey);
  const workspace: Workspace | undefined =
    activeCandidate && visibleItems(activeCandidate, user).length > 0
      ? activeCandidate
      : workspaces[0];
  const accent = workspace?.accent ?? '#9FA3A8';

  const items = workspace ? visibleItems(workspace, user) : [];
  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: 'Home' },
    ...items.map(({ key, icon, label }) => ({ key, icon, label })),
  ];

  const selectedKey =
    location.pathname === '/'
      ? '/'
      : items.find(
          (item) =>
            item.key === location.pathname ||
            location.pathname.startsWith(item.key + '/')
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
        // expose the workspace accent to descendants
        ['--ws-accent' as string]: accent,
      }}
    >
      {/* Workspace header */}
      <div
        style={{
          padding: collapsed ? '16px 0' : '18px 20px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          minHeight: 64,
          boxSizing: 'border-box',
        }}
      >
        <span style={{ color: accent, fontSize: 18, display: 'flex' }}>{workspace?.icon}</span>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F2F2F2', lineHeight: 1.1 }}>
              {workspace?.label ?? 'NavOS'}
            </div>
            <div style={{ fontSize: 10, color: '#6A6A6A', letterSpacing: 1, textTransform: 'uppercase' }}>
              NavOS
            </div>
          </div>
        )}
      </div>

      {/* Mobile workspace chips */}
      {showWorkspaceChips && (
        <div style={{ display: 'flex', gap: 6, padding: '10px 12px', flexWrap: 'wrap' }}>
          {workspaces.map((ws) => {
            const active = ws.key === workspace?.key;
            return (
              <button
                key={ws.key}
                onClick={() => {
                  setActiveWorkspace(ws.key);
                  const first = visibleItems(ws, user)[0];
                  if (first) navigate(first.key);
                  onNavigate?.();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  cursor: 'pointer',
                  border: `1px solid ${active ? ws.accent : 'rgba(255,255,255,0.08)'}`,
                  background: active ? `${ws.accent}22` : 'rgba(255,255,255,0.02)',
                  color: active ? ws.accent : '#9A9A9A',
                }}
              >
                {ws.icon}
                {ws.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
        <Menu
          mode="inline"
          theme="dark"
          inlineCollapsed={collapsed}
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => {
            navigate(key);
            onNavigate?.();
          }}
          style={{ border: 'none', background: 'transparent' }}
        />
      </div>

      {/* Collapse Toggle (hidden inside the mobile drawer) */}
      <div
        style={{
          padding: 12,
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          textAlign: 'center',
          display: inDrawer ? 'none' : 'block',
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
