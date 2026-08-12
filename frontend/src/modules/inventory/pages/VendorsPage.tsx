import React, { useEffect, useState } from 'react';
import { message } from 'antd';
import {
  ShopOutlined,
  PlusOutlined,
  PhoneOutlined,
  MailOutlined,
  UserOutlined,
} from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassModal from '@/shared/components/GlassModal';
import GlassInput from '@/shared/components/GlassInput';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import ShareButton from '@/shared/components/ShareButton';
import { usePermission } from '@/shared/stores/authStore';
import {
  Party,
  useCreateVendor,
  useDeleteVendor,
  useUpdateVendor,
  useVendors,
} from '../hooks/useCustody';

function VendorFormModal({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: Party | null;
}) {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');
  const create = useCreateVendor();
  const update = useUpdateVendor();

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? '');
    setContactName(existing?.contact_name ?? '');
    setContactPhone(existing?.contact_phone ?? '');
    setContactEmail(existing?.contact_email ?? '');
    setNotes(existing?.notes ?? '');
  }, [open, existing]);

  const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)' };

  const submit = () => {
    if (existing) {
      update.mutate(
        {
          id: existing.id,
          name: name.trim(),
          contact_name: contactName.trim() || null,
          contact_phone: contactPhone.trim() || null,
          contact_email: contactEmail.trim() || null,
          notes: notes.trim() || null,
        },
        { onSuccess: onClose }
      );
    } else {
      // useCreateVendor carries no toast of its own — CreatableSelect callers
      // announce their own success — so this page says it here.
      create.mutate(
        {
          name: name.trim(),
          contact_name: contactName.trim() || undefined,
          contact_phone: contactPhone.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        {
          onSuccess: () => {
            message.success('Vendor added');
            onClose();
          },
          onError: (err: any) =>
            message.error(err?.response?.data?.detail || 'Could not add the vendor'),
        }
      );
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit vendor' : 'Add vendor'}
      footer={null}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>Name</label>
          <GlassInput value={name} onChange={setName} placeholder="e.g. Sharma Electronics" />
        </div>
        <div>
          <label style={labelStyle}>Contact person (optional)</label>
          <GlassInput value={contactName} onChange={setContactName} placeholder="Who to ask for" />
        </div>
        <div>
          <label style={labelStyle}>Phone (optional)</label>
          <GlassInput value={contactPhone} onChange={setContactPhone} placeholder="Phone number" />
        </div>
        <div>
          <label style={labelStyle}>Email (optional)</label>
          <GlassInput
            type="email"
            value={contactEmail}
            onChange={setContactEmail}
            placeholder="Email address"
          />
        </div>
        <div>
          <label style={labelStyle}>Notes (optional)</label>
          <GlassInput
            type="textarea"
            value={notes}
            onChange={setNotes}
            placeholder="What we buy from them, payment terms…"
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            onClick={submit}
            disabled={!name.trim() || create.isPending || update.isPending}
          >
            {existing ? 'Save' : 'Add vendor'}
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

function VendorCard({ v, onEdit }: { v: Party; onEdit: (v: Party) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const del = useDeleteVendor();
  const canManage = usePermission('stock.manage');

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: 'var(--text-secondary)',
  };

  return (
    <GlassCard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 120 }}>{v.name}</span>
          {canManage && (
            <div style={{ display: 'flex', gap: 6 }}>
              <GlassButton size="sm" variant="ghost" onClick={() => onEdit(v)}>
                Edit
              </GlassButton>
              <GlassButton size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
                Delete
              </GlassButton>
            </div>
          )}
        </div>
        {v.contact_name && (
          <div style={rowStyle}>
            <UserOutlined style={{ color: 'var(--text-muted)' }} /> {v.contact_name}
          </div>
        )}
        {v.contact_phone && (
          <div style={rowStyle}>
            <PhoneOutlined style={{ color: 'var(--text-muted)' }} />
            <a href={`tel:${v.contact_phone}`} style={{ color: 'var(--text-secondary)' }}>
              {v.contact_phone}
            </a>
          </div>
        )}
        {v.contact_email && (
          <div style={rowStyle}>
            <MailOutlined style={{ color: 'var(--text-muted)' }} />
            <a href={`mailto:${v.contact_email}`} style={{ color: 'var(--text-secondary)' }}>
              {v.contact_email}
            </a>
          </div>
        )}
        {v.notes && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.notes}</div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Remove this vendor?"
        message={`"${v.name}" is removed from the list. If any item still points at them, the server will refuse and say why.`}
        confirmText="Remove"
        danger
        loading={del.isPending}
        onConfirm={() =>
          // On 409 the hook surfaces the server's detail message.
          del.mutate(v.id, { onSettled: () => setConfirmDelete(false) })
        }
        onCancel={() => setConfirmDelete(false)}
      />
    </GlassCard>
  );
}

export default function VendorsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const { data: vendors, isLoading } = useVendors();
  const canManage = usePermission('stock.manage');

  return (
    <div>
      <PageHeader
        title="Vendors"
        icon={<ShopOutlined />}
        subtitle="Who we buy from and who repairs our equipment"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <ShareButton title="Vendors" url="/inventory/vendors" />
            {canManage && (
              <GlassButton
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add vendor
              </GlassButton>
            )}
          </div>
        }
      />

      <VendorFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        existing={editing}
      />

      {isLoading ? (
        <LoadingSpinner text="Loading vendors…" />
      ) : (vendors ?? []).length === 0 ? (
        <EmptyState
          icon={<ShopOutlined />}
          title="No vendors yet"
          description="Add the shops and suppliers you buy from, so purchases and repairs can point at them."
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 10,
          }}
        >
          {(vendors ?? []).map((v) => (
            <VendorCard
              key={v.id}
              v={v}
              onEdit={(vendor) => {
                setEditing(vendor);
                setFormOpen(true);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
