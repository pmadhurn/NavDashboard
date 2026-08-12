import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '@/shared/api/client';

export interface AssetCategory {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  /**
   * Items in this category must be entered one-by-one with a serial number.
   * Present on GET /assets/categories rows; optional because the category
   * embedded in an asset brief may omit it.
   */
  requires_serial?: boolean;
}

export interface PersonBrief {
  id: string;
  full_name: string;
}

export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  category: AssetCategory | null;
  item_kind: 'SERIALIZED' | 'BULK';
  serial_number: string | null;
  quantity: number;
  current_project_id: string | null;
  current_person: PersonBrief | null;
  device_id: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  notes: string | null;
  tags: Record<string, unknown> | null;
  tag_identifiers: Record<string, string> | null;
  // --- custody (Phase 1) ---
  custody_type: import('./useCustody').CustodyType;
  custody_id: string | null;
  custody_label: string | null;
  condition: import('./useCustody').Condition;
  expected_return_date: string | null;
  /** Derived server-side: in a stock location and in working order. */
  is_available: boolean;
  created_at: string;
}

export interface AssetHistoryEntry {
  id: string;
  event_type: string;
  old_status: string | null;
  new_status: string | null;
  project_id: string | null;
  person_id: string | null;
  note: string | null;
  performed_by: string | null;
  occurred_at: string;
}

export interface AssetReport {
  id: string;
  report_type: 'DAMAGED' | 'REQUIREMENT';
  asset_id: string | null;
  asset: Asset | null;
  title: string;
  details: string | null;
  quantity: number;
  status: 'OPEN' | 'ORDERED' | 'RESOLVED';
  reported_by: string;
  resolved_at: string | null;
  created_at: string;
}

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}


export function useAssets(params: {
  page?: number;
  search?: string;
  categoryId?: string;
  source?: string;
  /** Custody filters (Phase 1) — the ones that mean something. */
  custodyType?: string;
  condition?: string;
  locationId?: string;
  personId?: string;
  available?: boolean;
}) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: () =>
      api.get<Paginated<Asset>>('/assets/', {
        page: params.page ?? 1,
        size: 50,
        search: params.search || undefined,
        category_id: params.categoryId || undefined,
        source: params.source || undefined,
        custody_type: params.custodyType || undefined,
        condition: params.condition || undefined,
        location_id: params.locationId || undefined,
        person_id: params.personId || undefined,
        available: params.available,
      }),
  });
}

export interface DeployedItem {
  type: string;
  id: string;
  label: string;
  status: string | null;
  custody: string | null;
}

export interface DeployedGroup {
  project_id: string | null;
  project_name: string;
  items: DeployedItem[];
}

export function useDeployed() {
  return useQuery({
    queryKey: ['assets', 'deployed'],
    queryFn: () => api.get<DeployedGroup[]>('/assets/deployed'),
  });
}

export function useBackfillDevices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ synced: number; total_devices: number }>('/assets/backfill-devices'),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      message.success(`Synced ${r.synced} device(s) into inventory`);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Sync failed');
    },
  });
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: () => api.get<Asset>(`/assets/${id}`),
    enabled: !!id,
  });
}

export function useAssetHistory(id: string | undefined) {
  return useQuery({
    queryKey: ['asset-history', id],
    queryFn: () => api.get<AssetHistoryEntry[]>(`/assets/${id}/history`),
    enabled: !!id,
  });
}

export function useAssetCategories() {
  return useQuery({
    queryKey: ['asset-categories'],
    queryFn: () => api.get<AssetCategory[]>('/assets/categories'),
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Asset> & { name: string }) =>
      api.post<Asset>('/assets/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      message.success('Asset added');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to add asset');
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<Asset>(`/assets/${id}`, data),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['asset-history', vars.id] });
      message.success('Asset updated');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to update asset');
    },
  });
}

export function useCreateAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; parent_id?: string }) =>
      api.post<AssetCategory>('/assets/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
    },
  });
}

export function useUpdateAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; requires_serial?: boolean; sort_order?: number };
    }) => api.put<AssetCategory>(`/assets/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Could not update the category');
    },
  });
}

export function useAssetReports(reportType?: string) {
  return useQuery({
    queryKey: ['asset-reports', reportType ?? ''],
    queryFn: () =>
      api.get<AssetReport[]>('/assets/reports', {
        report_type: reportType || undefined,
      }),
  });
}

export function useCreateAssetReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      report_type: 'DAMAGED' | 'REQUIREMENT';
      asset_id?: string;
      title: string;
      details?: string;
      quantity?: number;
    }) => api.post<AssetReport>('/assets/reports', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-reports'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      message.success('Report added');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to add report');
    },
  });
}

export function useUpdateAssetReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string } }) =>
      api.put<AssetReport>(`/assets/reports/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-reports'] });
      message.success('Report updated');
    },
  });
}
