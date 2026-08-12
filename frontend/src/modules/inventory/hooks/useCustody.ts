import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '@/shared/api/client';

export type CustodyType = 'LOCATION' | 'PERSON' | 'PROJECT' | 'CUSTOMER' | 'VENDOR' | 'UNKNOWN';
export type Condition = 'OK' | 'DAMAGED' | 'UNDER_REPAIR' | 'LOST' | 'RETIRED';

/** Labels and colours for the two axes, in one place so every screen agrees. */
export const CUSTODY_LABEL: Record<CustodyType, string> = {
  LOCATION: 'In stock',
  PERSON: 'With a person',
  PROJECT: 'At a project',
  CUSTOMER: 'With a customer',
  VENDOR: 'At a vendor',
  UNKNOWN: 'Location unknown',
};

export const CUSTODY_COLOR: Record<CustodyType, string> = {
  LOCATION: 'var(--status-working)',
  PERSON: '#6F8CB6',
  PROJECT: 'var(--status-not-working)',
  CUSTOMER: '#9E7E8A',
  VENDOR: '#7E6F9E',
  UNKNOWN: '#B0413E',
};

export const CONDITION_LABEL: Record<Condition, string> = {
  OK: 'Working',
  DAMAGED: 'Damaged',
  UNDER_REPAIR: 'Under repair',
  LOST: 'Lost',
  RETIRED: 'Retired',
};

export const CONDITION_COLOR: Record<Condition, string> = {
  OK: 'var(--status-working)',
  DAMAGED: '#B0413E',
  UNDER_REPAIR: 'var(--status-not-working)',
  LOST: '#8C5F5F',
  RETIRED: 'var(--text-muted)',
};

export interface StockLocation {
  id: string;
  name: string;
  kind: string;
  address: string | null;
  notes: string | null;
  sort_order: number;
  is_default: boolean;
}

export interface Party {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
}

export interface AssetMovement {
  id: string;
  asset_id: string;
  event_type: string;
  from_custody_type: CustodyType | null;
  from_label: string | null;
  to_custody_type: CustodyType | null;
  to_label: string | null;
  from_condition: Condition | null;
  to_condition: Condition | null;
  quantity: number;
  reason: string | null;
  performed_by: string | null;
  occurred_at: string;
}

export interface CustodySummary {
  total: number;
  available: number;
  overdue: number;
  needs_reconciliation: number;
  by_custody: Record<string, number>;
  by_condition: Record<string, number>;
  by_location: { location: string; count: number }[];
}

export function useCustodySummary() {
  return useQuery({
    queryKey: ['assets', 'custody-summary'],
    queryFn: () => api.get<CustodySummary>('/assets/custody/summary'),
  });
}

export function useStockLocations() {
  return useQuery({
    queryKey: ['assets', 'locations'],
    queryFn: () => api.get<StockLocation[]>('/assets/locations'),
    staleTime: 60_000,
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ['assets', 'customers'],
    queryFn: () => api.get<Party[]>('/assets/customers'),
    staleTime: 60_000,
  });
}

export function useVendors() {
  return useQuery({
    queryKey: ['assets', 'vendors'],
    queryFn: () => api.get<Party[]>('/assets/vendors'),
    staleTime: 60_000,
  });
}

export function useAssetMovements(assetId: string | undefined) {
  return useQuery({
    queryKey: ['assets', assetId, 'movements'],
    queryFn: () => api.get<AssetMovement[]>(`/assets/${assetId}/movements`),
    enabled: !!assetId,
  });
}

/** Moving an item changes the list, the summary and its own history at once. */
function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['assets'] });
}

export function useMoveCustody() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assetId,
      ...body
    }: {
      assetId: string;
      to_custody_type: CustodyType;
      to_custody_id?: string | null;
      reason?: string;
      event_type?: string;
      expected_return_date?: string | null;
    }) => api.post(`/assets/${assetId}/custody`, body),
    onSuccess: () => {
      invalidate(qc);
      message.success('Moved');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not move the item'),
  });
}

export function useSetCondition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assetId,
      ...body
    }: {
      assetId: string;
      condition: Condition;
      reason?: string;
    }) => api.post(`/assets/${assetId}/condition`, body),
    onSuccess: () => {
      invalidate(qc);
      message.success('Condition updated');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not update the condition'),
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; kind?: string; address?: string }) =>
      api.post<StockLocation>('/assets/locations', body),
    onSuccess: () => {
      invalidate(qc);
      message.success('Location added');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not add the location'),
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string }) =>
      api.post<Party>('/assets/customers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', 'customers'] }),
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    // Name-only from CreatableSelect (which shows its own feedback), full body
    // from the Vendors page — the endpoint takes both.
    mutationFn: (body: {
      name: string;
      contact_name?: string;
      contact_phone?: string;
      contact_email?: string;
      notes?: string;
    }) => api.post<Party>('/assets/vendors', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', 'vendors'] }),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      contact_name?: string | null;
      contact_phone?: string | null;
      contact_email?: string | null;
      notes?: string | null;
    }) => api.put<Party>(`/assets/vendors/${id}`, body),
    onSuccess: () => {
      invalidate(qc);
      message.success('Vendor updated');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not update the vendor'),
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/assets/vendors/${id}`),
    onSuccess: () => {
      invalidate(qc);
      message.success('Vendor removed');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not remove the vendor'),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/assets/locations/${id}`),
    onSuccess: () => {
      invalidate(qc);
      message.success('Location removed');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not remove the location'),
  });
}
