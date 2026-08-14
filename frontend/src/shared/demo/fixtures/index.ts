/**
 * Demo fixture registry.
 *
 * `resolveDemo(config)` answers every GET the app makes from static fixtures —
 * in demo mode no request ever reaches the backend. Routes are matched most
 * specific first; anything unmatched falls back to a sensible empty shape so a
 * new endpoint can never cause a network call.
 */
import type { InternalAxiosRequestConfig } from 'axios'
import { paginate } from './helpers'
import { DEMO_USER } from '../demo'
import { BASIC_USERS, PEOPLE, PERSON_ASSIGNMENTS, USERS } from './people'
import {
  COUPLES,
  DEVICES,
  DEVICE_MODELS,
  DEVICE_STATS,
  DEVICE_STATUS_HISTORY,
  LOCATION_HISTORY,
  MAP_DATA,
  PAIRS,
  PAIR_COMPOSITIONS,
  PAIR_STATS,
} from './devices'
import {
  ASSETS,
  ASSET_CATEGORIES,
  ASSET_MOVEMENTS,
  ASSET_REPORTS,
  BUNDLES,
  CUSTODY_SUMMARY,
  CUSTOMERS,
  DEPLOYED_GROUPS,
  HANDOVERS,
  ITEM_REQUESTS,
  OPEN_OUTWARDS,
  OUTWARD_MOVEMENTS,
  REPAIRS,
  STOCK_LOCATIONS,
  VENDORS,
  assetById,
  genericHistory,
  genericMovements,
} from './inventory'
import {
  PROJECTS,
  PROJECT_DEPLOYMENTS,
  PROJECT_PHASES,
  PROJECT_TIMELINES,
  projectArchive,
  projectMovements,
} from './projects'
import {
  ADVANCES,
  CLAIMS,
  EXPENSES,
  EXPENSE_SUMMARY,
  MY_FINANCE,
  SETTLEMENT,
  personBalance,
} from './finance'
import {
  ATTENDANCE_BOARD,
  COMP_OFF_LEDGER,
  LEADERSHIP_SUMMARY,
  MY_ATTENDANCE,
  MY_ATTENDANCE_SUMMARY,
  MY_COMP_OFF,
  NOTIFICATIONS,
  TASKS,
  UPDATES,
  personCompOff,
} from './personnelOps'
import {
  DASHBOARD_STATS,
  DEVICE_TYPE_BREAKDOWN,
  HOME_SUMMARY,
  PAIR_STATUS_DATA,
  RECENT_ACTIVITY,
  ROLE_HOME,
  STATUS_DISTRIBUTION,
  errorTrends,
} from './dashboard'
import { CHAT_SESSIONS, INGEST_STATUS, sessionDetail } from './ai'
import {
  AUDIT_ENTRIES,
  AUDIT_STATS,
  AUTHZ_CATALOG,
  BACKUP_HISTORY,
  DOCUMENTS,
  DOWNLOAD_CATEGORIES,
  DOWNLOAD_ITEMS,
  ERROR_LOGS,
  ERROR_STATS,
  REPORT_TEMPLATES,
  ROLES,
  SEARCH_SUGGESTIONS,
  SESSIONS,
  SYSTEM_HEALTH,
  SYSTEM_INFO,
  SYSTEM_SETTINGS,
  TABLE_COUNTS,
  searchResponse,
  userAccess,
} from './misc'

/** Thrown by a route to produce a non-200 answer (still without any network). */
export class DemoHttpError extends Error {
  status: number
  detail: string
  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

type Params = Record<string, unknown>

const str = (v: unknown): string => (v == null ? '' : String(v))
const contains = (haystack: string | null | undefined, needle: string): boolean =>
  (haystack ?? '').toLowerCase().includes(needle.toLowerCase())

// ── Per-domain list filtering ──────────────────────────────

function filterDevices(p: Params) {
  let rows = DEVICES
  if (p.device_type) rows = rows.filter((d) => d.device_type === p.device_type)
  if (p.status) rows = rows.filter((d) => d.status === p.status)
  if (p.couple_id) rows = rows.filter((d) => d.couple_id === p.couple_id)
  if (p.search) rows = rows.filter((d) => contains(d.serial_number, str(p.search)))
  return rows
}

function filterAssets(p: Params) {
  let rows = ASSETS
  if (p.category_id) rows = rows.filter((a) => a.category?.id === p.category_id)
  if (p.custody_type) rows = rows.filter((a) => a.custody_type === p.custody_type)
  if (p.condition) rows = rows.filter((a) => a.condition === p.condition)
  if (p.location_id) rows = rows.filter((a) => a.custody_type === 'LOCATION' && a.custody_id === p.location_id)
  if (p.person_id) rows = rows.filter((a) => a.current_person?.id === p.person_id)
  if (p.available === true || p.available === 'true') rows = rows.filter((a) => a.is_available)
  if (p.search) {
    const q = str(p.search)
    rows = rows.filter(
      (a) => contains(a.name, q) || contains(a.asset_code, q) || contains(a.serial_number, q),
    )
  }
  return rows
}

function filterExpenses(p: Params) {
  let rows = EXPENSES
  if (p.project_id) rows = rows.filter((e) => e.project_id === p.project_id)
  return rows
}

function filterProjects(p: Params) {
  let rows = PROJECTS
  if (p.project_type) rows = rows.filter((x) => x.project_type === p.project_type)
  if (p.status) rows = rows.filter((x) => x.status === p.status)
  if (p.search) rows = rows.filter((x) => contains(x.name, str(p.search)))
  return rows
}

function filterErrors(p: Params) {
  let rows = ERROR_LOGS
  if (p.severity) rows = rows.filter((e) => e.severity === p.severity)
  if (p.resolved === true || p.resolved === 'true') rows = rows.filter((e) => e.resolved)
  if (p.resolved === false || p.resolved === 'false') rows = rows.filter((e) => !e.resolved)
  return rows
}

// ── Route table ────────────────────────────────────────────

type Handler = (m: RegExpMatchArray, p: Params) => unknown

const ROUTES: [RegExp, Handler][] = [
  // Auth & access ------------------------------------------------------------
  [/^\/auth\/me$/, () => DEMO_USER],
  [/^\/auth\/users\/basic$/, () => BASIC_USERS.map((u) => ({ id: u.id, full_name: u.full_name, username: u.username }))],
  [/^\/auth\/users\/pending$/, () => []],
  [/^\/auth\/users\/([^/]+)\/permissions$/, (m) => userAccess(m[1]!)],
  [/^\/auth\/users$/, () => BASIC_USERS],
  [/^\/authz\/catalog$/, () => AUTHZ_CATALOG],
  [/^\/authz\/roles$/, () => ROLES],
  [/^\/authz\/sessions$/, () => SESSIONS],

  // Dashboard ----------------------------------------------------------------
  [/^\/dashboard\/home$/, () => HOME_SUMMARY],
  [/^\/dashboard\/home-for-me$/, () => ROLE_HOME],
  [/^\/dashboard\/stats$/, () => DASHBOARD_STATS],
  [/^\/dashboard\/status-distribution$/, () => STATUS_DISTRIBUTION],
  [/^\/dashboard\/device-type-breakdown$/, () => DEVICE_TYPE_BREAKDOWN],
  [/^\/dashboard\/error-trends$/, (_m, p) => errorTrends(Number(p.days) || 30)],
  [/^\/dashboard\/recent-activity$/, (_m, p) => RECENT_ACTIVITY.slice(0, Number(p.limit) || 20)],
  [/^\/dashboard\/pair-status$/, () => PAIR_STATUS_DATA],

  // Devices ------------------------------------------------------------------
  [/^\/devices\/?$/, (_m, p) => paginate(filterDevices(p), p)],
  [/^\/devices\/stats$/, () => DEVICE_STATS],
  [/^\/devices\/models$/, () => DEVICE_MODELS],
  [/^\/devices\/([^/]+)\/status-history$/, (m) => DEVICE_STATUS_HISTORY[m[1]!] ?? []],
  [
    /^\/devices\/([^/]+)$/,
    (m) => DEVICES.find((d) => d.id === m[1]) ?? notFound('No such device in the demo data'),
  ],

  // Couples ------------------------------------------------------------------
  [/^\/couples\/?$/, (_m, p) => paginate(COUPLES, p)],
  [/^\/couples\/map-data$/, () => MAP_DATA],
  [
    /^\/couples\/([^/]+)\/location-history$/,
    (m, p) => paginate(LOCATION_HISTORY.filter((h) => h.couple_id === m[1]), p),
  ],
  [
    /^\/couples\/([^/]+)$/,
    (m) => COUPLES.find((c) => c.id === m[1]) ?? notFound('No such couple in the demo data'),
  ],

  // Pairs --------------------------------------------------------------------
  [/^\/pairs\/?$/, (_m, p) => paginate(PAIRS, p)],
  [/^\/pairs\/stats$/, () => PAIR_STATS],
  [
    /^\/pairs\/([^/]+)\/composition$/,
    (m) => PAIR_COMPOSITIONS[m[1]!] ?? notFound('No composition for that link in the demo data'),
  ],
  [
    /^\/pairs\/([^/]+)$/,
    (m) => PAIRS.find((x) => x.id === m[1]) ?? notFound('No such link in the demo data'),
  ],

  // Location history ---------------------------------------------------------
  [
    /^\/locations\/history\/([^/]+)$/,
    (m, p) => paginate(LOCATION_HISTORY.filter((h) => h.couple_id === m[1]), p),
  ],
  [
    /^\/locations\/history$/,
    (_m, p) => {
      let rows = LOCATION_HISTORY
      if (p.couple_id) rows = rows.filter((h) => h.couple_id === p.couple_id)
      return paginate(
        rows.map((h) => ({
          ...h,
          handler_name: h.handled_by,
          couple_name: COUPLES.find((c) => c.id === h.couple_id)?.name ?? h.couple_id,
        })),
        p,
      )
    },
  ],

  // Personnel ----------------------------------------------------------------
  [
    /^\/personnel\/?$/,
    (_m, p) => {
      let rows = PEOPLE
      if (p.search) rows = rows.filter((x) => contains(x.full_name, str(p.search)))
      return paginate(rows, p)
    },
  ],
  [/^\/personnel\/([^/]+)\/assignments$/, () => PERSON_ASSIGNMENTS],
  [
    /^\/personnel\/([^/]+)$/,
    (m) => PEOPLE.find((x) => x.id === m[1]) ?? notFound('No such person in the demo data'),
  ],

  // Attendance ---------------------------------------------------------------
  [/^\/attendance\/me$/, () => MY_ATTENDANCE],
  [/^\/attendance\/me\/summary$/, () => MY_ATTENDANCE_SUMMARY],
  [/^\/attendance\/me\/comp-off$/, () => MY_COMP_OFF],
  [/^\/attendance\/board$/, () => ATTENDANCE_BOARD],
  [/^\/attendance\/person\/([^/]+)$/, (m) => ATTENDANCE_BOARD.filter((d) => d.person_id === m[1])],
  [/^\/attendance\/comp-off\/([^/]+)\/ledger$/, (m) => (m[1] === 'demo-user' ? COMP_OFF_LEDGER : [])],
  [/^\/attendance\/comp-off\/([^/]+)$/, (m) => (m[1] === 'demo-user' ? MY_COMP_OFF : personCompOff(m[1]!))],

  // Tasks & notifications ----------------------------------------------------
  [/^\/tasks\/me$/, () => TASKS],
  [
    /^\/tasks\/notifications$/,
    (_m, p) => (p.unread_only === true || p.unread_only === 'true' ? NOTIFICATIONS.filter((n) => !n.read_at) : NOTIFICATIONS),
  ],

  // Updates & leadership -----------------------------------------------------
  [/^\/updates\/mine$/, () => UPDATES.filter((u) => u.author_id === 'demo-user')],
  [
    /^\/updates\/?$/,
    (_m, p) => {
      let rows = UPDATES
      if (p.project_id) rows = rows.filter((u) => u.project_id === p.project_id)
      if (p.person_id) rows = rows.filter((u) => u.person_id === p.person_id)
      const limit = Number(p.limit) || 0
      return limit > 0 ? rows.slice(0, limit) : rows
    },
  ],
  [/^\/leadership\/summary$/, () => LEADERSHIP_SUMMARY],

  // Finance ------------------------------------------------------------------
  [/^\/finance\/summary$/, () => EXPENSE_SUMMARY],
  [/^\/finance\/my$/, () => MY_FINANCE],
  [/^\/finance\/settlement$/, () => SETTLEMENT],
  [
    /^\/finance\/claims$/,
    (_m, p) => {
      let rows = CLAIMS
      if (p.status) rows = rows.filter((c) => c.status === p.status)
      if (p.mine === true || p.mine === 'true') rows = rows.filter((c) => c.submitted_by === 'demo-user')
      if (p.project_id) rows = rows.filter((c) => c.project_id === p.project_id)
      return rows
    },
  ],
  [
    /^\/finance\/advances$/,
    (_m, p) => {
      let rows = ADVANCES
      if (p.person_id) rows = rows.filter((a) => a.person_id === p.person_id)
      if (p.project_id) rows = rows.filter((a) => a.project_id === p.project_id)
      return rows
    },
  ],
  [/^\/finance\/balance\/([^/]+)$/, (m) => personBalance(m[1]!)],
  [/^\/finance\/export/, () => blocked('Exports are disabled in the demo')],
  [/^\/finance\/bill\.pdf/, () => blocked('Exports are disabled in the demo')],
  [/^\/finance\/?$/, (_m, p) => paginate(filterExpenses(p), p)],

  // Inventory: fixed paths before /assets/{id} -------------------------------
  [/^\/assets\/custody\/summary$/, () => CUSTODY_SUMMARY],
  [/^\/assets\/categories$/, () => ASSET_CATEGORIES],
  [/^\/assets\/locations$/, () => STOCK_LOCATIONS],
  [/^\/assets\/customers$/, () => CUSTOMERS],
  [/^\/assets\/vendors$/, () => VENDORS],
  [/^\/assets\/deployed$/, () => DEPLOYED_GROUPS],
  [/^\/assets\/reports$/, (_m, p) => (p.report_type ? ASSET_REPORTS.filter((r) => r.report_type === p.report_type) : ASSET_REPORTS)],
  [/^\/assets\/requests$/, (_m, p) => (p.status ? ITEM_REQUESTS.filter((r) => r.status === p.status) : ITEM_REQUESTS)],
  [
    /^\/assets\/handovers$/,
    (_m, p) => {
      let rows = HANDOVERS
      if (p.status) rows = rows.filter((h) => h.status === p.status)
      if (p.person_id) rows = rows.filter((h) => h.from_person_id === p.person_id || h.to_person_id === p.person_id)
      return rows
    },
  ],
  [/^\/assets\/bundles$/, () => BUNDLES],
  [/^\/assets\/repairs$/, (_m, p) => (p.status ? REPAIRS.filter((r) => r.status === p.status) : REPAIRS)],
  [
    /^\/assets\/lookup\/([^/]+)$/,
    (m) => {
      const code = decodeURIComponent(m[1]!).toLowerCase()
      const hit = ASSETS.find(
        (a) =>
          a.asset_code.toLowerCase() === code ||
          (a.serial_number ?? '').toLowerCase() === code,
      )
      return hit ?? notFound('No item matches that code in the demo data — try AST-0101 or NW-IU-24015')
    },
  ],
  [/^\/assets\/([^/]+)\/movements$/, (m) => ASSET_MOVEMENTS[m[1]!] ?? genericMovements(m[1]!)],
  [/^\/assets\/([^/]+)\/history$/, (m) => genericHistory(m[1]!)],
  [/^\/assets\/?$/, (_m, p) => paginate(filterAssets(p), p)],
  [
    /^\/assets\/([^/]+)$/,
    (m) => assetById(m[1]!) ?? notFound('No such item in the demo data'),
  ],

  // Projects: movements before /{id} -----------------------------------------
  [/^\/projects\/movements\/open$/, () => OPEN_OUTWARDS],
  [
    /^\/projects\/movements\/([^/]+)$/,
    (m) => OUTWARD_MOVEMENTS.find((x) => x.id === m[1]) ?? notFound('No such gate pass in the demo data'),
  ],
  [/^\/projects\/?$/, (_m, p) => paginate(filterProjects(p), p)],
  [/^\/projects\/([^/]+)\/timeline$/, (m, p) => paginate(PROJECT_TIMELINES[m[1]!] ?? [], p)],
  [/^\/projects\/([^/]+)\/movements$/, (m) => projectMovements(m[1]!)],
  [/^\/projects\/([^/]+)\/deployments$/, (m) => PROJECT_DEPLOYMENTS[m[1]!] ?? []],
  [/^\/projects\/([^/]+)\/phases$/, (m) => PROJECT_PHASES[m[1]!] ?? []],
  [
    /^\/projects\/([^/]+)\/archive$/,
    (m) => {
      const id = m[1]!
      const docs = DOCUMENTS.filter((d) => d.entity_type === 'project' && d.entity_id === id)
      const photos = docs.filter((d) => (d.mime_type ?? '').startsWith('image/')).length
      const updates = UPDATES.filter((u) => u.project_id === id).length
      const projectExpenses = EXPENSES.filter((e) => e.project_id === id)
      return projectArchive(
        id,
        { total: docs.length, photos },
        updates,
        { count: projectExpenses.length, spend: projectExpenses.reduce((n, e) => n + e.amount, 0) },
      )
    },
  ],
  [
    /^\/projects\/([^/]+)$/,
    (m) => PROJECTS.find((x) => x.id === m[1]) ?? notFound('No such project in the demo data'),
  ],

  // Search -------------------------------------------------------------------
  [/^\/search\/global$/, (_m, p) => searchResponse(str(p.q))],
  [/^\/search\/suggestions$/, () => SEARCH_SUGGESTIONS],

  // Reports / audit / backup / troubleshooting -------------------------------
  [/^\/reports\/templates$/, () => REPORT_TEMPLATES],
  [/^\/audit\/stats$/, () => AUDIT_STATS],
  [/^\/audit\/entity\/([^/]+)\/([^/]+)$/, (m, p) => paginate(AUDIT_ENTRIES.filter((a) => a.entity_type === m[1] && a.entity_id === m[2]), p)],
  [/^\/audit\/user\/([^/]+)$/, (m, p) => paginate(AUDIT_ENTRIES.filter((a) => a.changed_by === m[1]), p)],
  [/^\/audit\/?$/, (_m, p) => paginate(AUDIT_ENTRIES, p)],
  [/^\/backup\/pg-dump\/history$/, () => BACKUP_HISTORY],
  [/^\/backup\/table-counts$/, () => TABLE_COUNTS],
  [/^\/troubleshooting\/stats$/, () => ERROR_STATS],
  [
    /^\/troubleshooting\/by-([^/]+)\/([^/]+)$/,
    (m, p) => {
      const [, entity, id] = m
      const rows = ERROR_LOGS.filter((e) =>
        entity === 'device' ? e.device_id === id : entity === 'couple' ? e.couple_id === id : e.pair_id === id,
      )
      return paginate(rows, p)
    },
  ],
  [/^\/troubleshooting\/?$/, (_m, p) => paginate(filterErrors(p), p)],
  [
    /^\/troubleshooting\/([^/]+)$/,
    (m) => ERROR_LOGS.find((e) => e.id === m[1]) ?? notFound('No such error log in the demo data'),
  ],

  // Settings & system --------------------------------------------------------
  [/^\/settings\/system-info$/, () => SYSTEM_INFO],
  [/^\/settings\/users$/, () => USERS],
  [/^\/settings\/?$/, () => SYSTEM_SETTINGS],
  [/^\/system\/health$/, () => SYSTEM_HEALTH],

  // Downloads & documents ----------------------------------------------------
  [/^\/downloads\/categories$/, () => DOWNLOAD_CATEGORIES],
  [/^\/downloads\/versions\/([^/]+)\/download/, () => blocked('File downloads are disabled in the demo')],
  [
    /^\/downloads\/?$/,
    (_m, p) => {
      let rows = DOWNLOAD_ITEMS
      if (p.category_id) rows = rows.filter((d) => d.category?.id === p.category_id)
      if (p.search) rows = rows.filter((d) => contains(d.title, str(p.search)))
      return { items: rows, total: rows.length }
    },
  ],
  [
    /^\/documents\/by-entity\/([^/]+)\/([^/]+)$/,
    (m, p) => paginate(DOCUMENTS.filter((d) => d.entity_type === m[1] && d.entity_id === m[2]), p),
  ],
  [
    /^\/documents\/?$/,
    (_m, p) => {
      let rows = DOCUMENTS
      if (p.entity_type) rows = rows.filter((d) => d.entity_type === p.entity_type)
      if (p.entity_id) rows = rows.filter((d) => d.entity_id === p.entity_id)
      if (p.file_type) rows = rows.filter((d) => d.file_type === p.file_type)
      return paginate(rows, p)
    },
  ],

  // AI assistant -------------------------------------------------------------
  [/^\/ai\/sessions$/, () => CHAT_SESSIONS],
  [/^\/ai\/sessions\/([^/]+)$/, (m) => sessionDetail(m[1]!)],
  [/^\/ai\/ingest\/status$/, () => INGEST_STATUS],
]

function notFound(detail: string): never {
  throw new DemoHttpError(404, detail)
}

function blocked(detail: string): never {
  throw new DemoHttpError(403, detail)
}

// Known list endpoints that must fall back to a paginated envelope.
const PAGINATED_FALLBACKS = [
  /^\/devices\//,
  /^\/couples\//,
  /^\/pairs\//,
  /^\/personnel\//,
  /^\/projects\//,
  /^\/assets\//,
  /^\/documents\//,
  /^\/audit\//,
  /^\/troubleshooting\//,
  /^\/locations\//,
  /^\/finance\//,
]

/**
 * Answer a GET from the fixtures. Never touches the network: unmatched paths
 * return an empty-but-well-shaped payload instead.
 */
export function resolveDemo(config: InternalAxiosRequestConfig): unknown {
  const raw = config.url ?? ''
  // Strip any query string and the API prefix if a caller included it.
  const path = raw.replace(/^\/api\/v1/, '').split('?')[0] ?? ''
  const params: Params = (config.params as Params) ?? {}

  for (const [pattern, handler] of ROUTES) {
    const m = path.match(pattern)
    if (m) return handler(m, params)
  }

  // Sensible empties for anything not modelled.
  if (PAGINATED_FALLBACKS.some((r) => r.test(path))) {
    return { items: [], total: 0, page: 1, size: 20, pages: 0 }
  }
  const lastSegment = path.split('/').filter(Boolean).pop() ?? ''
  if (lastSegment.endsWith('s')) return []
  return {}
}
