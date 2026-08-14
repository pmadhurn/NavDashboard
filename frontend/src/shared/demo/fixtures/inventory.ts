/** Inventory: assets, custody, requests, vendors, kits, repairs, handovers, gate passes. */
import type {
  Asset,
  AssetCategory,
  AssetHistoryEntry,
  AssetReport,
  DeployedGroup,
} from '@/modules/inventory/hooks/useAssets'
import type {
  AssetMovement,
  CustodySummary,
  CustodyType,
  Condition,
  Party,
  StockLocation,
} from '@/modules/inventory/hooks/useCustody'
import type { ItemRequest } from '@/modules/inventory/hooks/useRequests'
import type { Bundle, Handover, Repair } from '@/modules/inventory/hooks/useMovement'
import type { OutwardMovement } from '@/modules/inventory/hooks/useOutward'
import { countBy, daysAgo, dateOnly } from './helpers'

// ── Categories ─────────────────────────────────────────────

export const ASSET_CATEGORIES: AssetCategory[] = [
  { id: 'cat-iu', name: 'Indoor Units', parent_id: null, sort_order: 1, requires_serial: true },
  { id: 'cat-ou', name: 'Outdoor Units', parent_id: null, sort_order: 2, requires_serial: true },
  { id: 'cat-rf', name: 'RF Units', parent_id: null, sort_order: 3, requires_serial: true },
  { id: 'cat-hc', name: 'Hybrid Cables', parent_id: null, sort_order: 4, requires_serial: true },
  { id: 'cat-pc', name: 'Patch Cords', parent_id: null, sort_order: 5, requires_serial: false },
  { id: 'cat-mh', name: 'Mounting Hardware', parent_id: null, sort_order: 6, requires_serial: false },
  { id: 'cat-tools', name: 'Tools', parent_id: null, sort_order: 7, requires_serial: false },
]

const cat = (id: string): AssetCategory => ASSET_CATEGORIES.find((c) => c.id === id)!

// ── Stock locations / parties ──────────────────────────────

export const STOCK_LOCATIONS: StockLocation[] = [
  {
    id: 'sl-hq',
    name: 'HQ Store — Ahmedabad',
    kind: 'WAREHOUSE',
    address: 'Nav Wireless Technologies, Corporate Road, Prahlad Nagar, Ahmedabad',
    notes: null,
    sort_order: 1,
    is_default: true,
  },
  {
    id: 'sl-van',
    name: 'Service Van — Gandhinagar',
    kind: 'VEHICLE',
    address: null,
    notes: 'Rolling stock for the GIFT City POC.',
    sort_order: 2,
    is_default: false,
  },
]

export const CUSTOMERS: Party[] = [
  {
    id: 'cus-gift',
    name: 'GIFT City Ltd',
    contact_name: 'Hardik Trivedi',
    contact_phone: '+91 79 6134 5500',
    contact_email: 'hardik.trivedi@giftgujarat.in',
    notes: 'POC customer — evaluating the 10G backbone.',
  },
  {
    id: 'cus-adani',
    name: 'Adani Realty',
    contact_name: 'Meera Shah',
    contact_phone: '+91 79 2555 4141',
    contact_email: 'meera.shah@adani.com',
    notes: null,
  },
  {
    id: 'cus-sdb',
    name: 'Surat Diamond Bourse',
    contact_name: 'Jignesh Kapadia',
    contact_phone: '+91 261 298 8000',
    contact_email: 'jignesh.k@sdb.co.in',
    notes: 'Installation starts later this month.',
  },
  {
    id: 'cus-vmc',
    name: 'Vadodara Municipal School Board',
    contact_name: 'Rakesh Vaghela',
    contact_phone: '+91 265 243 1211',
    contact_email: 'rakesh.vaghela@vmc.gov.in',
    notes: 'Pilot completed and handed over.',
  },
]

export const VENDORS: Party[] = [
  {
    id: 'ven-balaji',
    name: 'Shree Balaji Electronics',
    contact_name: 'Mahesh Bhatt',
    contact_phone: '+91 98240 11223',
    contact_email: 'sales@shreebalajielec.in',
    notes: 'Relief Road, Ahmedabad. Fast on connectors and passives.',
  },
  {
    id: 'ven-git',
    name: 'Gujarat Infotech Supplies',
    contact_name: 'Falguni Desai',
    contact_phone: '+91 98980 45671',
    contact_email: 'falguni@gujaratinfotech.co.in',
    notes: 'Fibre drums and structured cabling.',
  },
  {
    id: 'ven-om',
    name: 'Om Communication Systems',
    contact_name: 'Nilesh Prajapati',
    contact_phone: '+91 97250 33890',
    contact_email: 'service@omcomm.in',
    notes: 'Vadodara. Authorised repair centre for RF units.',
  },
  {
    id: 'ven-precision',
    name: 'Precision Tools & Fasteners',
    contact_name: 'Bharat Solanki',
    contact_phone: '+91 94270 76512',
    contact_email: 'bharat@precisiontools.in',
    notes: 'Rajkot. Mounting hardware and anchors.',
  },
]

// ── Assets (24) ────────────────────────────────────────────

interface AssetSeed {
  id: string
  code: string
  name: string
  catId: string
  serial?: string
  qty?: number
  custody: CustodyType
  custodyId?: string
  custodyLabel: string
  condition?: Condition
  personId?: string
  personName?: string
  projectId?: string
  price?: number
  notes?: string
  expectedReturn?: string
  deviceId?: string
}

const seed = (s: AssetSeed): Asset => ({
  id: s.id,
  asset_code: s.code,
  name: s.name,
  category: cat(s.catId),
  item_kind: s.serial ? 'SERIALIZED' : 'BULK',
  serial_number: s.serial ?? null,
  quantity: s.qty ?? 1,
  current_project_id: s.projectId ?? null,
  current_person: s.personId ? { id: s.personId, full_name: s.personName ?? '' } : null,
  device_id: s.deviceId ?? null,
  purchase_date: dateOnly(55),
  purchase_price: s.price ?? null,
  notes: s.notes ?? null,
  tags: null,
  tag_identifiers: null,
  custody_type: s.custody,
  custody_id: s.custodyId ?? null,
  custody_label: s.custodyLabel,
  condition: s.condition ?? 'OK',
  expected_return_date: s.expectedReturn ?? null,
  is_available: s.custody === 'LOCATION' && (s.condition ?? 'OK') === 'OK',
  created_at: daysAgo(55),
})

const HQ = { custody: 'LOCATION' as CustodyType, custodyId: 'sl-hq', custodyLabel: 'HQ Store — Ahmedabad' }

export const ASSETS: Asset[] = [
  // Indoor Units
  seed({ id: 'ast-iu-01', code: 'AST-0101', name: 'Indoor Unit — OpticSpectra 10G', catId: 'cat-iu', serial: 'NW-IU-24015', price: 165000, ...HQ }),
  seed({ id: 'ast-iu-02', code: 'AST-0102', name: 'Indoor Unit — OpticSpectra 1G', catId: 'cat-iu', serial: 'NW-IU-24016', price: 88000, ...HQ }),
  seed({
    id: 'ast-iu-03', code: 'AST-0103', name: 'Indoor Unit — OpticSpectra 1G', catId: 'cat-iu', serial: 'NW-IU-24017', price: 88000,
    custody: 'PERSON', custodyId: 'per-arjun', custodyLabel: 'Arjun Mehta', personId: 'per-arjun', personName: 'Arjun Mehta',
    notes: 'Bench-checked for the Surat survey.',
  }),
  seed({
    id: 'ast-iu-04', code: 'AST-0104', name: 'Indoor Unit — OpticSpectra 10G', catId: 'cat-iu', serial: 'NW-IU-24018', price: 165000,
    custody: 'PROJECT', custodyId: 'prj-gift', custodyLabel: 'GIFT City Backbone POC', projectId: 'prj-gift',
    expectedReturn: dateOnly(-6),
  }),
  // Outdoor Units
  seed({ id: 'ast-ou-01', code: 'AST-0105', name: 'Outdoor Unit — OpticSpectra 10G', catId: 'cat-ou', serial: 'NW-OU-24025', price: 210000, ...HQ }),
  seed({ id: 'ast-ou-02', code: 'AST-0106', name: 'Outdoor Unit — OpticSpectra 1G', catId: 'cat-ou', serial: 'NW-OU-24026', price: 118000, ...HQ }),
  seed({
    id: 'ast-ou-03', code: 'AST-0107', name: 'Outdoor Unit — OpticSpectra 10G', catId: 'cat-ou', serial: 'NW-OU-24027', price: 210000,
    custody: 'PROJECT', custodyId: 'prj-gift', custodyLabel: 'GIFT City Backbone POC', projectId: 'prj-gift',
    expectedReturn: dateOnly(-6),
  }),
  seed({
    id: 'ast-ou-04', code: 'AST-0108', name: 'Outdoor Unit — OpticSpectra 1G', catId: 'cat-ou', serial: 'NW-OU-24028', price: 118000,
    custody: 'PERSON', custodyId: 'per-priya', custodyLabel: 'Priya Sharma', personId: 'per-priya', personName: 'Priya Sharma',
    notes: 'Swap candidate for the faulty Shantigram OU.',
  }),
  // RF Units
  seed({
    id: 'ast-rf-01', code: 'AST-0109', name: 'RF Unit — RF-5800', catId: 'cat-rf', serial: 'NW-RF-24042', price: 46000,
    custody: 'VENDOR', custodyId: 'ven-om', custodyLabel: 'Om Communication Systems', condition: 'UNDER_REPAIR',
    notes: 'No TX output after a lightning surge — sent to Om Communication.',
  }),
  seed({ id: 'ast-rf-02', code: 'AST-0110', name: 'RF Unit — RF-5800', catId: 'cat-rf', serial: 'NW-RF-24043', price: 46000, ...HQ }),
  seed({
    id: 'ast-rf-03', code: 'AST-0111', name: 'RF Unit — RF-5800', catId: 'cat-rf', serial: 'NW-RF-24044', price: 46000,
    custody: 'CUSTOMER', custodyId: 'cus-gift', custodyLabel: 'GIFT City Ltd',
    notes: 'On loan to the customer lab for interference testing.',
  }),
  // Hybrid Cables
  seed({
    id: 'ast-hc-01', code: 'AST-0112', name: 'Hybrid Cable 30 m', catId: 'cat-hc', serial: 'NW-HC-24035', price: 5400,
    condition: 'DAMAGED', notes: 'Kinked on the drum during the Shantigram pull — do not issue.', ...HQ,
  }),
  seed({ id: 'ast-hc-02', code: 'AST-0113', name: 'Hybrid Cable 50 m', catId: 'cat-hc', serial: 'NW-HC-24036', price: 8200, ...HQ }),
  seed({
    id: 'ast-hc-03', code: 'AST-0114', name: 'Hybrid Cable 30 m', catId: 'cat-hc', serial: 'NW-HC-24037', price: 5400,
    custody: 'PROJECT', custodyId: 'prj-gift', custodyLabel: 'GIFT City Backbone POC', projectId: 'prj-gift',
    expectedReturn: dateOnly(-6),
  }),
  seed({ id: 'ast-hc-04', code: 'AST-0115', name: 'Hybrid Cable 100 m', catId: 'cat-hc', serial: 'NW-HC-24038', price: 14600, ...HQ }),
  // Patch Cords (bulk)
  seed({ id: 'ast-pc-01', code: 'AST-0116', name: 'LC–LC patch cords, 3 m', catId: 'cat-pc', qty: 40, price: 250, ...HQ }),
  seed({
    id: 'ast-pc-02', code: 'AST-0117', name: 'LC–LC patch cords, 10 m', catId: 'cat-pc', qty: 12, price: 420,
    custody: 'PROJECT', custodyId: 'prj-adani', custodyLabel: 'Adani Shantigram Campus Link', projectId: 'prj-adani',
  }),
  // Mounting Hardware (bulk)
  seed({
    id: 'ast-mh-01', code: 'AST-0118', name: 'Pole-mount clamp set', catId: 'cat-mh', qty: 20, price: 850,
    custody: 'PROJECT', custodyId: 'prj-adani', custodyLabel: 'Adani Shantigram Campus Link', projectId: 'prj-adani',
  }),
  seed({ id: 'ast-mh-02', code: 'AST-0119', name: 'Wall-mount bracket kit', catId: 'cat-mh', qty: 15, price: 1200, ...HQ }),
  seed({ id: 'ast-mh-03', code: 'AST-0120', name: 'Anchor fastener box (M10)', catId: 'cat-mh', qty: 30, price: 340, ...HQ }),
  // Tools
  seed({
    id: 'ast-tool-01', code: 'AST-0121', name: 'Alignment telescope kit', catId: 'cat-tools', price: 32000,
    custody: 'PERSON', custodyId: 'per-arjun', custodyLabel: 'Arjun Mehta', personId: 'per-arjun', personName: 'Arjun Mehta',
    expectedReturn: dateOnly(3), notes: 'Due back after the Infocity re-check.',
  }),
  seed({
    id: 'ast-tool-02', code: 'AST-0122', name: 'Fusion splicer — Sumitomo T-72C', catId: 'cat-tools', price: 385000,
    custody: 'PERSON', custodyId: 'per-priya', custodyLabel: 'Priya Sharma', personId: 'per-priya', personName: 'Priya Sharma',
  }),
  seed({ id: 'ast-tool-03', code: 'AST-0123', name: 'Optical power meter', catId: 'cat-tools', price: 18500, ...HQ }),
  seed({ id: 'ast-tool-04', code: 'AST-0124', name: 'Crimping & termination kit', catId: 'cat-tools', price: 6800, ...HQ }),
]

export const assetById = (id: string): Asset | undefined => ASSETS.find((a) => a.id === id)

// ── Custody summary (computed so the numbers always reconcile) ──

export const CUSTODY_SUMMARY: CustodySummary = {
  total: ASSETS.length,
  available: ASSETS.filter((a) => a.is_available).length,
  overdue: 1, // the alignment telescope ran past its expected return
  needs_reconciliation: 0,
  by_custody: countBy(ASSETS, (a) => a.custody_type),
  by_condition: countBy(ASSETS, (a) => a.condition),
  by_location: [
    {
      location: 'HQ Store — Ahmedabad',
      count: ASSETS.filter((a) => a.custody_type === 'LOCATION').length,
    },
  ],
}

// ── Deployed view ──────────────────────────────────────────

export const DEPLOYED_GROUPS: DeployedGroup[] = [
  {
    project_id: 'prj-gift',
    project_name: 'GIFT City Backbone POC',
    items: ASSETS.filter((a) => a.current_project_id === 'prj-gift').map((a) => ({
      type: 'asset',
      id: a.id,
      label: `${a.asset_code} · ${a.name}`,
      status: a.condition,
      custody: a.custody_label,
    })),
  },
  {
    project_id: 'prj-adani',
    project_name: 'Adani Shantigram Campus Link',
    items: ASSETS.filter((a) => a.current_project_id === 'prj-adani').map((a) => ({
      type: 'asset',
      id: a.id,
      label: `${a.asset_code} · ${a.name}`,
      status: a.condition,
      custody: a.custody_label,
    })),
  },
]

// ── Per-asset history & movements ──────────────────────────

export const ASSET_MOVEMENTS: Record<string, AssetMovement[]> = {
  'ast-rf-01': [
    {
      id: 'am-rf1-1',
      asset_id: 'ast-rf-01',
      event_type: 'CONDITION',
      from_custody_type: 'LOCATION',
      from_label: 'HQ Store — Ahmedabad',
      to_custody_type: 'LOCATION',
      to_label: 'HQ Store — Ahmedabad',
      from_condition: 'OK',
      to_condition: 'DAMAGED',
      quantity: 1,
      reason: 'No TX output after lightning surge at Shantigram mast.',
      performed_by: 'Suresh Rathod',
      occurred_at: daysAgo(14, 17, 5),
    },
    {
      id: 'am-rf1-2',
      asset_id: 'ast-rf-01',
      event_type: 'SENT_FOR_REPAIR',
      from_custody_type: 'LOCATION',
      from_label: 'HQ Store — Ahmedabad',
      to_custody_type: 'VENDOR',
      to_label: 'Om Communication Systems',
      from_condition: 'DAMAGED',
      to_condition: 'UNDER_REPAIR',
      quantity: 1,
      reason: 'Repair estimate approved — ₹6,500.',
      performed_by: 'Neha Joshi',
      occurred_at: daysAgo(10, 11, 20),
    },
  ],
  'ast-tool-01': [
    {
      id: 'am-t1-1',
      asset_id: 'ast-tool-01',
      event_type: 'ISSUED',
      from_custody_type: 'LOCATION',
      from_label: 'HQ Store — Ahmedabad',
      to_custody_type: 'PERSON',
      to_label: 'Arjun Mehta',
      from_condition: 'OK',
      to_condition: 'OK',
      quantity: 1,
      reason: 'Infocity alignment re-check.',
      performed_by: 'Neha Joshi',
      occurred_at: daysAgo(9, 9, 45),
    },
  ],
}

/** A believable default trail for assets without a bespoke one. */
export const genericMovements = (assetId: string): AssetMovement[] => {
  const a = assetById(assetId)
  return [
    {
      id: `am-${assetId}-in`,
      asset_id: assetId,
      event_type: 'RECEIVED',
      from_custody_type: null,
      from_label: null,
      to_custody_type: 'LOCATION',
      to_label: 'HQ Store — Ahmedabad',
      from_condition: null,
      to_condition: 'OK',
      quantity: a?.quantity ?? 1,
      reason: 'Goods inward — added to stock.',
      performed_by: 'Neha Joshi',
      occurred_at: daysAgo(55, 12, 0),
    },
  ]
}

export const genericHistory = (assetId: string): AssetHistoryEntry[] => {
  const a = assetById(assetId)
  return [
    {
      id: `ah-${assetId}-1`,
      event_type: 'CREATED',
      old_status: null,
      new_status: 'IN_STOCK',
      project_id: null,
      person_id: null,
      note: 'Added to inventory at goods inward.',
      performed_by: 'Neha Joshi',
      occurred_at: daysAgo(55, 12, 0),
    },
    ...(a && a.custody_type === 'PROJECT'
      ? [
          {
            id: `ah-${assetId}-2`,
            event_type: 'OUTWARD',
            old_status: 'IN_STOCK',
            new_status: 'AT_PROJECT',
            project_id: a.current_project_id,
            person_id: null,
            note: `Issued to ${a.custody_label}.`,
            performed_by: 'Arjun Mehta',
            occurred_at: daysAgo(8, 8, 30),
          } satisfies AssetHistoryEntry,
        ]
      : []),
  ]
}

// ── Damage / requirement reports ───────────────────────────

export const ASSET_REPORTS: AssetReport[] = [
  {
    id: 'rep-dam-01',
    report_type: 'DAMAGED',
    asset_id: 'ast-hc-01',
    asset: assetById('ast-hc-01') ?? null,
    title: 'Hybrid cable kinked on the drum',
    details: 'Bend radius exceeded during the Shantigram pull. Needs re-termination or scrap decision.',
    quantity: 1,
    status: 'OPEN',
    reported_by: 'Suresh Rathod',
    resolved_at: null,
    created_at: daysAgo(12, 18, 10),
  },
  {
    id: 'rep-req-01',
    report_type: 'REQUIREMENT',
    asset_id: null,
    asset: null,
    title: 'Two more OpticSpectra 1G indoor units for Surat',
    details: 'Surat Diamond Bourse install needs spares on day one — current stock covers only one side.',
    quantity: 2,
    status: 'ORDERED',
    reported_by: 'Kavita Iyer',
    resolved_at: null,
    created_at: daysAgo(9, 10, 30),
  },
]

// ── Purchase requests ──────────────────────────────────────

export const ITEM_REQUESTS: ItemRequest[] = [
  {
    id: 'req-01',
    title: 'OM3 armoured fibre — 500 m drum',
    details: 'For the Surat riser runs. Armoured, outdoor rated.',
    quantity: 1,
    needed_by: dateOnly(-10),
    status: 'REQUESTED',
    requested_by: 'usr-neha',
    requested_by_name: 'Neha Joshi',
    vendor_id: 'ven-git',
    vendor_name: 'Gujarat Infotech Supplies',
    estimated_cost: 38500,
    status_note: null,
    resolved_at: null,
    created_at: daysAgo(2, 11, 15),
  },
  {
    id: 'req-02',
    title: '30 m hybrid cable assemblies',
    details: 'Replacement for the damaged drum plus one spare.',
    quantity: 4,
    needed_by: dateOnly(-7),
    status: 'APPROVED',
    requested_by: 'usr-neha',
    requested_by_name: 'Neha Joshi',
    vendor_id: 'ven-om',
    vendor_name: 'Om Communication Systems',
    estimated_cost: 64000,
    status_note: 'Approved — club with the RF repair courier to save freight.',
    resolved_at: null,
    created_at: daysAgo(6, 15, 40),
  },
  {
    id: 'req-03',
    title: 'Surge protectors, Class II',
    details: 'One per mast after the Shantigram lightning hit.',
    quantity: 12,
    needed_by: dateOnly(-5),
    status: 'ORDERED',
    requested_by: 'usr-kavita',
    requested_by_name: 'Kavita Iyer',
    vendor_id: 'ven-balaji',
    vendor_name: 'Shree Balaji Electronics',
    estimated_cost: 21600,
    status_note: 'PO NW/26-27/084 raised.',
    resolved_at: null,
    created_at: daysAgo(8, 12, 5),
  },
  {
    id: 'req-04',
    title: 'GyroMount G2 spare gimbal motor',
    details: 'Preventive spare — the GIFT City mount logs occasional stall warnings.',
    quantity: 2,
    needed_by: null,
    status: 'REQUESTED',
    requested_by: 'usr-kavita',
    requested_by_name: 'Kavita Iyer',
    vendor_id: null,
    vendor_name: null,
    estimated_cost: 18000,
    status_note: null,
    resolved_at: null,
    created_at: daysAgo(4, 9, 50),
  },
  {
    id: 'req-05',
    title: 'LC–LC patch cords, 5 m',
    details: null,
    quantity: 50,
    needed_by: null,
    status: 'RECEIVED',
    requested_by: 'usr-neha',
    requested_by_name: 'Neha Joshi',
    vendor_id: 'ven-balaji',
    vendor_name: 'Shree Balaji Electronics',
    estimated_cost: 12500,
    status_note: 'Received and binned.',
    resolved_at: daysAgo(6, 14, 20),
    created_at: daysAgo(16, 10, 10),
  },
  {
    id: 'req-06',
    title: 'Diesel generator, 5 kVA, for Surat site',
    details: 'Site power is not ready for the install window.',
    quantity: 1,
    needed_by: dateOnly(-14),
    status: 'REJECTED',
    requested_by: 'usr-kavita',
    requested_by_name: 'Kavita Iyer',
    vendor_id: 'ven-precision',
    vendor_name: 'Precision Tools & Fasteners',
    estimated_cost: 185000,
    status_note: 'Rent locally in Surat instead of buying.',
    resolved_at: daysAgo(3, 16, 35),
    created_at: daysAgo(7, 13, 25),
  },
]

// ── Kits ───────────────────────────────────────────────────

const bundleItem = (assetId: string) => {
  const a = assetById(assetId)!
  return {
    id: a.id,
    asset_code: a.asset_code,
    name: a.name,
    quantity: a.quantity,
    available: a.is_available,
  }
}

export const BUNDLES: Bundle[] = [
  {
    id: 'bun-01',
    name: 'Site Survey Kit',
    description: 'Everything a two-person crew needs for a desktop-to-physical survey day.',
    items: [bundleItem('ast-tool-01'), bundleItem('ast-tool-03'), bundleItem('ast-pc-01')],
  },
  {
    id: 'bun-02',
    name: 'Deployment Kit — 1G Pair',
    description: 'One full side of an OpticSpectra 1G link, ready to issue as a unit.',
    items: [
      bundleItem('ast-iu-02'),
      bundleItem('ast-ou-02'),
      bundleItem('ast-hc-02'),
      bundleItem('ast-mh-02'),
    ],
  },
]

// ── Repairs ────────────────────────────────────────────────

export const REPAIRS: Repair[] = [
  {
    id: 'rpr-01',
    asset_id: 'ast-rf-01',
    asset_code: 'AST-0109',
    asset_name: 'RF Unit — RF-5800',
    status: 'SENT',
    damage_details: 'No TX output after a lightning surge at the Shantigram mast.',
    damaged_at: daysAgo(14, 17, 5),
    damage_location: 'Shantigram mast M-4',
    responsible_person_id: 'per-suresh',
    responsible_name: 'Suresh Rathod',
    is_repairable: true,
    vendor_id: 'ven-om',
    cost: 6500,
    sent_at: daysAgo(10, 11, 20),
    received_at: null,
    outcome_note: null,
    created_at: daysAgo(14, 17, 20),
  },
]

// ── Handovers ──────────────────────────────────────────────

export const HANDOVERS: Handover[] = [
  {
    id: 'ho-01',
    from_person_id: 'per-arjun',
    from_name: 'Arjun Mehta',
    to_person_id: 'per-priya',
    to_name: 'Priya Sharma',
    status: 'PENDING',
    note: 'Taking over Surat survey prep from Monday — telescope and the bench-checked IU.',
    response_note: null,
    responded_at: null,
    created_at: daysAgo(1, 17, 50),
    items: [
      { id: 'ast-iu-03', asset_code: 'AST-0103', name: 'Indoor Unit — OpticSpectra 1G' },
      { id: 'ast-tool-01', asset_code: 'AST-0121', name: 'Alignment telescope kit' },
    ],
  },
]

// ── Gate passes (outward movements) ────────────────────────

const brief = (assetId: string) => {
  const a = assetById(assetId)!
  return { id: a.id, asset_code: a.asset_code, name: a.name, serial_number: a.serial_number }
}

export const OUTWARD_MOVEMENTS: OutwardMovement[] = [
  {
    id: 'gp2f7a91c4',
    project_id: 'prj-gift',
    project_name: 'GIFT City Backbone POC',
    direction: 'OUTWARD',
    purpose: 'TESTING',
    movement_date: daysAgo(8, 8, 30),
    handled_by: 'per-arjun',
    handler: { id: 'per-arjun', full_name: 'Arjun Mehta' },
    received_by_name: 'Hardik Trivedi (GIFT City Ltd)',
    expected_return_date: dateOnly(-6),
    notes: 'Soak-test rig for the 10G hop — spare heads plus test leads.',
    created_at: daysAgo(8, 8, 30),
    items: [
      {
        id: 'gpi-01',
        asset: brief('ast-iu-04'),
        quantity: 1,
        condition_note: null,
        item_status: 'WITH_CLIENT',
        return_outcome: null,
        outcome_note: null,
        resolved_at: null,
      },
      {
        id: 'gpi-02',
        asset: brief('ast-ou-03'),
        quantity: 1,
        condition_note: null,
        item_status: 'WITH_CLIENT',
        return_outcome: null,
        outcome_note: null,
        resolved_at: null,
      },
      {
        id: 'gpi-03',
        asset: brief('ast-hc-03'),
        quantity: 1,
        condition_note: null,
        item_status: 'WITH_CLIENT',
        return_outcome: null,
        outcome_note: null,
        resolved_at: null,
      },
      {
        id: 'gpi-04',
        asset: brief('ast-tool-03'),
        quantity: 1,
        condition_note: null,
        item_status: 'RETURNED',
        return_outcome: 'RETURNED',
        outcome_note: 'Back in the store after day-one measurements.',
        resolved_at: daysAgo(2, 18, 15),
      },
      {
        id: 'gpi-05',
        asset: brief('ast-pc-01'),
        quantity: 10,
        condition_note: null,
        item_status: 'RETURNED',
        return_outcome: 'RETURNED',
        outcome_note: null,
        resolved_at: daysAgo(2, 18, 15),
      },
    ],
  },
  {
    id: 'gp8b3d52e0',
    project_id: 'prj-adani',
    project_name: 'Adani Shantigram Campus Link',
    direction: 'OUTWARD',
    purpose: 'DEPLOYMENT',
    movement_date: daysAgo(30, 9, 0),
    handled_by: 'per-suresh',
    handler: { id: 'per-suresh', full_name: 'Suresh Rathod' },
    received_by_name: 'Site store, Shantigram',
    expected_return_date: null,
    notes: 'Consumables for the campus link build — stays at site.',
    created_at: daysAgo(30, 9, 0),
    items: [
      {
        id: 'gpi-06',
        asset: brief('ast-pc-02'),
        quantity: 12,
        condition_note: null,
        item_status: 'WITH_CLIENT',
        return_outcome: 'LEFT_AT_SITE',
        outcome_note: 'Installed in the campus racks.',
        resolved_at: daysAgo(20, 12, 0),
      },
      {
        id: 'gpi-07',
        asset: brief('ast-mh-01'),
        quantity: 20,
        condition_note: null,
        item_status: 'WITH_CLIENT',
        return_outcome: 'LEFT_AT_SITE',
        outcome_note: null,
        resolved_at: daysAgo(20, 12, 0),
      },
      {
        id: 'gpi-08',
        asset: brief('ast-tool-04'),
        quantity: 1,
        condition_note: null,
        item_status: 'RETURNED',
        return_outcome: 'RETURNED',
        outcome_note: null,
        resolved_at: daysAgo(16, 17, 45),
      },
    ],
  },
]

/** Passes that still have unresolved lines — what /projects/movements/open returns. */
export const OPEN_OUTWARDS: OutwardMovement[] = OUTWARD_MOVEMENTS.filter((m) =>
  m.items.some((i) => !i.resolved_at),
)
