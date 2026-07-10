import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '@/shared/api/client';

export interface DownloadCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface DownloadVersion {
  id: string;
  version_label: string | null;
  original_filename: string;
  file_size: number;
  mime_type: string | null;
  release_notes: string | null;
  uploaded_by: string;
  download_count: number;
  created_at: string;
}

export interface DownloadItem {
  id: string;
  title: string;
  description: string | null;
  category: DownloadCategory | null;
  item_type: 'FILE' | 'SOFTWARE';
  visibility: 'PUBLIC' | 'RESTRICTED';
  tags: Record<string, unknown> | null;
  uploaded_by: string;
  created_at: string;
  versions: DownloadVersion[];
  allowed_user_ids: string[];
}

interface ItemListResponse {
  items: DownloadItem[];
  total: number;
}

export function useDownloadItems(search?: string, categoryId?: string) {
  return useQuery({
    queryKey: ['download-items', search ?? '', categoryId ?? ''],
    queryFn: () =>
      api.get<ItemListResponse>('/downloads/', {
        search: search || undefined,
        category_id: categoryId || undefined,
      }),
  });
}

export function useDownloadCategories() {
  return useQuery({
    queryKey: ['download-categories'],
    queryFn: () => api.get<DownloadCategory[]>('/downloads/categories'),
  });
}

export interface UploadPayload {
  file: File;
  title?: string;
  description?: string;
  categoryId?: string;
  newCategory?: string;
  itemType: 'FILE' | 'SOFTWARE';
  visibility: 'PUBLIC' | 'RESTRICTED';
  allowedUserIds?: string[];
  existingItemId?: string;
  versionLabel?: string;
  releaseNotes?: string;
}

export function useUploadDownload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UploadPayload) => {
      const form = new FormData();
      form.append('file', payload.file);
      if (payload.title) form.append('title', payload.title);
      if (payload.description) form.append('description', payload.description);
      if (payload.categoryId) form.append('category_id', payload.categoryId);
      if (payload.newCategory) form.append('new_category', payload.newCategory);
      form.append('item_type', payload.itemType);
      form.append('visibility', payload.visibility);
      if (payload.allowedUserIds?.length) {
        form.append('allowed_user_ids', payload.allowedUserIds.join(','));
      }
      if (payload.existingItemId) form.append('existing_item_id', payload.existingItemId);
      if (payload.versionLabel) form.append('version_label', payload.versionLabel);
      if (payload.releaseNotes) form.append('release_notes', payload.releaseNotes);
      return api.upload<DownloadItem>('/downloads/upload', form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['download-items'] });
      queryClient.invalidateQueries({ queryKey: ['download-categories'] });
      message.success('Uploaded');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Upload failed');
    },
  });
}

export function useDeleteDownloadItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/downloads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['download-items'] });
      message.success('Item deleted');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Failed to delete');
    },
  });
}

export function downloadVersionFile(version: DownloadVersion) {
  return api.downloadFile(
    `/downloads/versions/${version.id}/download`,
    version.original_filename
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}
