import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  parameters: string[];
}

export interface ReportRequest {
  template_id: string;
  format: string;
  date_from?: string;
  date_to?: string;
  entity_ids?: string[];
  include_charts?: boolean;
}

export function useReportTemplates() {
  return useQuery({
    queryKey: ['reports', 'templates'],
    queryFn: () => api.get<ReportTemplate[]>('/reports/templates'),
  });
}

export function useGenerateReport() {
  return useMutation({
    mutationFn: async (request: ReportRequest) => {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/reports/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Report generation failed' }));
        throw new Error(err.detail || 'Report generation failed');
      }
      const blob = await response.blob();
      const ext = request.format === 'pdf' ? 'pdf' : 'xlsx';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `navdashboard_${request.template_id}_${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}