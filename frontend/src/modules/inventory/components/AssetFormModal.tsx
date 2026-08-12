import React, { useEffect, useState } from 'react';
import { DatePicker, InputNumber, Switch } from 'antd';
import type { Dayjs } from 'dayjs';
import GlassModal from '@/shared/components/GlassModal';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import CreatableSelect from '@/shared/components/CreatableSelect';
import {
  useAssetCategories,
  useCreateAsset,
  useCreateAssetCategory,
} from '../hooks/useAssets';
import { useCreateVendor, useVendors } from '../hooks/useCustody';

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
  const [vendorId, setVendorId] = useState<string | undefined>();
  const [purchasePrice, setPurchasePrice] = useState<number | null>(null);
  const [purchaseDate, setPurchaseDate] = useState<Dayjs | null>(null);
  const [showMore, setShowMore] = useState(false);

  const { data: categories } = useAssetCategories();
  const { data: vendors } = useVendors();
  const createAsset = useCreateAsset();
  const createCategory = useCreateAssetCategory();
  const createVendor = useCreateVendor();

  // The category's serial policy: some categories track items one-by-one, so
  // bulk entry is off the table and the serial number stops being optional.
  const selectedCategory = (categories ?? []).find((c) => c.id === categoryId);
  const serialRequired = !!selectedCategory?.requires_serial;

  useEffect(() => {
    if (serialRequired) setIsBulk(false);
  }, [serialRequired]);

  const reset = () => {
    setName('');
    setCategoryId(undefined);
    setIsBulk(false);
    setQuantity('1');
    setSerialNumber('');
    setNotes('');
    setVendorId(undefined);
    setPurchasePrice(null);
    setPurchaseDate(null);
    setShowMore(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (serialRequired && !serialNumber.trim()) return;
    await createAsset.mutateAsync({
      name: name.trim(),
      category_id: categoryId,
      item_kind: isBulk ? 'BULK' : 'SERIALIZED',
      quantity: isBulk ? parseInt(quantity, 10) || 1 : 1,
      serial_number: serialNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      vendor_id: vendorId,
      purchase_price: purchasePrice ?? undefined,
      purchase_date: purchaseDate ? purchaseDate.format('YYYY-MM-DD') : undefined,
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
            disabled={!name.trim() || (serialRequired && !serialNumber.trim())}
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
              {serialRequired
                ? 'This category tracks items one-by-one'
                : 'Counted by quantity (cables, connectors) instead of one-by-one'}
            </div>
          </div>
          <Switch
            checked={isBulk && !serialRequired}
            onChange={setIsBulk}
            disabled={serialRequired}
            style={{
              background: isBulk && !serialRequired ? 'var(--status-working)' : '#4A4A4A',
            }}
          />
        </div>

        {isBulk && !serialRequired ? (
          <div>
            <label style={labelStyle}>Quantity</label>
            <GlassInput type="number" value={quantity} onChange={setQuantity} placeholder="1" />
          </div>
        ) : (
          <div>
            <label style={labelStyle}>
              Serial number{serialRequired ? '' : ' (optional)'}
            </label>
            <GlassInput
              value={serialNumber}
              onChange={setSerialNumber}
              placeholder={
                serialRequired ? 'Serial number (required)' : 'Serial number if it has one'
              }
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
          <>
            <div>
              <label style={labelStyle}>Notes</label>
              <GlassInput value={notes} onChange={setNotes} placeholder="Anything worth noting" />
            </div>
            <div>
              <label style={labelStyle}>Vendor</label>
              <CreatableSelect
                value={vendorId}
                onChange={setVendorId}
                options={(vendors ?? []).map((v) => ({ value: v.id, label: v.name }))}
                noun="vendor"
                placeholder="Where was it bought?"
                createPermission="stock.manage"
                onCreate={(name) => createVendor.mutateAsync({ name })}
              />
            </div>
            <div>
              <label style={labelStyle}>Purchase price</label>
              <InputNumber
                value={purchasePrice}
                onChange={setPurchasePrice}
                min={0}
                prefix="₹"
                style={{ width: '100%' }}
                placeholder="What it cost"
              />
            </div>
            <div>
              <label style={labelStyle}>Purchase date</label>
              <DatePicker
                value={purchaseDate}
                onChange={setPurchaseDate}
                style={{ width: '100%' }}
              />
            </div>
          </>
        )}
      </div>
    </GlassModal>
  );
}
