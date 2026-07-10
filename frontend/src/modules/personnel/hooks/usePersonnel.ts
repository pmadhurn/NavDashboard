import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { PaginatedResponse } from '@/shared/types/common'
import type { Person, PersonCreate, PersonUpdate, AssignmentHistory } from '@/shared/types/personnel'

export function usePersonnelList(filters?: Record<string, unknown>) {
  return useQuery<PaginatedResponse<Person>>({
    queryKey: ['personnel', filters],
    queryFn: () => api.get<PaginatedResponse<Person>>('/personnel/', filters),
  })
}

export function usePerson(id: string) {
  return useQuery<Person>({
    queryKey: ['person', id],
    queryFn: () => api.get<Person>(`/personnel/${id}`),
    enabled: !!id,
  })
}

export function useCreatePerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PersonCreate) => api.post<Person>('/personnel/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personnel'] })
    },
  })
}

export function useUpdatePerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PersonUpdate }) =>
      api.put<Person>(`/personnel/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['personnel'] })
      qc.invalidateQueries({ queryKey: ['person', variables.id] })
    },
  })
}

export function useDeletePerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<Person>(`/personnel/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personnel'] })
    },
  })
}

export function useSeedPersonnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<Person[]>('/personnel/seed'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personnel'] })
    },
  })
}

export function usePersonAssignments(id: string) {
  return useQuery<AssignmentHistory[]>({
    queryKey: ['person-assignments', id],
    queryFn: () => api.get<AssignmentHistory[]>(`/personnel/${id}/assignments`),
    enabled: !!id,
  })
}

export function useLinkPersonUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string | null }) =>
      api.post<Person>(`/personnel/${id}/link-user`, { user_id: userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personnel'] })
    },
  })
}

export function useBackfillPersonLinks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<{ linked: number; already_linked: number; unmatched_personnel: number }>(
        '/personnel/backfill-links'
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personnel'] })
    },
  })
}
