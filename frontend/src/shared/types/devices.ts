export interface Device {
  id: string
  serial_number: string
  device_type: 'IU' | 'OU' | 'HC' | 'RF' | 'GYRO' | 'GYRO_CTRL'
  status: 'WORKING' | 'NOT_WORKING' | 'FAULTY'
  status_color: string
  couple_id: string | null
  device_model_id?: string | null
  device_model_name?: string | null
  handling_person_id: string | null
  notes: string | null
  custom_fields: Record<string, unknown> | null
  metadata_json: Record<string, unknown> | null
  created_at: string
  updated_at: string | null
  // --- inventory custody (Phase 3) ---
  // Read from the linked asset, so the device view and the inventory view
  // cannot disagree about where the physical thing is.
  asset_id?: string | null;
  asset_code?: string | null;
  custody_type?: string | null;
  custody_label?: string | null;
  condition?: string | null;
  is_available?: boolean | null;
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
  device_model_id?: string | null
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