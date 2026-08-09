import { useState } from 'react';
import { Select } from 'antd';
import { PlusOutlined, SendOutlined, FileTextOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import GlassModal from '@/shared/components/GlassModal';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ShareButton from '@/shared/components/ShareButton';
import { usePermission } from '@/shared/stores/authStore';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import {
  useClaims,
  useCreateClaim,
  useSubmitClaim,
  useExpenses,
  formatMoney,
} from '../hooks/useFinance';

const CLAIM_COLORS: Record<string, string> = {
  DRAFT: 'var(--text-muted)',
  SUBMITTED: 'var(--status-not-working)',
  PARTIALLY_PAID: '#8C8468',
  PAID: 'var(--status-working)',
  REJECTED: 'var(--status-faulty)',
};

export default function ClaimsPage() {
  const canEdit = usePermission('finance', 'EDIT');
  const { data: claims, isLoading } = useClaims();
  const { data: expenseData } = useExpenses({});
  const { data: projectData } = useProjects({});
  const createClaim = useCreateClaim();
  const submitClaim = useSubmitClaim();

  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const [expenseIds, setExpenseIds] = useState<string[]>([]);

  // Only unclaimed, unpaid expenses can be bundled
  const claimable = (expenseData?.items ?? []).filter(
    (e) => !e.claim_id && e.status !== 'PAID'
  );

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createClaim.mutateAsync({
      title: title.trim(),
      project_id: projectId,
      note: note.trim() || undefined,
      expense_ids: expenseIds,
    });
    setAddOpen(false);
    setTitle('');
    setProjectId(undefined);
    setNote('');
    setExpenseIds([]);
  };

  if (isLoading) return <LoadingSpinner text="Loading claims..." />;

  return (
    <div>
      <PageHeader
        title="Claims"
        subtitle="Bundle expenses and submit them to the finance department"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ShareButton title="Expense claims" url="/finance/claims" />
            {canEdit && (
              <GlassButton variant="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
                New Claim
              </GlassButton>
            )}
          </div>
        }
      />

      {!claims || claims.length === 0 ? (
        <EmptyState
          icon={<FileTextOutlined />}
          title="No claims yet"
          description="A team lead can bundle everyone's expenses for a project into one claim."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {claims.map((c) => (
            <GlassCard key={c.id} padding="sm">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>{c.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {c.expense_count} expenses · {formatMoney(c.total)}
                    {c.note && ` · ${c.note}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
                  <ShareButton title={`Claim: ${c.title} — ${formatMoney(c.total)}`} url="/finance/claims" compact />
                  {canEdit && c.status === 'DRAFT' && (
                    <GlassButton
                      size="sm"
                      icon={<SendOutlined />}
                      loading={submitClaim.isPending}
                      onClick={() => submitClaim.mutate(c.id)}
                    >
                      Submit
                    </GlassButton>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <GlassModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New Claim"
        width={520}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <GlassButton variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton onClick={handleCreate} loading={createClaim.isPending} disabled={!title.trim()}>
              Create Claim
            </GlassButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Title</label>
            <GlassInput value={title} onChange={setTitle} placeholder="e.g. Mumbai site trip — March" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Project (optional)
            </label>
            <Select
              className="dl-select"
              style={{ width: '100%' }}
              placeholder="Link to a project"
              allowClear
              showSearch
              optionFilterProp="label"
              value={projectId}
              onChange={setProjectId}
              options={(projectData?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Expenses to include ({claimable.length} available)
            </label>
            <Select
              className="dl-select"
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Pick expenses (yours and your team's)"
              value={expenseIds}
              onChange={setExpenseIds}
              optionFilterProp="label"
              options={claimable.map((e) => ({
                value: e.id,
                label: `${e.title} — ${formatMoney(Number(e.amount), e.currency)}`,
              }))}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Note (optional)
            </label>
            <GlassInput value={note} onChange={setNote} placeholder="Anything finance should know" />
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
