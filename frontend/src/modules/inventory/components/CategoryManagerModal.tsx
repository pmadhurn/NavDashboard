import { useState } from 'react';
import { Input, Switch } from 'antd';
import GlassModal from '@/shared/components/GlassModal';
import EmptyState from '@/shared/components/EmptyState';
import { useAssetCategories, useUpdateAssetCategory } from '../hooks/useAssets';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Category housekeeping: rename inline, and flip the "serial required" policy
 * per category. The policy is what forces one-by-one entry in the asset form.
 */
export default function CategoryManagerModal({ open, onClose }: Props) {
  const { data: categories } = useAssetCategories();
  const update = useUpdateAssetCategory();
  // Local drafts so typing does not fire a PUT per keystroke; saved on blur/Enter.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const saveName = (id: string, original: string) => {
    const draft = drafts[id];
    if (draft === undefined) return;
    const name = draft.trim();
    if (!name || name === original) {
      setDrafts((d) => {
        const { [id]: _dropped, ...rest } = d;
        return rest;
      });
      return;
    }
    update.mutate(
      { id, data: { name } },
      {
        onSuccess: () =>
          setDrafts((d) => {
            const { [id]: _dropped, ...rest } = d;
            return rest;
          }),
      }
    );
  };

  return (
    <GlassModal open={open} onClose={onClose} title="Manage categories" width={520} footer={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--overlay-subtle)',
          }}
        >
          Items in these categories must be entered one-by-one with a serial
          number. Leave off for small items like patch cords.
        </div>

        {(categories ?? []).length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Categories are created from the Add Asset form."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
            {(categories ?? []).map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'var(--overlay-subtle)',
                }}
              >
                <Input
                  value={drafts[c.id] ?? c.name}
                  onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                  onBlur={() => saveName(c.id, c.name)}
                  onPressEnter={() => saveName(c.id, c.name)}
                  size="small"
                  style={{ flex: 1 }}
                />
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  Serial required
                  <Switch
                    size="small"
                    checked={!!c.requires_serial}
                    onChange={(v) => update.mutate({ id: c.id, data: { requires_serial: v } })}
                    style={{
                      background: c.requires_serial ? 'var(--status-working)' : '#4A4A4A',
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassModal>
  );
}
