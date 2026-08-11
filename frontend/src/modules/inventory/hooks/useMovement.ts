import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '@/shared/api/client';

export type HandoverStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export type ReturnOutcome =
  | 'RETURNED'
  | 'LEFT_AT_SITE'
  | 'HANDED_TO_CUSTOMER'
  | 'DAMAGED'
  | 'LOST';

/** Each outcome, what it means, and what it needs. Kept together so the form
 *  and the copy can never drift apart. */
export const OUTCOMES: {
  value: ReturnOutcome;
  label: string;
  hint: string;
  color: string;
  needs?: 'project' | 'customer';
}[] = [
  { value: 'RETURNED', label: 'Came back', hint: 'Back in stock', color: 'var(--status-working)' },
  {
    value: 'LEFT_AT_SITE',
    label: 'Left at site',
    hint: 'Still there — testing ongoing',
    color: 'var(--status-not-working)',
    needs: 'project',
  },
  {
    value: 'HANDED_TO_CUSTOMER',
    label: 'Given to customer',
    hint: 'Stays with them',
    color: '#9E7E8A',
    needs: 'customer',
  },
  { value: 'DAMAGED', label: 'Came back damaged', hint: 'Back in stock, needs repair', color: '#B0413E' },
  { value: 'LOST', label: 'Not recovered', hint: 'Written off', color: '#8C5F5F' },
];

export const REPAIR_STATUS_LABEL: Record<string, string> = {
  REPORTED: 'Reported',
  SENT: 'At the vendor',
  RETURNED: 'Repaired',
  IRREPARABLE: 'Beyond repair',
};

export const REPAIR_STATUS_COLOR: Record<string, string> = {
  REPORTED: '#B0413E',
  SENT: 'var(--status-not-working)',
  RETURNED: 'var(--status-working)',
  IRREPARABLE: 'var(--text-muted)',
};

export interface HandoverItem {
  id: string;
  asset_code: string;
  name: string;
}

export interface Handover {
  id: string;
  from_person_id: string;
  from_name: string | null;
  to_person_id: string;
  to_name: string | null;
  status: HandoverStatus;
  note: string | null;
  response_note: string | null;
  responded_at: string | null;
  created_at: string;
  items: HandoverItem[];
}

export interface BundleItem {
  id: string;
  asset_code: string;
  name: string;
  quantity: number;
  available: boolean;
}

export interface Bundle {
  id: string;
  name: string;
  description: string | null;
  items: BundleItem[];
}

export interface Repair {
  id: string;
  asset_id: string;
  asset_code: string | null;
  asset_name: string | null;
  status: string;
  damage_details: string;
  damaged_at: string | null;
  damage_location: string | null;
  responsible_person_id: string | null;
  responsible_name: string | null;
  is_repairable: boolean | null;
  vendor_id: string | null;
  cost: number | null;
  sent_at: string | null;
  received_at: string | null;
  outcome_note: string | null;
  created_at: string;
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['assets'] });
}

export function useHandovers(params: { personId?: string; status?: HandoverStatus } = {}) {
  return useQuery({
    queryKey: ['assets', 'handovers', params],
    queryFn: () =>
      api.get<Handover[]>('/assets/handovers', {
        person_id: params.personId || undefined,
        status: params.status || undefined,
      }),
  });
}

export function useCreateHandover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      from_person_id: string;
      to_person_id: string;
      asset_ids: string[];
      note?: string;
    }) => api.post<Handover>('/assets/handovers', body),
    onSuccess: () => {
      invalidate(qc);
      message.success('Handover sent — waiting for them to accept');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not start the handover'),
  });
}

export function useRespondHandover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accept, note }: { id: string; accept: boolean; note?: string }) =>
      api.post<Handover>(`/assets/handovers/${id}/respond`, { accept, note }),
    onSuccess: (_d, v) => {
      invalidate(qc);
      message.success(v.accept ? 'Accepted — the items are yours now' : 'Declined');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not respond'),
  });
}

export function useCancelHandover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Handover>(`/assets/handovers/${id}/cancel`),
    onSuccess: () => {
      invalidate(qc);
      message.success('Handover cancelled');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not cancel'),
  });
}

export function useBundles() {
  return useQuery({
    queryKey: ['assets', 'bundles'],
    queryFn: () => api.get<Bundle[]>('/assets/bundles'),
  });
}

export function useSaveBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string; name: string; description?: string; asset_ids: string[] }) =>
      id ? api.put<Bundle>(`/assets/bundles/${id}`, body) : api.post<Bundle>('/assets/bundles', body),
    onSuccess: () => {
      invalidate(qc);
      message.success('Kit saved');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not save the kit'),
  });
}

export function useDeleteBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/assets/bundles/${id}`),
    onSuccess: () => {
      invalidate(qc);
      message.success('Kit removed — the items in it are untouched');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not remove the kit'),
  });
}

export interface ResolveItem {
  asset_id: string;
  outcome: ReturnOutcome;
  note?: string;
  project_id?: string;
  customer_id?: string;
  expected_return_date?: string;
}

export function useResolveReturns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: ResolveItem[]) =>
      api.post<{ resolved: number }>('/assets/returns/resolve', { items }),
    onSuccess: (r) => {
      invalidate(qc);
      message.success(`${r.resolved} item(s) accounted for`);
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not record the return'),
  });
}

export function useRepairs(status?: string) {
  return useQuery({
    queryKey: ['assets', 'repairs', status ?? ''],
    queryFn: () => api.get<Repair[]>('/assets/repairs', { status: status || undefined }),
  });
}

export function useReportDamage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      asset_id: string;
      details: string;
      damage_location?: string;
      responsible_person_id?: string;
      project_id?: string;
    }) => api.post<Repair>('/assets/repairs', body),
    onSuccess: () => {
      invalidate(qc);
      message.success('Damage recorded');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not record the damage'),
  });
}

export function useSendForRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; vendor_id?: string; cost?: number; note?: string }) =>
      api.post<Repair>(`/assets/repairs/${id}/send`, body),
    onSuccess: () => {
      invalidate(qc);
      message.success('Sent for repair');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not send for repair'),
  });
}

export function useCompleteRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: {
      id: string;
      repaired: boolean;
      cost?: number;
      note?: string;
      return_location_id?: string;
    }) => api.post<Repair>(`/assets/repairs/${id}/complete`, body),
    onSuccess: (_d, v) => {
      invalidate(qc);
      message.success(v.repaired ? 'Back in service' : 'Retired');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not close the repair'),
  });
}
