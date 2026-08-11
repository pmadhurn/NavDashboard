import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

export type HomeKind = 'leadership' | 'inventory' | 'finance' | 'rnd' | 'me' | 'general';

export interface RoleHome {
  home: HomeKind;
  data: Record<string, any>;
}

/**
 * Which home this person lands on, decided by the server from what they can
 * actually do. The client cannot know before it asks, so this is one request —
 * two would mean showing the wrong page first and then correcting it.
 */
export function useRoleHome() {
  return useQuery({
    queryKey: ['dashboard', 'home-for-me'],
    queryFn: () => api.get<RoleHome>('/dashboard/home-for-me'),
    staleTime: 5 * 60_000,
  });
}
