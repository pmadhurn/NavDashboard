import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, HistoryOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import EmptyState from '@/shared/components/EmptyState';
import ShareButton from '@/shared/components/ShareButton';
import { formatDateTime } from '@/shared/utils/formatters';
import { useAsset } from '../hooks/useAssets';
import {
  AssetTimeline,
  CustodyActions,
  CustodyBadges,
} from '../components/CustodyControls';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--primary)', textAlign: 'right' }}>{value ?? '—'}</span>
    </div>
  );
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: asset, isLoading } = useAsset(id);

  // `isLoading` and "no data" are distinct states: a 404 ends the load with
  // `asset` still undefined, so folding them together spins forever.
  if (isLoading) {
    return <LoadingSpinner text="Loading asset..." />;
  }

  if (!asset) {
    return (
      <EmptyState
        title="Asset not found"
        description="This asset may have been deleted, or the link is wrong."
        action={
          <GlassButton icon={<ArrowLeftOutlined />} onClick={() => navigate('/inventory/assets')}>
            Back to Inventory
          </GlassButton>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={asset.name}
        subtitle={asset.asset_code}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <CustodyActions
              assetId={asset.id}
              assetName={asset.name}
              condition={asset.condition}
            />
            <ShareButton
              title={`Asset: ${asset.name} (${asset.asset_code})`}
              url={`/inventory/assets/${asset.id}`}
            />
            <GlassButton
              variant="ghost"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/inventory/assets')}
            >
              Back
            </GlassButton>
          </div>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
        }}
      >
        <GlassCard padding="md">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginBottom: 14 }}>
            Details
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <InfoRow
              label="Where it is"
              value={
                <CustodyBadges
                  custodyType={asset.custody_type}
                  custodyLabel={asset.custody_label}
                  condition={asset.condition}
                />
              }
            />
            <InfoRow
              label="Available"
              value={
                <span
                  style={{
                    color: asset.is_available
                      ? 'var(--status-working)'
                      : 'var(--text-muted)',
                  }}
                >
                  {asset.is_available ? 'Yes' : 'No'}
                </span>
              }
            />
            {asset.expected_return_date && (
              <InfoRow
                label="Expected back"
                value={formatDateTime(asset.expected_return_date)}
              />
            )}
            <InfoRow label="Category" value={asset.category?.name} />
            <InfoRow
              label="Kind"
              value={asset.item_kind === 'BULK' ? `Bulk (${asset.quantity})` : 'Serialized'}
            />
            <InfoRow label="Serial number" value={asset.serial_number} />
            <InfoRow label="With" value={asset.current_person?.full_name} />
            <InfoRow label="Notes" value={asset.notes} />
            {asset.tag_identifiers?.barcode && (
              <InfoRow label="Barcode" value={asset.tag_identifiers.barcode} />
            )}
            {asset.tag_identifiers?.qr && <InfoRow label="QR" value={asset.tag_identifiers.qr} />}
            {asset.tag_identifiers?.rfid && (
              <InfoRow label="RFID" value={asset.tag_identifiers.rfid} />
            )}
          </div>
        </GlassCard>

        <GlassCard padding="md">
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--primary)',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <HistoryOutlined /> History
          </div>
          <AssetTimeline assetId={asset.id} />
        </GlassCard>
      </div>
    </div>
  );
}
