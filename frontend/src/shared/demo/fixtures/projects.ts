/** Projects, phases, timelines, deployments and per-project equipment movements. */
import type {
  Deployment,
  Movement,
  Project,
  ProjectPhase,
  TimelineEntry,
} from '@/modules/projects/hooks/useProjects'
import { daysAgo, dateOnly } from './helpers'
import { OUTWARD_MOVEMENTS } from './inventory'

export const PROJECTS: Project[] = [
  {
    id: 'prj-surat',
    name: 'Surat Diamond Bourse Link',
    project_type: 'INSTALLATION',
    status: 'UPCOMING',
    customer_name: 'Surat Diamond Bourse',
    site_location: 'SDB campus, Khajod, Surat',
    start_date: dateOnly(-14),
    end_date: null,
    description:
      'Two OpticSpectra 1G hops connecting the trading tower to the annexe data room. Survey booked; install crew mobilises mid-month.',
    created_by: 'usr-kavita',
    created_at: daysAgo(11, 12, 10),
    members: [
      {
        id: 'pm-surat-1',
        person: { id: 'per-kavita', full_name: 'Kavita Iyer', role: 'Project Manager' },
        role_in_project: 'Project Manager',
        joined_at: daysAgo(11, 12, 10),
        left_at: null,
      },
    ],
  },
  {
    id: 'prj-adani',
    name: 'Adani Shantigram Campus Link',
    project_type: 'INSTALLATION',
    status: 'ACTIVE',
    customer_name: 'Adani Realty',
    site_location: 'Shantigram township, SG Highway, Ahmedabad',
    start_date: dateOnly(45),
    end_date: null,
    description:
      'Campus backbone: Adani HQ terrace to the Shantigram comms mast. Link is up but degraded — the mast-side OU is faulty and a swap is scheduled.',
    created_by: 'usr-kavita',
    created_at: daysAgo(45, 9, 30),
    members: [
      {
        id: 'pm-adani-1',
        person: { id: 'per-kavita', full_name: 'Kavita Iyer', role: 'Project Manager' },
        role_in_project: 'Project Manager',
        joined_at: daysAgo(45, 9, 30),
        left_at: null,
      },
      {
        id: 'pm-adani-2',
        person: { id: 'per-priya', full_name: 'Priya Sharma', role: 'Field Engineer' },
        role_in_project: 'Lead Engineer',
        joined_at: daysAgo(45, 9, 30),
        left_at: null,
      },
      {
        id: 'pm-adani-3',
        person: { id: 'per-suresh', full_name: 'Suresh Rathod', role: 'Rigger' },
        role_in_project: 'Rigger',
        joined_at: daysAgo(43, 8, 0),
        left_at: null,
      },
    ],
  },
  {
    id: 'prj-gift',
    name: 'GIFT City Backbone POC',
    project_type: 'POC',
    status: 'ACTIVE',
    customer_name: 'GIFT City Ltd',
    site_location: 'GIFT City ↔ Infocity, Gandhinagar',
    start_date: dateOnly(20),
    end_date: null,
    description:
      '10G FSO hop between GIFT One Tower and Infocity Tower-2. Seven-day soak test running; customer evaluating against a leased fibre quote.',
    created_by: 'usr-kavita',
    created_at: daysAgo(20, 10, 0),
    members: [
      {
        id: 'pm-gift-1',
        person: { id: 'per-arjun', full_name: 'Arjun Mehta', role: 'Field Engineer' },
        role_in_project: 'Lead Engineer',
        joined_at: daysAgo(20, 10, 0),
        left_at: null,
      },
      {
        id: 'pm-gift-2',
        person: { id: 'per-rohit', full_name: 'Rohit Deshmukh', role: 'Rigger' },
        role_in_project: 'Rigger',
        joined_at: daysAgo(20, 10, 0),
        left_at: null,
      },
    ],
  },
  {
    id: 'prj-vad',
    name: 'Vadodara Smart School Pilot',
    project_type: 'DEMO',
    status: 'COMPLETED',
    customer_name: 'Vadodara Municipal School Board',
    site_location: 'Sayajigunj, Vadodara',
    start_date: dateOnly(58),
    end_date: dateOnly(21),
    description:
      'LiFi classroom demo across two municipal school buildings. Handed over with sign-off; equipment recovered to stock.',
    created_by: 'usr-kavita',
    created_at: daysAgo(58, 11, 0),
    members: [
      {
        id: 'pm-vad-1',
        person: { id: 'per-priya', full_name: 'Priya Sharma', role: 'Field Engineer' },
        role_in_project: 'Lead Engineer',
        joined_at: daysAgo(58, 11, 0),
        left_at: daysAgo(21, 17, 0),
      },
    ],
  },
]

export const projectById = (id: string): Project | undefined => PROJECTS.find((p) => p.id === id)

// ── Phases ─────────────────────────────────────────────────

export const PROJECT_PHASES: Record<string, ProjectPhase[]> = {
  'prj-adani': [
    {
      id: 'ph-adani-1',
      project_id: 'prj-adani',
      phase_type: 'DESKTOP_SURVEY',
      status: 'COMPLETED',
      started_at: daysAgo(45, 10, 0),
      ended_at: daysAgo(42, 17, 0),
      lead_person_id: 'per-kavita',
      note: 'LOS confirmed on GIS; 1.9 km hop, no obstructions.',
      created_at: daysAgo(45, 10, 0),
    },
    {
      id: 'ph-adani-2',
      project_id: 'prj-adani',
      phase_type: 'PHYSICAL_SURVEY',
      status: 'COMPLETED',
      started_at: daysAgo(41, 9, 0),
      ended_at: daysAgo(39, 16, 30),
      lead_person_id: 'per-priya',
      note: 'Mast M-4 selected over M-2 for the cleaner Fresnel zone.',
      created_at: daysAgo(41, 9, 0),
    },
    {
      id: 'ph-adani-3',
      project_id: 'prj-adani',
      phase_type: 'INSTALLATION',
      status: 'COMPLETED',
      started_at: daysAgo(34, 8, 0),
      ended_at: daysAgo(26, 18, 0),
      lead_person_id: 'per-suresh',
      note: 'Both heads mounted; hybrid runs terminated and tested.',
      created_at: daysAgo(34, 8, 0),
    },
    {
      id: 'ph-adani-4',
      project_id: 'prj-adani',
      phase_type: 'MAINTENANCE',
      status: 'ACTIVE',
      started_at: daysAgo(5, 9, 0),
      ended_at: null,
      lead_person_id: 'per-priya',
      note: 'OU swap for the mast side pending — spare NW-OU-24028 is with Priya.',
      created_at: daysAgo(5, 9, 0),
    },
  ],
  'prj-gift': [
    {
      id: 'ph-gift-1',
      project_id: 'prj-gift',
      phase_type: 'DESKTOP_SURVEY',
      status: 'COMPLETED',
      started_at: daysAgo(20, 10, 0),
      ended_at: daysAgo(19, 15, 0),
      lead_person_id: 'per-arjun',
      note: null,
      created_at: daysAgo(20, 10, 0),
    },
    {
      id: 'ph-gift-2',
      project_id: 'prj-gift',
      phase_type: 'INSTALLATION',
      status: 'COMPLETED',
      started_at: daysAgo(16, 8, 30),
      ended_at: daysAgo(12, 17, 0),
      lead_person_id: 'per-rohit',
      note: 'Roof permits cleared same day — GIFT City facilities were quick.',
      created_at: daysAgo(16, 8, 30),
    },
    {
      id: 'ph-gift-3',
      project_id: 'prj-gift',
      phase_type: 'OTHER',
      status: 'ACTIVE',
      started_at: daysAgo(8, 9, 0),
      ended_at: null,
      lead_person_id: 'per-arjun',
      note: 'Seven-day soak test — customer wants the error counters at the review.',
      created_at: daysAgo(8, 9, 0),
    },
  ],
  'prj-vad': [
    {
      id: 'ph-vad-1',
      project_id: 'prj-vad',
      phase_type: 'INSTALLATION',
      status: 'COMPLETED',
      started_at: daysAgo(56, 9, 0),
      ended_at: daysAgo(50, 17, 0),
      lead_person_id: 'per-priya',
      note: null,
      created_at: daysAgo(56, 9, 0),
    },
  ],
  'prj-surat': [],
}

// ── Timelines ──────────────────────────────────────────────

const entry = (
  id: string,
  type: string,
  title: string,
  body: string | null,
  days: number,
  hour = 11,
): TimelineEntry => ({
  id,
  entry_type: type,
  title,
  body,
  entry_date: daysAgo(days, hour),
  created_by: 'usr-kavita',
  created_at: daysAgo(days, hour),
})

export const PROJECT_TIMELINES: Record<string, TimelineEntry[]> = {
  'prj-adani': [
    entry(
      'tl-adani-6',
      'ISSUE',
      'Mast-side OU flagged faulty',
      'RX power at −28 dBm after the storm. Repair visit scheduled; spare OU reserved.',
      5,
      17,
    ),
    entry(
      'tl-adani-5',
      'VISIT',
      'Post-storm site inspection',
      'Suresh checked the mast fixings — no mechanical damage, surge protector recommended.',
      6,
      10,
    ),
    entry(
      'tl-adani-4',
      'STATUS_CHANGE',
      'Link commissioned',
      'End-to-end traffic passing at 940 Mbps sustained.',
      26,
      16,
    ),
    entry(
      'tl-adani-3',
      'EQUIPMENT',
      'Outward: consumables to site store',
      'Patch cords and clamp sets issued on gate pass GP8B3D52.',
      30,
      9,
    ),
    entry(
      'tl-adani-2',
      'CALL',
      'Weekly review with Adani Realty',
      'Meera Shah confirmed the annexe extension is in next quarter’s budget.',
      33,
      15,
    ),
    entry('tl-adani-1', 'NOTE', 'Kick-off', 'Scope agreed: HQ terrace to mast M-4, single 1G link.', 45, 9),
  ],
  'prj-gift': [
    entry(
      'tl-gift-4',
      'NOTE',
      'Soak test — day 6 clean',
      'Zero uncorrected errors in the last 48 h. Heat-haze flaps from last week not seen since the re-aim.',
      1,
      18,
    ),
    entry(
      'tl-gift-3',
      'EQUIPMENT',
      'Outward: soak-test rig',
      'Spare 10G heads and test leads out on gate pass GP2F7A91.',
      8,
      8,
    ),
    entry(
      'tl-gift-2',
      'STATUS_CHANGE',
      'Link up',
      'First light across the 1.4 km hop; alignment locked with the GyroMount.',
      12,
      17,
    ),
    entry('tl-gift-1', 'VISIT', 'Physical survey with customer', 'Hardik Trivedi joined the rooftop walk-through.', 19, 11),
  ],
  'prj-vad': [
    entry('tl-vad-2', 'DOCUMENT', 'Handover certificate signed', 'Pilot accepted by the school board.', 21, 12),
    entry('tl-vad-1', 'NOTE', 'Demo day', 'Two classrooms streamed 4K over LiFi for the board members.', 35, 14),
  ],
  'prj-surat': [
    entry(
      'tl-surat-1',
      'CALL',
      'Site readiness call with SDB',
      'Power for the annexe data room still pending — generator to be rented locally if it slips.',
      3,
      12,
    ),
  ],
}

// ── Deployments ────────────────────────────────────────────

export const PROJECT_DEPLOYMENTS: Record<string, Deployment[]> = {
  'prj-adani': [
    {
      id: 'dep-adani-1',
      project_id: 'prj-adani',
      entity_type: 'pair',
      entity_id: 'pair-2',
      label: 'Adani HQ ↔ Shantigram',
      sub: '2 couples · 6 devices',
      deployed_at: daysAgo(28, 12, 0),
      removed_at: null,
      note: 'Campus backbone link.',
    },
  ],
  'prj-gift': [
    {
      id: 'dep-gift-1',
      project_id: 'prj-gift',
      entity_type: 'pair',
      entity_id: 'pair-1',
      label: 'GIFT City ↔ Infocity',
      sub: '2 couples · 8 devices',
      deployed_at: daysAgo(12, 17, 30),
      removed_at: null,
      note: '10G POC link under soak test.',
    },
  ],
  'prj-vad': [],
  'prj-surat': [],
}

// ── Equipment movements (project detail tab shape) ─────────

const toMovement = (m: (typeof OUTWARD_MOVEMENTS)[number]): Movement => ({
  id: m.id,
  direction: m.direction,
  movement_date: m.movement_date,
  handler: m.handler,
  received_by_name: m.received_by_name,
  notes: m.notes,
  created_at: m.created_at,
  items: m.items.map((i) => ({
    id: i.id,
    asset: {
      id: i.asset?.id ?? '',
      asset_code: i.asset?.asset_code ?? '',
      name: i.asset?.name ?? '',
    },
    quantity: i.quantity,
    condition_note: i.condition_note,
    item_status: (i.item_status === 'RETURNED' ||
    i.item_status === 'WITH_CLIENT' ||
    i.item_status === 'DAMAGED' ||
    i.item_status === 'LOST'
      ? i.item_status
      : 'WITH_CLIENT') as 'RETURNED' | 'WITH_CLIENT' | 'DAMAGED' | 'LOST',
  })),
})

export const projectMovements = (projectId: string): Movement[] =>
  OUTWARD_MOVEMENTS.filter((m) => m.project_id === projectId).map(toMovement)

// ── Archive (closed-project summary) — computed per project ──

export interface ProjectArchive {
  documents_total: number
  photos: number
  other_files: number
  team_members: number
  phases: number
  timeline_entries: number
  updates: number
  equipment_movements: number
  still_out: number
  deployments: number
  issues: number
  expenses: number
  spend: number
}

export function projectArchive(
  projectId: string,
  docCounts: { total: number; photos: number },
  updates: number,
  expenses: { count: number; spend: number },
): ProjectArchive {
  const movements = OUTWARD_MOVEMENTS.filter((m) => m.project_id === projectId)
  const stillOut = movements.reduce(
    (n, m) => n + m.items.filter((i) => !i.resolved_at).length,
    0,
  )
  return {
    documents_total: docCounts.total,
    photos: docCounts.photos,
    other_files: docCounts.total - docCounts.photos,
    team_members: projectById(projectId)?.members.length ?? 0,
    phases: (PROJECT_PHASES[projectId] ?? []).length,
    timeline_entries: (PROJECT_TIMELINES[projectId] ?? []).length,
    updates,
    equipment_movements: movements.length,
    still_out: stillOut,
    deployments: (PROJECT_DEPLOYMENTS[projectId] ?? []).length,
    issues: projectId === 'prj-adani' ? 1 : 0,
    expenses: expenses.count,
    spend: expenses.spend,
  }
}
