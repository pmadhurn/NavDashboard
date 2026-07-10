import { useMemo, useState } from 'react';
import { Select } from 'antd';
import { PlusOutlined, WhatsAppOutlined, CheckOutlined } from '@ant-design/icons';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import GlassModal from '@/shared/components/GlassModal';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import StatusBadge from '@/shared/components/StatusBadge';
import { buildWhatsAppUrl } from '@/shared/components/ShareButton';
import { usePermission } from '@/shared/stores/authStore';
import {
  useAssetReports,
  useCreateAssetReport,
  useUpdateAssetReport,
  useAssets,
  AssetReport,
} from '../hooks/useAssets';

interface Props {
  reportType: 'DAMAGED' | 'REQUIREMENT';
}

export default function AssetReportsPanel({ reportType }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [assetId, setAssetId] = useState<string | undefined>();
  const [assetSearch, setAssetSearch] = useState('');

  const canEdit = usePermission('inventory', 'EDIT');
  const { data: reports, isLoading } = useAssetReports(reportType);
  const { data: assetData } = useAssets({ search: assetSearch });
  const createReport = useCreateAssetReport();
  const updateReport = useUpdateAssetReport();

  const openReports = useMemo(
    () => (reports ?? []).filter((r) => r.status !== 'RESOLVED'),
    [reports]
  );
  const resolvedReports = useMemo(
    () => (reports ?? []).filter((r) => r.status === 'RESOLVED'),
    [reports]
  );

  const isDamaged = reportType === 'DAMAGED';

  const forwardAll = () => {
    const lines = openReports.map(
      (r) => `• ${r.title}${r.quantity > 1 ? ` ×${r.quantity}` : ''}${r.details ? ` — ${r.details}` : ''}`
    );
    const heading = isDamaged ? 'Damaged items:' : 'New requirements:';
    window.open(
      buildWhatsAppUrl(heading, '/inventory', lines.join('\n')),
      '_blank',
      'noopener'
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await createReport.mutateAsync({
      report_type: reportType,
      asset_id: assetId,
      title: title.trim(),
      details: details.trim() || undefined,
      quantity: parseInt(quantity, 10) || 1,
    });
    setTitle('');
    setDetails('');
    setQuantity('1');
    setAssetId(undefined);
    setModalOpen(false);
  };

  const renderReport = (report: AssetReport) => (
    <GlassCard key={report.id} padding="sm">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ color: '#F2F2F2', fontSize: 13, fontWeight: 600 }}>
            {report.title}
            {report.quantity > 1 && (
              <span style={{ color: '#8BC34A', marginLeft: 8 }}>×{report.quantity}</span>
            )}
          </div>
          <div style={{ color: '#7A7A7A', fontSize: 12 }}>
            {report.asset && `${report.asset.asset_code} · `}
            {report.details || (isDamaged ? 'Damaged item' : 'Requested item')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <StatusBadge status={report.status} />
          {canEdit && report.status !== 'RESOLVED' && (
            <GlassButton
              variant="ghost"
              size="sm"
              icon={<CheckOutlined />}
              onClick={() =>
                updateReport.mutate({ id: report.id, data: { status: 'RESOLVED' } })
              }
            >
              Resolve
            </GlassButton>
          )}
        </div>
      </div>
    </GlassCard>
  );

  if (isLoading) return <LoadingSpinner text="Loading..." />;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 13, color: '#7A7A7A' }}>
          {openReports.length} open
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {openReports.length > 0 && (
            <GlassButton variant="ghost" icon={<WhatsAppOutlined />} onClick={forwardAll}>
              Forward on WhatsApp
            </GlassButton>
          )}
          {canEdit && (
            <GlassButton icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              {isDamaged ? 'Report Damage' : 'Add Requirement'}
            </GlassButton>
          )}
        </div>
      </div>

      {openReports.length === 0 && resolvedReports.length === 0 ? (
        <EmptyState
          title={isDamaged ? 'No damaged items' : 'No requirements yet'}
          description={
            isDamaged
              ? 'Damaged equipment reported by the team will show up here.'
              : 'Things the office needs to buy will show up here.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {openReports.map(renderReport)}
          {resolvedReports.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: '#5A5A5A', marginTop: 8 }}>Resolved</div>
              {resolvedReports.slice(0, 10).map(renderReport)}
            </>
          )}
        </div>
      )}

      <GlassModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isDamaged ? 'Report Damaged Item' : 'Add Requirement'}
        width={460}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <GlassButton variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handleSubmit}
              loading={createReport.isPending}
              disabled={!title.trim()}
            >
              Save
            </GlassButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#7A7A7A', marginBottom: 6 }}>
              {isDamaged ? 'What is damaged?' : 'What is needed?'}
            </label>
            <GlassInput
              value={title}
              onChange={setTitle}
              placeholder={isDamaged ? 'e.g. HDMI cable frayed' : 'e.g. 5x USB-C cables'}
            />
          </div>
          {isDamaged && (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#7A7A7A', marginBottom: 6 }}>
                Link to asset (optional)
              </label>
              <Select
                className="dl-select"
                style={{ width: '100%' }}
                placeholder="Search assets..."
                showSearch
                allowClear
                filterOption={false}
                onSearch={setAssetSearch}
                value={assetId}
                onChange={setAssetId}
                options={(assetData?.items ?? []).map((a) => ({
                  value: a.id,
                  label: `${a.asset_code} — ${a.name}`,
                }))}
              />
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#7A7A7A', marginBottom: 6 }}>
              Quantity
            </label>
            <GlassInput type="number" value={quantity} onChange={setQuantity} placeholder="1" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#7A7A7A', marginBottom: 6 }}>
              Details (optional)
            </label>
            <GlassInput value={details} onChange={setDetails} placeholder="Anything else" />
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
