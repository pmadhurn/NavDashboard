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

export function useSeedPairs() {
  const queryClient = useQueryClient()
  return useMutation<Pair[], Error, void>({
    mutationFn: () => api.post<Pair[]>('/pairs/seed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pairs'] })
      queryClient.invalidateQueries({ queryKey: ['couples'] })
    },
  })
}