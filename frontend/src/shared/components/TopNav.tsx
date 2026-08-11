import { useState } from 'react';
import { Input, Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  SearchOutlined,
  LogoutOutlined,
  UserOutlined,
  BulbOutlined,
  MoonOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/shared/stores/authStore';
import { useUiStore } from '@/shared/stores/uiStore';
import { useThemeStore } from '@/shared/stores/themeStore';
import { useLogout } from '@/modules/auth/hooks/useAuth';
import { getRoleColor } from '@/shared/utils/colors';
import { visibleWorkspaces, visibleItems, Workspace } from '@/shared/config/workspaces';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

export const TOPNAV_HEIGHT = 56;

/**
 * The module switcher. Workspaces are tabs here; the sidebar below carries only
 * the active workspace's pages, so the two axes never mix.
 *
 * On mobile this collapses to brand + hamburger (contextual drawer) + search,
 * because workspace switching moves to the bottom tab bar within thumb reach.
 */
export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const user = useAuthStore((s) => s.user);
  const activeWorkspace = useUiStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useUiStore((s) => s.setActiveWorkspace);
  const setMobileMenuOpen = useUiStore((s) => s.setMobileMenuOpen);
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const logout = useLogout();
  const [searchValue, setSearchValue] = useState('');

  const workspaces = visibleWorkspaces(user);
  const roleColor = user?.role ? getRoleColor(user.role) : 'var(--text-muted)';
  const isDark = mode === 'dark';

  const runSearch = () => {
    const q = searchValue.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  /** Switching workspace lands on its first visible page. */
  const openWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws.key);
    const first = visibleItems(ws, user)[0];
    if (first && location.pathname !== first.key) navigate(first.key);
  };

  const userMenu: MenuProps['items'] = [
    {
      key: 'who',
      disabled: true,
      label: (
        <div style={{ padding: '2px 0' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {user?.full_name || user?.username || 'User'}
          </div>
          {user?.role && (
            <div style={{ fontSize: 11, color: roleColor }}>{user.role}</div>
          )}
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: () => logout(),
    },
  ];

  return (
    <header
      className="navdash-topnav"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        height: TOPNAV_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 8 : 16,
        padding: isMobile ? '0 12px' : '0 16px',
        background: 'var(--header-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--overlay-subtle)',
        boxSizing: 'border-box',
      }}
    >
      {isMobile && (
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileMenuOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: 18,
            padding: 4,
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <MenuOutlined />
        </button>
      )}

      {/* Brand */}
      <div
        onClick={() => navigate('/')}
        style={{
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: 0.5,
          color: 'var(--text-primary)',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        Nav<span style={{ color: 'var(--secondary)' }}>Dashboard</span>
      </div>

      {/* Workspace tabs — desktop only; mobile uses the bottom bar */}
      {!isMobile && (
        <nav className="navdash-tabs" aria-label="Workspaces">
          {workspaces.map((ws) => {
            const active = ws.key === activeWorkspace;
            return (
              <button
                key={ws.key}
                type="button"
                onClick={() => openWorkspace(ws)}
                aria-current={active ? 'page' : undefined}
                // Below 1500px the label is hidden and only the icon remains,
                // so the accessible name has to come from somewhere.
                title={ws.label}
                aria-label={ws.label}
                className={`navdash-tab${active ? ' is-active' : ''}`}
                style={{
                  ['--tab-accent' as string]: ws.accent,
                }}
              >
                <span style={{ display: 'flex', fontSize: 14 }}>{ws.icon}</span>
                <span>{ws.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <div style={{ flex: 1, minWidth: 0 }} />

      {/* Search */}
      {isMobile ? (
        <button
          type="button"
          aria-label="Search"
          onClick={() => navigate('/search')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: 17,
            padding: 4,
            cursor: 'pointer',
            display: 'flex',
          }}
        >
          <SearchOutlined />
        </button>
      ) : (
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onPressEnter={runSearch}
          placeholder="Search everything…"
          prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
          style={{
            width: 220,
            flexShrink: 0,
            background: 'var(--overlay-subtle)',
            borderColor: 'var(--overlay-subtle)',
          }}
        />
      )}

      {/* Theme */}
      <Tooltip title={isDark ? 'Switch to light' : 'Switch to dark'}>
        <button
          type="button"
          aria-label={isDark ? 'Switch to light' : 'Switch to dark'}
          onClick={toggleTheme}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: 16,
            padding: 4,
            cursor: 'pointer',
            display: 'flex',
            flexShrink: 0,
          }}
        >
          {isDark ? <BulbOutlined /> : <MoonOutlined />}
        </button>
      </Tooltip>

      {/* User */}
      <Dropdown menu={{ items: userMenu }} trigger={['click']} placement="bottomRight">
        <button
          type="button"
          aria-label="Account"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 8,
            color: 'var(--text-primary)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--overlay-subtle)',
              color: roleColor,
              fontSize: 13,
            }}
          >
            <UserOutlined />
          </span>
          {!isMobile && (
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {user?.full_name || user?.username || 'User'}
            </span>
          )}
        </button>
      </Dropdown>
    </header>
  );
}
