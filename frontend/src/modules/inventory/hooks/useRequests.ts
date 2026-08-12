import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '@/shared/api/client';

export type RequestStatus = 'REQUESTED' | 'APPROVED' | 'ORDERED' | 'RECEIVED' | 'REJECTED';

/** Labels and colours in one place so every screen agrees. */
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  ORDERED: 'Ordered',
  RECEIVED: 'Received',
  REJECTED: 'Rejected',
};

export const REQUEST_STATUS_COLOR: Record<RequestStatus, string> = {
  REQUESTED: 'var(--status-not-working)',
  APPROVED: '#6F8CB6',
  ORDERED: '#7E6F9E',
  RECEIVED: 'var(--status-working)',
  REJECTED: '#8C5F5F',
};

/** Still moving through the pipeline; RECEIVED and REJECTED are terminal. */
export const OPEN_REQUEST_STATUSES: RequestStatus[] = ['REQUESTED', 'APPROVED', 'ORDERED'];

export interface ItemRequest {
  id: string;
  title: string;
  details: string | null;
  quantity: number;
  needed_by: string | null;
  status: RequestStatus;
  requested_by: string | null;
  requested_by_name: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  estimated_cost: number | null;
  status_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['assets', 'requests'] });
}

export function useRequests(status?: RequestStatus) {
  return useQuery({
    queryKey: ['assets', 'requests', status ?? ''],
    queryFn: () =>
      api.get<ItemRequest[]>('/assets/requests', { status: status || undefined }),
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      details?: string;
      quantity: number;
      needed_by?: string;
      vendor_id?: string;
      estimated_cost?: number;
    }) => api.post<ItemRequest>('/assets/requests', body),
    onSuccess: () => {
      invalidate(qc);
      message.success('On the list — the office will see it');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not add the request'),
  });
}

export function useUpdateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      title?: string;
      details?: string | null;
      quantity?: number;
      needed_by?: string | null;
      vendor_id?: string | null;
      estimated_cost?: number | null;
    }) => api.put<ItemRequest>(`/assets/requests/${id}`, body),
    onSuccess: () => {
      invalidate(qc);
      message.success('Request updated');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not update the request'),
  });
}

export function useSetRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      status: RequestStatus;
      status_note?: string;
      vendor_id?: string;
      estimated_cost?: number;
    }) => api.post<ItemRequest>(`/assets/requests/${id}/status`, body),
    onSuccess: (_d, v) => {
      invalidate(qc);
      const done: Partial<Record<RequestStatus, string>> = {
        APPROVED: 'Approved',
        ORDERED: 'Marked as ordered',
        RECEIVED: 'Received — off the list',
        REJECTED: 'Rejected',
      };
      message.success(done[v.status] ?? 'Status updated');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not change the status'),
  });
}

export function useDeleteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/assets/requests/${id}`),
    onSuccess: () => {
      invalidate(qc);
      message.success('Withdrawn');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not withdraw the request'),
  });
}
