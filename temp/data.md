## Full Files Needed (11 files)

These I need complete — they're either being REPLACED or contain types/APIs I must match exactly:

1. **`frontend/package.json`** — must REPLACE, need all current deps
{
  "name": "navdashboard-frontend",
  "version": "0.1.0",
  "private": true,
  "description": "",
  "license": "ISC",
  "author": "",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "antd": "^5.22.0",
    "@ant-design/icons": "^5.5.0",
    "axios": "^1.7.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.60.0",
    "dayjs": "^1.11.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^6.0.0"
  }
}



2. **`frontend/src/app/routes.tsx`** — must REPLACE
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  ApiOutlined,
  LinkOutlined,
  SwapOutlined,
  EnvironmentOutlined,
  ToolOutlined,
  RobotOutlined,
  HistoryOutlined,
  FileOutlined,
  BarChartOutlined,
  AuditOutlined,
  SearchOutlined,
  DiffOutlined,
  CloudDownloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import Layout from '@/shared/components/Layout';
import PlaceholderPage from '@/shared/components/PlaceholderPage';
import LoginPage from '@/modules/auth/pages/LoginPage';
import DashboardPage from '@/modules/dashboard/pages/DashboardPage';
import DeviceListPage from '@/modules/devices/pages/DeviceListPage';
import DeviceDetailPage from '@/modules/devices/pages/DeviceDetailPage';
import CoupleListPage from '@/modules/couples/pages/CoupleListPage';
import CoupleDetailPage from '@/modules/couples/pages/CoupleDetailPage';
import PairListPage from '@/modules/pairs/pages/PairListPage';
import PairDetailPage from '@/modules/pairs/pages/PairDetailPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="devices" element={<DeviceListPage />} />
        <Route path="devices/:id" element={<DeviceDetailPage />} />
        <Route path="couples" element={<CoupleListPage />} />
        <Route path="couples/:id" element={<CoupleDetailPage />} />
        <Route path="pairs" element={<PairListPage />} />
        <Route path="pairs/:id" element={<PairDetailPage />} />
        <Route path="map" element={<PlaceholderPage title="Map" icon={<EnvironmentOutlined />} />} />
        <Route path="troubleshooting" element={<PlaceholderPage title="Troubleshooting" icon={<ToolOutlined />} />} />
        <Route path="ai" element={<PlaceholderPage title="AI Assistant" icon={<RobotOutlined />} />} />
        <Route path="location-history" element={<PlaceholderPage title="Location History" icon={<HistoryOutlined />} />} />
        <Route path="documents" element={<PlaceholderPage title="Documents" icon={<FileOutlined />} />} />
        <Route path="reports" element={<PlaceholderPage title="Reports" icon={<BarChartOutlined />} />} />
        <Route path="audit" element={<PlaceholderPage title="Audit Trail" icon={<AuditOutlined />} />} />
        <Route path="search" element={<PlaceholderPage title="Search" icon={<SearchOutlined />} />} />
        <Route path="comparison" element={<PlaceholderPage title="Comparison" icon={<DiffOutlined />} />} />
        <Route path="backup" element={<PlaceholderPage title="Backup" icon={<CloudDownloadOutlined />} />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" icon={<SettingOutlined />} />} />
      </Route>
      <Route path="login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}



3. **`frontend/src/modules/couples/components/CoupleForm.tsx`** — must REPLACE entirely
import React, { useEffect, useState } from 'react'
import { Form, Select, Input, Button, Space, Switch, message } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import GlassModal from '@/shared/components/GlassModal'
import GlassButton from '@/shared/components/GlassButton'
import GlassInput from '@/shared/components/GlassInput'
import MaterialSelector from './MaterialSelector'
import { useCreateCouple, useUpdateCouple } from '../hooks/useCouples'
import { api } from '@/shared/api/client'
import type { Couple, MaterialCreateInline } from '@/shared/types/couples'
import type { PaginatedResponse } from '@/shared/types/common'
import type { Device } from '@/shared/types/devices'

interface PersonOption {
  id: string
  full_name: string
}

interface CoupleFormProps {
  open: boolean
  onClose: () => void
  couple?: Couple | null
}

interface CustomFieldRow {
  key: string
  value: string
}

export default function CoupleForm({ open, onClose, couple }: CoupleFormProps) {
  const [form] = Form.useForm()
  const createCouple = useCreateCouple()
  const updateCouple = useUpdateCouple()
  const isEdit = !!couple

  const [hasRf, setHasRf] = useState(false)
  const [materials, setMaterials] = useState<MaterialCreateInline[]>([])
  const [customFields, setCustomFields] = useState<CustomFieldRow[]>([])
  const [personnelOptions, setPersonnelOptions] = useState<PersonOption[]>([])
  const [deviceOptions, setDeviceOptions] = useState<Device[]>([])
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    api
      .get<PaginatedResponse<PersonOption>>('/personnel', { size: 100 })
      .then((res) => setPersonnelOptions(res.items))
      .catch(() => {})
    api
      .get<PaginatedResponse<Device>>('/devices', { size: 100 })
      .then((res) => setDeviceOptions(res.items))
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (open) {
      if (couple) {
        form.setFieldsValue({
          name: couple.name,
          status: couple.status,
          handling_person_id: couple.handling_person_id || undefined,
          latitude: couple.location?.latitude ?? '',
          longitude: couple.location?.longitude ?? '',
          address_note: couple.location?.address_note || '',
          configuration: couple.configuration ? JSON.stringify(couple.configuration, null, 2) : '',
          notes: couple.notes || '',
        })
        setHasRf(couple.has_rf)
        setMaterials([])
        setSelectedDeviceIds([])
        if (couple.custom_fields) {
          setCustomFields(
            Object.entries(couple.custom_fields).map(([k, v]) => ({
              key: k,
              value: String(v),
            }))
          )
        } else {
          setCustomFields([])
        }
      } else {
        form.resetFields()
        form.setFieldsValue({ status: 'WORKING' })
        setHasRf(false)
        setMaterials([])
        setCustomFields([])
        setSelectedDeviceIds([])
      }
    }
  }, [open, couple, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const cfObj: Record<string, string> | null =
        customFields.length > 0
          ? customFields.reduce((acc, row) => {
              if (row.key.trim()) acc[row.key.trim()] = row.value
              return acc
            }, {} as Record<string, string>)
          : null

      let configuration: Record<string, unknown> | null = null
      if (values.configuration) {
        try {
          configuration = JSON.parse(values.configuration)
        } catch {
          message.error('Invalid JSON in configuration')
          return
        }
      }

      const hasLocation = values.latitude !== '' && values.longitude !== ''

      if (isEdit && couple) {
        await updateCouple.mutateAsync({
          id: couple.id,
          data: {
            name: values.name,
            status: values.status,
            has_rf: hasRf,
            handling_person_id: values.handling_person_id || null,
            configuration,
            notes: values.notes || null,
            custom_fields: cfObj,
          },
        })
        message.success('Couple updated')
      } else {
        await createCouple.mutateAsync({
          name: values.name,
          status: values.status,
          has_rf: hasRf,
          handling_person_id: values.handling_person_id || null,
          location: hasLocation
            ? {
                latitude: parseFloat(values.latitude),
                longitude: parseFloat(values.longitude),
                address_note: values.address_note || null,
              }
            : null,
          device_ids: selectedDeviceIds.length > 0 ? selectedDeviceIds : undefined,
          fitting_materials: materials.length > 0 ? materials : undefined,
          configuration,
          notes: values.notes || null,
          custom_fields: cfObj,
        })
        message.success('Couple created')
      }
      onClose()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } }
        message.error(axiosErr.response?.data?.detail || 'Operation failed')
      }
    }
  }

  const addCustomField = () => setCustomFields([...customFields, { key: '', value: '' }])
  const removeCustomField = (idx: number) => setCustomFields(customFields.filter((_, i) => i !== idx))
  const updateCustomField = (idx: number, field: 'key' | 'value', val: string) => {
    const updated = [...customFields]
    updated[idx] = { ...updated[idx], [field]: val }
    setCustomFields(updated)
  }

  const isLoading = createCouple.isPending || updateCouple.isPending

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#F2F2F2',
    borderRadius: 8,
  }

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Couple' : 'Add Couple'}
      width={640}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <GlassButton variant="ghost" onClick={onClose}>Cancel</GlassButton>
          <GlassButton onClick={handleSubmit} loading={isLoading}>
            {isEdit ? 'Update' : 'Create'}
          </GlassButton>
        </div>
      }
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="name"
          label={<span style={{ color: '#B8B8B8' }}>Name</span>}
          rules={[{ required: true, message: 'Name is required' }]}
        >
          <GlassInput placeholder="e.g. Couple A1" />
        </Form.Item>

        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div>
            <span style={{ color: '#B8B8B8', fontSize: 14 }}>Has RF</span>
            <div style={{ marginTop: 8 }}>
              <Switch checked={hasRf} onChange={setHasRf} />
            </div>
          </div>
          <Form.Item
            name="status"
            label={<span style={{ color: '#B8B8B8' }}>Status</span>}
            style={{ flex: 1 }}
          >
            <Select
              options={[
                { label: 'Working', value: 'WORKING' },
                { label: 'Not Working', value: 'NOT_WORKING' },
                { label: 'Faulty', value: 'FAULTY' },
              ]}
            />
          </Form.Item>
        </div>

        <Form.Item
          name="handling_person_id"
          label={<span style={{ color: '#B8B8B8' }}>Handling Person</span>}
        >
          <Select
            placeholder="Select person"
            allowClear
            showSearch
            optionFilterProp="label"
            options={personnelOptions.map((p) => ({
              label: p.full_name,
              value: p.id,
            }))}
          />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <span style={{ color: '#B8B8B8', fontSize: 14, display: 'block', marginBottom: 8 }}>Location</span>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="latitude" style={{ flex: 1, marginBottom: 0 }}>
              <Input type="number" placeholder="Latitude" style={inputStyle} step="0.0001" />
            </Form.Item>
            <Form.Item name="longitude" style={{ flex: 1, marginBottom: 0 }}>
              <Input type="number" placeholder="Longitude" style={inputStyle} step="0.0001" />
            </Form.Item>
          </div>
          <Form.Item name="address_note" style={{ marginTop: 8, marginBottom: 0 }}>
            <Input placeholder="Address note" style={inputStyle} />
          </Form.Item>
        </div>

        {!isEdit && (
          <div style={{ marginBottom: 16 }}>
            <span style={{ color: '#B8B8B8', fontSize: 14, display: 'block', marginBottom: 8 }}>
              Assign Devices
            </span>
            <Select
              mode="multiple"
              placeholder="Select devices..."
              value={selectedDeviceIds}
              onChange={setSelectedDeviceIds}
              style={{ width: '100%' }}
              optionFilterProp="label"
              options={deviceOptions.map((d) => ({
                label: `${d.serial_number} (${d.device_type})`,
                value: d.id,
              }))}
            />
          </div>
        )}

        {!isEdit && (
          <div style={{ marginBottom: 16 }}>
            <span style={{ color: '#B8B8B8', fontSize: 14, display: 'block', marginBottom: 8 }}>
              Fitting Materials
            </span>
            <MaterialSelector value={materials} onChange={setMaterials} />
          </div>
        )}

        <Form.Item
          name="configuration"
          label={<span style={{ color: '#B8B8B8' }}>Configuration (JSON)</span>}
        >
          <Input.TextArea rows={3} placeholder='{"key": "value"}' style={inputStyle} />
        </Form.Item>

        <Form.Item
          name="notes"
          label={<span style={{ color: '#B8B8B8' }}>Notes</span>}
        >
          <Input.TextArea rows={3} placeholder="Optional notes..." style={inputStyle} />
        </Form.Item>

        <div style={{ marginBottom: 8 }}>
          <span style={{ color: '#B8B8B8', fontSize: 14 }}>Custom Fields</span>
        </div>
        {customFields.map((cf, idx) => (
          <Space key={idx} style={{ display: 'flex', marginBottom: 8 }} align="start">
            <Input
              placeholder="Key"
              value={cf.key}
              onChange={(e) => updateCustomField(idx, 'key', e.target.value)}
              style={{ ...inputStyle, width: 150 }}
            />
            <Input
              placeholder="Value"
              value={cf.value}
              onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
              style={{ ...inputStyle, width: 200 }}
            />
            <Button
              type="text"
              icon={<MinusCircleOutlined />}
              onClick={() => removeCustomField(idx)}
              style={{ color: '#9B3E3E' }}
            />
          </Space>
        ))}
        <Button
          type="dashed"
          onClick={addCustomField}
          icon={<PlusOutlined />}
          style={{ width: '100%', borderColor: 'rgba(255,255,255,0.1)', color: '#B8B8B8', borderRadius: 8 }}
        >
          Add Field
        </Button>
      </Form>
    </GlassModal>
  )
}


4. **`frontend/src/styles/global.css`** — must REPLACE
@import './glass.css';

/* ═══════════════════════════════════════════════════ */
/* GLOBAL RESET + BASE STYLES                          */
/* ═══════════════════════════════════════════════════ */

*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  width: 100%;
}

body {
  background: #0A0A0A;
  color: #F2F2F2;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #2A2A2A;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3A3A3A;
}

/* Selection */
::selection {
  background: rgba(230, 230, 230, 0.2);
  color: #F2F2F2;
}

/* ═══════════════════════════════════════════════════ */
/* ANT DESIGN OVERRIDES                                */
/* ═══════════════════════════════════════════════════ */

/* Transitions */
.ant-btn,
.ant-input,
.ant-input-affix-wrapper,
.ant-select,
.ant-menu-item,
.ant-table-row {
  transition: all 0.3s ease !important;
}

/* ─── Input overrides ─── */
.ant-input,
.ant-input-affix-wrapper,
.ant-input-password,
.ant-input-affix-wrapper-lg,
.ant-input-affix-wrapper-sm,
.ant-input-lg,
.ant-input-sm {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid #2A2A2A !important;
  color: #F2F2F2 !important;
  border-radius: 8px !important;
}

.ant-input::placeholder,
.ant-input-affix-wrapper .ant-input::placeholder {
  color: #7A7A7A !important;
}

.ant-input:hover,
.ant-input-affix-wrapper:hover {
  border-color: rgba(255, 255, 255, 0.15) !important;
}

.ant-input:focus,
.ant-input-focused,
.ant-input-affix-wrapper:focus,
.ant-input-affix-wrapper-focused,
.ant-input-affix-wrapper:focus-within {
  border-color: #C9C9C9 !important;
  box-shadow: 0 0 0 2px rgba(201, 201, 201, 0.1) !important;
  background: rgba(255, 255, 255, 0.05) !important;
}

/* Inner input inside affix wrapper (password, prefix inputs) */
.ant-input-affix-wrapper .ant-input {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: #F2F2F2 !important;
}

/* Password eye icon */
.ant-input-password-icon,
.ant-input-suffix {
  color: #7A7A7A !important;
}

.ant-input-password-icon:hover {
  color: #B8B8B8 !important;
}

/* Prefix icon */
.ant-input-prefix {
  color: #7A7A7A !important;
  margin-inline-end: 8px !important;
}

/* ─── Button overrides ─── */
.ant-btn-primary {
  background: #E6E6E6 !important;
  color: #0A0A0A !important;
  border: 1px solid #E6E6E6 !important;
  font-weight: 500 !important;
}

.ant-btn-primary:hover {
  background: #FFFFFF !important;
  border-color: #FFFFFF !important;
}

/* ─── Table overrides ─── */
.ant-table {
  background: transparent !important;
}

.ant-table-thead > tr > th {
  background: #151515 !important;
  color: #B8B8B8 !important;
  border-bottom: 1px solid #242424 !important;
  font-weight: 600;
}

.ant-table-tbody > tr > td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.03) !important;
}

.ant-table-tbody > tr:nth-child(even) > td {
  background: #111111;
}

.ant-table-tbody > tr:hover > td {
  background: #1C1C1C !important;
}

.ant-table-tbody > tr.ant-table-row-selected > td {
  background: #242424 !important;
}

.ant-table-placeholder {
  background: transparent !important;
}

.ant-table-cell {
  color: #F2F2F2 !important;
}

/* ─── Modal overrides ─── */
.ant-modal-mask {
  background: rgba(0, 0, 0, 0.7) !important;
  backdrop-filter: blur(4px);
}

.ant-modal-content {
  background: rgba(20, 20, 20, 0.95) !important;
  backdrop-filter: blur(30px) !important;
  -webkit-backdrop-filter: blur(30px) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 20px !important;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5) !important;
}

.ant-modal-header {
  background: transparent !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.ant-modal-title {
  color: #F2F2F2 !important;
}

.ant-modal-close-x {
  color: #7A7A7A !important;
}

.ant-modal-close:hover .ant-modal-close-x {
  color: #F2F2F2 !important;
}

.ant-modal-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
}

/* ─── Menu overrides (sidebar) ─── */
.ant-menu-dark {
  background: transparent !important;
}

.ant-menu-dark .ant-menu-item {
  color: #B8B8B8 !important;
  margin-inline: 8px !important;
  border-radius: 8px !important;
}

.ant-menu-dark .ant-menu-item:hover {
  background: #1A1A1A !important;
  color: #F2F2F2 !important;
}

.ant-menu-dark .ant-menu-item-selected {
  background: #1E1E1E !important;
  color: #F2F2F2 !important;
  border-left: 3px solid #E6E6E6;
}

.ant-menu-dark .ant-menu-item .ant-menu-item-icon {
  color: #C8C8C8 !important;
}

/* ─── Dropdown overrides ─── */
.ant-dropdown-menu {
  background: rgba(31, 31, 31, 0.95) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
}

.ant-dropdown-menu-item {
  color: #F2F2F2 !important;
}

.ant-dropdown-menu-item:hover {
  background: rgba(255, 255, 255, 0.06) !important;
}

/* ─── Pagination ─── */
.ant-pagination-item {
  background: transparent !important;
  border-color: #242424 !important;
}

.ant-pagination-item a {
  color: #B8B8B8 !important;
}

.ant-pagination-item-active {
  background: rgba(230, 230, 230, 0.1) !important;
  border-color: #E6E6E6 !important;
}

.ant-pagination-item-active a {
  color: #E6E6E6 !important;
}

/* ─── Misc ─── */
.ant-spin-text {
  color: #B8B8B8 !important;
}

.ant-empty-description {
  color: #7A7A7A !important;
}

.ant-breadcrumb-separator {
  color: #7A7A7A !important;
}

.ant-tooltip-inner {
  background: rgba(31, 31, 31, 0.95) !important;
  backdrop-filter: blur(10px) !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.ant-message-notice-content {
  background: rgba(31, 31, 31, 0.95) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
  color: #F2F2F2 !important;
}

5. **`frontend/src/shared/types/couples.ts`** — need exact types (MapDataPoint, Couple)
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



6. **`frontend/src/shared/types/locations.ts`** — need LocationHistory type
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
}

7. **`frontend/src/shared/types/pairs.ts`** — need Pair type
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

8. **`frontend/src/shared/api/client.ts`** — need API call patterns
import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export const api = {
  get: <T>(url: string, params?: object): Promise<T> =>
    axiosInstance.get(url, { params }).then(res => res.data),
  post: <T>(url: string, data?: object): Promise<T> =>
    axiosInstance.post(url, data).then(res => res.data),
  put: <T>(url: string, data?: object): Promise<T> =>
    axiosInstance.put(url, data).then(res => res.data),
  del: <T>(url: string): Promise<T> =>
    axiosInstance.delete(url).then(res => res.data),
}

9. **`frontend/src/shared/stores/uiStore.ts`** — used in MapViewPage
import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean;
  currentPageTitle: string;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPageTitle: (title: string) => void;
}

function getStoredCollapsed(): boolean {
  try {
    const stored = localStorage.getItem('sidebar_collapsed');
    return stored === 'true';
  } catch {
    return false;
  }
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: getStoredCollapsed(),
  currentPageTitle: 'Dashboard',
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      localStorage.setItem('sidebar_collapsed', String(next));
      return { sidebarCollapsed: next };
    }),
  setSidebarCollapsed: (collapsed: boolean) => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
    set({ sidebarCollapsed: collapsed });
  },
  setPageTitle: (title: string) => set({ currentPageTitle: title }),
}));

10. **`frontend/src/shared/components/Layout.tsx`** — need to understand content area structure for full-height map
import React, { useEffect } from 'react';
import { Layout as AntLayout } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import { useUiStore } from '@/shared/stores/uiStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { useLogout } from '@/modules/auth/hooks/useAuth';
import { getRoleColor } from '@/shared/utils/colors';
import ErrorBoundary from './ErrorBoundary';

const { Sider, Header, Content } = AntLayout;

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export default function Layout() {
  const navigate = useNavigate();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const currentPageTitle = useUiStore((s) => s.currentPageTitle);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  if (!token) {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  const roleColor = user?.role ? getRoleColor(user.role) : '#7A7A7A';

  return (
    <AntLayout style={{ minHeight: '100vh', background: '#0A0A0A' }}>
      <Sider
        collapsed={collapsed}
        width={240}
        collapsedWidth={64}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          background: 'transparent',
          borderRight: '1px solid rgba(255, 255, 255, 0.04)',
          overflow: 'hidden',
        }}
        trigger={null}
      >
        <Sidebar />
      </Sider>
      <AntLayout
        style={{
          marginLeft: collapsed ? 64 : 240,
          transition: 'margin-left 0.3s ease',
          background: '#0A0A0A',
        }}
      >
        <Header
          className="glass-header"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            height: 56,
            lineHeight: '56px',
            background: 'rgba(10, 10, 10, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: '#F2F2F2' }}>
            {currentPageTitle}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserOutlined style={{ color: '#B8B8B8', fontSize: 14 }} />
              <span style={{ color: '#F2F2F2', fontSize: 13, fontWeight: 500 }}>
                {user?.full_name || user?.username || 'User'}
              </span>
              {user?.role && (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 500,
                    lineHeight: '18px',
                    color: roleColor,
                    background: `rgba(${hexToRgb(roleColor)}, 0.12)`,
                    border: 'none',
                  }}
                >
                  {user.role}
                </span>
              )}
            </div>
            <div
              onClick={handleLogout}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 6,
                color: '#7A7A7A',
                transition: 'all 0.3s ease',
                fontSize: 13,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#F2F2F2';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#7A7A7A';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogoutOutlined style={{ fontSize: 14 }} />
              <span>Logout</span>
            </div>
          </div>
        </Header>
        <Content
          style={{
            padding: 24,
            minHeight: 'calc(100vh - 56px)',
            background: '#0A0A0A',
          }}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

11. **`frontend/src/shared/components/StatusBadge.tsx`** — used in popups
import React from 'react';
import { getStatusColor } from '@/shared/utils/colors';

interface StatusBadgeProps {
  status: 'WORKING' | 'NOT_WORKING' | 'FAULTY';
  size?: 'sm' | 'md';
}

const statusLabels: Record<string, string> = {
  WORKING: 'Working',
  NOT_WORKING: 'Not Working',
  FAULTY: 'Faulty',
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: isSmall ? '2px 8px' : '4px 12px',
        borderRadius: 20,
        background: `rgba(${hexToRgb(color)}, 0.1)`,
        fontSize: isSmall ? 11 : 13,
        fontWeight: 500,
        color,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: isSmall ? 6 : 8,
          height: isSmall ? 6 : 8,
          borderRadius: '50%',
          background: color,
          animation: status === 'WORKING' ? 'pulse 2s ease-in-out infinite' : 'none',
        }}
      />
      {statusLabels[status] || status}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </span>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}



## Prompt-Based (4 files — just need exports/signatures)

For these, ask AI: *"Show all exported types, interfaces, constants, and function signatures (no implementation bodies) and summeries "*

12. **`frontend/src/shared/types/common.ts`**
13. **`frontend/src/shared/types/devices.ts`**
14. **`frontend/src/shared/utils/colors.ts`**
15. **`frontend/src/shared/utils/formatters.ts`**

::::
Viewed common.ts:1-30
Viewed devices.ts:1-48
Viewed colors.ts:1-66
Viewed formatters.ts:1-47

Here are the exported types, interfaces, constants, and function signatures along with a brief summary for each of the requested files:

### 12. [frontend/src/shared/types/common.ts](cci:7://file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/types/common.ts:0:0-0:0)

**Summary:** 
Defines the foundational, cross-cutting TypeScript types and interfaces used throughout the application. This includes wrapper shapes for API responses and errors, along with global enums/unions (roles, severities, device states) and the core [User](cci:2://file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/types/common.ts:18:0-29:1) entity model.

**Exports:**
```typescript
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export type DeviceType = 'IU' | 'OU' | 'HC' | 'RF';
export type DeviceStatus = 'WORKING' | 'NOT_WORKING' | 'FAULTY';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type UserRole = 'ADMIN' | 'TECHNICIAN' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string | null;
  custom_fields: Record<string, unknown> | null;
}
```

***

### 13. [frontend/src/shared/types/devices.ts](cci:7://file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/types/devices.ts:0:0-0:0)

**Summary:** 
Contains the data models specific to the devices domain. It defines the core [Device](cci:2://file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/types/devices.ts:0:0-13:1) interface, data structures for viewing device history and statistics, and the payload shapes required for creating or modifying device records.

**Exports:**
```typescript
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
```

***

### 14. [frontend/src/shared/utils/colors.ts](cci:7://file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/utils/colors.ts:0:0-0:0)

**Summary:** 
Provides utility functions and constants to manage UI colors consistently. It re-exports the base theme colors and offers helper functions that map specific domain states (like device status, severities, or user roles) directly to their corresponding theme color values, plus a utility for manipulating color opacity.

**Exports:**
```typescript
// Re-exports colors from '@/styles/theme'
export { colors };

export function getStatusColor(status: string): string;

export function getSeverityColor(severity: string): string;

export function getDeviceTypeColor(type: string): string;

export function getRoleColor(role: string): string;

export function hexToRgba(hex: string, alpha: number): string;
```

***

### 15. [frontend/src/shared/utils/formatters.ts](cci:7://file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/utils/formatters.ts:0:0-0:0)

**Summary:** 
A collection of utility functions to handle data presentation. It includes wrappers around `dayjs` for consistent date and time formatting, as well as functions to uniformly format strings (truncation, serial numbers), geographical coordinates, and file sizes.

**Exports:**
```typescript
export function formatDate(date: string | Date | null): string;

export function formatDateTime(date: string | Date | null): string;

export function formatRelativeTime(date: string | Date): string;

export function truncateText(text: string, maxLength: number): string;

export function formatSerialNumber(serial: string): string;

export function formatCoordinates(lat: number, lng: number): string;

export function formatFileSize(bytes: number): string;
```
