import { useState } from 'react';
import { PlusOutlined, WalletOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import GlassModal from '@/shared/components/GlassModal';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ShareButton from '@/shared/components/ShareButton';
import PersonPicker from '@/shared/components/PersonPicker';
import { usePermission } from '@/shared/stores/authStore';
import { formatDateTime } from '@/shared/utils/formatters';
import {
  useMyFinance,
  useAdvances,
  useCreateAdvance,
  useClaims,
  formatMoney,
} from '../hooks/useFinance';

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <GlassCard padding="sm">
      <div style={{ color: '#7A7A7A', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ color: accent ?? '#F2F2F2', fontSize: 20, fontWeight: 700, marginTop: 4 }}>
        {value}
      </div>
    </GlassCard>
  );
}

export default function MyFinancePage() {
  const { data: summary, isLoading } = useMyFinance();
  const { data: advances } = useAdvances({ personId: summary?.person_id ?? undefined });
  const { data: claims } = useClaims({ mine: true });
  const createAdvance = useCreateAdvance();
  const canEdit = usePermission('finance', 'EDIT');

  const [addOpen, setAddOpen] = useState(false);
  const [personId, setPersonId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleLogAdvance = async () => {
    const value = parseFloat(amount);
    const target = personId ?? summary?.person_id;
    if (!target || !value) return;
    await createAdvance.mutateAsync({
      person_id: target,
      amount: value,
      source_note: note.trim() || undefined,
    });
    setAddOpen(false);
    setAmount('');
    setNote('');
    setPersonId(undefined);
  };

  if (isLoading || !summary) return <LoadingSpinner text="Loading your finance..." />;

  const negative = summary.balance < 0;

  return (
    <div>
      <PageHeader
        title="My Finance"
        subtitle="Your advances, expenses, and what's still owed"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ShareButton title="My finance summary" url="/finance/my" />
            {canEdit && (
              <GlassButton variant="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
                Log Advance
              </GlassButton>
            )}
          </div>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <Stat label="Advances received" value={formatMoney(summary.advances)} />
        <Stat label="Total spent" value={formatMoney(summary.spent)} />
        <Stat
          label={negative ? 'Owed to you' : 'Balance in hand'}
          value={formatMoney(Math.abs(summary.balance))}
          accent={negative ? '#B68A3C' : '#5F8F6B'}
        />
        <Stat label="Pending with finance" value={formatMoney(summary.pending_total)} accent="#B68A3C" />
        <Stat label="Paid out" value={formatMoney(summary.paid_total)} accent="#5F8F6B" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <GlassCard padding="md">
          <div style={{ color: '#E6E6E6', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Advances from office
          </div>
          {!advances || advances.length === 0 ? (
            <div style={{ color: '#7A7A7A', fontSize: 13 }}>No advances recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {advances.map((a) => (
                <div
                  key={a.id}
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}
                >
                  <span style={{ color: '#B8B8B8' }}>
                    {a.source_note || 'Advance'}
                    <span style={{ color: '#5A5A5A', fontSize: 11, marginLeft: 6 }}>
                      {formatDateTime(a.received_date)}
                    </span>
                  </span>
                  <span style={{ color: '#5F8F6B', fontWeight: 600 }}>{formatMoney(a.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard padding="md">
          <div style={{ color: '#E6E6E6', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            My claims
          </div>
          {!claims || claims.length === 0 ? (
            <EmptyState title="No claims yet" description="Bundle expenses into a claim to submit them." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {claims.map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#B8B8B8' }}>
                    {c.title}
                    <span style={{ color: '#5A5A5A', fontSize: 11, marginLeft: 6 }}>
                      {c.expense_count} items
                    </span>
                  </span>
                  <span style={{ color: c.status === 'PAID' ? '#5F8F6B' : '#B68A3C', fontSize: 12 }}>
                    {c.status} · {formatMoney(c.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Log Advance Received"
        width={440}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <GlassButton variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton onClick={handleLogAdvance} loading={createAdvance.isPending} disabled={!parseFloat(amount)}>
              Log Advance
            </GlassButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#7A7A7A', marginBottom: 6 }}>
              Who received it? (defaults to you)
            </label>
            <PersonPicker value={personId} onChange={setPersonId} placeholder="Myself" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#7A7A7A', marginBottom: 6 }}>
              Amount (₹)
            </label>
            <GlassInput type="number" value={amount} onChange={setAmount} placeholder="50000" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#7A7A7A', marginBottom: 6 }}>
              Note (optional)
            </label>
            <GlassInput value={note} onChange={setNote} placeholder="e.g. Site trip float" />
          </div>
          <div style={{ fontSize: 12, color: '#6A6A6A', display: 'flex', gap: 6, alignItems: 'center' }}>
            <WalletOutlined /> Your balance decreases automatically as you log expenses.
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
