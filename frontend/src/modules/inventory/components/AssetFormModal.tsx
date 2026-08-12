import React, { useState } from 'react';
import { Switch } from 'antd';
import GlassModal from '@/shared/components/GlassModal';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import CreatableSelect from '@/shared/components/CreatableSelect';
import {
  useAssetCategories,
  useCreateAsset,
  useCreateAssetCategory,
} from '../hooks/useAssets';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AssetFormModal({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [isBulk, setIsBulk] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [showMore, setShowMore] = useState(false);

  const { data: categories } = useAssetCategories();
  const createAsset = useCreateAsset();
  const createCategory = useCreateAssetCategory();

  const reset = () => {
    setName('');
    setCategoryId(undefined);
    setIsBulk(false);
    setQuantity('1');
    setSerialNumber('');
    setNotes('');
    setShowMore(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await createAsset.mutateAsync({
      name: name.trim(),
      category_id: categoryId,
      item_kind: isBulk ? 'BULK' : 'SERIALIZED',
      quantity: isBulk ? parseInt(quantity, 10) || 1 : 1,
      serial_number: serialNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    } as any);
    reset();
    onClose();
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: 'var(--text-muted)',
    marginBottom: 6,
  };

  return (
    <GlassModal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add Asset"
      width={480}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <GlassButton variant="ghost" onClick={() => { reset(); onClose(); }}>
            Cancel
          </GlassButton>
          <GlassButton
            onClick={handleSubmit}
            loading={createAsset.isPending}
            disabled={!name.trim()}
          >
            Add Asset
          </GlassButton>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>Name</label>
          <GlassInput value={name} onChange={setName} placeholder="e.g. HDMI Cable 3m" />
        </div>
        <div>
          <label style={labelStyle}>Category</label>
          <CreatableSelect
            value={categoryId}
            onChange={setCategoryId}
            options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
            noun="category"
            placeholder="Select a category"
            createPermission="assets.categories"
            onCreate={async (name) => createCategory.mutateAsync({ name })}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'var(--primary)', fontSize: 13 }}>Bulk item</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              Counted by quantity (cables, connectors) instead of one-by-one
            </div>
          </div>
          <Switch
            checked={isBulk}
            onChange={setIsBulk}
            style={{ background: isBulk ? 'var(--status-working)' : '#4A4A4A' }}
          />
        </div>

        {isBulk ? (
          <div>
            <label style={labelStyle}>Quantity</label>
            <GlassInput type="number" value={quantity} onChange={setQuantity} placeholder="1" />
          </div>
        ) : (
          <div>
            <label style={labelStyle}>Serial number (optional)</label>
            <GlassInput
              value={serialNumber}
              onChange={setSerialNumber}
              placeholder="Serial number if it has one"
            />
          </div>
        )}

        <div
          onClick={() => setShowMore(!showMore)}
          style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
        >
          {showMore ? '▾' : '▸'} More details
        </div>
        {showMore && (
          <div>
            <label style={labelStyle}>Notes</label>
            <GlassInput value={notes} onChange={setNotes} placeholder="Anything worth noting" />
          </div>
        )}
      </div>
    </GlassModal>
  );
}
