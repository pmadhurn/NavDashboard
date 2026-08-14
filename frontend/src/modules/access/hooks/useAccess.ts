import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '@/shared/api/client';

export interface CatalogPermission {
  key: string;
  label: string;
  description: string;
  dangerous: boolean;
}

export interface CatalogGroup {
  key: string;
  label: string;
  description: string;
  permissions: CatalogPermission[];
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
  user_count: number;
}

export interface Override {
  permission_key: string;
  effect: 'ALLOW' | 'DENY';
}

export interface UserAccess {
  user_id: string;
  full_name: string;
  email: string;
  legacy_role: string;
  is_legacy_admin: boolean;
  role_ids: string[];
  roles: Role[];
  overrides: Override[];
  effective: string[];
}

export interface Session {
  id: string;
  user_id: string;
  user_name: string | null;
  auth_provider: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string | null;
  last_seen_at: string | null;
  revoked_at: string | null;
  is_active: boolean;
}

export interface BasicUser {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  status: string;
  auth_provider: string;
}

/** The catalog is static for the life of a build; no point refetching it. */
export function useCatalog() {
  return useQuery({
    queryKey: ['authz', 'catalog'],
    queryFn: () => api.get<CatalogGroup[]>('/authz/catalog'),
    staleTime: Infinity,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['authz', 'users'],
    queryFn: () => api.get<BasicUser[]>('/auth/users', { limit: 500 }),
  });
}

export function useApproveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post<BasicUser>(`/auth/users/${userId}/approve`),
    onSuccess: () => {
      // Both this page's list and the Users & Settings page read user rows.
      qc.invalidateQueries({ queryKey: ['authz', 'users'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      message.success('Approved — they can sign in now');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not approve the account'),
  });
}

export function useUserAccess(userId: string | undefined) {
  return useQuery({
    queryKey: ['authz', 'user-access', userId],
    queryFn: () => api.get<UserAccess>(`/auth/users/${userId}/permissions`),
    enabled: !!userId,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['authz', 'roles'],
    queryFn: () => api.get<Role[]>('/authz/roles'),
  });
}

export function useSessions(includeEnded = false) {
  return useQuery({
    queryKey: ['authz', 'sessions', includeEnded],
    queryFn: () => api.get<Session[]>('/authz/sessions', { include_ended: includeEnded }),
    refetchInterval: 30_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['authz'] });
}

export function useSaveUserAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      roleIds,
      overrides,
    }: {
      userId: string;
      roleIds: string[];
      overrides: Override[];
    }) =>
      api.put<UserAccess>(`/auth/users/${userId}/permissions`, {
        role_ids: roleIds,
        overrides,
      }),
    onSuccess: () => {
      invalidate(qc);
      message.success('Access updated');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not update access'),
  });
}

export function useSaveRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      name,
      description,
      permissions,
    }: {
      id?: string;
      name: string;
      description?: string;
      permissions: string[];
    }) =>
      id
        ? api.put<Role>(`/authz/roles/${id}`, { name, description, permissions })
        : api.post<Role>('/authz/roles', { name, description, permissions }),
    onSuccess: () => {
      invalidate(qc);
      message.success('Role saved');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not save the role'),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/authz/roles/${id}`),
    onSuccess: () => {
      invalidate(qc);
      message.success('Role deleted');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not delete the role'),
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/authz/sessions/${id}`),
    onSuccess: () => {
      invalidate(qc);
      message.success('Session ended');
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not end the session'),
  });
}

export function useRevokeUserSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post<{ revoked: number }>(`/authz/sessions/revoke-user/${userId}`),
    onSuccess: (r) => {
      invalidate(qc);
      message.success(`Signed out of ${r.revoked} session(s)`);
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not sign the user out'),
  });
}
