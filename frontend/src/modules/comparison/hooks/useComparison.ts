import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { PaginatedResponse } from '@/shared/types/common';

export interface ComparisonField {
  field_name: string;
  label: string;
  value_a: any;
  value_b: any;
  match: boolean;
}

export interface ComparisonResult {
  entity_type: string;
  entity_a_id: string;
  entity_a_name: string;
  entity_b_id: string;
  entity_b_name: string;
  fields: ComparisonField[];
  match_count: number;
  diff_count: number;
  nested_comparisons?: Record<string, ComparisonField[]>;
}

interface CompareRequest {
  entity_id_1: string;
  entity_id_2: string;
}

export function useCompareCouples() {
  return useMutation({
    mutationFn: (data: CompareRequest) =>
      api.post<ComparisonResult>('/comparison/couples', data),
  });
}

export function useComparePairs() {
  return useMutation({
    mutationFn: (data: CompareRequest) =>
      api.post<ComparisonResult>('/comparison/pairs', data),
  });
}

export function useCompareDevices() {
  return useMutation({
    mutationFn: (data: CompareRequest) =>
      api.post<ComparisonResult>('/comparison/devices', data),
  });
}

export interface EntityOption {
  value: string;
  label: string;
}

export function useCoupleOptions() {
  return useQuery({
    queryKey: ['comparison', 'couples-options'],
    queryFn: async () => {
      const resp = await api.get<PaginatedResponse<any>>('/couples/', {
        size: 100,
      });
      return resp.items.map((c: any) => ({
        value: c.id,
        label: c.name,
      }));
    },
  });
}

export function usePairOptions() {
  return useQuery({
    queryKey: ['comparison', 'pairs-options'],
    queryFn: async () => {
      const resp = await api.get<PaginatedResponse<any>>('/pairs/', {
        size: 100,
      });
      return resp.items.map((p: any) => ({
        value: p.id,
        label: p.name,
      }));
    },
  });
}

export function useDeviceOptions() {
  return useQuery({
    queryKey: ['comparison', 'devices-options'],
    queryFn: async () => {
      const resp = await api.get<PaginatedResponse<any>>('/devices/', {
        size: 100,
      });
      return resp.items.map((d: any) => ({
        value: d.id,
        label: d.serial_number,
      }));
    },
  });
}