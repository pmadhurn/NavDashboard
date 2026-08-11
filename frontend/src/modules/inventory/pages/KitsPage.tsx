import { useEffect, useState } from 'react';
import { Input, Popconfirm, Tag } from 'antd';
import { AppstoreAddOutlined, PlusOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassModal from '@/shared/components/GlassModal';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { usePermission } from '@/shared/stores/authStore';
import { useAssets } from '../hooks/useAssets';
import { Bundle, useBundles, useDeleteBundle, useSaveBundle } from '../hooks/useMovement';

function KitModal({
  kit,
  open,
  onClose,
}: {
  kit: Bundle | null;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const { data: assets } = useAssets({ search });
  const save = useSaveBundle();

  useEffect(() => {
    setName(kit?.name ?? '');
    setDescription(kit?.description ?? '');
    setPicked((kit?.items ?? []).map((i) => i.id));
  }, [kit, open]);

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={kit ? `Edit — ${kit.name}` : 'New kit'}
      width={620}
      footer={null}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kit name, e.g. Troubleshooting Kit" />
        <Input.TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="What is it for?"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items to add…"
          allowClear
        />
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {picked.length} item{picked.length === 1 ? '' : 's'} in this kit. A kit is a
          shortcut for picking — the items inside stay tracked individually.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
          {(assets?.items ?? []).map((a) => {
            const on = picked.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setPicked(on ? picked.filter((x) => x !== a.id) : [...picked, a.id])}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: `1px solid ${on ? '#6F8CB6' : 'transparent'}`,
                  background: on ? 'rgba(111,140,182,0.12)' : 'var(--overlay-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 78 }}>
                  {a.asset_code}
                </span>
                <span style={{ fontSize: 13, flex: 1 }}>{a.name}</span>
                {on && <CheckOutlined style={{ color: '#6F8CB6' }} />}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            onClick={() =>
              save.mutate(
                { id: kit?.id, name: name.trim(), description: description.trim() || undefined, asset_ids: picked },
                { onSuccess: onClose }
              )
            }
            disabled={!name.trim() || save.isPending}
          >
            Save kit
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

export default function KitsPage() {
  const { data: kits, isLoading } = useBundles();
  const del = useDeleteBundle();
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [open, setOpen] = useState(false);
  const canManage = usePermission('assets.bundles');

  return (
    <div>
      <PageHeader
        title="Kits"
        icon={<AppstoreAddOutlined />}
        subtitle="Sets normally taken together — pick the kit, not twelve items"
        actions={
          canManage && (
            <GlassButton
              icon={<PlusOutlined />}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              New kit
            </GlassButton>
          )
        }
      />

      <KitModal kit={editing} open={open} onClose={() => setOpen(false)} />

      {isLoading ? (
        <LoadingSpinner text="Loading kits…" />
      ) : (kits ?? []).length === 0 ? (
        <EmptyState
          icon={<AppstoreAddOutlined />}
          title="No kits yet"
          description="Group the things that always travel together — a troubleshooting kit, a survey kit."
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {(kits ?? []).map((k) => {
            const ready = k.items.filter((i) => i.available).length;
            return (
              <GlassCard key={k.id}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{k.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, minHeight: 30 }}>
                  {k.description}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                  {ready} of {k.items.length} available now
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                  {k.items.map((i) => (
                    <Tag
                      key={i.id}
                      style={{
                        margin: 0,
                        fontSize: 10,
                        background: 'transparent',
                        color: i.available ? 'var(--text-secondary)' : 'var(--text-muted)',
                        borderColor: i.available ? 'var(--overlay-subtle)' : 'var(--status-not-working)',
                      }}
                      title={i.available ? 'In stock' : 'Currently out'}
                    >
                      {i.name}
                    </Tag>
                  ))}
                </div>
                {canManage && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(k);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </GlassButton>
                    <Popconfirm
                      title="Remove this kit?"
                      description="The items in it are not affected."
                      onConfirm={() => del.mutate(k.id)}
                    >
                      <GlassButton size="sm" variant="ghost" icon={<DeleteOutlined />}>
                        {''}
                      </GlassButton>
                    </Popconfirm>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
