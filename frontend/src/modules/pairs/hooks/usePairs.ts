import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { PaginatedResponse } from '@/shared/types/common'
import type { Pair, PairCreate, PairUpdate, PairStats } from '@/shared/types/pairs'

export function usePairs(filters?: Record<string, unknown>) {
  return useQuery<PaginatedResponse<Pair>>({
    queryKey: ['pairs', filters],
    queryFn: () => api.get<PaginatedResponse<Pair>>('/pairs/', filters),
  })
}

export function usePair(id: string) {
  return useQuery<Pair>({
    queryKey: ['pair', id],
    queryFn: () => api.get<Pair>(`/pairs/${id}`),
    enabled: !!id,
  })
}

export function useCreatePair() {
  const queryClient = useQueryClient()
  return useMutation<Pair, Error, PairCreate>({
    mutationFn: (data: PairCreate) => api.post<Pair>('/pairs/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pairs'] })
      queryClient.invalidateQueries({ queryKey: ['couples'] })
    },
  })
}

export function useUpdatePair() {
  const queryClient = useQueryClient()
  return useMutation<Pair, Error, { id: string; data: PairUpdate }>({
    mutationFn: ({ id, data }) => api.put<Pair>(`/pairs/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pairs'] })
      queryClient.invalidateQueries({ queryKey: ['pair', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['couples'] })
    },
  })
}

export function useDeletePair() {
  const queryClient = useQueryClient()
  return useMutation<Pair, Error, string>({
    mutationFn: (id: string) => api.del<Pair>(`/pairs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pairs'] })
      queryClient.invalidateQueries({ queryKey: ['couples'] })
    },
  })
}

export function usePairStats() {
  return useQuery<PairStats>({
    queryKey: ['pair-stats'],
    queryFn: () => api.get<PairStats>('/pairs/stats'),
  })
}

// --- Link composition (expected build vs what is actually fitted) ---

export interface CompositionDevice {
  id: string
  serial_number: string
  status: string
  model: string | null
}

export interface CompositionSide {
  couple_id: string
  couple_name: string
  has_rf: boolean
  has_gyro: boolean
  devices: Partial<Record<string, CompositionDevice[]>>
  missing: string[]
}

export interface PairComposition {
  pair_id: string
  pair_name: string
  status: string
  complete: boolean
  notes: string[]
  sides: CompositionSide[]
}

export function usePairComposition(pairId: string) {
  return useQuery<PairComposition>({
    queryKey: ['pair', pairId, 'composition'],
    queryFn: () => api.get<PairComposition>(`/pairs/${pairId}/composition`),
    enabled: !!pairId,
  })
}

