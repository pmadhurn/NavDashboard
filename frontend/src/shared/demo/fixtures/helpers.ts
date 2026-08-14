/**
 * Shared helpers for the demo fixtures. Every date is computed from Date.now()
 * at module load, so the demo always looks like it happened this month.
 */

const NOW = Date.now()
const DAY = 86_400_000

/** ISO timestamp `days` days ago (negative = in the future), at a working hour. */
export function daysAgo(days: number, hour = 10, minute = 24): string {
  const d = new Date(NOW - days * DAY)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

/** Date-only string (YYYY-MM-DD) `days` days ago; negative = in the future. */
export function dateOnly(days: number): string {
  const d = new Date(NOW - days * DAY)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** True if the date-only/ISO string falls in the current calendar month. */
export function isThisMonth(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date(NOW)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

/** Wrap a full list in the API's paginated envelope, honouring page/size params. */
export function paginate<T>(all: T[], params?: Record<string, unknown>): Paginated<T> {
  const page = Math.max(1, Number(params?.page) || 1)
  const size = Math.max(1, Number(params?.size) || 50)
  const start = (page - 1) * size
  return {
    items: all.slice(start, start + size),
    total: all.length,
    page,
    size,
    pages: Math.max(1, Math.ceil(all.length / size)),
  }
}

/** Count occurrences of a key across a list. */
export function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of items) {
    const k = key(item)
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

export const sum = (ns: number[]): number => ns.reduce((a, b) => a + b, 0)

/** Status colours as the backend serialises them. */
export const STATUS_COLOR: Record<string, string> = {
  WORKING: '#8BC34A',
  NOT_WORKING: '#FF9800',
  FAULTY: '#F44336',
}

export const statusColor = (s: string): string => STATUS_COLOR[s] ?? '#9E9E9E'
