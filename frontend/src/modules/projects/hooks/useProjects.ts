import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '@/shared/api/client';
import type { ProjectStatus } from '../constants';

export interface PersonBrief {
  id: string;
  full_name: string;
  role?: string;
}

export interface ProjectMember {
  id: string;
  person: PersonBrief;
  role_in_project: string | null;
  joined_at: string;
  left_at: string | null;
}

export interface Project {
  id: string;
  name: string;
  project_type: 'POC' | 'DEMO' | 'INSTALLATION' | 'OTHER';
  status: ProjectStatus;
  customer_name: string | null;
  site_location: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  members: ProjectMember[];
}

export interface TimelineEntry {
  id: string;
  entry_type: string;
  title: string;
  body: string | null;
  entry_date: string;
  created_by: string | null;
  created_at: string;
}

export interface MovementItem {
  id: string;
  asset: { id: string; asset_code: string; name: string };
  quantity: number;
  condition_note: string | null;
  item_status: 'RETURNED' | 'WITH_CLIENT' | 'DAMAGED' | 'LOST';
}

export interface Movement {
  id: string;
  direction: 'OUTWARD' | 'INWARD';
  movement_date: string;
  handler: PersonBrief | null;
  received_by_name: string | null;
  notes: string | null;
  items: MovementItem[];
  created_at: string;
}

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export function useProjects(params: { search?: string; type?: string; status?: string }) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () =>
      api.get<Paginated<Project>>('/projects/', {
        search: params.search || undefined,
        project_type: params.type || undefined,
        status: params.status || undefined,
        size: 100,
      }),
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<Project>(`/projects/${id}`),
    enabled: !!id,
  });
}

export function useProjectTimeline(id: string | undefined, entryType?: string) {
  return useQuery({
    queryKey: ['project-timeline', id, entryType ?? ''],
    queryFn: () =>
      api.get<Paginated<TimelineEntry>>(`/projects/${id}/timeline`, {
        entry_type: entryType || undefined,
        size: 100,
      }),
    enabled: !!id,
  });
}

export function useProjectMovements(id: string | undefined) {
  return useQuery({
    queryKey: ['project-movements', id],
    queryFn: () => api.get<Movement[]>(`/projects/${id}/movements`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      project_type: string;
      customer_name?: string;
      // Personnel ids added as team members at creation — they get notified.
      member_ids?: string[];
    }) => api.post<Project>('/projects/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('Project created');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to create project');
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.put<Project>(`/projects/${id}`, data),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['project-timeline', vars.id] });
      message.success('Project updated');
    },
  });
}

export function useAddTimelineEntry(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { entry_type: string; title: string; body?: string }) =>
      api.post<TimelineEntry>(`/projects/${projectId}/timeline`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-timeline', projectId] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to log entry');
    },
  });
}

export function useAddMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      person_id?: string;
      new_person_name?: string;
      role_in_project?: string;
    }) => api.post(`/projects/${projectId}/members`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-timeline', projectId] });
      message.success('Member added');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to add member');
    },
  });
}

export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      api.del(`/projects/${projectId}/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export interface Deployment {
  id: string;
  project_id: string;
  entity_type: string;
  entity_id: string;
  label: string | null;
  sub: string | null;
  deployed_at: string;
  removed_at: string | null;
  note: string | null;
}

export function useProjectDeployments(id: string | undefined) {
  return useQuery({
    queryKey: ['project-deployments', id],
    queryFn: () => api.get<Deployment[]>(`/projects/${id}/deployments`),
    enabled: !!id,
  });
}

export function useAddDeployment(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { entity_type: string; entity_id: string; note?: string }) =>
      api.post<Deployment>(`/projects/${projectId}/deployments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-deployments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-timeline', projectId] });
      queryClient.invalidateQueries({ queryKey: ['assets', 'deployed'] });
      message.success('Deployment recorded');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to add deployment');
    },
  });
}

export function useRemoveDeployment(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deploymentId: string) =>
      api.del(`/projects/${projectId}/deployments/${deploymentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-deployments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['assets', 'deployed'] });
      message.success('Removed');
    },
  });
}

export function useCreateMovement(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      direction: 'OUTWARD' | 'INWARD';
      handled_by?: string;
      received_by_name?: string;
      notes?: string;
      items: { asset_id: string; quantity?: number; condition_note?: string }[];
    }) => api.post<Movement>(`/projects/${projectId}/movements`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-movements', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-timeline', projectId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      message.success('Movement recorded');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to record movement');
    },
  });
}

export interface OutwardLineInput {
  asset_id?: string;
  name?: string;
  quantity: number;
  condition_note?: string;
}

export interface OutwardLineResult {
  index: number;
  asset_id: string | null;
  label: string;
  requested: number;
  available: number;
  conflict: 'NONE' | 'INSUFFICIENT' | 'NEW_ITEM';
  message: string | null;
}

export interface OutwardPreview {
  lines: OutwardLineResult[];
  has_conflicts: boolean;
}

export function usePreviewOutward(projectId: string) {
  return useMutation({
    mutationFn: (items: OutwardLineInput[]) =>
      api.post<OutwardPreview>(`/projects/${projectId}/outward/preview`, { items }),
  });
}

export function useExecuteOutward(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      items: OutwardLineInput[];
      received_by_name?: string;
      notes?: string;
      confirm: boolean;
    }) => api.post<Movement>(`/projects/${projectId}/outward`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-movements', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-timeline', projectId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      message.success('Outward recorded');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Outward failed');
    },
  });
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  phase_type: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  lead_person_id: string | null;
  note: string | null;
  created_at: string;
}

export function useProjectPhases(id: string | undefined) {
  return useQuery({
    queryKey: ['project-phases', id],
    queryFn: () => api.get<ProjectPhase[]>(`/projects/${id}/phases`),
    enabled: !!id,
  });
}

export function useCreatePhase(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { phase_type: string; lead_person_id?: string; note?: string }) =>
      api.post<ProjectPhase>(`/projects/${projectId}/phases`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-timeline', projectId] });
      message.success('Phase started');
    },
  });
}

export function useCloseProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { departing_member_ids?: string[]; force?: boolean }) =>
      api.post<Project>(`/projects/${projectId}/close`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      message.success('Project closed');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Close failed');
    },
  });
}

export function useUpdateMovementItem(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: { item_status: string; condition_note?: string } }) =>
      api.put(`/projects/movements/items/${itemId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-movements', projectId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      message.success('Updated');
    },
  });
}
