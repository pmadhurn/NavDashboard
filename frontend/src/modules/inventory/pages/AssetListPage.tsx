import { useState } from 'react';
import { Select, Tabs } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  WarningOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/shared/components/PageHeader';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import DataTable from '@/shared/components/DataTable';
import StatusBadge from '@/shared/components/StatusBadge';
import ShareButton from '@/shared/components/ShareButton';
import { usePermission } from '@/shared/stores/authStore';
import { useAssets, useAssetCategories, useBackfillDevices, Asset, ASSET_STATUSES } from '../hooks/useAssets';
import AssetFormModal from '../components/AssetFormModal';
import AssetReportsPanel from '../components/AssetReportsPanel';

function AssetsTab() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [source, setSource] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);

  const canEdit = usePermission('inventory', 'EDIT');
  const canManage = usePermission('inventory', 'MANAGE');
  const backfillDevices = useBackfillDevices();
  const { data, isLoading } = useAssets({ page, search, categoryId, status, source });
  const { data: categories } = useAssetCategories();

  const columns = [
    {
      title: 'Code',
      dataIndex: 'asset_code',
      key: 'asset_code',
      render: (code: string) => (
        <span style={{ color: '#8BC34A', fontFamily: 'monospace', fontSize: 12 }}>{code}</span>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Asset) => (
        <span style={{ color: '#F2F2F2', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {name}
          {record.device_id && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#5E8C86',
                background: 'rgba(94,140,134,0.15)',
                padding: '1px 6px',
                borderRadius: 8,
              }}
            >
              DEVICE
            </span>
          )}
        </span>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      className: 'hide-on-mobile',
      render: (_: unknown, record: Asset) => (
        <span style={{ color: '#B8B8B8' }}>{record.category?.name ?? '—'}</span>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      className: 'hide-on-mobile',
      render: (qty: number, record: Asset) => (
        <span style={{ color: '#B8B8B8' }}>{record.item_kind === 'BULK' ? qty : '—'}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <StatusBadge status={value} />,
    },
    {
      title: 'With',
      key: 'custody',
      className: 'hide-on-mobile',
      render: (_: unknown, record: Asset) => (
        <span style={{ color: '#B8B8B8', fontSize: 12 }}>
          {record.current_person?.full_name ??
            (record.status === 'WITH_PROJECT' ? 'Project' : 'Office')}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1, minWidth: 200, maxWidth: 380 }}>
          <GlassInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by name, code, or serial..."
            prefix={<SearchOutlined style={{ color: '#7A7A7A' }} />}
          />
        </div>
        <Select
          className="dl-select"
          style={{ minWidth: 160 }}
          placeholder="Category"
          allowClear
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v);
            setPage(1);
          }}
          options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
        />
        <Select
          className="dl-select"
          style={{ minWidth: 140 }}
          placeholder="Status"
          allowClear
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={ASSET_STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
        />
        <Select
          className="dl-select"
          style={{ minWidth: 130 }}
          placeholder="Type"
          allowClear
          value={source}
          onChange={(v) => {
            setSource(v);
            setPage(1);
          }}
          options={[
            { value: 'device', label: 'Devices' },
            { value: 'equipment', label: 'Equipment' },
          ]}
        />
        {canManage && (
          <GlassButton
            variant="ghost"
            onClick={() => backfillDevices.mutate()}
            loading={backfillDevices.isPending}
          >
            Sync Devices
          </GlassButton>
        )}
        {canEdit && (
          <GlassButton icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
            Add Asset
          </GlassButton>
        )}
      </div>

      <style>{`
        .dl-select .ant-select-selector {
          background: rgba(255,255,255,0.03) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          color: #F2F2F2 !important;
        }
        .dl-select .ant-select-selection-placeholder { color: #5A5A5A !important; }
        .dl-select .ant-select-selection-item { color: #F2F2F2 !important; }
      `}</style>

      <DataTable<Asset>
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        onRowClick={(record) =>
          navigate(record.device_id ? `/devices/${record.device_id}` : `/inventory/assets/${record.id}`)
        }
        pagination={{
          current: page,
          pageSize: 50,
          total: data?.total ?? 0,
          onChange: setPage,
        }}
        emptyText="No assets yet. Add the first one to start tracking."
      />

      <AssetFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}

export default function AssetListPage() {
  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Every item in the office — equipment, cables, tools"
        actions={<ShareButton title="Inventory" url="/inventory/assets" />}
      />
      <Tabs
        defaultActiveKey="assets"
        items={[
          {
            key: 'assets',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AppstoreOutlined /> Assets
              </span>
            ),
            children: <AssetsTab />,
          },
          {
            key: 'damaged',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <WarningOutlined /> Damaged
              </span>
            ),
            children: <AssetReportsPanel reportType="DAMAGED" />,
          },
          {
            key: 'requirements',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShoppingCartOutlined /> Requirements
              </span>
            ),
            children: <AssetReportsPanel reportType="REQUIREMENT" />,
          },
        ]}
      />
      <style>{`
        .ant-tabs-tab { color: #7A7A7A !important; }
        .ant-tabs-tab-active .ant-tabs-tab-btn { color: #E6E6E6 !important; }
        .ant-tabs-ink-bar { background: #E6E6E6 !important; }
      `}</style>
    </div>
  );
}
