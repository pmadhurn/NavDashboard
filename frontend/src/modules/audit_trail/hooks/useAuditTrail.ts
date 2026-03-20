import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { PaginatedResponse } from '@/shared/types/common';

export interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changed_by: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  timestamp: string;
  user_name: string | null;
  description: string | null;
}

export interface AuditStats {
  total_entries: number;
  by_action: Record<string, number>;
  by_entity_type: Record<string, number>;
  most_active_users: Array<{ user_id: string; name: string; count: number }>;
}

export function useAuditEntries(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ['audit', 'entries', filters],
    queryFn: () =>
      api.get<PaginatedResponse<AuditEntry>>('/audit/', filters),
  });
}

export function useEntityAudit(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['audit', 'entity', entityType, entityId],
    queryFn: () =>
      api.get<PaginatedResponse<AuditEntry>>(
        `/audit/entity/${entityType}/${entityId}`,
      ),
    enabled: !!entityType && !!entityId,
  });
}

export function useUserAudit(userId: string) {
  return useQuery({
    queryKey: ['audit', 'user', userId],
    queryFn: () =>
      api.get<PaginatedResponse<AuditEntry>>(`/audit/user/${userId}`),
    enabled: !!userId,
  });
}

export function useAuditStats() {
  return useQuery({
    queryKey: ['audit', 'stats'],
    queryFn: () => api.get<AuditStats>('/audit/stats'),
  });
}