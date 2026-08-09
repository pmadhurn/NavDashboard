import React from 'react';
import { Tooltip } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUiStore } from '@/shared/stores/uiStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { visibleWorkspaces, visibleItems, Workspace } from '@/shared/config/workspaces';

const RAIL_WIDTH = 60;

/**
 * The NavOS workspace switcher — a slim vertical icon rail. Clicking a
 * workspace activates it and jumps to its first visible item. A Home button
 * at the top always returns to the landing dashboard.
 */
export default function WorkspaceRail({ onSwitch }: { onSwitch?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const activeWorkspace = useUiStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useUiStore((s) => s.setActiveWorkspace);

  const workspaces = visibleWorkspaces(user);
  const isHome = location.pathname === '/';

  const openWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws.key);
    const first = visibleItems(ws, user)[0];
    if (first) navigate(first.key);
    onSwitch?.();
  };

  return (
    <div
      style={{
        width: RAIL_WIDTH,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '12px 0',
        height: '100%',
        background: 'var(--glass-rail-bg)',
        borderRight: '1px solid var(--overlay-subtle)',
      }}
    >
      <img
        src="/logo.png"
        alt="NavOS"
        style={{ width: 30, height: 30, objectFit: 'contain', marginBottom: 8 }}
      />

      <RailButton
        label="Home"
        active={isHome}
        accent="var(--secondary)"
        onClick={() => {
          navigate('/');
          onSwitch?.();
        }}
      >
        <HomeOutlined />
      </RailButton>

      <div style={{ width: 24, height: 1, background: 'var(--overlay-medium)', margin: '4px 0' }} />

      {workspaces.map((ws) => (
        <RailButton
          key={ws.key}
          label={ws.label}
          active={!isHome && activeWorkspace === ws.key}
          accent={ws.accent}
          onClick={() => openWorkspace(ws)}
        >
          {ws.icon}
        </RailButton>
      ))}
    </div>
  );
}

function RailButton({
  children,
  label,
  active,
  accent,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <Tooltip title={label} placement="right">
      <div
        onClick={onClick}
        style={{
          position: 'relative',
          width: 42,
          height: 42,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          cursor: 'pointer',
          fontSize: 18,
          color: active ? accent : 'var(--text-muted)',
          background: active ? `${accent}1F` : 'transparent',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.color = '#D8D8D8';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }
        }}
      >
        {active && (
          <span
            style={{
              position: 'absolute',
              left: -12,
              top: 10,
              bottom: 10,
              width: 3,
              borderRadius: 2,
              background: accent,
            }}
          />
        )}
        {children}
      </div>
    </Tooltip>
  );
}
