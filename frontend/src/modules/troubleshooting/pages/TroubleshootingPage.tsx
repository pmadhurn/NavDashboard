import { useState } from 'react';
import { Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AlertOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import DataTable from '@/shared/components/DataTable';
import { formatDateTime, truncateText } from '@/shared/utils/formatters';
import ErrorTimeline from '../components/ErrorTimeline';
import ErrorFilters from '../components/ErrorFilters';
import TroubleshootForm from '../components/TroubleshootForm';
import {
  useErrors,
  useErrorStats,
  type ErrorLog,
  type ErrorFilterState,
} from '../hooks/useTroubleshooting';
import { colors } from '@/styles/theme';

const SEVERITY_COLORS: Record<string, string> = {
  LOW: colors.severity.low,
  MEDIUM: colors.severity.medium,
  HIGH: colors.severity.high,
  CRITICAL: colors.severity.critical,
};

export default function TroubleshootingPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [filters, setFilters] = useState<ErrorFilterState>({
    severity: [],
    resolved: null,
    error_type: '',
    entity_type: 'all',
    reported_at_gte: null,
    reported_at_lte: null,
  });

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'add-step' | 'resolve'>('create');
  const [selectedErrorId, setSelectedErrorId] = useState<string>('');

  const { data: errorsData, isLoading } = useErrors(filters, page, pageSize);
  const { data: stats } = useErrorStats();

  const openCreateForm = () => {
    setFormMode('create');
    setSelectedErrorId('');
    setFormOpen(true);
  };

  const openAddStepForm = (errorId: string) => {
    setFormMode('add-step');
    setSelectedErrorId(errorId);
    setFormOpen(true);
  };

  const openResolveForm = (errorId: string) => {
    setFormMode('resolve');
    setSelectedErrorId(errorId);
    setFormOpen(true);
  };

  const handleSelectError = (_error: ErrorLog) => {
    // Could navigate to entity detail — for now just expand in timeline
  };

  // Table columns
  const columns: ColumnsType<ErrorLog> = [
    {
      title: 'Type',
      dataIndex: 'error_type',
      key: 'error_type',
      width: 160,
      render: (text: string) => (
        <span style={{ color: '#F0F0F0', fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (sev: string) => (
        <Tag
          style={{
            background: `${SEVERITY_COLORS[sev] || '#6E6E6E'}33`,
            border: `1px solid ${SEVERITY_COLORS[sev] || 'var(--severity-low)'}`,
            color: SEVERITY_COLORS[sev] || 'var(--severity-low)',
            borderRadius: 12,
            fontSize: 11,
          }}
        >
          {sev}
        </Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => (
        <span style={{ color: '#BFBFBF' }}>{truncateText(text, 60)}</span>
      ),
    },
    {
      title: 'Entity',
      key: 'entity',
      width: 120,
      render: (_: unknown, record: ErrorLog) => {
        if (record.device_id) return <span style={{ color: '#5B8AF0' }}>Device</span>;
        if (record.couple_id) return <span style={{ color: '#5B8AF0' }}>Couple</span>;
        if (record.pair_id) return <span style={{ color: '#5B8AF0' }}>Link</span>;
        return <span style={{ color: '#595959' }}>—</span>;
      },
    },
    {
      title: 'Reporter',
      dataIndex: 'reported_by_name',
      key: 'reporter',
      width: 130,
      render: (name: string | null) => (
        <span style={{ color: name ? 'var(--chart1)' : '#595959' }}>{name || '—'}</span>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'reported_at',
      key: 'date',
      width: 150,
      render: (dt: string) => (
        <span style={{ color: 'var(--role-admin)', fontSize: 12 }}>{formatDateTime(dt)}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'resolved',
      key: 'status',
      width: 100,
      render: (resolved: boolean) =>
        resolved ? (
          <Tag
            icon={<CheckCircleOutlined />}
            style={{
              background: 'rgba(91,185,139,0.15)',
              border: '1px solid rgba(91,185,139,0.3)',
              color: '#5BB98B',
              borderRadius: 12,
            }}
          >
            Resolved
          </Tag>
        ) : (
          <Tag
            icon={<ClockCircleOutlined />}
            style={{
              background: 'rgba(182,138,60,0.15)',
              border: '1px solid rgba(182,138,60,0.3)',
              color: 'var(--status-not-working)',
              borderRadius: 12,
            }}
          >
            Open
          </Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: ErrorLog) =>
        !record.resolved ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e?.stopPropagation();
                openAddStepForm(record.id);
              }}
            >
              + Step
            </GlassButton>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e?.stopPropagation();
                openResolveForm(record.id);
              }}
            >
              Resolve
            </GlassButton>
          </div>
        ) : null,
    },
  ];

  const errors = errorsData?.items || [];

  return (
    <div>
      <PageHeader
        title="Troubleshooting"
        subtitle="Error tracking and resolution workflow"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <GlassButton
              variant="primary"
              icon={<PlusOutlined />}
              onClick={openCreateForm}
            >
              Report Error
            </GlassButton>
          </div>
        }
      />

      {/* Stats bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <GlassCard padding="md" accentColor="var(--status-not-working)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertOutlined style={{ fontSize: 28, color: 'var(--status-not-working)' }} />
            <div>
              <div style={{ color: 'var(--role-admin)', fontSize: 12 }}>Open Errors</div>
              <div style={{ color: '#F0F0F0', fontSize: 28, fontWeight: 700 }}>
                {stats?.open ?? '—'}
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md" accentColor="#5BB98B">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircleOutlined style={{ fontSize: 28, color: '#5BB98B' }} />
            <div>
              <div style={{ color: 'var(--role-admin)', fontSize: 12 }}>Resolved</div>
              <div style={{ color: '#F0F0F0', fontSize: 28, fontWeight: 700 }}>
                {stats?.resolved ?? '—'}
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md" accentColor={colors.severity.critical}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ExclamationCircleOutlined
              style={{ fontSize: 28, color: colors.severity.critical }}
            />
            <div>
              <div style={{ color: 'var(--role-admin)', fontSize: 12 }}>Critical</div>
              <div style={{ color: '#F0F0F0', fontSize: 28, fontWeight: 700 }}>
                {stats?.by_severity?.CRITICAL ?? 0}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <ErrorFilters filters={filters} onChange={setFilters} />

      {/* View toggle */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <GlassButton
          variant={viewMode === 'timeline' ? 'primary' : 'ghost'}
          size="sm"
          icon={<ClockCircleOutlined />}
          onClick={() => setViewMode('timeline')}
        >
          Timeline
        </GlassButton>
        <GlassButton
          variant={viewMode === 'table' ? 'primary' : 'ghost'}
          size="sm"
          icon={<UnorderedListOutlined />}
          onClick={() => setViewMode('table')}
        >
          Table
        </GlassButton>
      </div>

      {/* Content */}
      {viewMode === 'timeline' ? (
        <ErrorTimeline
          errors={errors}
          loading={isLoading}
          onSelectError={handleSelectError}
          onResolve={openResolveForm}
          onAddStep={openAddStepForm}
        />
      ) : (
        <DataTable<ErrorLog>
          columns={columns}
          data={errors}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize,
            total: errorsData?.total || 0,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      )}

      {/* Form modal */}
      <TroubleshootForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        errorId={selectedErrorId}
      />
    </div>
  );
}