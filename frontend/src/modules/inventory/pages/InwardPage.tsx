import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { Input, Select, message } from 'antd';
import { CheckCircleOutlined, ImportOutlined, QrcodeOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import QrScannerModal from '@/shared/components/QrScanner';
import { usePermission } from '@/shared/stores/authStore';
import { formatDate } from '@/shared/utils/formatters';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useCustomers } from '../hooks/useCustody';
import { OUTCOMES, ResolveItem, ReturnOutcome, useResolveReturns } from '../hooks/useMovement';
import {
  MOVEMENT_PURPOSES,
  OutwardMovement,
  OutwardMovementItem,
  passNumber,
  useOpenOutwards,
} from '../hooks/useOutward';

/** Per movement-item choice while receiving; keyed by movement item id. */
interface RowState {
  outcome?: ReturnOutcome;
  note?: string;
  projectId?: string;
  customerId?: string;
}

function isOverdue(m: OutwardMovement): boolean {
  return (
    !!m.expected_return_date &&
    dayjs(m.expected_return_date).isBefore(dayjs(), 'day') &&
    m.items.some((i) => !i.resolved_at)
  );
}

function whoHasIt(m: OutwardMovement): string {
  return m.project_name ?? m.handler?.full_name ?? m.received_by_name ?? '—';
}

export default function InwardPage() {
  const { data: movements, isLoading } = useOpenOutwards();
  const { data: projects } = useProjects({});
  const { data: customers } = useCustomers();
  const resolve = useResolveReturns();
  const canReceive = usePermission('assets.returns');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [scanOpen, setScanOpen] = useState(false);

  const expanded = (movements ?? []).find((m) => m.id === expandedId);

  const setRow = (id: string, patch: Partial<RowState>) =>
    setRows((r) => ({ ...r, [id]: { ...(r[id] ?? {}), ...patch } }));

  const unresolvedOf = (m: OutwardMovement): OutwardMovementItem[] =>
    m.items.filter((i) => !i.resolved_at);

  // Rows of the expanded pass that have an outcome and everything it needs.
  const ready = useMemo(() => {
    if (!expanded) return [];
    return unresolvedOf(expanded).filter((item) => {
      const r = rows[item.id];
      if (!r?.outcome || !item.asset) return false;
      const spec = OUTCOMES.find((o) => o.value === r.outcome);
      if (spec?.needs === 'project' && !r.projectId) return false;
      if (spec?.needs === 'customer' && !r.customerId) return false;
      return true;
    });
  }, [expanded, rows]);

  const handleScan = (code: string) => {
    if (!expanded) return;
    const needle = code.trim().toLowerCase();
    const item = unresolvedOf(expanded).find(
      (i) =>
        i.asset &&
        (i.asset.asset_code.toLowerCase() === needle ||
          (i.asset.serial_number ?? '').toLowerCase() === needle)
    );
    if (!item) {
      message.warning('No open item with that code on this pass');
      return;
    }
    if (rows[item.id]?.outcome === 'RETURNED') {
      message.info(`${item.asset!.asset_code} is already marked as returned`);
      return;
    }
    setRow(item.id, { outcome: 'RETURNED', projectId: undefined, customerId: undefined });
    message.success(`${item.asset!.asset_code} — marked as returned`);
  };

  const submit = () => {
    if (!expanded) return;
    const items: ResolveItem[] = ready.map((item) => {
      const r = rows[item.id] ?? {};
      return {
        asset_id: item.asset!.id,
        outcome: r.outcome!,
        note: r.note?.trim() || undefined,
        project_id: r.projectId,
        customer_id: r.customerId,
      };
    });
    resolve.mutate(items, {
      onSuccess: () => {
        setRows((prev) => {
          const next = { ...prev };
          for (const item of ready) delete next[item.id];
          return next;
        });
      },
    });
  };

  const open = movements ?? [];

  return (
    <div>
      <PageHeader
        title="Receive items back"
        icon={<ImportOutlined />}
        subtitle="Open gate passes — tick off what comes through the door"
      />

      {isLoading ? (
        <LoadingSpinner text="Loading open passes…" />
      ) : open.length === 0 ? (
        <EmptyState
          icon={<CheckCircleOutlined />}
          title="No open passes"
          description="Everything taken out on a gate pass has been accounted for."
          action={
            <Link to="/inventory/returns" style={{ fontSize: 13, color: 'var(--secondary)' }}>
              Resolve items without a pass
            </Link>
          }
        />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 760 }}>
            {open.map((m) => {
              const unresolved = unresolvedOf(m);
              const resolvedCount = m.items.length - unresolved.length;
              const overdue = isOverdue(m);
              const isOpen = m.id === expandedId;
              const marked = unresolved.filter((i) => rows[i.id]?.outcome).length;
              const purpose =
                MOVEMENT_PURPOSES.find((p) => p.value === m.purpose)?.label ?? m.purpose ?? '—';

              return (
                <GlassCard key={m.id} padding="sm">
                  <div
                    onClick={() => setExpandedId(isOpen ? null : m.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px 14px',
                        alignItems: 'baseline',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                        {passNumber(m.id)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {whoHasIt(m)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{purpose}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {formatDate(m.movement_date)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {resolvedCount}/{m.items.length} items resolved
                      </span>
                      {m.expected_return_date && (
                        <span style={{ color: overdue ? 'var(--status-not-working)' : 'var(--text-muted)' }}>
                          {overdue ? 'Overdue — expected ' : 'Expected '}
                          {formatDate(m.expected_return_date)}
                        </span>
                      )}
                      <Link
                        to={`/inventory/outward/${m.id}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: 'var(--secondary)' }}
                      >
                        View pass
                      </Link>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {canReceive ? (
                        <GlassButton
                          variant="ghost"
                          icon={<QrcodeOutlined />}
                          onClick={() => setScanOpen(true)}
                        >
                          Scan to receive
                        </GlassButton>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          You can see this pass, but receiving items needs the returns permission.
                        </div>
                      )}

                      {unresolved.map((item) => {
                        const r = rows[item.id] ?? {};
                        const spec = OUTCOMES.find((o) => o.value === r.outcome);
                        return (
                          <div
                            key={item.id}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 10,
                              background: 'var(--overlay-subtle)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                            }}
                          >
                            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', minWidth: 78 }}>
                                {item.asset?.asset_code ?? '—'}
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {item.asset?.name ?? 'New item'}
                              </span>
                              {item.asset?.serial_number && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  SN {item.asset.serial_number}
                                </span>
                              )}
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                × {item.quantity}
                              </span>
                            </div>

                            {canReceive && (
                              <>
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                    gap: 6,
                                  }}
                                >
                                  {OUTCOMES.map((o) => {
                                    const on = r.outcome === o.value;
                                    return (
                                      <button
                                        key={o.value}
                                        type="button"
                                        onClick={() =>
                                          setRow(item.id, {
                                            outcome: on ? undefined : o.value,
                                            projectId: undefined,
                                            customerId: undefined,
                                          })
                                        }
                                        style={{
                                          padding: 8,
                                          borderRadius: 8,
                                          cursor: 'pointer',
                                          textAlign: 'left',
                                          border: `1px solid ${on ? o.color : 'var(--overlay-subtle)'}`,
                                          background: on ? 'var(--overlay-subtle)' : 'transparent',
                                          color: on ? o.color : 'var(--text-secondary)',
                                        }}
                                      >
                                        <div style={{ fontSize: 12, fontWeight: on ? 600 : 400 }}>{o.label}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{o.hint}</div>
                                      </button>
                                    );
                                  })}
                                </div>

                                {spec?.needs === 'project' && (
                                  <Select
                                    className="dl-select"
                                    value={r.projectId}
                                    onChange={(v) => setRow(item.id, { projectId: v })}
                                    showSearch
                                    optionFilterProp="label"
                                    placeholder="Which project is it left with? (required)"
                                    status={r.projectId ? undefined : 'warning'}
                                    style={{ width: '100%' }}
                                    options={(projects?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
                                  />
                                )}

                                {spec?.needs === 'customer' && (
                                  <Select
                                    className="dl-select"
                                    value={r.customerId}
                                    onChange={(v) => setRow(item.id, { customerId: v })}
                                    showSearch
                                    optionFilterProp="label"
                                    placeholder="Which customer has it? (required)"
                                    status={r.customerId ? undefined : 'warning'}
                                    style={{ width: '100%' }}
                                    options={(customers ?? []).map((c) => ({ value: c.id, label: c.name }))}
                                    notFoundContent="No customers added yet"
                                  />
                                )}

                                {r.outcome && (
                                  <Input
                                    value={r.note ?? ''}
                                    onChange={(e) => setRow(item.id, { note: e.target.value })}
                                    placeholder="Note (optional)"
                                    size="small"
                                  />
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}

                      {canReceive && (
                        <div
                          style={{
                            position: 'sticky',
                            bottom: 0,
                            padding: '10px 0',
                            background: 'var(--bg-main)',
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 'auto' }}>
                            {unresolved.length - marked > 0
                              ? `${unresolved.length - marked} item${
                                  unresolved.length - marked === 1 ? '' : 's'
                                } still out — the pass stays open`
                              : 'Everything on this pass is accounted for'}
                          </span>
                          <GlassButton
                            onClick={submit}
                            disabled={ready.length === 0 || resolve.isPending}
                            loading={resolve.isPending}
                          >
                            Confirm received items
                            {ready.length > 0 ? ` (${ready.length})` : ''}
                          </GlassButton>
                        </div>
                      )}
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            Items came back without a pass?{' '}
            <Link to="/inventory/returns" style={{ color: 'var(--secondary)' }}>
              Resolve items without a pass
            </Link>
          </div>
        </>
      )}

      <QrScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={handleScan}
        continuous
      />
    </div>
  );
}
