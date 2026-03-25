import React, { useState } from 'react';
import { Row, Col, Pagination, message, Popconfirm } from 'antd';
import {
  UnorderedListOutlined,
  FieldTimeOutlined,
  PlusCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import DataTable from '@/shared/components/DataTable';
import { useAuditEntries, useAuditStats, useRevertAudit } from '../hooks/useAuditTrail';
import { useAuthStore } from '@/shared/stores/authStore';
import AuditTimeline from '../components/AuditTimeline';
import AuditFilters from '../components/AuditFilters';

const REVERTABLE_ACTIONS = ['UPDATE', 'STATUS_CHANGE', 'DELETE'];

const AuditTrailPage: React.FC = () => {
  const [view, setView] = useState<'timeline' | 'table'>('timeline');
  const [filters, setFilters] = useState<Record<string, any>>({
    page: 1,
    size: 20,
  });

  const { data: statsData, isLoading: statsLoading } = useAuditStats();
  const { data: entriesData, isLoading: entriesLoading } =
    useAuditEntries(filters);
  const revertMutation = useRevertAudit();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const stats = statsData;
  const entries = entriesData?.items || [];
  const total = entriesData?.total || 0;
  const currentPage = filters.page || 1;
  const pageSize = filters.size || 20;

  const createCount = stats?.by_action?.CREATE ?? 0;
  const seedCreateCount = stats?.by_action?.SEED_CREATE ?? 0;
  const updateCount = stats?.by_action?.UPDATE ?? 0;
  const statusChangeCount = stats?.by_action?.STATUS_CHANGE ?? 0;
  const deleteCount = stats?.by_action?.DELETE ?? 0;

  const handlePageChange = (page: number, size?: number) => {
    setFilters((prev) => ({ ...prev, page, size: size || prev.size }));
  };

  const handleRevert = async (auditId: string) => {
    try {
      await revertMutation.mutateAsync(auditId);
      message.success('Changes reverted successfully');
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'Failed to revert');
    }
  };

  const tableColumns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (val: string) => new Date(val).toLocaleString(),
      width: 180,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (val: string) => {
        let color = '#7A7A7A';
        if (val === 'CREATE' || val === 'SEED_CREATE') color = '#5F8F6B';
        if (val === 'DELETE') color = '#9B3E3E';
        if (val === 'REVERT') color = '#B68A3C';
        return (
          <span
            style={{
              color,
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
            }}
          >
            {val}
          </span>
        );
      },
    },
    {
      title: 'Entity Type',
      dataIndex: 'entity_type',
      key: 'entity_type',
      width: 120,
    },
    {
      title: 'Entity ID',
      dataIndex: 'entity_id',
      key: 'entity_id',
      width: 280,
      render: (val: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#B8B8B8' }}>
          {val}
        </span>
      ),
    },
    {
      title: 'User',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 150,
      render: (val: string | null) => val || '—',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (val: string | null) => (
        <span style={{ color: '#B8B8B8' }}>{val || '—'}</span>
      ),
    },
    ...(isAdmin
      ? [
          {
            title: 'Revert',
            key: 'revert',
            width: 100,
            render: (_: unknown, record: any) => {
              const canRevert =
                REVERTABLE_ACTIONS.includes(record.action) &&
                record.old_values &&
                Object.keys(record.old_values).length > 0;
              if (!canRevert) return null;
              return (
                <Popconfirm
                  title="Revert this change?"
                  description="This will restore the previous values."
                  onConfirm={() => handleRevert(record.id)}
                  okText="Revert"
                  cancelText="Cancel"
                >
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    icon={<UndoOutlined />}
                    loading={revertMutation.isPending}
                    style={{ color: '#B68A3C' }}
                  >
                    Revert
                  </GlassButton>
                </Popconfirm>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader title="Audit Trail" />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <GlassCard>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#7A7A7A', fontSize: 12, marginBottom: 4 }}>
                Total Entries
              </div>
              <div style={{ color: '#F2F2F2', fontSize: 28, fontWeight: 700 }}>
                {statsLoading ? '...' : stats?.total_entries ?? 0}
              </div>
            </div>
          </GlassCard>
        </Col>
        <Col xs={12} sm={6}>
          <GlassCard>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#7A7A7A', fontSize: 12, marginBottom: 4 }}>
                <PlusCircleOutlined style={{ marginRight: 4 }} />
                Creates
              </div>
              <div style={{ color: '#5F8F6B', fontSize: 28, fontWeight: 700 }}>
                {statsLoading ? '...' : createCount + seedCreateCount}
              </div>
            </div>
          </GlassCard>
        </Col>
        <Col xs={12} sm={6}>
          <GlassCard>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#7A7A7A', fontSize: 12, marginBottom: 4 }}>
                <EditOutlined style={{ marginRight: 4 }} />
                Updates
              </div>
              <div style={{ color: '#7A7A7A', fontSize: 28, fontWeight: 700 }}>
                {statsLoading ? '...' : updateCount + statusChangeCount}
              </div>
            </div>
          </GlassCard>
        </Col>
        <Col xs={12} sm={6}>
          <GlassCard>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#7A7A7A', fontSize: 12, marginBottom: 4 }}>
                <DeleteOutlined style={{ marginRight: 4 }} />
                Deletes
              </div>
              <div style={{ color: '#9B3E3E', fontSize: 28, fontWeight: 700 }}>
                {statsLoading ? '...' : deleteCount}
              </div>
            </div>
          </GlassCard>
        </Col>
      </Row>

      <AuditFilters
        filters={filters}
        onFiltersChange={(newFilters) =>
          setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }))
        }
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 16,
          gap: 8,
        }}
      >
        <GlassButton
          icon={<FieldTimeOutlined />}
          onClick={() => setView('timeline')}
          style={{
            borderColor: view === 'timeline' ? '#5F8F6B' : undefined,
            color: view === 'timeline' ? '#5F8F6B' : '#B8B8B8',
          }}
        >
          Timeline
        </GlassButton>
        <GlassButton
          icon={<UnorderedListOutlined />}
          onClick={() => setView('table')}
          style={{
            borderColor: view === 'table' ? '#5F8F6B' : undefined,
            color: view === 'table' ? '#5F8F6B' : '#B8B8B8',
          }}
        >
          Table
        </GlassButton>
      </div>

      {entriesLoading && <LoadingSpinner />}

      {!entriesLoading && view === 'timeline' && (
        <AuditTimeline entries={entries} loading={false} />
      )}

      {!entriesLoading && view === 'table' && (
        <GlassCard>
          <DataTable
            columns={tableColumns}
            dataSource={entries}
            rowKey="id"
            pagination={false}
          />
        </GlassCard>
      )}

      {!entriesLoading && total > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 24,
          }}
        >
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={total}
            onChange={handlePageChange}
            showSizeChanger
            pageSizeOptions={['10', '20', '50', '100']}
          />
        </div>
      )}
    </div>
  );
};

export default AuditTrailPage;