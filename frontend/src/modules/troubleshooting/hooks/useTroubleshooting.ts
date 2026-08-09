import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { PaginatedResponse } from '@/shared/types/common';

// ── Types ───────────────────────────────────────────────────────

export interface TroubleshootEntryData {
  id: string;
  error_id: string;
  step_number: number;
  step_description: string;
  action_taken: string | null;
  resolution: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  performed_at: string;
  custom_fields: Record<string, unknown> | null;
}

export interface ErrorLog {
  id: string;
  device_id: string | null;
  couple_id: string | null;
  pair_id: string | null;
  error_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  severity_color: string;
  description: string;
  reported_by: string | null;
  reported_by_name: string | null;
  reported_at: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
  steps: TroubleshootEntryData[];
  custom_fields: Record<string, unknown> | null;
  created_at: string;
}

export interface ErrorStats {
  total: number;
  open: number;
  resolved: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
}

export interface ErrorLogCreate {
  device_id?: string | null;
  couple_id?: string | null;
  pair_id?: string | null;
  error_type: string;
  severity: string;
  description: string;
  reported_by?: string | null;
  custom_fields?: Record<string, unknown> | null;
}

export interface StepCreate {
  step_description: string;
  action_taken?: string | null;
  resolution?: string | null;
  performed_by?: string | null;
  custom_fields?: Record<string, unknown> | null;
}

export interface ResolveRequest {
  resolution_notes?: string | null;
  resolved_by?: string | null;
}

export interface ErrorFilterState {
  severity: string[];
  resolved: boolean | null;
  error_type: string;
  entity_type: string;
  reported_at_gte: string | null;
  reported_at_lte: string | null;
}

// ── Hooks ───────────────────────────────────────────────────────

export function useErrors(filters?: Partial<ErrorFilterState>, page = 1, size = 20) {
  const params: Record<string, string | number | boolean> = { page, size };

  if (filters) {
    if (filters.severity && filters.severity.length === 1 && filters.severity[0]) {
      params.severity = filters.severity[0];
    }
    if (filters.resolved !== null && filters.resolved !== undefined) {
      params.resolved = filters.resolved;
    }
    if (filters.error_type) {
      params.error_type__contains = filters.error_type;
    }
    if (filters.reported_at_gte) {
      params.reported_at__gte = filters.reported_at_gte;
    }
    if (filters.reported_at_lte) {
      params.reported_at__lte = filters.reported_at_lte;
    }
  }

  return useQuery<PaginatedResponse<ErrorLog>>({
    queryKey: ['errors', params],
    queryFn: () => api.get<PaginatedResponse<ErrorLog>>('/troubleshooting/', params),
  });
}

export function useError(id: string) {
  return useQuery<ErrorLog>({
    queryKey: ['error', id],
    queryFn: () => api.get<ErrorLog>(`/troubleshooting/${id}`),
    enabled: !!id,
  });
}

export function useCreateError() {
  const queryClient = useQueryClient();
  return useMutation<ErrorLog, Error, ErrorLogCreate>({
    mutationFn: (data) => api.post<ErrorLog>('/troubleshooting/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['errors'] });
    },
  });
}

export function useAddStep() {
  const queryClient = useQueryClient();
  return useMutation<
    TroubleshootEntryData,
    Error,
    { errorId: string; data: StepCreate }
  >({
    mutationFn: ({ errorId, data }) =>
      api.post<TroubleshootEntryData>(`/troubleshooting/${errorId}/steps`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['errors'] });
      queryClient.invalidateQueries({ queryKey: ['error', variables.errorId] });
    },
  });
}

export function useResolveError() {
  const queryClient = useQueryClient();
  return useMutation<
    ErrorLog,
    Error,
    { errorId: string; data: ResolveRequest }
  >({
    mutationFn: ({ errorId, data }) =>
      api.put<ErrorLog>(`/troubleshooting/${errorId}/resolve`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['errors'] });
      queryClient.invalidateQueries({ queryKey: ['error', variables.errorId] });
    },
  });
}

export function useErrorStats() {
  return useQuery<ErrorStats>({
    queryKey: ['error-stats'],
    queryFn: () => api.get<ErrorStats>('/troubleshooting/stats'),
  });
}

export function useErrorsByEntity(entityType: string, entityId: string) {
  return useQuery<PaginatedResponse<ErrorLog>>({
    queryKey: ['errors', entityType, entityId],
    queryFn: () =>
      api.get<PaginatedResponse<ErrorLog>>(
        `/troubleshooting/by-${entityType}/${entityId}`
      ),
    enabled: !!entityType && !!entityId,
  });
}

export function useSeedErrors() {
  const queryClient = useQueryClient();
  return useMutation<ErrorLog[], Error>({
    mutationFn: () => api.post<ErrorLog[]>('/troubleshooting/seed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['errors'] });
      queryClient.invalidateQueries({ queryKey: ['error-stats'] });
    },
  });
}