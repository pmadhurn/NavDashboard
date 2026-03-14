export interface Device {
  id: string
  serial_number: string
  device_type: 'IU' | 'OU' | 'HC' | 'RF'
  status: 'WORKING' | 'NOT_WORKING' | 'FAULTY'
  status_color: string
  couple_id: string | null
  handling_person_id: string | null
  notes: string | null
  custom_fields: Record<string, unknown> | null
  metadata_json: Record<string, unknown> | null
  created_at: string
  updated_at: string | null
}

export interface DeviceStatusHistory {
  id: string
  device_id: string
  old_status: string
  new_status: string
  changed_by: string
  changed_at: string
  reason: string | null
}

export interface DeviceStats {
  total: number
  by_type: Record<string, number>
  by_status: Record<string, number>
}

export interface DeviceCreate {
  serial_number: string
  device_type: string
  status?: string
  couple_id?: string | null
  handling_person_id?: string | null
  notes?: string | null
  custom_fields?: Record<string, unknown> | null
  metadata_json?: Record<string, unknown> | null
}

export interface DeviceUpdate extends Partial<DeviceCreate> {}

export interface StatusChangeRequest {
  status: string
  reason?: string | null
}