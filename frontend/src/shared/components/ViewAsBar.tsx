import { useState } from 'react';
import { Select } from 'antd';
import { EyeOutlined, CloseOutlined } from '@ant-design/icons';
import { useRoles } from '@/modules/access/hooks/useAccess';
import { useAuthStore } from '@/shared/stores/authStore';
import { useViewAsStore } from '@/shared/stores/viewAsStore';

/**
 * The preview switcher, plus the banner that says a preview is running.
 *
 * The banner is not decoration. Without it an admin who forgets they are
 * previewing files a bug report about missing features.
 */
export default function ViewAsBar() {
  const user = useAuthStore((s) => s.user);
  const { roleName, permissions, setViewAs, clear } = useViewAsStore();
  const { data: roles } = useRoles();
  const [open, setOpen] = useState(false);

  // Only someone who can read the role list has any business previewing one.
  const mayPreview =
    user?.role === 'ADMIN' ||
    (Array.isArray(user?.permissions) && user!.permissions!.includes('users.read'));
  if (!mayPreview) return null;

  if (permissions) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '10px 16px',
          background: '#8A6212',
          color: '#fff',
          fontSize: 13,
          flexWrap: 'wrap',
        }}
      >
        <EyeOutlined />
        <span>
          Previewing as <strong>{roleName}</strong> — this changes what you see,
          not what you can do.
        </span>
        <button
          type="button"
          onClick={clear}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.18)',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            padding: '4px 12px',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          <CloseOutlined /> Stop
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Preview the app as another role"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          borderRadius: 20,
          border: '1px solid var(--overlay-subtle)',
          background: 'var(--bg-card)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}
      >
        <EyeOutlined /> View as
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 12,
        border: '1px solid var(--overlay-subtle)',
        background: 'var(--bg-card)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}
    >
      <Select
        autoFocus
        style={{ minWidth: 200 }}
        placeholder="Preview as which role?"
        options={(roles ?? []).map((r) => ({ value: r.id, label: r.name }))}
        onChange={(id) => {
          const role = (roles ?? []).find((r) => r.id === id);
          if (role) {
            setViewAs(role.name, role.permissions);
            setOpen(false);
          }
        }}
      />
      <button
        type="button"
        onClick={() => setOpen(false)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
        }}
      >
        <CloseOutlined />
      </button>
    </div>
  );
}
