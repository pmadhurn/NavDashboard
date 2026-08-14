/** Finance: expenses, claims, advances, balances and the settlement view. */
import type {
  Advance,
  Balance,
  Claim,
  Expense,
  ExpenseSummary,
  MyFinanceSummary,
  SettlementSummary,
} from '@/modules/finance/hooks/useFinance'
import { dateOnly, daysAgo, isThisMonth, sum } from './helpers'

function expense(
  id: string,
  title: string,
  amount: number,
  category: string,
  projectId: string | null,
  addedBy: string,
  status: Expense['status'],
  daysBack: number,
  claimId: string | null = null,
  notes: string | null = null,
): Expense {
  return {
    id,
    title,
    amount,
    currency: 'INR',
    expense_date: dateOnly(daysBack),
    category,
    project_id: projectId,
    batch_id: null,
    claim_id: claimId,
    added_by: addedBy,
    notes,
    status,
    paid_by: status === 'PAID' ? 'usr-neha' : null,
    paid_at: status === 'PAID' ? daysAgo(4, 15, 30) : null,
    members: [],
    created_at: daysAgo(daysBack, 19, 5),
  }
}

export const EXPENSES: Expense[] = [
  expense('exp-01', 'Cab — HQ to GIFT City soak test', 850, 'Cab', 'prj-gift', 'demo-user', 'PAID', 9, 'clm-02'),
  expense('exp-02', 'Food — soak test day one, crew of three', 1240, 'Food', 'prj-gift', 'demo-user', 'PAID', 8, 'clm-02'),
  expense('exp-03', 'Hotel — Surat recce overnight', 3600, 'Hotel', 'prj-surat', 'demo-user', 'DRAFT', 3, null, 'Hotel Lords Plaza, Ring Road.'),
  expense('exp-04', 'Train — Ahmedabad ↔ Surat, 2 pax', 1140, 'Train', 'prj-surat', 'demo-user', 'DRAFT', 3),
  expense('exp-05', 'Mast crane hire — Shantigram OU inspection', 2100, 'Other', 'prj-adani', 'usr-kavita', 'SUBMITTED', 6, 'clm-01'),
  expense('exp-06', 'Team lunch — storm-day repair crew', 980, 'Food', 'prj-adani', 'usr-kavita', 'SUBMITTED', 6, 'clm-01'),
  expense('exp-07', 'Local transport — Shantigram site visits', 615, 'Rickshaw', 'prj-adani', 'usr-kavita', 'SUBMITTED', 5, 'clm-01'),
  expense('exp-08', 'Courier — RF unit to Om Communication, Vadodara', 420, 'Other', null, 'usr-neha', 'PAID', 10),
]

const total = (rows: Expense[]) => sum(rows.map((e) => e.amount))

const PROJECT_NAMES: Record<string, string> = {
  'prj-gift': 'GIFT City Backbone POC',
  'prj-adani': 'Adani Shantigram Campus Link',
  'prj-surat': 'Surat Diamond Bourse Link',
  'prj-vad': 'Vadodara Smart School Pilot',
}

export const EXPENSE_SUMMARY: ExpenseSummary = {
  total_this_month: total(EXPENSES.filter((e) => isThisMonth(e.expense_date))),
  total_all_time: total(EXPENSES),
  count: EXPENSES.length,
  by_project: Object.entries(
    EXPENSES.reduce<Record<string, number>>((acc, e) => {
      const name = e.project_id ? (PROJECT_NAMES[e.project_id] ?? e.project_id) : 'No project'
      acc[name] = (acc[name] ?? 0) + e.amount
      return acc
    }, {}),
  ).map(([name, t]) => ({ name, total: t })),
  by_category: Object.entries(
    EXPENSES.reduce<Record<string, number>>((acc, e) => {
      const name = e.category ?? 'Other'
      acc[name] = (acc[name] ?? 0) + e.amount
      return acc
    }, {}),
  ).map(([name, t]) => ({ name, total: t })),
}

// ── Claims ─────────────────────────────────────────────────

const claimExpenses = (claimId: string) => EXPENSES.filter((e) => e.claim_id === claimId)

export const CLAIMS: Claim[] = [
  {
    id: 'clm-01',
    title: 'Shantigram storm-response expenses',
    project_id: 'prj-adani',
    submitted_by: 'usr-kavita',
    status: 'SUBMITTED',
    note: 'Crane, crew food and local transport for the post-storm inspection.',
    submitted_at: daysAgo(4, 10, 15),
    settled_by: null,
    settled_at: null,
    total: total(claimExpenses('clm-01')),
    expense_count: claimExpenses('clm-01').length,
    created_at: daysAgo(5, 18, 40),
  },
  {
    id: 'clm-02',
    title: 'GIFT POC week-one travel',
    project_id: 'prj-gift',
    submitted_by: 'demo-user',
    status: 'PAID',
    note: null,
    submitted_at: daysAgo(7, 9, 20),
    settled_by: 'usr-neha',
    settled_at: daysAgo(4, 15, 30),
    total: total(claimExpenses('clm-02')),
    expense_count: claimExpenses('clm-02').length,
    created_at: daysAgo(8, 20, 10),
  },
]

// ── Advances ───────────────────────────────────────────────

export const ADVANCES: Advance[] = [
  {
    id: 'adv-01',
    person_id: 'per-arjun',
    person: { id: 'per-arjun', full_name: 'Arjun Mehta' },
    project_id: 'prj-gift',
    amount: 20000,
    currency: 'INR',
    received_date: dateOnly(12),
    source_note: 'Cash advance for the GIFT City soak-test fortnight.',
    logged_by: 'usr-neha',
    created_at: daysAgo(12, 11, 30),
  },
  {
    id: 'adv-02',
    person_id: 'per-priya',
    person: { id: 'per-priya', full_name: 'Priya Sharma' },
    project_id: 'prj-adani',
    amount: 10000,
    currency: 'INR',
    received_date: dateOnly(7),
    source_note: 'Shantigram repair-visit float.',
    logged_by: 'usr-neha',
    created_at: daysAgo(7, 12, 0),
  },
]

export const personBalance = (personId: string): Balance => {
  const advances = sum(ADVANCES.filter((a) => a.person_id === personId).map((a) => a.amount))
  return {
    person_id: personId,
    project_id: null,
    advances,
    spent: 0,
    balance: advances,
  }
}

// ── The demo visitor's own money ───────────────────────────

const myExpenses = EXPENSES.filter((e) => e.added_by === 'demo-user')
const mySpent = total(myExpenses)

export const MY_FINANCE: MyFinanceSummary = {
  person_id: null,
  advances: 0,
  spent: mySpent,
  balance: -mySpent, // out of pocket until the drafts are claimed
  pending_total: total(myExpenses.filter((e) => e.status === 'SUBMITTED')),
  paid_total: total(myExpenses.filter((e) => e.status === 'PAID')),
  expense_count: myExpenses.length,
  claim_count: CLAIMS.filter((c) => c.submitted_by === 'demo-user').length,
}

export const MY_EXPENSES_MONTH = myExpenses.filter((e) => isThisMonth(e.expense_date))

// ── Settlement (finance person's view) ─────────────────────

const USER_NAMES: Record<string, string> = {
  'demo-user': 'Demo Visitor',
  'usr-kavita': 'Kavita Iyer',
  'usr-neha': 'Neha Joshi',
}

const spentBy = countByAmount((e: Expense) => e.added_by)
const pendingBy = countByAmount((e: Expense) => e.added_by, (e) => e.status === 'SUBMITTED')
const paidBy = countByAmount((e: Expense) => e.added_by, (e) => e.status === 'PAID')

function countByAmount(key: (e: Expense) => string, filter?: (e: Expense) => boolean) {
  const out: Record<string, number> = {}
  for (const e of EXPENSES) {
    if (filter && !filter(e)) continue
    const k = key(e)
    out[k] = (out[k] ?? 0) + e.amount
  }
  return out
}

export const SETTLEMENT: SettlementSummary = {
  total_pending: total(EXPENSES.filter((e) => e.status === 'SUBMITTED')),
  total_paid: total(EXPENSES.filter((e) => e.status === 'PAID')),
  by_person: [
    ...Object.keys(USER_NAMES).map((uid) => ({
      person_id: null,
      user_id: uid,
      name: USER_NAMES[uid] ?? uid,
      advances: 0,
      spent: spentBy[uid] ?? 0,
      balance: -(spentBy[uid] ?? 0),
      pending: pendingBy[uid] ?? 0,
      paid: paidBy[uid] ?? 0,
    })),
    ...ADVANCES.map((a) => ({
      person_id: a.person_id,
      user_id: null,
      name: a.person?.full_name ?? 'Unknown',
      advances: a.amount,
      spent: 0,
      balance: a.amount,
      pending: 0,
      paid: 0,
    })),
  ],
  by_project: Object.entries(
    EXPENSES.reduce<Record<string, { total: number; pending: number; paid: number; id: string | null }>>(
      (acc, e) => {
        const name = e.project_id ? (PROJECT_NAMES[e.project_id] ?? e.project_id) : 'No project'
        const row = acc[name] ?? (acc[name] = { total: 0, pending: 0, paid: 0, id: e.project_id })
        row.total += e.amount
        if (e.status === 'SUBMITTED') row.pending += e.amount
        if (e.status === 'PAID') row.paid += e.amount
        return acc
      },
      {},
    ),
  ).map(([name, r]) => ({ project_id: r.id, name, total: r.total, pending: r.pending, paid: r.paid })),
}

// Convenience for other fixture modules (dashboard, leadership).
export const FINANCE_ROLLUP = {
  spend_this_month: EXPENSE_SUMMARY.total_this_month,
  pending_claims: CLAIMS.filter((c) => c.status === 'SUBMITTED').length,
  pending_claim_value: sum(CLAIMS.filter((c) => c.status === 'SUBMITTED').map((c) => c.total)),
  my_expenses_month_total: total(MY_EXPENSES_MONTH),
  my_expenses_month_count: MY_EXPENSES_MONTH.length,
  my_advance_balance: MY_FINANCE.balance,
}
