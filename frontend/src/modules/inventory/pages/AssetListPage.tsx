import { useState } from 'react';
import dayjs from 'dayjs';
import { Select, Tabs, message } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  WarningOutlined,
  ShoppingCartOutlined,
  QrcodeOutlined,
  PrinterOutlined,
  TagsOutlined,
  CheckSquareOutlined,
  BorderOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/shared/components/PageHeader';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import DataTable from '@/shared/components/DataTable';
import ShareButton from '@/shared/components/ShareButton';
import QrScannerModal from '@/shared/components/QrScanner';
import { usePermission } from '@/shared/stores/authStore';
import { CustodyBadges } from '../components/CustodyControls';
import {
  CONDITION_LABEL,
  CUSTODY_LABEL,
  useCustodySummary,
  useStockLocations,
} from '../hooks/useCustody';
import { useAssets, useAssetCategories, useBackfillDevices, Asset } from '../hooks/useAssets';
import { lookupAsset } from '../hooks/useOutward';
import AssetFormModal from '../components/AssetFormModal';
import AssetReportsPanel from '../components/AssetReportsPanel';
import PrintLabelsModal from '../components/PrintLabelsModal';
import CategoryManagerModal from '../components/CategoryManagerModal';

function AssetsTab() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [custodyType, setCustodyType] = useState<string | undefined>();
  const [condition, setCondition] = useState<string | undefined>();
  const [locationId, setLocationId] = useState<string | undefined>();
  const [source, setSource] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  // Label printing: selection mode adds a tick column and repurposes the row
  // click; selections survive page/filter changes so a batch can span pages.
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, Asset>>({});
  const [printOpen, setPrintOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const canEdit = usePermission('assets.update');
  const canManage = usePermission('assets.delete');
  const canCategories = usePermission('assets.categories');
  const backfillDevices = useBackfillDevices();
  const { data, isLoading } = useAssets({
    page,
    search,
    categoryId,
    source,
    custodyType,
    condition,
    locationId,
  });
  const { data: locations } = useStockLocations();
  const { data: summary } = useCustodySummary();
  const { data: categories } = useAssetCategories();

  const toggleSelected = (record: Asset) =>
    setSelected((prev) => {
      if (prev[record.id]) {
        const { [record.id]: _dropped, ...rest } = prev;
        return rest;
      }
      return { ...prev, [record.id]: record };
    });

  const selectedList = Object.values(selected);

  const columns = [
    ...(selectMode
      ? [
          {
            title: '',
            key: 'select',
            width: 40,
            render: (_: unknown, record: Asset) =>
              selected[record.id] ? (
                <CheckSquareOutlined style={{ color: 'var(--primary)', fontSize: 16 }} />
              ) : (
                <BorderOutlined style={{ color: 'var(--text-muted)', fontSize: 16 }} />
              ),
          },
        ]
      : []),
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
        <span style={{ color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
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
        <span style={{ color: 'var(--text-secondary)' }}>{record.category?.name ?? '—'}</span>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      className: 'hide-on-mobile',
      render: (qty: number, record: Asset) => (
        <span style={{ color: 'var(--text-secondary)' }}>{record.item_kind === 'BULK' ? qty : '—'}</span>
      ),
    },
    {
      title: 'Where it is',
      key: 'custody',
      render: (_: unknown, record: Asset) => (
        <CustodyBadges
          custodyType={record.custody_type}
          custodyLabel={record.custody_label}
          condition={record.condition}
          size="sm"
        />
      ),
    },
  ];

  const tiles = summary
    ? [
        { label: 'Total', value: summary.total, onClick: () => { setCustodyType(undefined); setCondition(undefined); setLocationId(undefined); } },
        { label: 'Available', value: summary.available, color: 'var(--status-working)', onClick: () => { setCustodyType('LOCATION'); setCondition('OK'); } },
        { label: 'Damaged', value: summary.by_condition?.DAMAGED ?? 0, color: '#B0413E', onClick: () => { setCondition('DAMAGED'); setCustodyType(undefined); } },
        { label: 'With people', value: summary.by_custody?.PERSON ?? 0, color: '#6F8CB6', onClick: () => { setCustodyType('PERSON'); setCondition(undefined); } },
        { label: 'Overdue', value: summary.overdue, color: 'var(--status-not-working)' },
        { label: 'Unknown', value: summary.needs_reconciliation, color: '#B0413E', onClick: () => { setCustodyType('UNKNOWN'); setCondition(undefined); } },
      ]
    : [];

  return (
    <div>
      {tiles.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: 10,
            marginBottom: 16,
          }}
        >
          {tiles.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => { t.onClick?.(); setPage(1); }}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--overlay-subtle)',
                background: 'var(--overlay-subtle)',
                cursor: t.onClick ? 'pointer' : 'default',
                color: 'var(--text-primary)',
              }}
            >
              <div style={{ fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {t.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: t.color ?? 'var(--text-primary)' }}>
                {t.value}
              </div>
            </button>
          ))}
        </div>
      )}
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
            prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
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
          style={{ minWidth: 150 }}
          placeholder="Where"
          allowClear
          value={custodyType}
          onChange={(v) => {
            setCustodyType(v);
            setPage(1);
          }}
          options={Object.entries(CUSTODY_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <Select
          className="dl-select"
          style={{ minWidth: 140 }}
          placeholder="Condition"
          allowClear
          value={condition}
          onChange={(v) => {
            setCondition(v);
            setPage(1);
          }}
          options={Object.entries(CONDITION_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <Select
          className="dl-select"
          style={{ minWidth: 150 }}
          placeholder="Location"
          allowClear
          value={locationId}
          onChange={(v) => {
            setLocationId(v);
            setCustodyType(v ? 'LOCATION' : undefined);
            setPage(1);
          }}
          options={(locations ?? []).map((l) => ({ value: l.id, label: l.name }))}
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
        {canCategories && (
          <GlassButton
            variant="ghost"
            icon={<TagsOutlined />}
            onClick={() => setCategoriesOpen(true)}
          >
            Manage categories
          </GlassButton>
        )}
        {selectMode ? (
          <>
            <GlassButton
              variant="ghost"
              onClick={() => {
                setSelectMode(false);
                setSelected({});
              }}
            >
              Cancel
            </GlassButton>
            <GlassButton
              icon={<PrinterOutlined />}
              disabled={selectedList.length === 0}
              onClick={() => setPrintOpen(true)}
            >
              Print {selectedList.length} label{selectedList.length === 1 ? '' : 's'}
            </GlassButton>
          </>
        ) : (
          <GlassButton
            variant="ghost"
            icon={<PrinterOutlined />}
            onClick={() => setSelectMode(true)}
          >
            Print labels
          </GlassButton>
        )}
        {canEdit && (
          <GlassButton icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
            Add Asset
          </GlassButton>
        )}
      </div>

      {selectMode && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            padding: '8px 12px',
            borderRadius: 8,
            background: 'var(--overlay-subtle)',
            marginBottom: 12,
          }}
        >
          Tap rows to pick the items to label — the selection keeps across pages and filters.
        </div>
      )}

      <style>{`
        .dl-select .ant-select-selector {
          background: rgba(255,255,255,0.03) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          color: var(--text-primary) !important;
        }
        .dl-select .ant-select-selection-placeholder { color: var(--chart4) !important; }
        .dl-select .ant-select-selection-item { color: var(--text-primary) !important; }
      `}</style>

      <DataTable<Asset>
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        titleKey="asset_code"
        onRowClick={(record) =>
          selectMode
            ? toggleSelected(record)
            : navigate(record.device_id ? `/devices/${record.device_id}` : `/inventory/assets/${record.id}`)
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
      <PrintLabelsModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        assets={selectedList}
      />
      <CategoryManagerModal open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </div>
  );
}

export default function AssetListPage() {
  // Same query as the tab below; React Query dedupes, so this costs nothing
  // and keeps the share summary beside the button that sends it.
  const { data: summary } = useCustodySummary();
  const navigate = useNavigate();
  const [scanOpen, setScanOpen] = useState(false);

  // A scan is "take me to this thing": resolve the code (asset code, serial,
  // or tag) and jump straight to the item.
  const handleScan = async (code: string) => {
    try {
      const asset = await lookupAsset(code);
      navigate(`/inventory/assets/${asset.id}`);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        message.error('No item with that code');
      } else {
        message.error(err?.response?.data?.detail || 'Could not look up that code');
      }
    }
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Every item in the office — equipment, cables, tools"
        actions={<>
        <GlassButton
          variant="ghost"
          icon={<QrcodeOutlined />}
          onClick={() => setScanOpen(true)}
        >
          Scan
        </GlassButton>
        <ShareButton
          title="Inventory position"
          subtitle={dayjs().format('D MMMM YYYY')}
          url="/inventory/assets"
          lines={[
            { label: 'Total items', value: summary?.total },
            { label: 'Available', value: summary?.available },
            { label: 'With people', value: summary?.by_custody?.PERSON },
            { label: 'At customer sites', value: summary?.by_custody?.CUSTOMER },
            { label: 'Damaged', value: summary?.by_condition?.DAMAGED },
            { label: 'Overdue', value: summary?.overdue },
            { label: 'Location unknown', value: summary?.needs_reconciliation },
          ]}
        />
        </>}
      />
      <QrScannerModal open={scanOpen} onClose={() => setScanOpen(false)} onScan={handleScan} />
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
        .ant-tabs-tab { color: var(--text-muted) !important; }
        .ant-tabs-tab-active .ant-tabs-tab-btn { color: var(--primary) !important; }
        .ant-tabs-ink-bar { background: var(--primary) !important; }
      `}</style>
    </div>
  );
}
