import { useRef, useState } from 'react';
import { Select, DatePicker } from 'antd';
import dayjs from 'dayjs';
import {
  PlusOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  DeleteOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import GlassModal from '@/shared/components/GlassModal';
import DataTable from '@/shared/components/DataTable';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useAuthStore, usePermission } from '@/shared/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import {
  useExpenses,
  useExpenseSummary,
  useCreateExpense,
  useDeleteExpense,
  useImportExpenses,
  useSetExpenseStatus,
  uploadExpenseAttachment,
  formatMoney,
  EXPENSE_CATEGORIES,
  Expense,
} from '../hooks/useFinance';
import ExportModal from '../components/ExportModal';

const CATEGORIES = EXPENSE_CATEGORIES;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'var(--text-muted)',
  SUBMITTED: 'var(--status-not-working)',
  PAID: 'var(--status-working)',
  REJECTED: 'var(--status-faulty)',
};

function SummaryCards() {
  const { data } = useExpenseSummary();
  if (!data) return null;
  const cards = [
    { label: 'This month', value: formatMoney(data.total_this_month) },
    { label: 'All time', value: formatMoney(data.total_all_time) },
    { label: 'Expenses', value: String(data.count) },
    {
      label: 'Top project',
      value: data.by_project[0]
        ? `${data.by_project[0].name} · ${formatMoney(data.by_project[0].total)}`
        : '—',
    },
  ];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}
    >
      {cards.map((card) => (
        <GlassCard key={card.label} padding="sm">
          <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {card.label}
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 700, marginTop: 4 }}>
            {card.value}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

export default function FinancePage() {
  const [page, setPage] = useState(1);
  const [projectFilter, setProjectFilter] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  // Add-expense form
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [category, setCategory] = useState<string | undefined>();
  const [projectId, setProjectId] = useState<string | undefined>();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [bills, setBills] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const user = useAuthStore((s) => s.user);
  const canEdit = usePermission('finance', 'EDIT');
  const canManage = usePermission('finance', 'MANAGE');

  const { data, isLoading } = useExpenses({ page, projectId: projectFilter });
  const { data: projectData } = useProjects({});
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const importExpenses = useImportExpenses();
  const setExpenseStatus = useSetExpenseStatus();

  const { data: personnel } = useQuery({
    queryKey: ['personnel-list'],
    queryFn: () =>
      api.get<{ items: { id: string; full_name: string }[] }>('/personnel/', { size: 100 }),
    enabled: addOpen,
  });

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setDate(dayjs());
    setCategory(undefined);
    setProjectId(undefined);
    setMemberIds([]);
    setNotes('');
    setBills([]);
  };

  const handleAdd = async () => {
    const value = parseFloat(amount);
    if (!title.trim() || !value || value <= 0) return;
    const expense = await createExpense.mutateAsync({
      title: title.trim(),
      amount: value,
      expense_date: date?.toISOString(),
      category,
      project_id: projectId,
      notes: notes.trim() || undefined,
      member_person_ids: memberIds.length ? memberIds : undefined,
    });
    for (const bill of bills) {
      try {
        await uploadExpenseAttachment(expense.id, bill);
      } catch {
        message.warning(`Failed to attach ${bill.name}`);
      }
    }
    resetForm();
    setAddOpen(false);
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'expense_date',
      key: 'date',
      render: (value: string) => (
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{dayjs(value).format('DD MMM YYYY')}</span>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (value: string, record: Expense) => (
        <div>
          <span style={{ color: 'var(--text-primary)' }}>{value}</span>
          {record.members.length > 0 && (
            <div style={{ color: 'var(--chart4)', fontSize: 11 }}>
              {record.members.map((m) => m.person.full_name).join(', ')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      className: 'hide-on-mobile',
      render: (value: string | null) => <span style={{ color: 'var(--text-secondary)' }}>{value ?? '—'}</span>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number, record: Expense) => (
        <span style={{ color: '#8BC34A', fontWeight: 600 }}>
          {formatMoney(Number(value), record.currency)}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: STATUS_COLORS[value] ?? 'var(--text-muted)',
            background: `${STATUS_COLORS[value] ?? '#7A7A7A'}22`,
            padding: '2px 8px',
            borderRadius: 8,
          }}
        >
          {value}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, record: Expense) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {/* Finance person flags an individual expense paid/pending */}
          {canManage && (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() =>
                setExpenseStatus.mutate({
                  id: record.id,
                  status: record.status === 'PAID' ? 'SUBMITTED' : 'PAID',
                })
              }
            >
              {record.status === 'PAID' ? 'Unpay' : 'Mark Paid'}
            </GlassButton>
          )}
          {(canManage || record.added_by === user?.id) && (
            <GlassButton
              variant="ghost"
              size="sm"
              icon={<DeleteOutlined />}
              onClick={() => setDeleteTarget(record)}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle="Team expenses and bills"
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <GlassButton variant="ghost" icon={<FilePdfOutlined />} onClick={() => setExportOpen(true)}>
              Export
            </GlassButton>
            {canEdit && (
              <>
                <GlassButton
                  variant="ghost"
                  icon={<FileExcelOutlined />}
                  loading={importExpenses.isPending}
                  onClick={() => importInputRef.current?.click()}
                >
                  Import Sheet
                </GlassButton>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importExpenses.mutate(file);
                    e.target.value = '';
                  }}
                />
                <GlassButton variant="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
                  Add Expense
                </GlassButton>
              </>
            )}
          </div>
        }
      />

      <SummaryCards />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          className="dl-select"
          style={{ minWidth: 200 }}
          placeholder="Filter by project"
          allowClear
          value={projectFilter}
          onChange={(v) => {
            setProjectFilter(v);
            setPage(1);
          }}
          options={(projectData?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>

      <style>{`
        .dl-select .ant-select-selector {
          background: rgba(255,255,255,0.03) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          color: var(--text-primary) !important;
        }
        .dl-select .ant-select-selection-placeholder { color: var(--chart4) !important; }
        .dl-select .ant-select-selection-item { color: var(--text-primary) !important; }
        .fin-date .ant-picker {
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid var(--input-border) !important;
          width: 100%;
        }
        .fin-date .ant-picker-input > input { color: var(--text-primary) !important; }
      `}</style>

      <DataTable<Expense>
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 50,
          total: data?.total ?? 0,
          onChange: setPage,
        }}
        emptyText="No expenses yet. Add the first one — it takes ten seconds."
      />

      <GlassModal
        open={addOpen}
        onClose={() => {
          resetForm();
          setAddOpen(false);
        }}
        title="Add Expense"
        width={500}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <GlassButton variant="ghost" onClick={() => { resetForm(); setAddOpen(false); }}>
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handleAdd}
              loading={createExpense.isPending}
              disabled={!title.trim() || !parseFloat(amount)}
            >
              Save Expense
            </GlassButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                What was it for?
              </label>
              <GlassInput value={title} onChange={setTitle} placeholder="e.g. Site visit taxi" />
            </div>
            <div style={{ flex: 1, minWidth: 110 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Amount (₹)
              </label>
              <GlassInput type="number" value={amount} onChange={setAmount} placeholder="0" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="fin-date" style={{ flex: 1, minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Date
              </label>
              <DatePicker value={date} onChange={setDate} format="DD MMM YYYY" />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Category
              </label>
              <Select
                className="dl-select"
                style={{ width: '100%' }}
                placeholder="Optional"
                allowClear
                value={category}
                onChange={setCategory}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
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
              Who was included? (optional)
            </label>
            <Select
              className="dl-select"
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Team members on this bill"
              optionFilterProp="label"
              value={memberIds}
              onChange={setMemberIds}
              options={(personnel?.items ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Bills & receipts (optional)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '1.5px dashed rgba(255,255,255,0.15)',
                borderRadius: 10,
                padding: '12px 14px',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <PaperClipOutlined />
              {bills.length
                ? bills.map((b) => b.name).join(', ')
                : 'Attach photos, PDFs, or sheets'}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => setBills([...(e.target.files ?? [])])}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Notes (optional)
            </label>
            <GlassInput value={notes} onChange={setNotes} placeholder="Anything else" />
          </div>
        </div>
      </GlassModal>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        defaultScope={projectFilter ? 'project' : 'all'}
        defaultScopeId={projectFilter}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Expense"
        message={`Delete "${deleteTarget?.title}"?`}
        confirmText="Delete"
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteExpense.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
        danger
        loading={deleteExpense.isPending}
      />
    </div>
  );
}
