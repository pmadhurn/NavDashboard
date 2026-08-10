import { Menu } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
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
}

/**
 * Contextual navigation: the pages of the *active* workspace, and nothing else.
 * Switching workspaces is the top bar's job (desktop) or the bottom tab bar's
 * (mobile) — keeping the two axes apart is what removes the old confusion.
 */
export default function Sidebar({ onNavigate }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const inDrawer = Boolean(onNavigate);
  const collapsed = useUiStore((s) => s.sidebarCollapsed) && !inDrawer;
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const activeWorkspaceKey = useUiStore((s) => s.activeWorkspace);
  const user = useAuthStore((s) => s.user);

  const workspaces = visibleWorkspaces(user);
  // Prefer the active workspace, but only if the user can actually see items in
  // it; otherwise fall back to the first workspace they have access to.
  const activeCandidate = workspaceByKey(activeWorkspaceKey);
  const workspace: Workspace | undefined =
    activeCandidate && visibleItems(activeCandidate, user).length > 0
      ? activeCandidate
      : workspaces[0];
  const accent = workspace?.accent ?? 'var(--secondary)';

  const items = workspace ? visibleItems(workspace, user) : [];
  const menuItems = items.map(({ key, icon, label }) => ({ key, icon, label }));

  const selectedKey =
    items.find(
      (item) =>
        item.key === location.pathname || location.pathname.startsWith(item.key + '/')
    )?.key ?? '';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--glass-sidebar-bg)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        // expose the workspace accent to descendants
        ['--ws-accent' as string]: accent,
      }}
    >
      {/* Which workspace these items belong to */}
      <div
        style={{
          padding: collapsed ? '14px 0' : '14px 20px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
          borderBottom: '1px solid var(--overlay-subtle)',
          minHeight: 52,
          boxSizing: 'border-box',
        }}
      >
        <span style={{ color: accent, fontSize: 17, display: 'flex' }}>{workspace?.icon}</span>
        {!collapsed && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              letterSpacing: 0.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {workspace?.label ?? 'NavOS'}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
        <Menu
          mode="inline"
          theme="dark"
          inlineCollapsed={collapsed}
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={menuItems}
          onClick={({ key }) => {
            navigate(key);
            onNavigate?.();
          }}
          style={{ border: 'none', background: 'transparent' }}
        />
      </div>

      {/* Collapse toggle (hidden inside the mobile drawer) */}
      <div
        style={{
          padding: 10,
          borderTop: '1px solid var(--overlay-subtle)',
          display: inDrawer ? 'none' : 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          onClick={toggleSidebar}
          role="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            color: 'var(--text-muted)',
            transition: 'all 0.3s ease',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--sidebar-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          {collapsed ? (
            <MenuUnfoldOutlined style={{ fontSize: 17 }} />
          ) : (
            <MenuFoldOutlined style={{ fontSize: 17 }} />
          )}
        </div>
      </div>
    </div>
  );
}
