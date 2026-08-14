/** Search, downloads, documents, troubleshooting, reports, settings, system,
 *  audit, backup and access-control fixtures. */
import type { GlobalSearchResponse, SearchSuggestion } from '@/modules/search/hooks/useSearch'
import type { DownloadCategory, DownloadItem } from '@/modules/downloads/hooks/useDownloads'
import type { DocumentItem } from '@/modules/documents/hooks/useDocuments'
import type { ErrorLog, ErrorStats } from '@/modules/troubleshooting/hooks/useTroubleshooting'
import type { ReportTemplate } from '@/modules/reports/hooks/useReports'
import type { SystemInfo, SystemSetting } from '@/modules/settings/hooks/useSettings'
import type { AuditEntry, AuditStats } from '@/modules/audit_trail/hooks/useAuditTrail'
import type { BackupInfo, TableCounts } from '@/modules/backup/hooks/useBackup'
import type { CatalogGroup, Role, Session, UserAccess } from '@/modules/access/hooks/useAccess'
import { daysAgo } from './helpers'
import { USERS } from './people'

// ── Global search ──────────────────────────────────────────

const SEARCH_RESULTS: GlobalSearchResponse['results'] = [
  {
    id: 'dev-13',
    entity_type: 'device',
    name: 'NW-OU-24024',
    description: 'Outdoor Unit · OpticSpectra 1G · Shantigram Mast',
    status: 'FAULTY',
    extra: {},
    score: 0.94,
  },
  {
    id: 'cpl-c4',
    entity_type: 'couple',
    name: 'Shantigram Mast',
    description: 'Couple on Adani HQ ↔ Shantigram · mast M-4, Ahmedabad',
    status: 'FAULTY',
    extra: {},
    score: 0.88,
  },
  {
    id: 'pair-2',
    entity_type: 'pair',
    name: 'Adani HQ ↔ Shantigram',
    description: 'Campus link · degraded, single-path',
    status: 'FAULTY',
    extra: {},
    score: 0.81,
  },
  {
    id: 'per-priya',
    entity_type: 'personnel',
    name: 'Priya Sharma',
    description: 'Field Engineer · handles the Shantigram link',
    extra: {},
    score: 0.72,
  },
  {
    id: 'err-01',
    entity_type: 'error',
    name: 'RX power below threshold — NW-OU-24024',
    description: 'HIGH · open · reported by Priya Sharma',
    status: 'OPEN',
    extra: {},
    score: 0.69,
  },
]

export const searchResponse = (query: string): GlobalSearchResponse => ({
  results: SEARCH_RESULTS,
  total: SEARCH_RESULTS.length,
  query,
  entity_counts: SEARCH_RESULTS.reduce<Record<string, number>>((acc, r) => {
    acc[r.entity_type] = (acc[r.entity_type] ?? 0) + 1
    return acc
  }, {}),
})

export const SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  { text: 'NW-OU-24024', entity_type: 'device', entity_id: 'dev-13' },
  { text: 'Shantigram Mast', entity_type: 'couple', entity_id: 'cpl-c4' },
  { text: 'GIFT City ↔ Infocity', entity_type: 'pair', entity_id: 'pair-1' },
  { text: 'Priya Sharma', entity_type: 'personnel', entity_id: 'per-priya' },
]

// ── Downloads ──────────────────────────────────────────────

export const DOWNLOAD_CATEGORIES: DownloadCategory[] = [
  { id: 'dlc-manuals', name: 'Manuals & Datasheets', sort_order: 1 },
  { id: 'dlc-software', name: 'Software', sort_order: 2 },
  { id: 'dlc-firmware', name: 'Firmware', sort_order: 3 },
]

export const DOWNLOAD_ITEMS: DownloadItem[] = [
  {
    id: 'dl-01',
    title: 'OpticSpectra Alignment Guide v3',
    description: 'Field procedure for coarse and fine alignment, including GyroMount setups.',
    category: DOWNLOAD_CATEGORIES[0]!,
    item_type: 'FILE',
    visibility: 'PUBLIC',
    tags: null,
    uploaded_by: 'usr-kavita',
    created_at: daysAgo(30, 14, 0),
    versions: [
      {
        id: 'dlv-01',
        version_label: 'v3.0',
        original_filename: 'opticspectra-alignment-guide-v3.pdf',
        file_size: 4_412_000,
        mime_type: 'application/pdf',
        release_notes: null,
        uploaded_by: 'usr-kavita',
        download_count: 17,
        created_at: daysAgo(30, 14, 0),
      },
    ],
    allowed_user_ids: [],
  },
  {
    id: 'dl-02',
    title: 'NavLink Commissioning Tool',
    description: 'Windows utility for link bring-up: power readings, BER counters, config export.',
    category: DOWNLOAD_CATEGORIES[1]!,
    item_type: 'SOFTWARE',
    visibility: 'PUBLIC',
    tags: null,
    uploaded_by: 'demo-user',
    created_at: daysAgo(48, 11, 0),
    versions: [
      {
        id: 'dlv-02',
        version_label: 'v2.4.1',
        original_filename: 'navlink-commissioning-2.4.1.zip',
        file_size: 38_215_000,
        mime_type: 'application/zip',
        release_notes: 'Adds RF-5800 failover statistics tab; fixes the export crash on Hindi locales.',
        uploaded_by: 'demo-user',
        download_count: 9,
        created_at: daysAgo(6, 16, 30),
      },
      {
        id: 'dlv-03',
        version_label: 'v2.3.0',
        original_filename: 'navlink-commissioning-2.3.0.zip',
        file_size: 36_804_000,
        mime_type: 'application/zip',
        release_notes: null,
        uploaded_by: 'demo-user',
        download_count: 22,
        created_at: daysAgo(48, 11, 0),
      },
    ],
    allowed_user_ids: [],
  },
  {
    id: 'dl-03',
    title: 'RF-5800 Datasheet',
    description: null,
    category: DOWNLOAD_CATEGORIES[0]!,
    item_type: 'FILE',
    visibility: 'PUBLIC',
    tags: null,
    uploaded_by: 'usr-neha',
    created_at: daysAgo(40, 10, 0),
    versions: [
      {
        id: 'dlv-04',
        version_label: null,
        original_filename: 'rf-5800-datasheet.pdf',
        file_size: 1_284_000,
        mime_type: 'application/pdf',
        release_notes: null,
        uploaded_by: 'usr-neha',
        download_count: 11,
        created_at: daysAgo(40, 10, 0),
      },
    ],
    allowed_user_ids: [],
  },
]

// ── Documents ──────────────────────────────────────────────

export const DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-01',
    filename: 'shantigram-alignment-report.pdf',
    original_filename: 'shantigram-alignment-report.pdf',
    file_type: 'pdf',
    mime_type: 'application/pdf',
    file_size: 2_140_000,
    storage_path: 'demo/doc-01',
    entity_type: 'project',
    entity_id: 'prj-adani',
    uploaded_by: 'usr-kavita',
    description: 'Commissioning alignment report — Adani HQ ↔ Shantigram.',
    created_at: daysAgo(25, 15, 10),
    download_url: null,
  },
  {
    id: 'doc-02',
    filename: 'mast-m4-installation.jpg',
    original_filename: 'mast-m4-installation.jpg',
    file_type: 'image',
    mime_type: 'image/jpeg',
    file_size: 3_860_000,
    storage_path: 'demo/doc-02',
    entity_type: 'project',
    entity_id: 'prj-adani',
    uploaded_by: 'usr-kavita',
    description: 'OU mounted on mast M-4, Shantigram.',
    created_at: daysAgo(26, 17, 40),
    download_url: null,
  },
  {
    id: 'doc-03',
    filename: 'gift-poc-link-budget.xlsx',
    original_filename: 'gift-poc-link-budget.xlsx',
    file_type: 'spreadsheet',
    mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    file_size: 96_000,
    storage_path: 'demo/doc-03',
    entity_type: 'project',
    entity_id: 'prj-gift',
    uploaded_by: 'demo-user',
    description: '1.4 km hop link budget with monsoon fade margins.',
    created_at: daysAgo(19, 12, 20),
    download_url: null,
  },
  {
    id: 'doc-04',
    filename: 'vadodara-handover-certificate.pdf',
    original_filename: 'vadodara-handover-certificate.pdf',
    file_type: 'pdf',
    mime_type: 'application/pdf',
    file_size: 412_000,
    storage_path: 'demo/doc-04',
    entity_type: 'project',
    entity_id: 'prj-vad',
    uploaded_by: 'usr-kavita',
    description: 'Signed acceptance from the school board.',
    created_at: daysAgo(21, 13, 0),
    download_url: null,
  },
]

// ── Troubleshooting ────────────────────────────────────────

export const ERROR_LOGS: ErrorLog[] = [
  {
    id: 'err-01',
    device_id: 'dev-13',
    couple_id: 'cpl-c4',
    pair_id: 'pair-2',
    error_type: 'Optical power loss',
    severity: 'HIGH',
    severity_color: '#F44336',
    description:
      'RX power at Shantigram Mast dropped from −14 dBm to −28 dBm overnight after the pre-monsoon storm. Link holding but with no margin.',
    reported_by: 'usr-kavita',
    reported_by_name: 'Priya Sharma',
    reported_at: daysAgo(5, 16, 40),
    resolved: false,
    resolved_at: null,
    resolved_by: null,
    resolved_by_name: null,
    steps: [
      {
        id: 'ts-01',
        error_id: 'err-01',
        step_number: 1,
        step_description: 'Cleaned both lenses and re-checked alignment from the mast side.',
        action_taken: 'Lens clean + fine re-aim with the telescope kit.',
        resolution: 'RX improved to −24 dBm — still 10 dB below commissioning. Not an alignment issue.',
        performed_by: 'per-priya',
        performed_by_name: 'Priya Sharma',
        performed_at: daysAgo(4, 12, 30),
        custom_fields: null,
      },
      {
        id: 'ts-02',
        error_id: 'err-01',
        step_number: 2,
        step_description: 'Inspected the OU housing for storm damage.',
        action_taken: 'Found moisture ingress at the lens seal. OU marked FAULTY; swap unit reserved.',
        resolution: null,
        performed_by: 'per-priya',
        performed_by_name: 'Priya Sharma',
        performed_at: daysAgo(4, 15, 10),
        custom_fields: null,
      },
    ],
    custom_fields: null,
    created_at: daysAgo(5, 16, 40),
  },
  {
    id: 'err-02',
    device_id: null,
    couple_id: 'cpl-c2',
    pair_id: 'pair-1',
    error_type: 'Intermittent link flaps',
    severity: 'MEDIUM',
    severity_color: '#FF9800',
    description:
      'Short link drops (2–5 s) every afternoon between 1 pm and 4 pm on the GIFT City hop — pattern matched heat haze over the Infocity car park.',
    reported_by: 'demo-user',
    reported_by_name: 'Arjun Mehta',
    reported_at: daysAgo(17, 15, 20),
    resolved: true,
    resolved_at: daysAgo(12, 17, 45),
    resolved_by: 'demo-user',
    resolved_by_name: 'Arjun Mehta',
    steps: [
      {
        id: 'ts-03',
        error_id: 'err-02',
        step_number: 1,
        step_description: 'Logged BER against time of day for three days to confirm the thermal pattern.',
        action_taken: 'Continuous monitoring with the commissioning tool.',
        resolution: 'Flaps correlate with 1–4 pm surface heating. Beam path crosses the asphalt car park.',
        performed_by: 'per-arjun',
        performed_by_name: 'Arjun Mehta',
        performed_at: daysAgo(14, 16, 0),
        custom_fields: null,
      },
      {
        id: 'ts-04',
        error_id: 'err-02',
        step_number: 2,
        step_description: 'Raised the Infocity head 1.2 m and re-aimed to lift the beam off the hot layer.',
        action_taken: 'Re-mounted on the Tower-2 terrace parapet extension.',
        resolution: 'Six clean days since — closed.',
        performed_by: 'per-arjun',
        performed_by_name: 'Arjun Mehta',
        performed_at: daysAgo(12, 17, 45),
        custom_fields: null,
      },
    ],
    custom_fields: null,
    created_at: daysAgo(17, 15, 20),
  },
]

export const ERROR_STATS: ErrorStats = {
  total: ERROR_LOGS.length,
  open: ERROR_LOGS.filter((e) => !e.resolved).length,
  resolved: ERROR_LOGS.filter((e) => e.resolved).length,
  by_severity: { HIGH: 1, MEDIUM: 1 },
  by_type: { 'Optical power loss': 1, 'Intermittent link flaps': 1 },
}

// ── Reports ────────────────────────────────────────────────

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'device_inventory',
    name: 'Device Inventory',
    description: 'Every device with model, serial, status and current couple.',
    parameters: ['date_from', 'date_to'],
  },
  {
    id: 'link_health',
    name: 'Link Health',
    description: 'Pair-by-pair status with open errors and composition gaps.',
    parameters: ['date_from', 'date_to', 'include_charts'],
  },
  {
    id: 'project_summary',
    name: 'Project Summary',
    description: 'Phases, team, equipment movements and spend for selected projects.',
    parameters: ['entity_ids', 'date_from', 'date_to'],
  },
  {
    id: 'expense_report',
    name: 'Expense Report',
    description: 'Expenses by project and category, with claim status.',
    parameters: ['date_from', 'date_to'],
  },
]

// ── Settings & system ──────────────────────────────────────

export const SYSTEM_SETTINGS: SystemSetting[] = [
  {
    key: 'company_name',
    value: 'Nav Wireless Technologies Pvt Ltd',
    description: 'Shown on reports and gate passes.',
    updated_at: daysAgo(50),
  },
  {
    key: 'default_currency',
    value: 'INR',
    description: 'Currency for expenses and estimates.',
    updated_at: daysAgo(50),
  },
  {
    key: 'gate_pass_footer',
    value: 'Material to be returned to HQ Store, Prahlad Nagar, Ahmedabad unless marked otherwise.',
    description: 'Printed at the bottom of every outward gate pass.',
    updated_at: daysAgo(22),
  },
]

export const SYSTEM_INFO: SystemInfo = {
  version: '2.4.0 (demo)',
  database_size: '182 MB',
  table_count: 42,
  total_devices: 14,
  total_couples: 4,
  total_pairs: 2,
  total_documents: 4,
  total_users: USERS.length,
  total_audit_entries: 128,
  total_embeddings: 1240,
  ollama_status: 'available',
  ollama_url: 'http://ollama:11434',
  ollama_models: ['qwen3:8b', 'nomic-embed-text'],
  environment: 'demo',
}

export const SYSTEM_HEALTH = {
  status: 'OK' as const,
  headline: 'Everything looks healthy',
  checked_at: daysAgo(0, 8, 55),
  failing: 0,
  warning: 1,
  passing: 5,
  checks: [
    {
      name: 'Database',
      status: 'OK' as const,
      summary: 'PostgreSQL answering in 4 ms',
      detail: null,
      why: null,
      action: null,
      value: '4 ms',
    },
    {
      name: 'Disk space',
      status: 'OK' as const,
      summary: '38 GB free of 100 GB',
      detail: null,
      why: null,
      action: null,
      value: '62% used',
    },
    {
      name: 'Backups',
      status: 'WARN' as const,
      summary: 'Last backup ran 2 days ago',
      detail: 'The nightly pg_dump has not run since the weekend.',
      why: 'A restore can only recover data up to the last successful backup.',
      action: 'Check the backup cron on the server, or trigger one from Backup & Export.',
      value: '2 days',
    },
    {
      name: 'AI assistant (Ollama)',
      status: 'OK' as const,
      summary: 'qwen3:8b loaded and responding',
      detail: null,
      why: null,
      action: null,
      value: null,
    },
    {
      name: 'Document storage',
      status: 'OK' as const,
      summary: 'Uploads volume writable',
      detail: null,
      why: null,
      action: null,
      value: null,
    },
    {
      name: 'Background jobs',
      status: 'OK' as const,
      summary: 'Notification queue empty',
      detail: null,
      why: null,
      action: null,
      value: null,
    },
  ],
  environment: { mode: 'demo', region: 'ap-south-1' },
}

// ── Audit trail ────────────────────────────────────────────

export const AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: 'aud-01',
    action: 'UPDATE',
    entity_type: 'device',
    entity_id: 'dev-13',
    changed_by: 'usr-kavita',
    old_values: { status: 'WORKING' },
    new_values: { status: 'FAULTY' },
    timestamp: daysAgo(5, 16, 40),
    user_name: 'Kavita Iyer',
    description: 'Device NW-OU-24024 status changed WORKING → FAULTY',
  },
  {
    id: 'aud-02',
    action: 'CREATE',
    entity_type: 'handover',
    entity_id: 'ho-01',
    changed_by: 'demo-user',
    old_values: null,
    new_values: { to: 'Priya Sharma', items: 2 },
    timestamp: daysAgo(1, 17, 50),
    user_name: 'Demo Visitor',
    description: 'Handover created: Arjun Mehta → Priya Sharma',
  },
  {
    id: 'aud-03',
    action: 'CREATE',
    entity_type: 'movement',
    entity_id: 'gp2f7a91c4',
    changed_by: 'demo-user',
    old_values: null,
    new_values: { purpose: 'TESTING', items: 5 },
    timestamp: daysAgo(8, 8, 30),
    user_name: 'Demo Visitor',
    description: 'Outward gate pass GP2F7A91 issued to GIFT City Backbone POC',
  },
  {
    id: 'aud-04',
    action: 'UPDATE',
    entity_type: 'claim',
    entity_id: 'clm-02',
    changed_by: 'usr-neha',
    old_values: { status: 'SUBMITTED' },
    new_values: { status: 'PAID' },
    timestamp: daysAgo(4, 15, 30),
    user_name: 'Neha Joshi',
    description: 'Claim “GIFT POC week-one travel” settled',
  },
  {
    id: 'aud-05',
    action: 'UPDATE',
    entity_type: 'couple',
    entity_id: 'cpl-c2',
    changed_by: 'usr-kavita',
    old_values: { latitude: 23.2129, longitude: 72.6404 },
    new_values: { latitude: 23.2156, longitude: 72.6369 },
    timestamp: daysAgo(18, 11, 35),
    user_name: 'Kavita Iyer',
    description: 'Infocity Rooftop location updated (452 m)',
  },
  {
    id: 'aud-06',
    action: 'CREATE',
    entity_type: 'project',
    entity_id: 'prj-surat',
    changed_by: 'usr-kavita',
    old_values: null,
    new_values: { name: 'Surat Diamond Bourse Link' },
    timestamp: daysAgo(11, 12, 10),
    user_name: 'Kavita Iyer',
    description: 'Project created: Surat Diamond Bourse Link',
  },
]

export const AUDIT_STATS: AuditStats = {
  total_entries: 128,
  by_action: { CREATE: 54, UPDATE: 61, DELETE: 13 },
  by_entity_type: { device: 31, asset: 42, project: 18, couple: 14, expense: 15, user: 8 },
  most_active_users: [
    { user_id: 'usr-kavita', name: 'Kavita Iyer', count: 52 },
    { user_id: 'usr-neha', name: 'Neha Joshi', count: 44 },
    { user_id: 'demo-user', name: 'Demo Visitor', count: 32 },
  ],
}

// ── Backup ─────────────────────────────────────────────────

export const BACKUP_HISTORY: BackupInfo[] = [
  {
    filename: 'navdash_demo_full.dump',
    size: 48_500_000,
    created_at: daysAgo(2, 2, 30),
    backup_type: 'pg_dump',
  },
  {
    filename: 'navdash_demo_weekly.dump',
    size: 47_100_000,
    created_at: daysAgo(9, 2, 30),
    backup_type: 'pg_dump',
  },
]

export const TABLE_COUNTS: TableCounts = {
  devices: 14,
  couples: 4,
  pairs: 2,
  assets: 24,
  asset_movements: 38,
  projects: 4,
  personnel: 6,
  expenses: 8,
  claims: 2,
  error_logs: 2,
  documents: 4,
  users: 3,
  audit_log: 128,
}

// ── Access control ─────────────────────────────────────────

export const AUTHZ_CATALOG: CatalogGroup[] = [
  {
    key: 'devices',
    label: 'Devices & Links',
    description: 'Devices, couples, pairs and the map.',
    permissions: [
      { key: 'devices.read', label: 'View devices', description: 'See devices, couples, pairs and the map.', dangerous: false },
      { key: 'devices.update', label: 'Edit devices', description: 'Change status, models and assignments.', dangerous: false },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    description: 'Assets, custody, gate passes and repairs.',
    permissions: [
      { key: 'inventory.read', label: 'View inventory', description: 'See assets and where they are.', dangerous: false },
      { key: 'inventory.move', label: 'Move items', description: 'Issue, return and hand over items.', dangerous: false },
      { key: 'inventory.manage', label: 'Manage inventory', description: 'Categories, vendors, kits and write-offs.', dangerous: true },
    ],
  },
  {
    key: 'projects',
    label: 'Projects',
    description: 'Projects, phases and deployments.',
    permissions: [
      { key: 'projects.read', label: 'View projects', description: 'See projects and their timelines.', dangerous: false },
      { key: 'projects.update', label: 'Run projects', description: 'Phases, members, deployments and movements.', dangerous: false },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    description: 'Expenses, claims, advances and settlement.',
    permissions: [
      { key: 'finance.read', label: 'View finance', description: 'See expenses and claims.', dangerous: false },
      { key: 'finance.settle', label: 'Settle claims', description: 'Pay and reject claims; log advances.', dangerous: true },
    ],
  },
  {
    key: 'admin',
    label: 'Administration',
    description: 'Users, roles, backups and settings.',
    permissions: [
      { key: 'admin.users', label: 'Manage users', description: 'Approve accounts and assign roles.', dangerous: true },
      { key: 'admin.system', label: 'System settings', description: 'Backups, settings and health.', dangerous: true },
    ],
  },
]

const ALL_PERMISSION_KEYS = AUTHZ_CATALOG.flatMap((g) => g.permissions.map((p) => p.key))

export const ROLES: Role[] = [
  {
    id: 'role-admin',
    name: 'Administrator',
    description: 'Everything, including the dangerous parts.',
    is_system: true,
    permissions: ALL_PERMISSION_KEYS,
    user_count: 1,
  },
  {
    id: 'role-field',
    name: 'Field Engineer',
    description: 'Day-to-day field work: devices, inventory moves, project updates.',
    is_system: false,
    permissions: ['devices.read', 'devices.update', 'inventory.read', 'inventory.move', 'projects.read', 'projects.update', 'finance.read'],
    user_count: 2,
  },
]

export const SESSIONS: Session[] = [
  {
    id: 'ses-01',
    user_id: 'demo-user',
    user_name: 'Demo Visitor',
    auth_provider: 'demo',
    ip_address: '203.0.113.42',
    user_agent: 'This browser — the demo session',
    created_at: daysAgo(0, 9, 5),
    expires_at: daysAgo(-1, 9, 5),
    last_seen_at: daysAgo(0, 9, 30),
    revoked_at: null,
    is_active: true,
  },
  {
    id: 'ses-02',
    user_id: 'usr-kavita',
    user_name: 'Kavita Iyer',
    auth_provider: 'clerk',
    ip_address: '49.36.81.117',
    user_agent: 'Chrome on Android',
    created_at: daysAgo(0, 8, 41),
    expires_at: daysAgo(-1, 8, 41),
    last_seen_at: daysAgo(0, 10, 2),
    revoked_at: null,
    is_active: true,
  },
]

/**
 * /auth/users/{id}/permissions is read by two screens with different
 * expectations (UserAccess on the access page, {permissions} map on the legacy
 * settings page) — serve a merged object so both render.
 */
export const userAccess = (userId: string): UserAccess & { permissions: Record<string, string> } => {
  const u = USERS.find((x) => x.id === userId) ?? USERS[0]!
  const isAdmin = u.role === 'ADMIN'
  const role = isAdmin ? ROLES[0]! : ROLES[1]!
  return {
    user_id: u.id,
    full_name: u.full_name,
    email: u.email,
    legacy_role: u.role,
    is_legacy_admin: isAdmin,
    role_ids: [role.id],
    roles: [role],
    overrides: [],
    effective: role.permissions,
    permissions: {},
  }
}
