import type { Device } from './devices'
import type { Location, LocationCreate } from './locations'

export interface MaterialCreateInline {
  name: string
  quantity: number
  unit?: string | null
}

export interface CoupleCreate {
  name: string
  pair_id?: string | null
  has_rf?: boolean
  status?: string
  handling_person_id?: string | null
  location?: LocationCreate | null
  device_ids?: string[]
  fitting_materials?: MaterialCreateInline[]
  configuration?: Record<string, unknown> | null
  notes?: string | null
  custom_fields?: Record<string, unknown> | null
  copy_materials_from?: string | null
  template_id?: string | null
}

export interface CoupleUpdate {
  name?: string | null
  pair_id?: string | null
  has_rf?: boolean | null
  status?: string | null
  handling_person_id?: string | null
  configuration?: Record<string, unknown> | null
  notes?: string | null
  custom_fields?: Record<string, unknown> | null
}

export interface Material {
  id: string
  couple_id: string | null
  name: string
  description: string | null
  quantity: number
  unit: string | null
  is_template: boolean
  custom_fields: Record<string, unknown> | null
  created_at: string
  updated_at: string | null
}

export interface Couple {
  id: string
  name: string
  pair_id: string | null
  has_rf: boolean
  status: string
  status_color: string
  handling_person_id: string | null
  handling_person_name: string | null
  location_id: string | null
  location: Location | null
  devices: Device[]
  materials: Material[]
  configuration: Record<string, unknown> | null
  notes: string | null
  custom_fields: Record<string, unknown> | null
  created_at: string
  updated_at: string | null
}

export interface CoupleSummary {
  id: string
  name: string
  status: string
  status_color: string
  has_rf: boolean
  location: Location | null
  device_count: number
}

export interface LocationChangeRequest {
  latitude: number
  longitude: number
  address_note?: string | null
  notes?: string | null
}