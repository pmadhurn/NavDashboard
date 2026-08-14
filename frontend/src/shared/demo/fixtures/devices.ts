/** Devices, couples, pairs, link composition, map data and location history. */
import type { Device, DeviceStats, DeviceStatusHistory } from '@/shared/types/devices'
import type { Couple, Material } from '@/shared/types/couples'
import type { Pair, PairStats } from '@/shared/types/pairs'
import type { Location, LocationHistory, MapDataPoint } from '@/shared/types/locations'
import type { DeviceModel } from '@/modules/devices/hooks/useDevices'
import type { PairComposition } from '@/modules/pairs/hooks/usePairs'
import { daysAgo, statusColor, countBy } from './helpers'

// ── Hardware catalog ───────────────────────────────────────

export const DEVICE_MODELS: DeviceModel[] = [
  { id: 'mdl-os1g', name: 'OpticSpectra 1G', device_type: null, notes: '1 Gbps FSO link head' },
  { id: 'mdl-os10g', name: 'OpticSpectra 10G', device_type: null, notes: '10 Gbps FSO link head' },
  { id: 'mdl-rf5800', name: 'RF-5800', device_type: 'RF', notes: '5.8 GHz RF failover unit' },
  { id: 'mdl-gyro', name: 'GyroMount G2', device_type: 'GYRO', notes: 'Active stabilised mount' },
]

// ── Locations (all real Gujarat coordinates) ───────────────

const loc = (id: string, latitude: number, longitude: number, note: string): Location => ({
  id,
  latitude,
  longitude,
  address_note: note,
  created_at: daysAgo(45),
  updated_at: null,
})

const LOC_C1 = loc('loc-c1', 23.1614, 72.6841, 'GIFT One Tower, Block-A rooftop, GIFT City, Gandhinagar')
const LOC_C2 = loc('loc-c2', 23.2156, 72.6369, 'Infocity IT Park, Tower-2 terrace, Gandhinagar')
const LOC_C3 = loc('loc-c3', 23.0454, 72.5163, 'Adani Corporate House, west terrace, Ahmedabad')
const LOC_C4 = loc('loc-c4', 23.1387, 72.5451, 'Shantigram township, comms mast M-4, Ahmedabad')

// ── Devices (14) ───────────────────────────────────────────

function device(
  id: string,
  serial: string,
  type: Device['device_type'],
  coupleId: string,
  modelId: string | null,
  status: Device['status'] = 'WORKING',
  notes: string | null = null,
  handledBy: string | null = null,
): Device {
  const model = DEVICE_MODELS.find((m) => m.id === modelId)
  return {
    id,
    serial_number: serial,
    device_type: type,
    status,
    status_color: statusColor(status),
    couple_id: coupleId,
    device_model_id: modelId,
    device_model_name: model?.name ?? null,
    handling_person_id: handledBy,
    notes,
    custom_fields: null,
    metadata_json: null,
    created_at: daysAgo(44),
    updated_at: status === 'WORKING' ? null : daysAgo(5),
  }
}

export const DEVICES: Device[] = [
  // Couple 1 — GIFT City Tower-A (RF + gyro side)
  device('dev-01', 'NW-IU-24011', 'IU', 'cpl-c1', 'mdl-os10g'),
  device('dev-02', 'NW-OU-24021', 'OU', 'cpl-c1', 'mdl-os10g'),
  device('dev-03', 'NW-HC-24031', 'HC', 'cpl-c1', null),
  device('dev-04', 'NW-RF-24041', 'RF', 'cpl-c1', 'mdl-rf5800'),
  device('dev-05', 'NW-GY-24051', 'GYRO', 'cpl-c1', 'mdl-gyro'),
  // Couple 2 — Infocity Rooftop (RF planned, not yet fitted)
  device('dev-06', 'NW-IU-24012', 'IU', 'cpl-c2', 'mdl-os10g'),
  device('dev-07', 'NW-OU-24022', 'OU', 'cpl-c2', 'mdl-os10g'),
  device('dev-08', 'NW-HC-24032', 'HC', 'cpl-c2', null),
  // Couple 3 — Adani HQ Terrace
  device('dev-09', 'NW-IU-24013', 'IU', 'cpl-c3', 'mdl-os1g'),
  device('dev-10', 'NW-OU-24023', 'OU', 'cpl-c3', 'mdl-os1g'),
  device('dev-11', 'NW-HC-24033', 'HC', 'cpl-c3', null),
  // Couple 4 — Shantigram Mast (faulty OU)
  device('dev-12', 'NW-IU-24014', 'IU', 'cpl-c4', 'mdl-os1g'),
  device(
    'dev-13',
    'NW-OU-24024',
    'OU',
    'cpl-c4',
    'mdl-os1g',
    'FAULTY',
    'RX power dropped to −28 dBm after the pre-monsoon storm — suspected lens seal.',
    'per-priya',
  ),
  device('dev-14', 'NW-HC-24034', 'HC', 'cpl-c4', null),
]

export const DEVICE_STATS: DeviceStats = {
  total: DEVICES.length,
  by_type: countBy(DEVICES, (d) => d.device_type),
  by_status: countBy(DEVICES, (d) => d.status),
}

export const DEVICE_STATUS_HISTORY: Record<string, DeviceStatusHistory[]> = {
  'dev-13': [
    {
      id: 'dsh-01',
      device_id: 'dev-13',
      old_status: 'WORKING',
      new_status: 'FAULTY',
      changed_by: 'Priya Sharma',
      changed_at: daysAgo(5, 16, 40),
      reason: 'RX power below threshold after storm; lens seal suspected.',
    },
  ],
}

// ── Couples (4) ────────────────────────────────────────────

const materials = (coupleId: string, rows: [string, number, string][]): Material[] =>
  rows.map(([name, quantity, unit], i) => ({
    id: `${coupleId}-mat-${i + 1}`,
    couple_id: coupleId,
    name,
    description: null,
    quantity,
    unit,
    is_template: false,
    custom_fields: null,
    created_at: daysAgo(40),
    updated_at: null,
  }))

function couple(
  id: string,
  name: string,
  pairId: string,
  hasRf: boolean,
  status: string,
  location: Location,
  handlingPersonId: string,
  handlingPersonName: string,
  mats: [string, number, string][],
  notes: string | null,
): Couple {
  return {
    id,
    name,
    pair_id: pairId,
    has_rf: hasRf,
    status,
    status_color: statusColor(status),
    handling_person_id: handlingPersonId,
    handling_person_name: handlingPersonName,
    location_id: location.id,
    location,
    devices: DEVICES.filter((d) => d.couple_id === id),
    materials: mats.length ? materials(id, mats) : [],
    configuration: null,
    notes,
    custom_fields: null,
    created_at: daysAgo(44),
    updated_at: null,
  }
}

export const COUPLES: Couple[] = [
  couple(
    'cpl-c1',
    'GIFT City Tower-A',
    'pair-1',
    true,
    'WORKING',
    LOC_C1,
    'per-arjun',
    'Arjun Mehta',
    [
      ['Pole-mount clamp set', 4, 'pcs'],
      ['UV-rated cable ties', 30, 'pcs'],
    ],
    'North-east parapet. Clear line of sight to Infocity Tower-2.',
  ),
  couple(
    'cpl-c2',
    'Infocity Rooftop',
    'pair-1',
    true,
    'WORKING',
    LOC_C2,
    'per-arjun',
    'Arjun Mehta',
    [['Wall-mount bracket kit', 2, 'sets']],
    'RF backup unit approved but not yet fitted on this side.',
  ),
  couple(
    'cpl-c3',
    'Adani HQ Terrace',
    'pair-2',
    false,
    'WORKING',
    LOC_C3,
    'per-priya',
    'Priya Sharma',
    [['Pole-mount clamp set', 4, 'pcs']],
    null,
  ),
  couple(
    'cpl-c4',
    'Shantigram Mast',
    'pair-2',
    false,
    'FAULTY',
    LOC_C4,
    'per-priya',
    'Priya Sharma',
    [
      ['Mast adaptor plate', 1, 'pcs'],
      ['Anchor fasteners M10', 8, 'pcs'],
    ],
    'OU NW-OU-24024 faulty since the storm — repair visit scheduled.',
  ),
]

// ── Pairs (2 links) ────────────────────────────────────────

function pair(
  id: string,
  name: string,
  status: string,
  handlingPersonId: string,
  handlingPersonName: string,
  notes: string | null,
): Pair {
  return {
    id,
    name,
    status,
    status_color: statusColor(status),
    status_override: false,
    handling_person_id: handlingPersonId,
    handling_person_name: handlingPersonName,
    couples: COUPLES.filter((c) => c.pair_id === id),
    notes,
    custom_fields: null,
    created_at: daysAgo(44),
    updated_at: null,
  }
}

export const PAIRS: Pair[] = [
  pair(
    'pair-1',
    'GIFT City ↔ Infocity',
    'WORKING',
    'per-arjun',
    'Arjun Mehta',
    '10G backbone POC — 1.4 km hop, soak test in progress.',
  ),
  pair(
    'pair-2',
    'Adani HQ ↔ Shantigram',
    'FAULTY',
    'per-priya',
    'Priya Sharma',
    'Campus link degraded: Shantigram OU faulty, RF-less link is down to one path.',
  ),
]

export const PAIR_STATS: PairStats = {
  total: PAIRS.length,
  by_status: countBy(PAIRS, (p) => p.status),
}

// ── Link composition (expected build vs fitted) ────────────

const compDevices = (coupleId: string) => {
  const out: Record<string, { id: string; serial_number: string; status: string; model: string | null }[]> = {}
  for (const d of DEVICES.filter((x) => x.couple_id === coupleId)) {
    const list = out[d.device_type] ?? (out[d.device_type] = [])
    list.push({
      id: d.id,
      serial_number: d.serial_number,
      status: d.status,
      model: d.device_model_name ?? null,
    })
  }
  return out
}

export const PAIR_COMPOSITIONS: Record<string, PairComposition> = {
  'pair-1': {
    pair_id: 'pair-1',
    pair_name: 'GIFT City ↔ Infocity',
    status: 'WORKING',
    complete: false,
    notes: ['Infocity side has no RF backup fitted — the link has no failover path until it does.'],
    sides: [
      {
        couple_id: 'cpl-c1',
        couple_name: 'GIFT City Tower-A',
        has_rf: true,
        has_gyro: true,
        devices: compDevices('cpl-c1'),
        missing: [],
      },
      {
        couple_id: 'cpl-c2',
        couple_name: 'Infocity Rooftop',
        has_rf: true,
        has_gyro: false,
        devices: compDevices('cpl-c2'),
        missing: ['RF'],
      },
    ],
  },
  'pair-2': {
    pair_id: 'pair-2',
    pair_name: 'Adani HQ ↔ Shantigram',
    status: 'FAULTY',
    complete: true,
    notes: [],
    sides: [
      {
        couple_id: 'cpl-c3',
        couple_name: 'Adani HQ Terrace',
        has_rf: false,
        has_gyro: false,
        devices: compDevices('cpl-c3'),
        missing: [],
      },
      {
        couple_id: 'cpl-c4',
        couple_name: 'Shantigram Mast',
        has_rf: false,
        has_gyro: false,
        devices: compDevices('cpl-c4'),
        missing: [],
      },
    ],
  },
}

// ── Map data — the showcase centerpiece ────────────────────

export const MAP_DATA: MapDataPoint[] = COUPLES.map((c) => ({
  couple_id: c.id,
  couple_name: c.name,
  latitude: c.location!.latitude,
  longitude: c.location!.longitude,
  status: c.status,
  has_rf: c.has_rf,
  pair_id: c.pair_id,
  pair_name: PAIRS.find((p) => p.id === c.pair_id)?.name ?? null,
  project_id: c.pair_id === 'pair-1' ? 'prj-gift' : 'prj-adani',
  project_name: c.pair_id === 'pair-1' ? 'GIFT City Backbone POC' : 'Adani Shantigram Campus Link',
}))

// ── Location history ───────────────────────────────────────

export const LOCATION_HISTORY: LocationHistory[] = [
  {
    id: 'lh-01',
    couple_id: 'cpl-c4',
    old_latitude: 23.1342,
    old_longitude: 72.5498,
    new_latitude: 23.1387,
    new_longitude: 72.5451,
    moved_at: daysAgo(26, 15, 10),
    handled_by: 'Suresh Rathod',
    had_rf: false,
    distance_meters: 685,
    fitting_materials_snapshot: null,
    configuration_snapshot: null,
    notes: 'Moved from temporary gantry to permanent mast M-4 after civil work finished.',
    created_at: daysAgo(26, 15, 10),
  },
  {
    id: 'lh-02',
    couple_id: 'cpl-c2',
    old_latitude: 23.2129,
    old_longitude: 72.6404,
    new_latitude: 23.2156,
    new_longitude: 72.6369,
    moved_at: daysAgo(18, 11, 35),
    handled_by: 'Arjun Mehta',
    had_rf: true,
    distance_meters: 452,
    fitting_materials_snapshot: null,
    configuration_snapshot: null,
    notes: 'Shifted to Tower-2 terrace for a cleaner Fresnel zone over the tree line.',
    created_at: daysAgo(18, 11, 35),
  },
]
