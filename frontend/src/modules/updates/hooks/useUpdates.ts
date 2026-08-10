import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '@/shared/api/client';

export interface UpdateComment {
  id: string;
  update_id: string;
  author_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface DailyUpdate {
  id: string;
  author_id: string;
  author_name: string | null;
  person_id: string | null;
  project_id: string | null;
  project_name: string | null;
  body: string;
  posted_for: string;
  created_at: string;
  comment_count: number;
  comments: UpdateComment[];
}

export interface LeadershipSummary {
  generated_at: string;
  people_total: number;
  on_field_today: number;
  in_office_today: number;
  away_today: number;
  not_logged_today: number;
  active_projects: number;
  projects_by_status: Record<string, number>;
  devices_total: number;
  devices_working: number;
  devices_faulty: number;
  open_errors: number;
  spend_this_month: number;
  pending_claims: number;
  pending_claim_value: number;
  assets_deployed: number;
  recent_updates: DailyUpdate[];
}

interface UpdateFilters {
  date_from?: string;
  date_to?: string;
  person_id?: string;
  project_id?: string;
  limit?: number;
}

export function useUpdates(filters: UpdateFilters = {}) {
  return useQuery({
    queryKey: ['updates', filters],
    queryFn: () => api.get<DailyUpdate[]>('/updates', filters),
  });
}

export function useMyUpdates() {
  return useQuery({
    queryKey: ['updates', 'mine'],
    queryFn: () => api.get<DailyUpdate[]>('/updates/mine'),
  });
}

export function useLeadershipSummary() {
  return useQuery({
    queryKey: ['leadership', 'summary'],
    queryFn: () => api.get<LeadershipSummary>('/leadership/summary'),
    // The boss's home page is a live picture; a stale one is worse than a
    // slightly slower one.
    refetchInterval: 60_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['updates'] });
  qc.invalidateQueries({ queryKey: ['leadership'] });
}

export function usePostUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { body: string; project_id?: string | null; posted_for?: string }) =>
      api.post<DailyUpdate>('/updates', data),
    onSuccess: () => invalidate(qc),
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not post the update'),
  });
}

export function useDeleteUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/updates/${id}`),
    onSuccess: () => {
      invalidate(qc);
      message.success('Update removed');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not remove the update'),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ updateId, body }: { updateId: string; body: string }) =>
      api.post<DailyUpdate>(`/updates/${updateId}/comments`, { body }),
    onSuccess: () => invalidate(qc),
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not post the comment'),
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => api.del<void>(`/updates/comments/${commentId}`),
    onSuccess: () => invalidate(qc),
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not remove the comment'),
  });
}
