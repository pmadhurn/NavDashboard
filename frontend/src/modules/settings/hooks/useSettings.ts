import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { message } from 'antd';

export interface SystemSetting {
  key: string;
  value: string | null;
  description: string | null;
  updated_at: string | null;
}

export interface SystemInfo {
  version: string;
  database_size: string;
  table_count: number;
  total_devices: number;
  total_couples: number;
  total_pairs: number;
  total_documents: number;
  total_users: number;
  total_audit_entries: number;
  total_embeddings: number;
  ollama_status: string;
  ollama_url: string;
  ollama_models: string[];
  environment: string;
}

export interface UserItem {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  auth_provider?: string;
  status?: string;
  created_at: string;
  last_login: string | null;
}

// Settings
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<SystemSetting[]>('/settings/'),
  });
}

export function useSystemInfo() {
  return useQuery({
    queryKey: ['system-info'],
    queryFn: () => api.get<SystemInfo>('/settings/system-info'),
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.put<SystemSetting>(`/settings/${key}`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      message.success('Setting updated');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to update setting');
    },
  });
}

// Users
export function useUsers() {
  return useQuery({
    queryKey: ['settings-users'],
    queryFn: () => api.get<UserItem[]>('/settings/users'),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email: string;
      username: string;
      password: string;
      full_name: string;
      role: string;
    }) => api.post<UserItem>('/settings/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
      message.success('User created');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to create user');
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { full_name?: string; role?: string; is_active?: boolean };
    }) => api.put<UserItem>(`/settings/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
      message.success('User updated');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to update user');
    },
  });
}

export function usePendingUsers() {
  return useQuery({
    queryKey: ['pending-users'],
    queryFn: () => api.get<UserItem[]>('/auth/users/pending'),
    refetchInterval: 60 * 1000,
  });
}

export function useApproveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<UserItem>(`/auth/users/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
      message.success('User approved');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to approve user');
    },
  });
}

export type PermissionMap = Record<string, string>;

export function useUserPermissions(userId: string | null) {
  return useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: () =>
      api.get<{ permissions: PermissionMap }>(`/auth/users/${userId}/permissions`),
    enabled: !!userId,
  });
}

export function useSetUserPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: PermissionMap }) =>
      api.put<{ permissions: PermissionMap }>(`/auth/users/${id}/permissions`, {
        permissions,
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', vars.id] });
      message.success('Permissions updated');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to update permissions');
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/settings/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
      message.success('User deactivated');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to deactivate user');
    },
  });
}
