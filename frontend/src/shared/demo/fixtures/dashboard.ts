/** Dashboard tiles and charts — every number reconciles with the other fixtures. */
import type {
  DashboardStats,
  DeviceTypeBreakdown,
  ErrorTrendPoint,
  HomeSummary,
  PairStatusData,
  RecentActivityItem,
  StatusDistribution,
} from '@/modules/dashboard/hooks/useDashboard'
import type { RoleHome } from '@/modules/dashboard/hooks/useRoleHome'
import { dateOnly, daysAgo, statusColor } from './helpers'
import { COUPLES, DEVICE_STATS, PAIRS } from './devices'
import { ASSETS } from './inventory'
import { FINANCE_ROLLUP } from './finance'

const working = DEVICE_STATS.by_status['WORKING'] ?? 0
const notWorking = DEVICE_STATS.by_status['NOT_WORKING'] ?? 0
const faulty = DEVICE_STATS.by_status['FAULTY'] ?? 0
const OPEN_ERRORS = 1 // the Shantigram OU investigation — matches troubleshooting stats

export const DASHBOARD_STATS: DashboardStats = {
  total_pairs: PAIRS.length,
  total_couples: COUPLES.length,
  total_devices: DEVICE_STATS.total,
  active_errors: OPEN_ERRORS,
  devices_working: working,
  devices_not_working: notWorking,
  devices_faulty: faulty,
}

export const HOME_SUMMARY: HomeSummary = {
  devices_working: working,
  devices_faulty: faulty,
  devices_total: DEVICE_STATS.total,
  couples_total: COUPLES.length,
  pairs_total: PAIRS.length,
  active_errors: OPEN_ERRORS,
  projects_active: 2,
  equipment_out: ASSETS.filter((a) => a.custody_type !== 'LOCATION').length,
  damaged_open: 1, // the kinked hybrid cable report
  my_expenses_month_total: FINANCE_ROLLUP.my_expenses_month_total,
  my_expenses_month_count: FINANCE_ROLLUP.my_expenses_month_count,
  my_advance_balance: FINANCE_ROLLUP.my_advance_balance,
  pending_user_approvals: 0,
}

const countByStatus = (statuses: string[]) => ({
  working: statuses.filter((s) => s === 'WORKING').length,
  not_working: statuses.filter((s) => s === 'NOT_WORKING').length,
  faulty: statuses.filter((s) => s === 'FAULTY').length,
})

export const STATUS_DISTRIBUTION: StatusDistribution[] = [
  { entity_type: 'devices', working, not_working: notWorking, faulty },
  { entity_type: 'couples', ...countByStatus(COUPLES.map((c) => c.status)) },
  { entity_type: 'pairs', ...countByStatus(PAIRS.map((p) => p.status)) },
]

const TYPE_COLORS: Record<string, string> = {
  IU: '#6F8CB6',
  OU: '#8BC34A',
  HC: '#B68A3C',
  RF: '#7E6F9E',
  GYRO: '#9E7E8A',
  GYRO_CTRL: '#5E8C86',
}

export const DEVICE_TYPE_BREAKDOWN: DeviceTypeBreakdown[] = Object.entries(
  DEVICE_STATS.by_type,
).map(([device_type, count]) => ({
  device_type,
  count,
  color: TYPE_COLORS[device_type] ?? '#9E9E9E',
}))

/** 30 days of error reports: quiet, with a storm-week bump. */
export const errorTrends = (days = 30): ErrorTrendPoint[] => {
  const out: ErrorTrendPoint[] = []
  for (let back = days - 1; back >= 0; back -= 1) {
    // The two logged errors: heat-haze flaps (~17 days ago), OU fault (5 days ago).
    const medium = back === 17 ? 1 : 0
    const high = back === 5 ? 1 : 0
    out.push({
      date: dateOnly(back),
      count: medium + high,
      severity_low: 0,
      severity_medium: medium,
      severity_high: high,
      severity_critical: 0,
    })
  }
  return out
}

export const RECENT_ACTIVITY: RecentActivityItem[] = [
  {
    id: 'act-01',
    action: 'UPDATE',
    entity_type: 'device',
    entity_id: 'dev-13',
    description: 'Device NW-OU-24024 marked FAULTY — RX power below threshold',
    user_id: 'usr-kavita',
    timestamp: daysAgo(5, 16, 40),
  },
  {
    id: 'act-02',
    action: 'CREATE',
    entity_type: 'handover',
    entity_id: 'ho-01',
    description: 'Handover started: Arjun Mehta → Priya Sharma (2 items)',
    user_id: 'demo-user',
    timestamp: daysAgo(1, 17, 50),
  },
  {
    id: 'act-03',
    action: 'CREATE',
    entity_type: 'movement',
    entity_id: 'gp2f7a91c4',
    description: 'Gate pass GP2F7A91 — 5 items out to GIFT City Backbone POC',
    user_id: 'demo-user',
    timestamp: daysAgo(8, 8, 30),
  },
  {
    id: 'act-04',
    action: 'UPDATE',
    entity_type: 'claim',
    entity_id: 'clm-02',
    description: 'Claim “GIFT POC week-one travel” settled — ₹2,090 paid',
    user_id: 'usr-neha',
    timestamp: daysAgo(4, 15, 30),
  },
  {
    id: 'act-05',
    action: 'CREATE',
    entity_type: 'repair',
    entity_id: 'rpr-01',
    description: 'RF unit NW-RF-24042 sent to Om Communication Systems for repair',
    user_id: 'usr-neha',
    timestamp: daysAgo(10, 11, 20),
  },
  {
    id: 'act-06',
    action: 'UPDATE',
    entity_type: 'couple',
    entity_id: 'cpl-c2',
    description: 'Infocity Rooftop relocated 452 m to Tower-2 terrace',
    user_id: 'usr-kavita',
    timestamp: daysAgo(18, 11, 35),
  },
]

export const PAIR_STATUS_DATA: PairStatusData[] = Object.entries(
  PAIRS.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {}),
).map(([status, count]) => ({ status, count, color: statusColor(status) }))

/** The demo visitor is an admin, so the server would land them on leadership. */
export const ROLE_HOME: RoleHome = { home: 'leadership', data: {} }
