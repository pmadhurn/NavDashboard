import type { Couple } from './couples'

export interface PairCreate {
  name: string
  couple_ids: string[]
  handling_person_id?: string | null
  notes?: string | null
  custom_fields?: Record<string, unknown> | null
}

export interface PairUpdate {
  name?: string | null
  status?: string | null
  status_override?: boolean | null
  handling_person_id?: string | null
  notes?: string | null
  custom_fields?: Record<string, unknown> | null
}

export interface Pair {
  id: string
  name: string
  status: string
  status_color: string
  status_override: boolean
  handling_person_id: string | null
  handling_person_name: string | null
  couples: Couple[]
  notes: string | null
  custom_fields: Record<string, unknown> | null
  created_at: string
  updated_at: string | null
}

export interface PairStats {
  total: number
  by_status: Record<string, number>
}