import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

export type Urgency = 'BLOCKING' | 'DUE' | 'SOON';

export interface Task {
  key: string;
  title: string;
  detail: string | null;
  link: string | null;
  urgency: Urgency;
  action: string;
  count: number | null;
}

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export const URGENCY_COLOR: Record<Urgency, string> = {
  BLOCKING: '#B0413E',
  DUE: 'var(--status-not-working)',
  SOON: 'var(--text-muted)',
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  BLOCKING: 'Someone is waiting on you',
  DUE: 'Today',
  SOON: 'When you can',
};

export function useMyTasks() {
  return useQuery({
    queryKey: ['tasks', 'me'],
    queryFn: () => api.get<Task[]>('/tasks/me'),
    // The list is the whole point of the page; a stale one sends people to do
    // work they have already done.
    refetchInterval: 60_000,
  });
}

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ['tasks', 'notifications', unreadOnly],
    queryFn: () =>
      api.get<Notification[]>('/tasks/notifications', { unread_only: unreadOnly }),
    refetchInterval: 60_000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ marked: number }>('/tasks/notifications/read'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
