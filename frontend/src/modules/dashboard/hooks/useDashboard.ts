import { useQuery } from '@tanstack/react-query'
import { api } from '../../../shared/api/client'

// ─── Interfaces ────────────────────────────────────────────

export interface DashboardStats {
  total_pairs: number
  total_couples: number
  total_devices: number
  active_errors: number
  devices_working: number
  devices_not_working: number
  devices_faulty: number
}

export interface StatusDistribution {
  entity_type: string
  working: number
  not_working: number
  faulty: number
}

export interface DeviceTypeBreakdown {
  device_type: string
  count: number
  color: string
}

export interface ErrorTrendPoint {
  date: string
  count: number
  severity_low: number
  severity_medium: number
  severity_high: number
  severity_critical: number
}

export interface RecentActivityItem {
  id: string
  action: string
  entity_type: string
  entity_id: string
  description: string
  user_id: string | null
  timestamp: string
}

export interface PairStatusData {
  status: string
  count: number
  color: string
}

// ─── Hooks ─────────────────────────────────────────────────

export interface HomeSummary {
  devices_working: number
  devices_faulty: number
  devices_total: number
  couples_total: number
  pairs_total: number
  active_errors: number
  projects_active: number
  equipment_out: number
  damaged_open: number
  my_expenses_month_total: number
  my_expenses_month_count: number
  my_advance_balance: number
  pending_user_approvals: number
}

export function useHomeSummary() {
  return useQuery<HomeSummary>({
    queryKey: ['dashboard', 'home'],
    queryFn: () => api.get<HomeSummary>('/dashboard/home'),
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

export function useStatusDistribution() {
  return useQuery<StatusDistribution[]>({
    queryKey: ['dashboard', 'status-distribution'],
    queryFn: () => api.get<StatusDistribution[]>('/dashboard/status-distribution'),
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

export function useDeviceTypeBreakdown() {
  return useQuery<DeviceTypeBreakdown[]>({
    queryKey: ['dashboard', 'device-type-breakdown'],
    queryFn: () => api.get<DeviceTypeBreakdown[]>('/dashboard/device-type-breakdown'),
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

export function useErrorTrends(days: number = 30) {
  return useQuery<ErrorTrendPoint[]>({
    queryKey: ['dashboard', 'error-trends', days],
    queryFn: () => api.get<ErrorTrendPoint[]>('/dashboard/error-trends', { days }),
    staleTime: 30000,
  })
}

export function useRecentActivity(limit: number = 20) {
  return useQuery<RecentActivityItem[]>({
    queryKey: ['dashboard', 'recent-activity', limit],
    queryFn: () => api.get<RecentActivityItem[]>('/dashboard/recent-activity', { limit }),
    staleTime: 30000,
  })
}

export function usePairStatus() {
  return useQuery<PairStatusData[]>({
    queryKey: ['dashboard', 'pair-status'],
    queryFn: () => api.get<PairStatusData[]>('/dashboard/pair-status'),
    refetchInterval: 60000,
    staleTime: 30000,
  })
}