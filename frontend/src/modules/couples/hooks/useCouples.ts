import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { PaginatedResponse } from '@/shared/types/common'
import type {
  Couple,
  CoupleCreate,
  CoupleUpdate,
  LocationChangeRequest,
} from '@/shared/types/couples'
import type { LocationHistory, MapDataPoint } from '@/shared/types/locations'

export function useCouples(filters?: Record<string, unknown>) {
  return useQuery<PaginatedResponse<Couple>>({
    queryKey: ['couples', filters],
    queryFn: () => api.get<PaginatedResponse<Couple>>('/couples/', filters),
  })
}

export function useCouple(id: string) {
  return useQuery<Couple>({
    queryKey: ['couple', id],
    queryFn: () => api.get<Couple>(`/couples/${id}`),
    enabled: !!id,
  })
}

export function useCreateCouple() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CoupleCreate) => api.post<Couple>('/couples/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couples'] })
    },
  })
}

export function useUpdateCouple() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CoupleUpdate }) =>
      api.put<Couple>(`/couples/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['couples'] })
      qc.invalidateQueries({ queryKey: ['couple', variables.id] })
    },
  })
}

export function useDeleteCouple() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<Couple>(`/couples/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couples'] })
    },
  })
}

export function useChangeCoupleLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LocationChangeRequest }) =>
      api.put<Couple>(`/couples/${id}/location`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['couples'] })
      qc.invalidateQueries({ queryKey: ['couple', variables.id] })
      qc.invalidateQueries({ queryKey: ['couple-location-history', variables.id] })
    },
  })
}

export function useCoupleLocationHistory(id: string) {
  return useQuery<PaginatedResponse<LocationHistory>>({
    queryKey: ['couple-location-history', id],
    queryFn: () =>
      api.get<PaginatedResponse<LocationHistory>>(
        `/couples/${id}/location-history`
      ),
    enabled: !!id,
  })
}

export function useCoupleMapData() {
  return useQuery<MapDataPoint[]>({
    queryKey: ['couple-map-data'],
    queryFn: () => api.get<MapDataPoint[]>('/couples/map-data'),
  })
}

export function useSeedCouples() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<Couple[]>('/couples/seed'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['couples'] })
    },
  })
}