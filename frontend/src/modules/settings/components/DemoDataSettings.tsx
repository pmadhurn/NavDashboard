import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message, Table, Tag } from 'antd';
import {
  DatabaseOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { api } from '@/shared/api/client';
import { colors } from '@/styles/theme';

interface ModuleStatus {
  entity_type: string;
  table: string;
  total_rows: number;
  seeded_rows: number;
}

interface SeedStatus {
  modules: ModuleStatus[];
  seeded_total: number;
  unregistered_total: number;
  can_adopt: boolean;
}

interface SeedRunResult {
  batch_id: string;
  created: Record<string, number>;
  total: number;
}

interface AdoptResult {
  batch_id: string;
  adopted: Record<string, number>;
  total: number;
}

interface RemoveResult {
  removed: Record<string, number>;
  total: number;
}

const LABELS: Record<string, string> = {
  material_template: 'Material templates',
  fitting_material: 'Fitting materials',
  person: 'Personnel',
  device: 'Devices',
  location: 'Locations',
  couple: 'Couples',
  pair: 'Pairs',
  error_log: 'Error logs',
  project: 'Projects',
  project_phase: 'Project phases',
  project_member: 'Project members',
  asset_category: 'Asset categories',
  asset: 'Assets',
  expense_batch: 'Expense batches',
  fund_allocation: 'Fund allocations',
  expense_claim: 'Expense claims',
  expense: 'Expenses',
};

export default function DemoDataSettings() {
  const qc = useQueryClient();
  const [confirmText, setConfirmText] = useState('');

  const { data: status, isLoading } = useQuery<SeedStatus>({
    queryKey: ['seeding', 'status'],
    queryFn: () => api.get<SeedStatus>('/seeding/status'),
  });

  // Invalidating everything is intentional: seeding and removal touch most
  // modules at once, so a targeted invalidation list would go stale the next
  // time a module is added to the seeder.
  const refreshAll = () => {
    qc.invalidateQueries();
    setConfirmText('');
  };

  const seed = useMutation({
    mutationFn: () => api.post<SeedRunResult>('/seeding/run'),
    onSuccess: (d) => {
      message.success(
        d.total > 0
          ? `Seeded ${d.total} records across ${Object.keys(d.created).length} modules.`
          : 'Nothing to seed — every module already has data.',
      );
      refreshAll();
    },
    onError: () => message.error('Seeding failed. Check the backend logs.'),
  });

  const adopt = useMutation({
    // confirm is a query param, not a body field — the API refuses without it.
    mutationFn: () => api.post<AdoptResult>('/seeding/adopt?confirm=ADOPT'),
    onSuccess: (d) => {
      message.success(`Marked ${d.total} existing records as demo data.`);
      refreshAll();
    },
    onError: () => message.error('Could not mark existing records.'),
  });

  const remove = useMutation({
    mutationFn: () => api.del<RemoveResult>('/seeding/?confirm=REMOVE'),
    onSuccess: (d) => {
      message.success(`Removed ${d.total} demo records.`);
      refreshAll();
    },
    onError: () => message.error('Removal failed. Check the backend logs.'),
  });

  if (isLoading || !status) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <LoadingSpinner size="md" />
      </div>
    );
  }

  const busy = seed.isPending || adopt.isPending || remove.isPending;
  const canRemove = status.seeded_total > 0 && confirmText === 'REMOVE';

  const columns = [
    {
      title: 'Module',
      dataIndex: 'entity_type',
      key: 'entity_type',
      render: (v: string) => (
        <span style={{ color: colors.text.primary, whiteSpace: 'nowrap' }}>
          {LABELS[v] ?? v}
        </span>
      ),
    },
    {
      title: 'Total rows',
      dataIndex: 'total_rows',
      key: 'total_rows',
      align: 'right' as const,
      render: (v: number) => <span style={{ color: colors.text.secondary }}>{v}</span>,
    },
    {
      title: 'Demo rows',
      dataIndex: 'seeded_rows',
      key: 'seeded_rows',
      align: 'right' as const,
      render: (v: number, row: ModuleStatus) => (
        <Tag
          style={{
            background: v > 0 ? `${colors.status.working}22` : 'transparent',
            border: `1px solid ${v > 0 ? colors.status.working : colors.border}`,
            color: v > 0 ? colors.status.working : colors.text.muted,
            margin: 0,
          }}
        >
          {v} / {row.total_rows}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <GlassCard padding="lg">
        <h3 style={{ color: colors.text.primary, fontSize: 16, fontWeight: 600, margin: 0 }}>
          Demo data
        </h3>
        <p style={{ color: colors.text.muted, fontSize: 13, marginTop: 6, marginBottom: 16 }}>
          Fills every module — devices, couples, pairs, personnel, inventory, error logs,
          projects, assets and finance — with realistic sample records. Every row created
          here is tracked, so removal deletes exactly what was seeded and nothing else.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <GlassButton
            variant="primary"
            disabled={busy}
            onClick={() => seed.mutate()}
          >
            <DatabaseOutlined /> {seed.isPending ? 'Seeding…' : 'Seed demo data'}
          </GlassButton>
        </div>

        <div style={{ marginTop: 18 }}>
          <Table
            size="small"
            rowKey="entity_type"
            dataSource={status.modules}
            columns={columns}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </div>
      </GlassCard>

      {status.can_adopt && (
        <GlassCard padding="lg" accentColor={colors.severity.medium}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <TagsOutlined style={{ color: colors.severity.medium, fontSize: 20, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <h4 style={{ color: colors.text.primary, fontSize: 14, fontWeight: 600, margin: 0 }}>
                {status.unregistered_total} records are not tracked
              </h4>
              <p style={{ color: colors.text.muted, fontSize: 13, marginTop: 6, marginBottom: 12 }}>
                These were created before demo-data tracking existed, so
                <strong style={{ color: colors.text.secondary }}> Remove demo data
                </strong> will not touch them. Marking them as demo data makes them
                removable — but this cannot tell old sample rows apart from records you
                entered yourself. It claims all {status.unregistered_total}.
              </p>
              <GlassButton
                disabled={busy}
                onClick={() => adopt.mutate()}
              >
                Mark all {status.unregistered_total} as demo data
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard padding="lg" accentColor={colors.severity.critical}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <ExclamationCircleOutlined
            style={{ color: colors.severity.critical, fontSize: 20, marginTop: 2 }}
          />
          <div style={{ flex: 1 }}>
            <h4 style={{ color: colors.text.primary, fontSize: 14, fontWeight: 600, margin: 0 }}>
              Remove demo data
            </h4>
            <p style={{ color: colors.text.muted, fontSize: 13, marginTop: 6, marginBottom: 12 }}>
              Permanently deletes the{' '}
              <strong style={{ color: colors.text.secondary }}>
                {status.seeded_total} tracked demo records
              </strong>{' '}
              and their history. Untracked records are left alone. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <GlassInput
                placeholder="Type REMOVE to confirm"
                value={confirmText}
                onChange={setConfirmText}
                style={{ maxWidth: 220 }}
                disabled={status.seeded_total === 0 || busy}
              />
              <GlassButton
                variant="danger"
                disabled={!canRemove || busy}
                onClick={() => remove.mutate()}
              >
                <DeleteOutlined /> {remove.isPending ? 'Removing…' : 'Remove demo data'}
              </GlassButton>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
