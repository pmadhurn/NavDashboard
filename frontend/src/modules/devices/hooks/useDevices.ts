import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { PaginatedResponse } from '@/shared/types/common'
import type {
  Device,
  DeviceCreate,
  DeviceUpdate,
  DeviceStats,
  DeviceStatusHistory,
  StatusChangeRequest,
} from '@/shared/types/devices'

export function useDevices(filters?: Record<string, unknown>) {
  return useQuery<PaginatedResponse<Device>>({
    queryKey: ['devices', filters],
    queryFn: () => api.get<PaginatedResponse<Device>>('/devices/', filters),
  })
}

export function useDevice(id: string) {
  return useQuery<Device>({
    queryKey: ['device', id],
    queryFn: () => api.get<Device>(`/devices/${id}`),
    enabled: !!id,
  })
}

export function useCreateDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: DeviceCreate) => api.post<Device>('/devices/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
    },
  })
}

export function useUpdateDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DeviceUpdate }) =>
      api.put<Device>(`/devices/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['device', variables.id] })
    },
  })
}

export function useDeleteDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<Device>(`/devices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
    },
  })
}

export function useChangeDeviceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StatusChangeRequest }) =>
      api.put<Device>(`/devices/${id}/status`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['device', variables.id] })
      qc.invalidateQueries({ queryKey: ['device-status-history', variables.id] })
    },
  })
}

export function useDeviceStatusHistory(id: string) {
  return useQuery<DeviceStatusHistory[]>({
    queryKey: ['device-status-history', id],
    queryFn: () => api.get<DeviceStatusHistory[]>(`/devices/${id}/status-history`),
    enabled: !!id,
  })
}

export function useDeviceStats() {
  return useQuery<DeviceStats>({
    queryKey: ['device-stats'],
    queryFn: () => api.get<DeviceStats>('/devices/stats'),
  })
}
