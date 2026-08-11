import { useState } from 'react';
import { Select, Input, Tag } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { SwapOutlined, ToolOutlined } from '@ant-design/icons';
import GlassButton from '@/shared/components/GlassButton';
import GlassModal from '@/shared/components/GlassModal';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { usePermission } from '@/shared/stores/authStore';
import { usePersonnelList } from '@/modules/personnel/hooks/usePersonnel';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import {
  CONDITION_COLOR,
  CONDITION_LABEL,
  CUSTODY_COLOR,
  CUSTODY_LABEL,
  Condition,
  CustodyType,
  useAssetMovements,
  useCustomers,
  useMoveCustody,
  useSetCondition,
  useStockLocations,
  useVendors,
} from '../hooks/useCustody';

dayjs.extend(relativeTime);

/** The two facts, side by side, wherever an item is shown. */
export function CustodyBadges({
  custodyType,
  custodyLabel,
  condition,
  size = 'md',
}: {
  custodyType: CustodyType;
  custodyLabel?: string | null;
  condition: Condition;
  size?: 'sm' | 'md';
}) {
  const f = size === 'sm' ? 10 : 11;
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <Tag
        style={{
          margin: 0,
          fontSize: f,
          color: CUSTODY_COLOR[custodyType],
          borderColor: CUSTODY_COLOR[custodyType],
          background: 'transparent',
        }}
      >
        {custodyLabel || CUSTODY_LABEL[custodyType]}
      </Tag>
      {condition !== 'OK' && (
        <Tag
          style={{
            margin: 0,
            fontSize: f,
            color: CONDITION_COLOR[condition],
            borderColor: CONDITION_COLOR[condition],
            background: 'transparent',
          }}
        >
          {CONDITION_LABEL[condition]}
        </Tag>
      )}
    </span>
  );
}

/** Move an item. The holder picker changes with the kind of holder chosen. */
export function MoveCustodyModal({
  assetId,
  assetName,
  open,
  onClose,
}: {
  assetId: string;
  assetName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [custodyType, setCustodyType] = useState<CustodyType>('LOCATION');
  const [holderId, setHolderId] = useState<string>();
  const [reason, setReason] = useState('');
  const move = useMoveCustody();

  const { data: locations } = useStockLocations();
  const { data: personnel } = usePersonnelList({ size: 200 });
  const { data: projects } = useProjects({});
  const { data: customers } = useCustomers();
  const { data: vendors } = useVendors();

  const options =
    custodyType === 'LOCATION'
      ? (locations ?? []).map((l) => ({ value: l.id, label: l.name }))
      : custodyType === 'PERSON'
        ? (personnel?.items ?? []).map((p) => ({ value: p.id, label: p.full_name }))
        : custodyType === 'PROJECT'
          ? (projects?.items ?? []).map((p) => ({ value: p.id, label: p.name }))
          : custodyType === 'CUSTOMER'
            ? (customers ?? []).map((c) => ({ value: c.id, label: c.name }))
            : custodyType === 'VENDOR'
              ? (vendors ?? []).map((v) => ({ value: v.id, label: v.name }))
              : [];

  const needsHolder = custodyType !== 'UNKNOWN';

  const submit = () =>
    move.mutate(
      {
        assetId,
        to_custody_type: custodyType,
        to_custody_id: needsHolder ? holderId : null,
        reason: reason.trim() || undefined,
        event_type:
          custodyType === 'PERSON'
            ? 'ISSUED'
            : custodyType === 'CUSTOMER'
              ? 'GIVEN_TO_CUSTOMER'
              : custodyType === 'VENDOR'
                ? 'SENT_FOR_REPAIR'
                : 'MOVED',
      },
      {
        onSuccess: () => {
          setReason('');
          setHolderId(undefined);
          onClose();
        },
      }
    );

  return (
    <GlassModal open={open} onClose={onClose} title={`Move — ${assetName}`} footer={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Where is it going?</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 8,
              marginTop: 6,
            }}
          >
            {(Object.keys(CUSTODY_LABEL) as CustodyType[]).map((t) => {
              const active = t === custodyType;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setCustodyType(t);
                    setHolderId(undefined);
                  }}
                  style={{
                    padding: '9px 8px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    border: `1px solid ${active ? CUSTODY_COLOR[t] : 'var(--overlay-subtle)'}`,
                    background: active ? 'var(--overlay-subtle)' : 'transparent',
                    color: active ? CUSTODY_COLOR[t] : 'var(--text-secondary)',
                  }}
                >
                  {CUSTODY_LABEL[t]}
                </button>
              );
            })}
          </div>
        </div>

        {needsHolder && (
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Which one?</label>
            <Select
              value={holderId}
              onChange={setHolderId}
              options={options}
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder={options.length ? 'Choose…' : 'Nothing to choose yet'}
              notFoundContent="None added yet"
            />
          </div>
        )}

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Why? (optional)</label>
          <Input.TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Recorded against this item permanently"
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            onClick={submit}
            disabled={(needsHolder && !holderId) || move.isPending}
          >
            Move
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

export function SetConditionModal({
  assetId,
  assetName,
  current,
  open,
  onClose,
}: {
  assetId: string;
  assetName: string;
  current: Condition;
  open: boolean;
  onClose: () => void;
}) {
  const [condition, setCondition] = useState<Condition>(current);
  const [reason, setReason] = useState('');
  const set = useSetCondition();

  return (
    <GlassModal open={open} onClose={onClose} title={`Condition — ${assetName}`} footer={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          This records what state the item is in. It does not move it — an item can
          be damaged wherever it happens to be.
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 8,
          }}
        >
          {(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => {
            const active = c === condition;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCondition(c)}
                style={{
                  padding: '9px 8px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  border: `1px solid ${active ? CONDITION_COLOR[c] : 'var(--overlay-subtle)'}`,
                  background: active ? 'var(--overlay-subtle)' : 'transparent',
                  color: active ? CONDITION_COLOR[c] : 'var(--text-secondary)',
                }}
              >
                {CONDITION_LABEL[c]}
              </button>
            );
          })}
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>What happened?</label>
          <Input.TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Dropped on site, water damage, returned from repair…"
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            onClick={() =>
              set.mutate(
                { assetId, condition, reason: reason.trim() || undefined },
                { onSuccess: () => { setReason(''); onClose(); } }
              )
            }
            disabled={set.isPending}
          >
            Save
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

const EVENT_LABEL: Record<string, string> = {
  OPENING_BALANCE: 'Tracking began',
  NEEDS_RECONCILIATION: 'Needs reconciliation',
  MOVED: 'Moved',
  ISSUED: 'Issued',
  RETURNED: 'Returned',
  HANDED_OVER: 'Handed over',
  LEFT_AT_SITE: 'Left at site',
  GIVEN_TO_CUSTOMER: 'Given to customer',
  SENT_FOR_REPAIR: 'Sent for repair',
  REPAIRED: 'Repaired',
};

/** One item's whole life, newest first. */
export function AssetTimeline({ assetId }: { assetId: string }) {
  const { data: movements, isLoading } = useAssetMovements(assetId);

  if (isLoading) return <LoadingSpinner text="Loading history…" />;
  if (!movements || movements.length === 0) {
    return (
      <EmptyState
        title="No history yet"
        description="Movements and condition changes appear here as they happen."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {movements.map((m) => {
        const moved =
          m.from_custody_type !== m.to_custody_type ||
          m.from_label !== m.to_label;
        const conditionChanged =
          m.from_condition && m.to_condition && m.from_condition !== m.to_condition;
        return (
          <div
            key={m.id}
            style={{
              display: 'flex',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 8,
              background: 'var(--overlay-subtle)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {EVENT_LABEL[m.event_type] ?? m.event_type.replace(/_/g, ' ').toLowerCase()}
              </div>
              {moved && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 2,
                  }}
                >
                  <span>{m.from_label ?? (m.from_custody_type ? CUSTODY_LABEL[m.from_custody_type] : '—')}</span>
                  <SwapOutlined style={{ fontSize: 10, color: 'var(--text-muted)' }} />
                  <span>{m.to_label ?? (m.to_custody_type ? CUSTODY_LABEL[m.to_custody_type] : '—')}</span>
                </div>
              )}
              {conditionChanged && (
                <div
                  style={{
                    fontSize: 12,
                    marginTop: 2,
                    color: CONDITION_COLOR[m.to_condition as Condition],
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ToolOutlined style={{ fontSize: 10 }} />
                  {CONDITION_LABEL[m.from_condition as Condition]} →{' '}
                  {CONDITION_LABEL[m.to_condition as Condition]}
                </div>
              )}
              {m.reason && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  {m.reason}
                </div>
              )}
            </div>
            <div
              style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}
              title={dayjs(m.occurred_at).format('D MMM YYYY, HH:mm')}
            >
              {dayjs(m.occurred_at).fromNow()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Move / condition buttons, shown only to people who may use them. */
export function CustodyActions({
  assetId,
  assetName,
  condition,
}: {
  assetId: string;
  assetName: string;
  condition: Condition;
}) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [condOpen, setCondOpen] = useState(false);
  const canMove = usePermission('assets.custody');
  const canCondition = usePermission('assets.condition');

  if (!canMove && !canCondition) return null;

  return (
    <>
      {canMove && (
        <GlassButton variant="ghost" icon={<SwapOutlined />} onClick={() => setMoveOpen(true)}>
          Move
        </GlassButton>
      )}
      {canCondition && (
        <GlassButton variant="ghost" icon={<ToolOutlined />} onClick={() => setCondOpen(true)}>
          Condition
        </GlassButton>
      )}
      <MoveCustodyModal
        assetId={assetId}
        assetName={assetName}
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
      />
      <SetConditionModal
        assetId={assetId}
        assetName={assetName}
        current={condition}
        open={condOpen}
        onClose={() => setCondOpen(false)}
      />
    </>
  );
}
