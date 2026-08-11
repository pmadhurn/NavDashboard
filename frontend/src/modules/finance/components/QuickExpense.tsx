import { useRef, useState } from 'react';
import { Select, Input, DatePicker, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { CameraOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import GlassButton from '@/shared/components/GlassButton';
import GlassModal from '@/shared/components/GlassModal';
import { api } from '@/shared/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useProjects } from '@/modules/projects/hooks/useProjects';

/** The eight categories the company actually spends on, most common first. */
const CATEGORIES = [
  'Food',
  'Cab',
  'Hotel',
  'Train',
  'Bus',
  'Rickshaw',
  'Air travel',
  'Other',
];

/**
 * Add an expense from a phone, at a site, at the end of a long day.
 *
 * Amount first and biggest, because it is the one thing nobody can look up
 * later. Everything else has a sensible default. The receipt is optional and
 * says so — a blocked expense is an unrecorded expense, and an engineer who
 * cannot file one without a photo simply stops filing them.
 */
export default function QuickExpense({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('Food');
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>();
  const [when, setWhen] = useState<Dayjs>(dayjs());
  const [receipt, setReceipt] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: projects } = useProjects({});
  const qc = useQueryClient();

  const reset = () => {
    setAmount('');
    setTitle('');
    setReceipt(null);
    setCategory('Food');
    setWhen(dayjs());
  };

  const submit = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append('title', title.trim() || category);
      form.append('amount', String(value));
      form.append('category', category);
      form.append('expense_date', when.toISOString());
      if (projectId) form.append('project_id', projectId);
      if (receipt) form.append('receipt', receipt);
      // One request: two would let a weak connection leave an expense with no
      // receipt, or a receipt with no expense.
      await api.upload('/finance/quick', form);
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      message.success(
        receipt ? 'Expense saved with receipt' : 'Expense saved — no receipt attached'
      );
      reset();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'Could not save the expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassModal open={open} onClose={onClose} title="Add expense" footer={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Amount: the one thing nobody can reconstruct later. */}
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>How much?</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-muted)' }}>₹</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal"
              autoFocus
              placeholder="0"
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 34,
                fontWeight: 700,
                border: 'none',
                borderBottom: '2px solid var(--overlay-subtle)',
                background: 'transparent',
                color: 'var(--text-primary)',
                outline: 'none',
                padding: '4px 0',
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>On what?</label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))',
              gap: 6,
              marginTop: 6,
            }}
          >
            {CATEGORIES.map((c) => {
              const on = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  style={{
                    padding: '12px 6px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: on ? 600 : 400,
                    border: `1px solid ${on ? 'var(--status-working)' : 'var(--overlay-subtle)'}`,
                    background: on ? 'var(--overlay-subtle)' : 'transparent',
                    color: on ? 'var(--status-working)' : 'var(--text-secondary)',
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Receipt: optional, and honest about it. */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            // Opens the camera directly on a phone rather than a file browser.
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
          />
          {receipt ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 10,
                background: 'var(--overlay-subtle)',
                border: '1px solid var(--status-working)',
              }}
            >
              <CheckOutlined style={{ color: 'var(--status-working)' }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {receipt.name}
              </span>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <CloseOutlined />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: '1px dashed var(--overlay-subtle)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <CameraOutlined /> Photograph the receipt
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(optional)</span>
            </button>
          )}
        </div>

        {/* Everything below has a sensible default; nobody has to touch it. */}
        <details>
          <summary style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
            Add a project, date or note
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <Select
              value={projectId}
              onChange={setProjectId}
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Project"
              options={(projects?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
            />
            <DatePicker value={when} onChange={(d) => d && setWhen(d)} allowClear={false} />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Note (defaults to "${category}")`}
            />
          </div>
        </details>

        <GlassButton
          onClick={submit}
          disabled={!amount || parseFloat(amount) <= 0 || saving}
          style={{ width: '100%', padding: '14px' }}
        >
          {saving ? 'Saving…' : `Save ₹${amount || '0'}`}
        </GlassButton>
      </div>
    </GlassModal>
  );
}
