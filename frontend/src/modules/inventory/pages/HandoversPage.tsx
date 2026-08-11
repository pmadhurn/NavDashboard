import { useMemo, useState } from 'react';
import { Select, Input, Tag, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  SwapOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassModal from '@/shared/components/GlassModal';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ShareButton from '@/shared/components/ShareButton';
import { usePermission } from '@/shared/stores/authStore';
import { usePersonnelList } from '@/modules/personnel/hooks/usePersonnel';
import { useAssets } from '../hooks/useAssets';
import {
  Handover,
  HandoverStatus,
  useCancelHandover,
  useCreateHandover,
  useHandovers,
  useRespondHandover,
} from '../hooks/useMovement';

dayjs.extend(relativeTime);

const STATUS_COLOR: Record<HandoverStatus, string> = {
  PENDING: 'var(--status-not-working)',
  ACCEPTED: 'var(--status-working)',
  REJECTED: '#8C5F5F',
  CANCELLED: 'var(--text-muted)',
};

const STATUS_LABEL: Record<HandoverStatus, string> = {
  PENDING: 'Waiting to be accepted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Declined',
  CANCELLED: 'Cancelled',
};

function StartHandoverModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [fromId, setFromId] = useState<string>();
  const [toId, setToId] = useState<string>();
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const { data: personnel } = usePersonnelList({ size: 200 });
  // Only what that person is actually holding can be handed on.
  const { data: assets } = useAssets({ custodyType: 'PERSON', personId: fromId });
  const create = useCreateHandover();

  const people = personnel?.items ?? [];
  const holding = assets?.items ?? [];

  const submit = () =>
    create.mutate(
      { from_person_id: fromId!, to_person_id: toId!, asset_ids: picked, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setPicked([]);
          setNote('');
          setToId(undefined);
          onClose();
        },
      }
    );

  return (
    <GlassModal open={open} onClose={onClose} title="Hand items to someone" width={620} footer={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>From</label>
            <Select
              value={fromId}
              onChange={(v) => {
                setFromId(v);
                setPicked([]);
              }}
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="Who is handing over?"
              options={people.map((p) => ({ value: p.id, label: p.full_name }))}
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>To</label>
            <Select
              value={toId}
              onChange={setToId}
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="Who is taking them?"
              options={people
                .filter((p) => p.id !== fromId)
                .map((p) => ({ value: p.id, label: p.full_name }))}
            />
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Which items? {picked.length > 0 && `(${picked.length} selected)`}
            </label>
            {holding.length > 0 && (
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={() =>
                  setPicked(picked.length === holding.length ? [] : holding.map((a) => a.id))
                }
              >
                {picked.length === holding.length ? 'Clear' : 'Select all'}
              </GlassButton>
            )}
          </div>
          {!fromId ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Choose who is handing over first.
            </div>
          ) : holding.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              They are not holding anything at the moment.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                maxHeight: 260,
                overflowY: 'auto',
              }}
            >
              {holding.map((a) => {
                const on = picked.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() =>
                      setPicked(on ? picked.filter((x) => x !== a.id) : [...picked, a.id])
                    }
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
          )}
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Note (optional)</label>
          <Input.TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Going on leave, changing site…"
          />
        </div>

        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            padding: '8px 10px',
            borderRadius: 8,
            background: 'var(--overlay-subtle)',
          }}
        >
          Nothing moves yet. The items stay with {people.find((p) => p.id === fromId)?.full_name ?? 'them'}{' '}
          until the other person accepts.
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            onClick={submit}
            disabled={!fromId || !toId || picked.length === 0 || create.isPending}
          >
            Send handover
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

function HandoverCard({ h }: { h: Handover }) {
  const [note, setNote] = useState('');
  const [respondingTo, setRespondingTo] = useState<'accept' | 'decline' | null>(null);
  const respond = useRespondHandover();
  const cancel = useCancelHandover();
  const canAct = usePermission('assets.handover');

  return (
    <GlassCard>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{h.from_name}</span>
            <SwapOutlined style={{ color: 'var(--text-muted)', fontSize: 12 }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{h.to_name}</span>
            <Tag
              style={{
                margin: 0,
                fontSize: 10,
                color: STATUS_COLOR[h.status],
                borderColor: STATUS_COLOR[h.status],
                background: 'transparent',
              }}
            >
              {STATUS_LABEL[h.status]}
            </Tag>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            {h.items.length} item{h.items.length === 1 ? '' : 's'} ·{' '}
            {dayjs(h.created_at).fromNow()}
            {h.responded_at && ` · answered ${dayjs(h.responded_at).fromNow()}`}
          </div>
          {h.note && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {h.note}
            </div>
          )}
          {h.response_note && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Reply: {h.response_note}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {h.items.map((i) => (
              <span
                key={i.id}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 20,
                  background: 'var(--overlay-subtle)',
                  color: 'var(--text-secondary)',
                }}
                title={i.asset_code}
              >
                {i.name}
              </span>
            ))}
          </div>
        </div>

        {h.status === 'PENDING' && canAct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 190 }}>
            {respondingTo ? (
              <>
                <Input.TextArea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder={respondingTo === 'accept' ? 'Anything to add?' : 'Why not?'}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <GlassButton variant="ghost" size="sm" onClick={() => setRespondingTo(null)}>
                    Back
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    onClick={() =>
                      respond.mutate(
                        { id: h.id, accept: respondingTo === 'accept', note: note.trim() || undefined },
                        { onSuccess: () => { setNote(''); setRespondingTo(null); } }
                      )
                    }
                    disabled={respond.isPending}
                  >
                    Confirm
                  </GlassButton>
                </div>
              </>
            ) : (
              <>
                <GlassButton size="sm" icon={<CheckOutlined />} onClick={() => setRespondingTo('accept')}>
                  Accept
                </GlassButton>
                <GlassButton
                  size="sm"
                  variant="ghost"
                  icon={<CloseOutlined />}
                  onClick={() => setRespondingTo('decline')}
                >
                  Decline
                </GlassButton>
                <Popconfirm title="Cancel this handover?" onConfirm={() => cancel.mutate(h.id)}>
                  <GlassButton size="sm" variant="ghost">
                    Cancel it
                  </GlassButton>
                </Popconfirm>
              </>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export default function HandoversPage() {
  const [statusFilter, setStatusFilter] = useState<HandoverStatus | undefined>();
  const [startOpen, setStartOpen] = useState(false);
  const { data: handovers, isLoading } = useHandovers({ status: statusFilter });
  const canAct = usePermission('assets.handover');

  const pending = useMemo(
    () => (handovers ?? []).filter((h) => h.status === 'PENDING'),
    [handovers]
  );
  const settled = useMemo(
    () => (handovers ?? []).filter((h) => h.status !== 'PENDING'),
    [handovers]
  );

  return (
    <div>
      <PageHeader
        title="Handovers"
        icon={<SwapOutlined />}
        subtitle="Passing equipment between people — the receiver has to accept"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              placeholder="All"
              style={{ minWidth: 170 }}
              options={(Object.keys(STATUS_LABEL) as HandoverStatus[]).map((s) => ({
                value: s,
                label: STATUS_LABEL[s],
              }))}
            />
            <ShareButton title="Equipment handovers" url="/inventory/handovers" />
            {canAct && (
              <GlassButton icon={<PlusOutlined />} onClick={() => setStartOpen(true)}>
                Hand over
              </GlassButton>
            )}
          </div>
        }
      />

      <StartHandoverModal open={startOpen} onClose={() => setStartOpen(false)} />

      {isLoading ? (
        <LoadingSpinner text="Loading handovers…" />
      ) : (handovers ?? []).length === 0 ? (
        <EmptyState
          icon={<InboxOutlined />}
          title="No handovers yet"
          description="When someone goes on leave or changes site, hand their equipment on from here."
        />
      ) : (
        <>
          {pending.length > 0 && !statusFilter && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: 'var(--status-not-working)',
                  marginBottom: 8,
                }}
              >
                Waiting on someone
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pending.map((h) => (
                  <HandoverCard key={h.id} h={h} />
                ))}
              </div>
            </div>
          )}
          {(statusFilter ? handovers ?? [] : settled).length > 0 && (
            <div>
              {!statusFilter && (
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: 8,
                  }}
                >
                  Settled
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(statusFilter ? handovers ?? [] : settled).map((h) => (
                  <HandoverCard key={h.id} h={h} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
