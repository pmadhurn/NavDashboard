import { useState } from 'react';
import { Select, message } from 'antd';
import { PlusOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons';
import GlassModal from '@/shared/components/GlassModal';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import { useAssets } from '@/modules/inventory/hooks/useAssets';
import {
  usePreviewOutward,
  useExecuteOutward,
  OutwardLineInput,
  OutwardPreview,
} from '../hooks/useProjects';

interface Line {
  key: number;
  assetId?: string;
  name: string;
  quantity: number;
}

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

/**
 * The outward form: site team lists everything they're taking to site. Each line
 * pulls live from inventory; new items are created on the fly; stock conflicts
 * (taking more than available) are surfaced and confirmed before saving.
 */
export default function OutwardForm({ projectId, open, onClose }: Props) {
  const [lines, setLines] = useState<Line[]>([{ key: 1, name: '', quantity: 1 }]);
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<OutwardPreview | null>(null);

  const { data: assetData } = useAssets({ search });
  const previewOutward = usePreviewOutward(projectId);
  const executeOutward = useExecuteOutward(projectId);

  const reset = () => {
    setLines([{ key: 1, name: '', quantity: 1 }]);
    setReceivedBy('');
    setNotes('');
    setPreview(null);
  };

  const toInputs = (): OutwardLineInput[] =>
    lines
      .filter((l) => l.assetId || l.name.trim())
      .map((l) => ({
        asset_id: l.assetId,
        name: l.assetId ? undefined : l.name.trim(),
        quantity: l.quantity,
      }));

  const addLine = () =>
    setLines((prev) => [...prev, { key: Math.max(0, ...prev.map((l) => l.key)) + 1, name: '', quantity: 1 }]);

  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key));

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const handleReview = async () => {
    const items = toInputs();
    if (!items.length) {
      message.warning('Add at least one item');
      return;
    }
    const result = await previewOutward.mutateAsync(items);
    setPreview(result);
    if (!result.has_conflicts) {
      // no conflicts → save straight away
      await executeOutward.mutateAsync({
        items,
        received_by_name: receivedBy.trim() || undefined,
        notes: notes.trim() || undefined,
        confirm: false,
      });
      reset();
      onClose();
    }
  };

  const handleConfirm = async () => {
    await executeOutward.mutateAsync({
      items: toInputs(),
      received_by_name: receivedBy.trim() || undefined,
      notes: notes.trim() || undefined,
      confirm: true,
    });
    reset();
    onClose();
  };

  const assetOptions = (assetData?.items ?? []).map((a) => ({
    value: a.id,
    label: `${a.asset_code} — ${a.name}`,
  }));

  return (
    <GlassModal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Outward — send equipment to site"
      width={620}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <GlassButton variant="ghost" icon={<PlusOutlined />} onClick={addLine}>
            Add line
          </GlassButton>
          <div style={{ display: 'flex', gap: 8 }}>
            <GlassButton variant="ghost" onClick={() => { reset(); onClose(); }}>
              Cancel
            </GlassButton>
            {preview?.has_conflicts ? (
              <GlassButton onClick={handleConfirm} loading={executeOutward.isPending}>
                Confirm & Save Anyway
              </GlassButton>
            ) : (
              <GlassButton
                onClick={handleReview}
                loading={previewOutward.isPending || executeOutward.isPending}
              >
                Review & Save
              </GlassButton>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lines.map((line) => {
          const conflict = preview?.lines.find(
            (r) => (r.asset_id && r.asset_id === line.assetId) || r.label === line.name
          );
          return (
            <div key={line.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Select
                  className="dl-select"
                  style={{ width: '100%' }}
                  showSearch
                  allowClear
                  placeholder="Type to search inventory, or type a new item name"
                  filterOption={false}
                  onSearch={(v) => {
                    setSearch(v);
                    updateLine(line.key, { name: v });
                  }}
                  value={line.assetId}
                  onChange={(v) => updateLine(line.key, { assetId: v, name: v ? '' : line.name })}
                  options={assetOptions}
                  notFoundContent={
                    line.name ? (
                      <div style={{ padding: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                        "{line.name}" will be created as a new item
                      </div>
                    ) : null
                  }
                />
                {conflict && conflict.conflict !== 'NONE' && (
                  <div
                    style={{
                      fontSize: 11,
                      color: conflict.conflict === 'INSUFFICIENT' ? 'var(--status-not-working)' : '#6F8CB6',
                      marginTop: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <WarningOutlined />
                    {conflict.message}
                  </div>
                )}
              </div>
              <div style={{ width: 80 }}>
                <GlassInput
                  type="number"
                  value={String(line.quantity)}
                  onChange={(v) => updateLine(line.key, { quantity: parseInt(v, 10) || 1 })}
                  placeholder="Qty"
                />
              </div>
              <GlassButton
                variant="ghost"
                size="sm"
                icon={<DeleteOutlined />}
                onClick={() => removeLine(line.key)}
              />
            </div>
          );
        })}

        {preview?.has_conflicts && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(182,138,60,0.1)',
              border: '1px solid rgba(182,138,60,0.3)',
              fontSize: 12,
              color: '#D8B77A',
            }}
          >
            Some items exceed stock or aren't in inventory yet. Confirming will create the new
            items and top up recorded stock to cover the extra.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Taken by (optional)
            </label>
            <GlassInput value={receivedBy} onChange={setReceivedBy} placeholder="Name" />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Notes (optional)
            </label>
            <GlassInput value={notes} onChange={setNotes} placeholder="Purpose, condition…" />
          </div>
        </div>
      </div>
    </GlassModal>
  );
}
