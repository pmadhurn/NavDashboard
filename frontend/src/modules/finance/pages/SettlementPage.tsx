import { useState } from 'react';
import { CheckOutlined, CloseOutlined, SendOutlined, DownloadOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ShareButton from '@/shared/components/ShareButton';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import {
  useSettlement,
  useClaims,
  useSettleClaim,
  useSubmitClaim,
  formatMoney,
} from '../hooks/useFinance';
import ExportModal from '../components/ExportModal';

const CLAIM_COLORS: Record<string, string> = {
  DRAFT: 'var(--text-muted)',
  SUBMITTED: 'var(--status-not-working)',
  PARTIALLY_PAID: '#8C8468',
  PAID: 'var(--status-working)',
  REJECTED: 'var(--status-faulty)',
};

export default function SettlementPage() {
  const isMobile = useIsMobile();
  const [exportOpen, setExportOpen] = useState(false);
  const { data: summary, isLoading } = useSettlement();
  const { data: claims } = useClaims();
  const settleClaim = useSettleClaim();
  const submitClaim = useSubmitClaim();

  if (isLoading || !summary) return <LoadingSpinner text="Loading settlement..." />;

  const openClaims = (claims ?? []).filter((c) => c.status !== 'PAID' && c.status !== 'REJECTED');
  const closedClaims = (claims ?? []).filter((c) => c.status === 'PAID' || c.status === 'REJECTED');

  return (
    <div>
      <PageHeader
        title="Settlement"
        subtitle="Pending and paid across everyone, project-wise"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <GlassButton variant="ghost" icon={<DownloadOutlined />} onClick={() => setExportOpen(true)}>
              Export
            </GlassButton>
            <ShareButton title="Finance settlement summary" url="/finance/settlement" />
          </div>
        }
      />

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <GlassCard padding="sm">
          <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Pending payout</div>
          <div style={{ color: 'var(--status-not-working)', fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            {formatMoney(summary.total_pending)}
          </div>
        </GlassCard>
        <GlassCard padding="sm">
          <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Paid out</div>
          <div style={{ color: 'var(--status-working)', fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            {formatMoney(summary.total_paid)}
          </div>
        </GlassCard>
      </div>

      {/* Claims awaiting the finance person */}
      <div style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
        Claims to process
      </div>
      {openClaims.length === 0 ? (
        <EmptyState title="Nothing to process" description="Submitted claims will appear here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {openClaims.map((c) => (
            <GlassCard key={c.id} padding="sm">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{c.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {c.expense_count} expenses · {formatMoney(c.total)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: CLAIM_COLORS[c.status],
                      background: `${CLAIM_COLORS[c.status]}22`,
                      padding: '2px 8px',
                      borderRadius: 8,
                    }}
                  >
                    {c.status}
                  </span>
                  {c.status === 'DRAFT' && (
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      icon={<SendOutlined />}
                      onClick={() => submitClaim.mutate(c.id)}
                    >
                      Submit
                    </GlassButton>
                  )}
                  {c.status !== 'DRAFT' && (
                    <>
                      <GlassButton
                        size="sm"
                        icon={<CheckOutlined />}
                        loading={settleClaim.isPending}
                        onClick={() => settleClaim.mutate({ id: c.id, status: 'PAID' })}
                      >
                        Mark Paid
                      </GlassButton>
                      <GlassButton
                        variant="danger"
                        size="sm"
                        icon={<CloseOutlined />}
                        onClick={() => settleClaim.mutate({ id: c.id, status: 'REJECTED' })}
                      >
                        Reject
                      </GlassButton>
                    </>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
        {/* Per person */}
        <GlassCard padding="md">
          <div style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>By person</div>
          {summary.by_person.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No expenses logged yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {summary.by_person.map((p) => (
                <div key={p.user_id ?? p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: 13 }}>{p.name}</div>
                    <div style={{ color: 'var(--chart4)', fontSize: 11 }}>
                      advance {formatMoney(p.advances)} · spent {formatMoney(p.spent)} · balance{' '}
                      {formatMoney(p.balance)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12 }}>
                    <div style={{ color: 'var(--status-not-working)' }}>{formatMoney(p.pending)} pending</div>
                    <div style={{ color: 'var(--status-working)' }}>{formatMoney(p.paid)} paid</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Per project */}
        <GlassCard padding="md">
          <div style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>By project</div>
          {summary.by_project.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No project expenses yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {summary.by_project.map((p) => (
                <div key={p.project_id ?? p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{p.name}</span>
                  <div style={{ textAlign: 'right', fontSize: 12 }}>
                    <div style={{ color: 'var(--status-not-working)' }}>{formatMoney(p.pending)} pending</div>
                    <div style={{ color: 'var(--status-working)' }}>{formatMoney(p.paid)} paid</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {closedClaims.length > 0 && (
        <>
          <div style={{ color: 'var(--chart4)', fontSize: 12, marginTop: 24, marginBottom: 8 }}>Settled claims</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {closedClaims.slice(0, 10).map((c) => (
              <GlassCard key={c.id} padding="sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{c.title}</span>
                  <span style={{ color: CLAIM_COLORS[c.status] }}>
                    {c.status} · {formatMoney(c.total)}
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
