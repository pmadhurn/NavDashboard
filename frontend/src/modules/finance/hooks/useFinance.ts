import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '@/shared/api/client';

export interface ExpenseMember {
  id: string;
  person: { id: string; full_name: string };
}

export const EXPENSE_CATEGORIES = [
  'Hotel',
  'Food',
  'Air travel',
  'Cab',
  'Rickshaw',
  'Bus',
  'Train',
  'Other',
];

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  expense_date: string;
  category: string | null;
  project_id: string | null;
  batch_id: string | null;
  claim_id: string | null;
  added_by: string;
  notes: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'PAID' | 'REJECTED';
  paid_by: string | null;
  paid_at: string | null;
  members: ExpenseMember[];
  created_at: string;
}

export interface ExpenseSummary {
  total_this_month: number;
  total_all_time: number;
  count: number;
  by_project: { name: string; total: number }[];
  by_category: { name: string; total: number }[];
}

interface Paginated<T> {
  items: T[];
  total: number;
}

export function useExpenses(params: { page?: number; projectId?: string }) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () =>
      api.get<Paginated<Expense>>('/finance/', {
        page: params.page ?? 1,
        size: 50,
        project_id: params.projectId || undefined,
      }),
  });
}

export function useExpenseSummary() {
  return useQuery({
    queryKey: ['expense-summary'],
    queryFn: () => api.get<ExpenseSummary>('/finance/summary'),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      amount: number;
      expense_date?: string;
      category?: string;
      project_id?: string;
      notes?: string;
      member_person_ids?: string[];
    }) => api.post<Expense>('/finance/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
      message.success('Expense added');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to add expense');
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/finance/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
      message.success('Expense deleted');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to delete');
    },
  });
}

export function useImportExpenses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.upload<{ created: number; skipped: number; errors: string[] }>(
        '/finance/import',
        form
      );
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
      message.success(`Imported ${result.created} expenses (${result.skipped} skipped)`);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Import failed');
    },
  });
}

// ── Advances ──────────────────────────────────────────────
export interface Advance {
  id: string;
  person_id: string;
  person: { id: string; full_name: string } | null;
  project_id: string | null;
  amount: number;
  currency: string;
  received_date: string;
  source_note: string | null;
  logged_by: string;
  created_at: string;
}

export interface Balance {
  person_id: string | null;
  project_id: string | null;
  advances: number;
  spent: number;
  balance: number;
}

export function useAdvances(params: { personId?: string; projectId?: string } = {}) {
  return useQuery({
    queryKey: ['advances', params],
    queryFn: () =>
      api.get<Advance[]>('/finance/advances', {
        person_id: params.personId || undefined,
        project_id: params.projectId || undefined,
      }),
  });
}

export function useCreateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      person_id: string;
      project_id?: string;
      amount: number;
      source_note?: string;
    }) => api.post<Advance>('/finance/advances', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['advances'] });
      qc.invalidateQueries({ queryKey: ['my-finance'] });
      qc.invalidateQueries({ queryKey: ['settlement'] });
      message.success('Advance logged');
    },
    onError: (err: any) => message.error(err?.response?.data?.detail || 'Failed to log advance'),
  });
}

export function useBalance(personId: string | undefined, projectId?: string) {
  return useQuery({
    queryKey: ['balance', personId, projectId ?? ''],
    queryFn: () =>
      api.get<Balance>(`/finance/balance/${personId}`, { project_id: projectId || undefined }),
    enabled: !!personId,
  });
}

// ── My finance ────────────────────────────────────────────
export interface MyFinanceSummary {
  person_id: string | null;
  advances: number;
  spent: number;
  balance: number;
  pending_total: number;
  paid_total: number;
  expense_count: number;
  claim_count: number;
}

export function useMyFinance() {
  return useQuery({
    queryKey: ['my-finance'],
    queryFn: () => api.get<MyFinanceSummary>('/finance/my'),
  });
}

// ── Claims ────────────────────────────────────────────────
export interface Claim {
  id: string;
  title: string;
  project_id: string | null;
  submitted_by: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PARTIALLY_PAID' | 'PAID' | 'REJECTED';
  note: string | null;
  submitted_at: string | null;
  settled_by: string | null;
  settled_at: string | null;
  total: number;
  expense_count: number;
  created_at: string;
}

export function useClaims(params: { status?: string; projectId?: string; mine?: boolean } = {}) {
  return useQuery({
    queryKey: ['claims', params],
    queryFn: () =>
      api.get<Claim[]>('/finance/claims', {
        status: params.status || undefined,
        project_id: params.projectId || undefined,
        mine: params.mine || undefined,
      }),
  });
}

export function useCreateClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      project_id?: string;
      note?: string;
      expense_ids?: string[];
    }) => api.post<Claim>('/finance/claims', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['claims'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      message.success('Claim created');
    },
    onError: (err: any) => message.error(err?.response?.data?.detail || 'Failed to create claim'),
  });
}

export function useSubmitClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Claim>(`/finance/claims/${id}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['claims'] });
      qc.invalidateQueries({ queryKey: ['settlement'] });
      message.success('Submitted to finance');
    },
    onError: (err: any) => message.error(err?.response?.data?.detail || 'Submit failed'),
  });
}

export function useSettleClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.post<Claim>(`/finance/claims/${id}/settle`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['claims'] });
      qc.invalidateQueries({ queryKey: ['settlement'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      message.success('Claim settled');
    },
    onError: (err: any) => message.error(err?.response?.data?.detail || 'Settle failed'),
  });
}

// ── Settlement (finance person) ───────────────────────────
export interface SettlementPerson {
  person_id: string | null;
  user_id: string | null;
  name: string;
  advances: number;
  spent: number;
  balance: number;
  pending: number;
  paid: number;
}

export interface SettlementProject {
  project_id: string | null;
  name: string;
  total: number;
  pending: number;
  paid: number;
}

export interface SettlementSummary {
  total_pending: number;
  total_paid: number;
  by_person: SettlementPerson[];
  by_project: SettlementProject[];
}

export function useSettlement() {
  return useQuery({
    queryKey: ['settlement'],
    queryFn: () => api.get<SettlementSummary>('/finance/settlement'),
  });
}

export function useSetExpenseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put<Expense>(`/finance/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['settlement'] });
      qc.invalidateQueries({ queryKey: ['my-finance'] });
      message.success('Updated');
    },
    onError: (err: any) => message.error(err?.response?.data?.detail || 'Update failed'),
  });
}

export interface ExportOptions {
  format: 'pdf' | 'xlsx' | 'zip';
  scope?: 'all' | 'project' | 'user' | 'claim';
  scopeId?: string;
  includeImages?: boolean;
}

const EXPORT_FILENAME: Record<string, string> = {
  pdf: 'expense-report.pdf',
  xlsx: 'expenses.xlsx',
  zip: 'expenses-with-receipts.zip',
};

/** Download an expense export in any supported format. */
export function exportExpenses(opts: ExportOptions) {
  const params = new URLSearchParams({ format: opts.format, scope: opts.scope ?? 'all' });
  if (opts.scopeId) params.set('scope_id', opts.scopeId);
  if (opts.includeImages) params.set('include_images', 'true');
  return api.downloadFile(`/finance/export?${params.toString()}`, EXPORT_FILENAME[opts.format]!);
}

export function downloadBillPdf(projectId?: string) {
  const params = projectId ? `?project_id=${projectId}` : '';
  return api.downloadFile(`/finance/bill.pdf${params}`, 'expense-report.pdf');
}

export async function uploadExpenseAttachment(expenseId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  form.append('entity_type', 'expense');
  form.append('entity_id', expenseId);
  return api.upload('/documents/upload', form);
}

export function formatMoney(amount: number, currency = 'INR'): string {
  return `${currency === 'INR' ? '₹' : currency + ' '}${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}
