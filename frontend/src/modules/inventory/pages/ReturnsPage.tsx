import { useMemo, useState } from 'react';
import { Select, Input, DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import { InboxOutlined, CheckCircleOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { usePersonnelList } from '@/modules/personnel/hooks/usePersonnel';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useAssets, Asset } from '../hooks/useAssets';
import { useCustomers } from '../hooks/useCustody';
import { OUTCOMES, ResolveItem, ReturnOutcome, useResolveReturns } from '../hooks/useMovement';

/** One row per item that is out, with an outcome to choose. */
interface RowState {
  outcome?: ReturnOutcome;
  note?: string;
  projectId?: string;
  customerId?: string;
  expected?: Dayjs | null;
}

export default function ReturnsPage() {
  const [personId, setPersonId] = useState<string>();
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const { data: personnel } = usePersonnelList({ size: 200 });
  const { data: projects } = useProjects({});
  const { data: customers } = useCustomers();
  const resolve = useResolveReturns();

  // Everything currently out: with a person, at a project, or with a customer.
  const { data: withPerson, isLoading: l1 } = useAssets({
    custodyType: 'PERSON',
    personId,
  });
  const { data: atProject, isLoading: l2 } = useAssets({ custodyType: 'PROJECT' });

  const out: Asset[] = useMemo(
    () => [...(withPerson?.items ?? []), ...(personId ? [] : atProject?.items ?? [])],
    [withPerson, atProject, personId]
  );

  const setRow = (id: string, patch: Partial<RowState>) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  const ready = useMemo(
    () =>
      Object.entries(rows).filter(([, r]) => {
        if (!r.outcome) return false;
        const spec = OUTCOMES.find((o) => o.value === r.outcome);
        if (spec?.needs === 'project' && !r.projectId) return false;
        if (spec?.needs === 'customer' && !r.customerId) return false;
        return true;
      }),
    [rows]
  );

  const incomplete = useMemo(
    () =>
      Object.entries(rows).filter(([, r]) => {
        if (!r.outcome) return false;
        const spec = OUTCOMES.find((o) => o.value === r.outcome);
        if (spec?.needs === 'project' && !r.projectId) return true;
        if (spec?.needs === 'customer' && !r.customerId) return true;
        return false;
      }).length,
    [rows]
  );

  const submit = () => {
    const items: ResolveItem[] = ready.map(([assetId, r]) => ({
      asset_id: assetId,
      outcome: r.outcome!,
      note: r.note?.trim() || undefined,
      project_id: r.projectId,
      customer_id: r.customerId,
      expected_return_date: r.expected ? r.expected.toISOString() : undefined,
    }));
    resolve.mutate(items, { onSuccess: () => setRows({}) });
  };

  const isLoading = l1 || l2;

  return (
    <div>
      <PageHeader
        title="Record a return"
        icon={<InboxOutlined />}
        subtitle="Say what happened to each item — what came back, what stayed, what broke"
        actions={
          <Select
            value={personId}
            onChange={(v) => {
              setPersonId(v);
              setRows({});
            }}
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Everyone"
            style={{ minWidth: 200 }}
            options={(personnel?.items ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
          />
        }
      />

      <div
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          padding: '10px 14px',
          borderRadius: 8,
          background: 'var(--overlay-subtle)',
          marginBottom: 16,
        }}
      >
        You do not have to account for everything at once. Resolve what you know
        now — the rest stays on this list until someone does.
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading what is out…" />
      ) : out.length === 0 ? (
        <EmptyState
          icon={<CheckCircleOutlined />}
          title="Nothing is out"
          description="Every item is in stock. Nothing to account for."
        />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {out.map((a) => {
              const r = rows[a.id] ?? {};
              const spec = OUTCOMES.find((o) => o.value === r.outcome);
              return (
                <GlassCard key={a.id}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 78 }}>
                        {a.asset_code}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        with {a.custody_label ?? '—'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
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
                              setRow(a.id, {
                                outcome: on ? undefined : o.value,
                                projectId: undefined,
                                customerId: undefined,
                              })
                            }
                            style={{
                              padding: '8px',
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
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Select
                          value={r.projectId}
                          onChange={(v) => setRow(a.id, { projectId: v })}
                          showSearch
                          optionFilterProp="label"
                          placeholder="Which project is it left with? (required)"
                          style={{ flex: 1, minWidth: 220 }}
                          status={r.projectId ? undefined : 'warning'}
                          options={(projects?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
                        />
                        <DatePicker
                          value={r.expected}
                          onChange={(d) => setRow(a.id, { expected: d })}
                          placeholder="Expected back (optional)"
                        />
                      </div>
                    )}

                    {spec?.needs === 'customer' && (
                      <Select
                        value={r.customerId}
                        onChange={(v) => setRow(a.id, { customerId: v })}
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
                        onChange={(e) => setRow(a.id, { note: e.target.value })}
                        placeholder="Note (optional)"
                        size="small"
                      />
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>

          <div
            style={{
              position: 'sticky',
              bottom: 0,
              marginTop: 16,
              padding: '12px 0',
              background: 'var(--bg-main)',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 'auto' }}>
              {out.length} out · {ready.length} ready to record
              {incomplete > 0 && (
                <span style={{ color: 'var(--status-not-working)' }}>
                  {' '}· {incomplete} need{incomplete === 1 ? 's' : ''} a project or customer
                </span>
              )}
            </span>
            <GlassButton variant="ghost" onClick={() => setRows({})} disabled={!Object.keys(rows).length}>
              Clear
            </GlassButton>
            <GlassButton onClick={submit} disabled={ready.length === 0 || resolve.isPending}>
              Record {ready.length > 0 ? `${ready.length} item${ready.length === 1 ? '' : 's'}` : ''}
            </GlassButton>
          </div>
        </>
      )}
    </div>
  );
}
