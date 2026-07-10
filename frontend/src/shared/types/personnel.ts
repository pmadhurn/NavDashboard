export interface Person {
  id: string
  full_name: string
  role: string
  email?: string | null
  phone?: string | null
  notes?: string | null
  user_id?: string | null
  custom_fields?: Record<string, unknown> | null
  created_at: string
  updated_at?: string | null
}

export interface PersonCreate {
  full_name: string
  role: string
  email?: string | null
  phone?: string | null
  notes?: string | null
  custom_fields?: Record<string, unknown> | null
}

export interface PersonUpdate {
  full_name?: string
  role?: string
  email?: string | null
  phone?: string | null
  notes?: string | null
  custom_fields?: Record<string, unknown> | null
}

export interface AssignmentHistory {
  id: string
  person_id: string
  entity_type: string
  entity_id: string
  assigned_at: string
  unassigned_at?: string | null
}
