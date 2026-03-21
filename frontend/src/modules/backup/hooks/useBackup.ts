import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

export interface BackupInfo {
  filename: string;
  size: number;
  created_at: string;
  backup_type: string;
}

export interface ImportSummary {
  total_rows: number;
  created: number;
  updated: number;
  errors: number;
  error_details: string[] | null;
}

export interface TableCounts {
  [table: string]: number;
}

export function useBackupHistory() {
  return useQuery({
    queryKey: ['backup', 'history'],
    queryFn: () => api.get<BackupInfo[]>('/backup/pg-dump/history'),
  });
}

export function useCreateBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<BackupInfo>('/backup/pg-dump'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backup', 'history'] }),
  });
}

export function useDeleteBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (filename: string) => api.del(`/backup/pg-dump/${filename}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backup', 'history'] }),
  });
}

export function useExportXlsx() {
  return useMutation({
    mutationFn: async (tables?: string[]) => {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/backup/export/xlsx', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format: 'xlsx', tables: tables || null }),
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `navdashboard_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useExportCsv() {
  return useMutation({
    mutationFn: async (tables?: string[]) => {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/backup/export/csv', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format: 'csv', tables: tables || null }),
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `navdashboard_export_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useImportXlsx() {
  return useMutation({
    mutationFn: async (file: File): Promise<ImportSummary> => {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/v1/backup/import/xlsx', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Import failed' }));
        throw new Error(err.detail || 'Import failed');
      }
      return response.json();
    },
  });
}

export function useImportCsv() {
  return useMutation({
    mutationFn: async (file: File): Promise<ImportSummary> => {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/v1/backup/import/csv', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Import failed' }));
        throw new Error(err.detail || 'Import failed');
      }
      return response.json();
    },
  });
}

export function useTableCounts() {
  return useQuery({
    queryKey: ['backup', 'table-counts'],
    queryFn: () => api.get<TableCounts>('/backup/table-counts'),
  });
}