import { useEffect, useMemo, useState } from 'react';
import { DatePicker, Input, InputNumber, Tag } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ShoppingCartOutlined, PlusOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassModal from '@/shared/components/GlassModal';
import GlassInput from '@/shared/components/GlassInput';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import ShareButton from '@/shared/components/ShareButton';
import CreatableSelect from '@/shared/components/CreatableSelect';
import { useAuthStore, usePermission } from '@/shared/stores/authStore';
import { useCreateVendor, useVendors } from '../hooks/useCustody';
import {
  ItemRequest,
  OPEN_REQUEST_STATUSES,
  REQUEST_STATUS_COLOR,
  REQUEST_STATUS_LABEL,
  RequestStatus,
  useCreateRequest,
  useDeleteRequest,
  useRequests,
  useSetRequestStatus,
  useUpdateRequest,
} from '../hooks/useRequests';

dayjs.extend(relativeTime);

/** What a request may become next; RECEIVED and REJECTED are the end of it. */
const NEXT_STATUS: Record<RequestStatus, RequestStatus[]> = {
  REQUESTED: ['APPROVED', 'ORDERED', 'REJECTED'],
  APPROVED: ['ORDERED', 'RECEIVED', 'REJECTED'],
  ORDERED: ['RECEIVED', 'REJECTED'],
  RECEIVED: [],
  REJECTED: [],
};

const ACTION_LABEL: Record<RequestStatus, string> = {
  REQUESTED: 'Requested',
  APPROVED: 'Approve',
  ORDERED: 'Mark ordered',
  RECEIVED: 'Mark received',
  REJECTED: 'Reject',
};

function RequestFormModal({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: ItemRequest | null;
}) {
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState<number | null>(1);
  const [details, setDetails] = useState('');
  const [neededBy, setNeededBy] = useState<Dayjs | null>(null);
  const [vendorId, setVendorId] = useState<string>();
  const [cost, setCost] = useState<number | null>(null);
  const canManage = usePermission('stock.requests.manage');
  const { data: vendors } = useVendors();
  const createVendor = useCreateVendor();
  const create = useCreateRequest();
  const update = useUpdateRequest();

  // Prefill when editing; reset when the modal opens fresh.
  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title ?? '');
    setQuantity(existing?.quantity ?? 1);
    setDetails(existing?.details ?? '');
    setNeededBy(existing?.needed_by ? dayjs(existing.needed_by) : null);
    setVendorId(existing?.vendor_id ?? undefined);
    setCost(existing?.estimated_cost ?? null);
  }, [open, existing]);

  const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)' };

  const submit = () => {
    const common = {
      title: title.trim(),
      details: details.trim() || undefined,
      quantity: quantity ?? 1,
      needed_by: neededBy ? neededBy.format('YYYY-MM-DD') : undefined,
      vendor_id: canManage ? vendorId : undefined,
      estimated_cost: canManage ? cost ?? undefined : undefined,
    };
    if (existing) {
      update.mutate(
        {
          id: existing.id,
          ...common,
          details: details.trim() || null,
          needed_by: neededBy ? neededBy.format('YYYY-MM-DD') : null,
        },
        { onSuccess: onClose }
      );
    } else {
      create.mutate(common, { onSuccess: onClose });
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit request' : 'Ask for an item'}
      footer={null}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>What is needed?</label>
          <GlassInput value={title} onChange={setTitle} placeholder="e.g. Crimping tool" />
        </div>
        <div>
          <label style={labelStyle}>How many?</label>
          <InputNumber
            value={quantity}
            onChange={setQuantity}
            min={1}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Details (optional)</label>
          <Input.TextArea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            placeholder="Model, spec, or why it is needed"
          />
        </div>
        <div>
          <label style={labelStyle}>Needed by (optional)</label>
          <DatePicker
            value={neededBy}
            onChange={setNeededBy}
            style={{ width: '100%' }}
          />
        </div>
        {canManage && (
          <>
            <div>
              <label style={labelStyle}>Vendor (optional)</label>
              <CreatableSelect
                value={vendorId}
                onChange={setVendorId}
                placeholder="Who would we buy it from?"
                noun="vendor"
                createPermission="stock.manage"
                onCreate={(name) => createVendor.mutateAsync({ name })}
                options={(vendors ?? []).map((v) => ({ value: v.id, label: v.name }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Estimated cost (optional)</label>
              <InputNumber
                value={cost}
                onChange={setCost}
                min={0}
                prefix="₹"
                style={{ width: '100%' }}
              />
            </div>
          </>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            onClick={submit}
            disabled={!title.trim() || create.isPending || update.isPending}
          >
            {existing ? 'Save' : 'Ask for it'}
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

function RequestCard({ r, onEdit }: { r: ItemRequest; onEdit: (r: ItemRequest) => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const setStatus = useSetRequestStatus();
  const del = useDeleteRequest();
  const user = useAuthStore((s) => s.user);
  const canManage = usePermission('stock.requests.manage');
  const canCreate = usePermission('stock.requests.create');

  const isOpen = OPEN_REQUEST_STATUSES.includes(r.status);
  const isOwn = !!user && r.requested_by === user.id;
  // The requester can touch their own while it is still just a request;
  // a manager can edit or withdraw any open one. The server checks again.
  const mayEdit = isOpen && (canManage || (isOwn && canCreate && r.status === 'REQUESTED'));
  const overdue =
    isOpen && !!r.needed_by && dayjs(r.needed_by).isBefore(dayjs(), 'day');

  return (
    <GlassCard>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</span>
            {r.quantity > 1 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>× {r.quantity}</span>
            )}
            <Tag
              style={{
                margin: 0,
                fontSize: 10,
                color: REQUEST_STATUS_COLOR[r.status],
                borderColor: REQUEST_STATUS_COLOR[r.status],
                background: 'transparent',
              }}
            >
              {REQUEST_STATUS_LABEL[r.status]}
            </Tag>
          </div>
          {r.details && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              {r.details}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {[
              r.requested_by_name && `asked by ${r.requested_by_name}`,
              dayjs(r.created_at).fromNow(),
              r.vendor_name && `from ${r.vendor_name}`,
              r.estimated_cost != null &&
                `~₹${Number(r.estimated_cost).toLocaleString('en-IN')}`,
              r.resolved_at && `settled ${dayjs(r.resolved_at).fromNow()}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
          {r.needed_by && (
            <div
              style={{
                fontSize: 11,
                marginTop: 4,
                color: overdue ? '#B0413E' : 'var(--text-muted)',
                fontWeight: overdue ? 600 : undefined,
              }}
            >
              Needed by {dayjs(r.needed_by).format('D MMM YYYY')}
              {overdue && ' — past due'}
            </div>
          )}
          {r.status_note && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {r.status_note}
            </div>
          )}
        </div>

        {isOpen && (canManage || mayEdit) && (
          <div style={{ minWidth: 190, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rejecting ? (
              <>
                <Input
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Why not?"
                  size="small"
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <GlassButton size="sm" variant="ghost" onClick={() => setRejecting(false)}>
                    Back
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      setStatus.mutate(
                        {
                          id: r.id,
                          status: 'REJECTED',
                          status_note: rejectNote.trim() || undefined,
                        },
                        {
                          onSuccess: () => {
                            setRejecting(false);
                            setRejectNote('');
                          },
                        }
                      )
                    }
                    disabled={setStatus.isPending}
                  >
                    Reject
                  </GlassButton>
                </div>
              </>
            ) : (
              <>
                {canManage &&
                  NEXT_STATUS[r.status]
                    .filter((s) => s !== 'REJECTED')
                    .map((s) => (
                      <GlassButton
                        key={s}
                        size="sm"
                        onClick={() => setStatus.mutate({ id: r.id, status: s })}
                        disabled={setStatus.isPending}
                      >
                        {ACTION_LABEL[s]}
                      </GlassButton>
                    ))}
                {canManage && (
                  <GlassButton size="sm" variant="ghost" onClick={() => setRejecting(true)}>
                    Reject
                  </GlassButton>
                )}
                {mayEdit && (
                  <>
                    <GlassButton size="sm" variant="ghost" onClick={() => onEdit(r)}>
                      Edit
                    </GlassButton>
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmWithdraw(true)}
                    >
                      Withdraw
                    </GlassButton>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmWithdraw}
        title="Withdraw this request?"
        message={`"${r.title}" comes off the list. Nobody will order it.`}
        confirmText="Withdraw"
        danger
        loading={del.isPending}
        onConfirm={() =>
          del.mutate(r.id, { onSuccess: () => setConfirmWithdraw(false) })
        }
        onCancel={() => setConfirmWithdraw(false)}
      />
    </GlassCard>
  );
}

const CHIP_OPTIONS: (RequestStatus | 'ALL')[] = [
  'ALL',
  'REQUESTED',
  'APPROVED',
  'ORDERED',
  'RECEIVED',
  'REJECTED',
];

export default function RequiredItemsPage() {
  const [chip, setChip] = useState<RequestStatus | 'ALL'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ItemRequest | null>(null);
  const [showDone, setShowDone] = useState(false);
  const { data: requests, isLoading } = useRequests();
  const canCreate = usePermission('stock.requests.create');

  const all = requests ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: all.length };
    for (const r of all) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [all]);

  const filtered = chip === 'ALL' ? all : all.filter((r) => r.status === chip);
  // Grouping only makes sense on the unfiltered view; a single-status chip is
  // already one group, so the "Done" fold would just hide what was asked for.
  const grouped = chip === 'ALL';
  const open = grouped ? filtered.filter((r) => OPEN_REQUEST_STATUSES.includes(r.status)) : filtered;
  const done = grouped ? filtered.filter((r) => !OPEN_REQUEST_STATUSES.includes(r.status)) : [];

  const openEdit = (r: ItemRequest) => {
    setEditing(r);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Required Items"
        icon={<ShoppingCartOutlined />}
        subtitle="What the office needs to buy — ask here, finance orders from here"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <ShareButton title="Required items" url="/inventory/requests" />
            {canCreate && (
              <GlassButton
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Ask for an item
              </GlassButton>
            )}
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {CHIP_OPTIONS.map((s) => {
          const active = chip === s;
          const count = counts[s] ?? 0;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setChip(s)}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                cursor: 'pointer',
                border: `1px solid ${active ? 'var(--secondary)' : 'transparent'}`,
                background: active ? 'rgba(111,140,182,0.12)' : 'var(--overlay-subtle)',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {s === 'ALL' ? 'All' : REQUEST_STATUS_LABEL[s]} ({count})
            </button>
          );
        })}
      </div>

      <RequestFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        existing={editing}
      />

      {isLoading ? (
        <LoadingSpinner text="Loading the list…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingCartOutlined />}
          title="Nothing on the list"
          description="Ask for what you need and it shows up here."
        />
      ) : (
        <>
          {open.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {open.map((r) => (
                <RequestCard key={r.id} r={r} onEdit={openEdit} />
              ))}
            </div>
          )}
          {done.length > 0 && (
            <div style={{ marginTop: open.length > 0 ? 20 : 0 }}>
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                }}
              >
                {showDone ? '▾' : '▸'} Done ({done.length})
              </button>
              {showDone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {done.map((r) => (
                    <RequestCard key={r.id} r={r} onEdit={openEdit} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
