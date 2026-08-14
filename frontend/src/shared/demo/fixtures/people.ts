/** Personnel and user accounts — the cast every other fixture references. */
import type { Person, AssignmentHistory } from '@/shared/types/personnel'
import type { UserItem } from '@/modules/settings/hooks/useSettings'
import type { BasicUser } from '@/modules/access/hooks/useAccess'
import { daysAgo } from './helpers'

export const PEOPLE: Person[] = [
  {
    id: 'per-arjun',
    full_name: 'Arjun Mehta',
    role: 'Field Engineer',
    email: 'arjun.mehta@navwireless.in',
    phone: '+91 98795 12034',
    notes: 'Lead on the GIFT City POC. Certified for tower work.',
    user_id: null,
    custom_fields: null,
    created_at: daysAgo(58),
    updated_at: null,
  },
  {
    id: 'per-priya',
    full_name: 'Priya Sharma',
    role: 'Field Engineer',
    email: 'priya.sharma@navwireless.in',
    phone: '+91 99091 44872',
    notes: 'Alignment specialist — handles the Shantigram link.',
    user_id: null,
    custom_fields: null,
    created_at: daysAgo(58),
    updated_at: null,
  },
  {
    id: 'per-rohit',
    full_name: 'Rohit Deshmukh',
    role: 'Rigger',
    email: 'rohit.deshmukh@navwireless.in',
    phone: '+91 97230 88121',
    notes: null,
    user_id: null,
    custom_fields: null,
    created_at: daysAgo(52),
    updated_at: null,
  },
  {
    id: 'per-suresh',
    full_name: 'Suresh Rathod',
    role: 'Rigger',
    email: 'suresh.rathod@navwireless.in',
    phone: '+91 98988 30455',
    notes: 'Mast and gantry work at Shantigram.',
    user_id: null,
    custom_fields: null,
    created_at: daysAgo(50),
    updated_at: null,
  },
  {
    id: 'per-kavita',
    full_name: 'Kavita Iyer',
    role: 'Project Manager',
    email: 'kavita.iyer@navwireless.in',
    phone: '+91 98250 67310',
    notes: 'Runs Adani Shantigram and the Surat Diamond Bourse pipeline.',
    user_id: 'usr-kavita',
    custom_fields: null,
    created_at: daysAgo(58),
    updated_at: null,
  },
  {
    id: 'per-neha',
    full_name: 'Neha Joshi',
    role: 'Inventory & Finance',
    email: 'neha.joshi@navwireless.in',
    phone: '+91 90999 21547',
    notes: 'Owns the HQ store, purchase requests and settlements.',
    user_id: 'usr-neha',
    custom_fields: null,
    created_at: daysAgo(55),
    updated_at: null,
  },
]

export const personName = (id: string): string =>
  PEOPLE.find((p) => p.id === id)?.full_name ?? 'Unknown'

export const PERSON_ASSIGNMENTS: AssignmentHistory[] = []

export const USERS: UserItem[] = [
  {
    id: 'demo-user',
    email: 'demo@navdashboard.com',
    username: 'demo',
    full_name: 'Demo Visitor',
    role: 'ADMIN',
    is_active: true,
    auth_provider: 'demo',
    status: 'ACTIVE',
    created_at: daysAgo(58),
    last_login: daysAgo(0, 9, 5),
  },
  {
    id: 'usr-kavita',
    email: 'kavita.iyer@navwireless.in',
    username: 'kavita.iyer',
    full_name: 'Kavita Iyer',
    role: 'TECHNICIAN',
    is_active: true,
    auth_provider: 'clerk',
    status: 'ACTIVE',
    created_at: daysAgo(55),
    last_login: daysAgo(0, 8, 41),
  },
  {
    id: 'usr-neha',
    email: 'neha.joshi@navwireless.in',
    username: 'neha.joshi',
    full_name: 'Neha Joshi',
    role: 'TECHNICIAN',
    is_active: true,
    auth_provider: 'clerk',
    status: 'ACTIVE',
    created_at: daysAgo(54),
    last_login: daysAgo(1, 18, 12),
  },
]

export const BASIC_USERS: BasicUser[] = USERS.map((u) => ({
  id: u.id,
  email: u.email,
  username: u.username,
  full_name: u.full_name,
  role: u.role,
  is_active: u.is_active,
  status: u.status ?? 'ACTIVE',
  auth_provider: u.auth_provider ?? 'clerk',
}))
