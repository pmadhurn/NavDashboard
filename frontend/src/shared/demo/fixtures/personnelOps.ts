/** Attendance, daily updates, the leadership summary, tasks and notifications. */
import type {
  AttendanceDay,
  AttendanceSummary,
  CompOffBalance,
  CompOffEntry,
  DayType,
} from '@/modules/attendance/hooks/useAttendance'
import type { DailyUpdate } from '@/modules/updates/hooks/useUpdates'
import type { LeadershipSummary } from '@/modules/updates/hooks/useUpdates'
import type { Notification, Task } from '@/modules/tasks/hooks/useTasks'
import { countBy, dateOnly, daysAgo } from './helpers'
import { FINANCE_ROLLUP } from './finance'
import { DEVICE_STATS } from './devices'

// ── My attendance (the demo visitor's month) ───────────────

const isWeekend = (daysBack: number): boolean => {
  const d = new Date(Date.now() - daysBack * 86_400_000)
  return d.getDay() === 0 || d.getDay() === 6
}

interface DaySeed {
  type: DayType
  projectId?: string
  projectName?: string
  note?: string
}

// Cycled over weekdays, newest first — a believable field-heavy fortnight.
const MY_PATTERN: DaySeed[] = [
  { type: 'IN_OFFICE', note: 'Soak-test report writing.' },
  { type: 'ON_FIELD', projectId: 'prj-gift', projectName: 'GIFT City Backbone POC' },
  { type: 'ON_FIELD', projectId: 'prj-adani', projectName: 'Adani Shantigram Campus Link' },
  { type: 'IN_OFFICE' },
  { type: 'ON_FIELD', projectId: 'prj-gift', projectName: 'GIFT City Backbone POC' },
  { type: 'COMP_OFF_TAKEN', note: 'Accrued from the Sunday storm call-out.' },
  { type: 'AT_HOME' },
  { type: 'ON_FIELD', projectId: 'prj-surat', projectName: 'Surat Diamond Bourse Link', note: 'Site recce.' },
  { type: 'IN_OFFICE' },
  { type: 'ON_FIELD', projectId: 'prj-adani', projectName: 'Adani Shantigram Campus Link' },
]

export const MY_ATTENDANCE: AttendanceDay[] = (() => {
  const out: AttendanceDay[] = []
  let patternIdx = 0
  for (let back = 0; back <= 20 && patternIdx < MY_PATTERN.length; back += 1) {
    if (isWeekend(back)) continue
    const p = MY_PATTERN[patternIdx]!
    patternIdx += 1
    out.push({
      id: `att-me-${back}`,
      person_id: 'demo-user',
      person_name: 'Demo Visitor',
      day: dateOnly(back),
      day_type: p.type,
      project_id: p.projectId ?? null,
      project_name: p.projectName ?? null,
      phase_id: null,
      departed_at: p.type === 'ON_FIELD' ? daysAgo(back, 8, 15) : null,
      completed_at: p.type === 'ON_FIELD' && back > 0 ? daysAgo(back, 18, 40) : null,
      note: p.note ?? null,
      logged_by: 'demo-user',
      created_at: daysAgo(back, 19, 0),
    })
  }
  return out
})()

export const MY_ATTENDANCE_SUMMARY: AttendanceSummary = {
  person_id: 'demo-user',
  person_name: 'Demo Visitor',
  date_from: dateOnly(30),
  date_to: dateOnly(0),
  counts: countBy(MY_ATTENDANCE, (d) => d.day_type),
  total_logged: MY_ATTENDANCE.length,
  comp_off_balance: 1,
}

export const MY_COMP_OFF: CompOffBalance = {
  person_id: 'demo-user',
  person_name: 'Demo Visitor',
  balance: 1,
  accrued: 2,
  consumed: 1,
}

export const COMP_OFF_LEDGER: CompOffEntry[] = [
  {
    id: 'co-01',
    person_id: 'demo-user',
    entry_type: 'ACCRUED',
    days: 1,
    source_day_id: null,
    reason: 'Sunday call-out — Shantigram storm inspection.',
    created_by: 'usr-kavita',
    created_at: daysAgo(6, 20, 10),
  },
  {
    id: 'co-02',
    person_id: 'demo-user',
    entry_type: 'ACCRUED',
    days: 1,
    source_day_id: null,
    reason: 'Overnight soak-test watch.',
    created_by: 'usr-kavita',
    created_at: daysAgo(12, 20, 10),
  },
  {
    id: 'co-03',
    person_id: 'demo-user',
    entry_type: 'CONSUMED',
    days: 1,
    source_day_id: null,
    reason: 'Comp off taken.',
    created_by: 'demo-user',
    created_at: daysAgo(8, 9, 0),
  },
]

// ── Team board (today + yesterday) ─────────────────────────

const boardDay = (
  id: string,
  personId: string,
  personName: string,
  back: number,
  type: DayType,
  projectId: string | null = null,
  projectName: string | null = null,
  note: string | null = null,
): AttendanceDay => ({
  id,
  person_id: personId,
  person_name: personName,
  day: dateOnly(back),
  day_type: type,
  project_id: projectId,
  project_name: projectName,
  phase_id: null,
  departed_at: type === 'ON_FIELD' ? daysAgo(back, 8, 30) : null,
  completed_at: type === 'ON_FIELD' && back > 0 ? daysAgo(back, 18, 15) : null,
  note,
  logged_by: personId,
  created_at: daysAgo(back, 8, 45),
})

/** Today: 2 on field, 2 in office, 1 on leave; Rohit hasn't logged. */
export const ATTENDANCE_BOARD: AttendanceDay[] = [
  boardDay('att-b1', 'per-arjun', 'Arjun Mehta', 0, 'ON_FIELD', 'prj-gift', 'GIFT City Backbone POC'),
  boardDay('att-b2', 'per-priya', 'Priya Sharma', 0, 'ON_FIELD', 'prj-adani', 'Adani Shantigram Campus Link', null, ),
  boardDay('att-b3', 'per-kavita', 'Kavita Iyer', 0, 'IN_OFFICE'),
  boardDay('att-b4', 'per-neha', 'Neha Joshi', 0, 'IN_OFFICE'),
  boardDay('att-b5', 'per-suresh', 'Suresh Rathod', 0, 'LEAVE', null, null, 'Family function in Rajkot.'),
  boardDay('att-b6', 'per-arjun', 'Arjun Mehta', 1, 'ON_FIELD', 'prj-gift', 'GIFT City Backbone POC'),
  boardDay('att-b7', 'per-priya', 'Priya Sharma', 1, 'IN_OFFICE'),
  boardDay('att-b8', 'per-rohit', 'Rohit Deshmukh', 1, 'ON_FIELD', 'prj-gift', 'GIFT City Backbone POC'),
  boardDay('att-b9', 'per-suresh', 'Suresh Rathod', 1, 'ON_FIELD', 'prj-adani', 'Adani Shantigram Campus Link'),
]

export const personCompOff = (personId: string): CompOffBalance => ({
  person_id: personId,
  person_name: ATTENDANCE_BOARD.find((d) => d.person_id === personId)?.person_name ?? null,
  balance: personId === 'per-suresh' ? 2 : 0,
  accrued: personId === 'per-suresh' ? 2 : 0,
  consumed: 0,
})

// ── Daily updates ──────────────────────────────────────────

export const UPDATES: DailyUpdate[] = [
  {
    id: 'upd-01',
    author_id: 'usr-kavita',
    author_name: 'Priya Sharma',
    person_id: 'per-priya',
    project_id: 'prj-adani',
    project_name: 'Adani Shantigram Campus Link',
    body:
      'Shantigram mast visit done. The faulty OU (NW-OU-24024) is holding at −28 dBm — swap unit is bench-checked and ready. Need the crane slot confirmed for Thursday.',
    posted_for: dateOnly(1),
    created_at: daysAgo(1, 18, 25),
    comment_count: 2,
    comments: [
      {
        id: 'cmt-01',
        update_id: 'upd-01',
        author_id: 'usr-kavita',
        author_name: 'Kavita Iyer',
        body: 'Crane confirmed for Thursday 7 am — booked through the Adani site office.',
        created_at: daysAgo(1, 19, 10),
      },
      {
        id: 'cmt-02',
        update_id: 'upd-01',
        author_id: 'usr-neha',
        author_name: 'Neha Joshi',
        body: 'Spare OU NW-OU-24028 is signed out to you already — bring the old one back for the repair pool.',
        created_at: daysAgo(1, 19, 45),
      },
    ],
  },
  {
    id: 'upd-02',
    author_id: 'demo-user',
    author_name: 'Arjun Mehta',
    person_id: 'per-arjun',
    project_id: 'prj-gift',
    project_name: 'GIFT City Backbone POC',
    body:
      'Soak test day 6: zero uncorrected errors in 48 h, worst-case fade 2.1 dB during the afternoon haze. Customer review is Friday — assembling the counters into a one-pager.',
    posted_for: dateOnly(1),
    created_at: daysAgo(1, 19, 5),
    comment_count: 1,
    comments: [
      {
        id: 'cmt-03',
        update_id: 'upd-02',
        author_id: 'usr-kavita',
        author_name: 'Kavita Iyer',
        body: 'Add the leased-fibre cost comparison to the one-pager — Hardik asked for it twice.',
        created_at: daysAgo(1, 20, 15),
      },
    ],
  },
  {
    id: 'upd-03',
    author_id: 'usr-kavita',
    author_name: 'Suresh Rathod',
    person_id: 'per-suresh',
    project_id: 'prj-adani',
    project_name: 'Adani Shantigram Campus Link',
    body: 'Fitted the new surge-protector brackets on mast M-4. Earthing check passed at 2.1 Ω.',
    posted_for: dateOnly(2),
    created_at: daysAgo(2, 17, 50),
    comment_count: 0,
    comments: [],
  },
  {
    id: 'upd-04',
    author_id: 'usr-neha',
    author_name: 'Neha Joshi',
    person_id: 'per-neha',
    project_id: null,
    project_name: null,
    body:
      'Quarterly stock audit done: 24 assets reconciled, 1 damaged cable flagged for scrap decision, telescope kit overdue with Arjun (chased).',
    posted_for: dateOnly(2),
    created_at: daysAgo(2, 16, 20),
    comment_count: 0,
    comments: [],
  },
  {
    id: 'upd-05',
    author_id: 'usr-kavita',
    author_name: 'Kavita Iyer',
    person_id: 'per-kavita',
    project_id: 'prj-surat',
    project_name: 'Surat Diamond Bourse Link',
    body:
      'SDB kickoff call: annexe data-room power still pending on their side. Slipping the install by a week costs us the crane deposit — pushing them for a firm date.',
    posted_for: dateOnly(3),
    created_at: daysAgo(3, 15, 30),
    comment_count: 0,
    comments: [],
  },
]

// ── Leadership summary ─────────────────────────────────────

export const LEADERSHIP_SUMMARY: LeadershipSummary = {
  // Real "now": daysAgo(0, …) pins a clock time that can land in the future
  // early in the day, which would render as "updated in N hours".
  generated_at: new Date(Date.now() - 8 * 60_000).toISOString(),
  people_total: 6,
  on_field_today: 2,
  in_office_today: 2,
  away_today: 1,
  not_logged_today: 1,
  active_projects: 2,
  projects_by_status: { UPCOMING: 1, ACTIVE: 2, COMPLETED: 1 },
  devices_total: DEVICE_STATS.total,
  devices_working: DEVICE_STATS.by_status['WORKING'] ?? 0,
  devices_faulty: DEVICE_STATS.by_status['FAULTY'] ?? 0,
  open_errors: 1,
  spend_this_month: FINANCE_ROLLUP.spend_this_month,
  pending_claims: FINANCE_ROLLUP.pending_claims,
  pending_claim_value: FINANCE_ROLLUP.pending_claim_value,
  assets_deployed: 5,
  recent_updates: UPDATES.slice(0, 3),
}

// ── My tasks & notifications ───────────────────────────────

export const TASKS: Task[] = [
  {
    key: 'handover-ho-01',
    title: 'Handover waiting: Arjun Mehta → Priya Sharma',
    detail: 'Two items (survey IU and the alignment telescope) need an accept before Monday.',
    link: '/inventory/handovers',
    urgency: 'BLOCKING',
    action: 'Review handover',
    count: 1,
  },
  {
    key: 'gatepass-gp2f7a91',
    title: 'Gate pass GP2F7A91 has 3 items still out',
    detail: 'Soak-test rig at GIFT City — expected back this week.',
    link: '/inventory/returns',
    urgency: 'DUE',
    action: 'Record returns',
    count: 3,
  },
  {
    key: 'claim-clm-01',
    title: 'Claim awaiting settlement: ₹3,695',
    detail: 'Shantigram storm-response expenses, submitted by Kavita Iyer.',
    link: '/finance/settlement',
    urgency: 'DUE',
    action: 'Settle',
    count: 1,
  },
  {
    key: 'damaged-ast-hc-01',
    title: 'Damaged hybrid cable needs a scrap decision',
    detail: 'AST-0112 kinked on the drum — repair, re-terminate or write off.',
    link: '/inventory/repairs',
    urgency: 'SOON',
    action: 'Triage',
    count: 1,
  },
]

export const NOTIFICATIONS: Notification[] = [
  {
    id: 'ntf-01',
    kind: 'HANDOVER',
    title: 'Arjun Mehta started a handover to Priya Sharma',
    body: '2 items — Surat survey prep.',
    link: '/inventory/handovers',
    read_at: null,
    created_at: daysAgo(1, 17, 52),
  },
  {
    id: 'ntf-02',
    kind: 'CLAIM',
    title: 'Claim submitted: Shantigram storm-response expenses',
    body: '₹3,695 across 3 expenses.',
    link: '/finance/settlement',
    read_at: null,
    created_at: daysAgo(4, 10, 16),
  },
  {
    id: 'ntf-03',
    kind: 'REQUEST',
    title: 'Purchase request received: LC–LC patch cords, 5 m',
    body: 'Marked received by Neha Joshi.',
    link: '/inventory/requests',
    read_at: daysAgo(5, 9, 0),
    created_at: daysAgo(6, 14, 21),
  },
]
