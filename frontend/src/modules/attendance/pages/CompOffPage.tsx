import { useState } from 'react';
import { Select, Input, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { ClockCircleOutlined, PlusOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassModal from '@/shared/components/GlassModal';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ShareButton from '@/shared/components/ShareButton';
import { usePermission } from '@/shared/stores/authStore';
import { usePersonnelList } from '@/modules/personnel/hooks/usePersonnel';
import {
  useAdjustCompOff,
  useCompOffBalance,
  useCompOffLedger,
} from '../hooks/useAttendance';

const ENTRY_COLOR: Record<string, string> = {
  ACCRUED: 'var(--status-working)',
  CONSUMED: 'var(--status-not-working)',
  ADJUSTED: '#7E6F9E',
};

function AdjustModal({
  open,
  onClose,
  personId,
}: {
  open: boolean;
  onClose: () => void;
  personId: string | undefined;
}) {
  const [days, setDays] = useState<number | null>(1);
  const [reason, setReason] = useState('');
  const adjust = useAdjustCompOff();

  const submit = () => {
    if (!personId || !days || !reason.trim()) return;
    adjust.mutate(
      { person_id: personId, days, reason: reason.trim() },
      { onSuccess: onClose }
    );
  };

  return (
    // footer={null}: this modal supplies its own actions, and antd
    // renders a default OK/Cancel pair when footer is undefined.
    <GlassModal open={open} onClose={onClose} title="Adjust comp-off" footer={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          A manual correction, recorded as its own ledger entry. Use a negative
          number to deduct days.
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Days</label>
          <InputNumber
            value={days}
            onChange={setDays}
            step={0.5}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Reason (required)</label>
          <Input.TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Why is this adjustment being made?"
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            onClick={submit}
            disabled={!personId || !days || !reason.trim() || adjust.isPending}
          >
            Save
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

export default function CompOffPage() {
  const { data: personnel, isLoading: loadingPeople } = usePersonnelList({ size: 200 });
  const [personId, setPersonId] = useState<string | undefined>();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const canManage = usePermission('attendance', 'MANAGE');

  const people = personnel?.items ?? [];
  const selected = personId ?? people[0]?.id;

  const { data: balance, isLoading } = useCompOffBalance(selected);
  const { data: ledger } = useCompOffLedger(selected);

  return (
    <div>
      <PageHeader
        title="Comp-off Balances"
        icon={<ClockCircleOutlined />}
        subtitle="Days earned working weekends on site, and days taken back"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Select
              value={selected}
              onChange={setPersonId}
              style={{ minWidth: 200 }}
              showSearch
              optionFilterProp="label"
              loading={loadingPeople}
              placeholder="Choose a person"
              options={people.map((p) => ({ value: p.id, label: p.full_name }))}
            />
            <ShareButton title="Comp-off balances" url="/compoff" />
            {canManage && (
              <GlassButton icon={<PlusOutlined />} onClick={() => setAdjustOpen(true)}>
                Adjust
              </GlassButton>
            )}
          </div>
        }
      />

      <AdjustModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        personId={selected}
      />

      {!selected ? (
        <EmptyState
          title="No personnel yet"
          description="Add people in Personnel before tracking comp-off."
        />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <GlassCard>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Balance
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color:
                    (balance?.balance ?? 0) < 0
                      ? 'var(--status-not-working)'
                      : 'var(--text-primary)',
                }}
              >
                {balance?.balance ?? 0}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>days available</div>
            </GlassCard>
            <GlassCard>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Earned
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--status-working)' }}>
                {balance?.accrued ?? 0}
              </div>
            </GlassCard>
            <GlassCard>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Taken
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--status-not-working)' }}>
                {balance?.consumed ?? 0}
              </div>
            </GlassCard>
          </div>

          <GlassCard>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
              Ledger — every movement, oldest last
            </div>
            {isLoading ? (
              <LoadingSpinner text="Loading ledger…" />
            ) : (ledger ?? []).length === 0 ? (
              <EmptyState
                title="No comp-off movements"
                description="A weekend day logged as field work earns comp-off automatically."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(ledger ?? []).map((row) => (
                  <div
                    key={row.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: 'var(--overlay-subtle)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: ENTRY_COLOR[row.entry_type],
                          minWidth: 74,
                        }}
                      >
                        {row.entry_type}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {row.reason}
                      </span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {dayjs(row.created_at).format('D MMM YYYY')}
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: Number(row.days) < 0 ? 'var(--status-not-working)' : 'var(--status-working)',
                        }}
                      >
                        {Number(row.days) > 0 ? '+' : ''}
                        {row.days}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </>
      )}
    </div>
  );
}
