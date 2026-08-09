import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, HistoryOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import EmptyState from '@/shared/components/EmptyState';
import StatusBadge from '@/shared/components/StatusBadge';
import ShareButton from '@/shared/components/ShareButton';
import { formatDateTime } from '@/shared/utils/formatters';
import { useAsset, useAssetHistory } from '../hooks/useAssets';

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
  const { data: history } = useAssetHistory(id);

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
          <div style={{ display: 'flex', gap: 8 }}>
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
            <InfoRow label="Status" value={<StatusBadge status={asset.status} />} />
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
            <HistoryOutlined /> Trail
          </div>
          {!history || history.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No events recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map((event) => (
                <div
                  key={event.id}
                  style={{
                    borderLeft: '2px solid rgba(139,195,74,0.35)',
                    paddingLeft: 12,
                  }}
                >
                  <div style={{ color: 'var(--primary)', fontSize: 13 }}>
                    {event.event_type.replace(/_/g, ' ')}
                    {event.old_status && event.new_status && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        {' '}
                        · {event.old_status} → {event.new_status}
                      </span>
                    )}
                  </div>
                  {event.note && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{event.note}</div>
                  )}
                  <div style={{ color: 'var(--chart4)', fontSize: 11 }}>
                    {formatDateTime(event.occurred_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
