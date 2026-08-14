export interface Location {
  id: string
  latitude: number
  longitude: number
  address_note: string | null
  created_at: string
  updated_at: string | null
}

export interface LocationHistory {
  id: string
  couple_id: string
  old_latitude: number
  old_longitude: number
  new_latitude: number
  new_longitude: number
  moved_at: string
  handled_by: string | null
  had_rf: boolean
  distance_meters: number | null
  fitting_materials_snapshot: Array<Record<string, unknown>> | null
  configuration_snapshot: Record<string, unknown> | null
  notes: string | null
  created_at: string
}

export interface LocationCreate {
  latitude: number
  longitude: number
  address_note?: string | null
}

export interface MapDataPoint {
  couple_id: string
  couple_name: string
  latitude: number
  longitude: number
  status: string
  has_rf: boolean
  pair_id: string | null
  pair_name: string | null
  // Set when the couple (or its link) is deployed to a project.
  project_id: string | null
  project_name: string | null
}