import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { PaginatedResponse } from '@/shared/types/common';

export interface DocumentItem {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  mime_type: string | null;
  file_size: number;
  storage_path: string;
  entity_type: string | null;
  entity_id: string | null;
  uploaded_by: string;
  description: string | null;
  created_at: string;
  download_url: string | null;
}

interface DocumentFilters {
  page?: number;
  size?: number;
  entity_type?: string;
  entity_id?: string;
  file_type?: string;
}

export function useDocuments(filters: DocumentFilters = {}) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: () =>
      api.get<PaginatedResponse<DocumentItem>>('/documents/', {
        page: filters.page || 1,
        size: filters.size || 20,
        entity_type: filters.entity_type || undefined,
        entity_id: filters.entity_id || undefined,
        file_type: filters.file_type || undefined,
      }),
  });
}

export function useDocumentsByEntity(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['documents', 'by-entity', entityType, entityId],
    queryFn: () =>
      api.get<PaginatedResponse<DocumentItem>>(
        `/documents/by-entity/${entityType}/${entityId}`
      ),
    enabled: !!entityType && !!entityId,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      file: File;
      entityType?: string;
      entityId?: string;
      description?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      if (data.entityType) formData.append('entity_type', data.entityType);
      if (data.entityId) formData.append('entity_id', data.entityId);
      if (data.description) formData.append('description', data.description);

      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(err.detail || 'Upload failed');
      }
      return response.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}