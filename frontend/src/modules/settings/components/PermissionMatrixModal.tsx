import { useEffect, useState } from 'react';
import GlassModal from '@/shared/components/GlassModal';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import {
  useUserPermissions,
  useSetUserPermissions,
  PermissionMap,
} from '../hooks/useSettings';
import type { UserItem } from '../hooks/useSettings';

const SECTIONS: { key: string; label: string }[] = [
  { key: 'devices', label: 'Devices & Map' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'projects', label: 'Projects' },
  { key: 'downloads', label: 'Downloads' },
  { key: 'finance', label: 'Finance' },
  { key: 'personnel', label: 'Personnel' },
  { key: 'documents', label: 'Documents' },
  { key: 'troubleshooting', label: 'Troubleshooting' },
  { key: 'reports', label: 'Reports' },
  { key: 'ai', label: 'AI Assistant' },
  { key: 'admin', label: 'Admin' },
];

const LEVELS = ['NONE', 'VIEW', 'EDIT', 'MANAGE'] as const;

const LEVEL_COLORS: Record<string, string> = {
  NONE: 'var(--chart4)',
  VIEW: 'var(--role-technician)',
  EDIT: '#8C8468',
  MANAGE: 'var(--status-working)',
};

interface Props {
  user: UserItem | null;
  onClose: () => void;
}

export default function PermissionMatrixModal({ user, onClose }: Props) {
  const { data, isLoading } = useUserPermissions(user?.id ?? null);
  const setPermissions = useSetUserPermissions();
  const [draft, setDraft] = useState<PermissionMap>({});

  useEffect(() => {
    if (data?.permissions) {
      setDraft(data.permissions);
    }
  }, [data]);

  const handleSave = async () => {
    if (!user) return;
    const full: PermissionMap = {};
    for (const section of SECTIONS) {
      full[section.key] = draft[section.key] ?? 'NONE';
    }
    await setPermissions.mutateAsync({ id: user.id, permissions: full });
    onClose();
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <GlassModal
      open={!!user}
      onClose={onClose}
      title={`Permissions — ${user?.full_name ?? ''}`}
      width={560}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            onClick={handleSave}
            loading={setPermissions.isPending}
            disabled={isAdmin}
          >
            Save Permissions
          </GlassButton>
        </div>
      }
    >
      {isLoading ? (
        <LoadingSpinner text="Loading permissions..." />
      ) : isAdmin ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '12px 0' }}>
          Admins automatically have full access to every section.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SECTIONS.map((section) => {
            const current = draft[section.key] ?? 'NONE';
            return (
              <div
                key={section.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ color: 'var(--primary)', fontSize: 13, minWidth: 130 }}>
                  {section.label}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {LEVELS.map((level) => {
                    const active = current === level;
                    return (
                      <button
                        key={level}
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, [section.key]: level }))
                        }
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: 0.3,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          border: `1px solid ${
                            active ? LEVEL_COLORS[level] : 'rgba(255,255,255,0.06)'
                          }`,
                          background: active
                            ? `${LEVEL_COLORS[level]}33`
                            : 'rgba(255,255,255,0.02)',
                          color: active ? LEVEL_COLORS[level] : 'var(--text-muted)',
                        }}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassModal>
  );
}
