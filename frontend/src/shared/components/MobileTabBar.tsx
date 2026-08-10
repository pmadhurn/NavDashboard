import { useState } from 'react';
import { Drawer } from 'antd';
import { EllipsisOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';
import { useUiStore } from '@/shared/stores/uiStore';
import { visibleWorkspaces, visibleItems, Workspace } from '@/shared/config/workspaces';

export const TABBAR_HEIGHT = 58;

/** Slots on the bar itself; anything beyond this goes into the More sheet. */
const PRIMARY_SLOTS = 4;

/**
 * Bottom workspace switcher for mobile. Module switching is the single most
 * frequent navigation act for a field user, so it sits in thumb reach rather
 * than behind the top-left drawer.
 *
 * There are more workspaces than slots, so the first four render inline and the
 * rest live in a More sheet — with one exception: if the *active* workspace is
 * one of the overflow ones, it takes the fourth slot so the bar always shows
 * where you are.
 */
export default function MobileTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const activeWorkspace = useUiStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useUiStore((s) => s.setActiveWorkspace);
  const [moreOpen, setMoreOpen] = useState(false);

  const workspaces = visibleWorkspaces(user);

  const openWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws.key);
    const first = visibleItems(ws, user)[0];
    if (first && location.pathname !== first.key) navigate(first.key);
    setMoreOpen(false);
  };

  let primary = workspaces.slice(0, PRIMARY_SLOTS);
  let overflow = workspaces.slice(PRIMARY_SLOTS);

  // Keep the active workspace visible on the bar even when it lives in overflow.
  const activeInOverflow = overflow.find((ws) => ws.key === activeWorkspace);
  if (activeInOverflow) {
    primary = [...primary.slice(0, PRIMARY_SLOTS - 1), activeInOverflow];
    overflow = workspaces.filter((ws) => !primary.includes(ws));
  }

  const renderTab = (ws: Workspace) => {
    const active = ws.key === activeWorkspace;
    return (
      <button
        key={ws.key}
        type="button"
        onClick={() => openWorkspace(ws)}
        aria-current={active ? 'page' : undefined}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          padding: '6px 2px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: active ? ws.accent : 'var(--text-muted)',
          transition: 'color 0.2s ease',
        }}
      >
        <span style={{ fontSize: 18, display: 'flex', lineHeight: 1 }}>{ws.icon}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: active ? 600 : 400,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {ws.shortLabel ?? ws.label}
        </span>
      </button>
    );
  };

  return (
    <>
      <nav
        aria-label="Workspaces"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 200,
          height: TABBAR_HEIGHT,
          display: 'flex',
          alignItems: 'stretch',
          background: 'var(--header-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--overlay-subtle)',
          // Respect the iOS home indicator.
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxSizing: 'content-box',
        }}
      >
        {primary.map(renderTab)}
        {overflow.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More workspaces"
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '6px 2px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ fontSize: 18, display: 'flex', lineHeight: 1 }}>
              <EllipsisOutlined />
            </span>
            <span style={{ fontSize: 10 }}>More</span>
          </button>
        )}
      </nav>

      <Drawer
        placement="bottom"
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        height="auto"
        closable={false}
        styles={{ body: { padding: 16, background: 'var(--bg-sidebar)' } }}
      >
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: 1 }}>
          WORKSPACES
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {overflow.map((ws) => (
            <button
              key={ws.key}
              type="button"
              onClick={() => openWorkspace(ws)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '16px 8px',
                borderRadius: 12,
                border: '1px solid var(--overlay-subtle)',
                background: 'var(--overlay-subtle)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              <span style={{ fontSize: 20, color: ws.accent, display: 'flex' }}>{ws.icon}</span>
              <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{ws.shortLabel ?? ws.label}</span>
            </button>
          ))}
        </div>
      </Drawer>
    </>
  );
}
