import React, { useEffect, useState } from 'react'
import { Form, Select, Input, Button, Space, Switch, message } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import GlassModal from '@/shared/components/GlassModal'
import GlassButton from '@/shared/components/GlassButton'
import GlassInput from '@/shared/components/GlassInput'
import MaterialSelector from './MaterialSelector'
import LocationPicker from '@/modules/map/components/LocationPicker'
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
  const [locationValue, setLocationValue] = useState<{ latitude: number; longitude: number } | null>(null)

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
          address_note: couple.location?.address_note || '',
          configuration: couple.configuration ? JSON.stringify(couple.configuration, null, 2) : '',
          notes: couple.notes || '',
        })
        setHasRf(couple.has_rf)
        setMaterials([])
        setSelectedDeviceIds([])
        if (couple.location) {
          setLocationValue({
            latitude: couple.location.latitude,
            longitude: couple.location.longitude,
          })
        } else {
          setLocationValue(null)
        }
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
        setLocationValue(null)
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

      const hasLocation = locationValue !== null

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
                latitude: locationValue.latitude,
                longitude: locationValue.longitude,
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
    const current = updated[idx]
    if (!current) return
    updated[idx] = { ...current, [field]: val }
    setCustomFields(updated)
  }

  const isLoading = createCouple.isPending || updateCouple.isPending

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
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
          label={<span style={{ color: 'var(--text-secondary)' }}>Name</span>}
          rules={[{ required: true, message: 'Name is required' }]}
        >
          <GlassInput placeholder="e.g. Couple A1" />
        </Form.Item>

        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Has RF</span>
            <div style={{ marginTop: 8 }}>
              <Switch checked={hasRf} onChange={setHasRf} />
            </div>
          </div>
          <Form.Item
            name="status"
            label={<span style={{ color: 'var(--text-secondary)' }}>Status</span>}
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
          label={<span style={{ color: 'var(--text-secondary)' }}>Handling Person</span>}
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
          <span style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'block', marginBottom: 8 }}>Location</span>
          <LocationPicker
            value={locationValue}
            onChange={setLocationValue}
            height="250px"
          />
          <Form.Item name="address_note" style={{ marginTop: 8, marginBottom: 0 }}>
            <Input placeholder="Address note" style={inputStyle} />
          </Form.Item>
        </div>

        {!isEdit && (
          <div style={{ marginBottom: 16 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'block', marginBottom: 8 }}>
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
            <span style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'block', marginBottom: 8 }}>
              Fitting Materials
            </span>
            <MaterialSelector value={materials} onChange={setMaterials} />
          </div>
        )}

        <Form.Item
          name="configuration"
          label={<span style={{ color: 'var(--text-secondary)' }}>Configuration (JSON)</span>}
        >
          <Input.TextArea rows={3} placeholder='{"key": "value"}' style={inputStyle} />
        </Form.Item>

        <Form.Item
          name="notes"
          label={<span style={{ color: 'var(--text-secondary)' }}>Notes</span>}
        >
          <Input.TextArea rows={3} placeholder="Optional notes..." style={inputStyle} />
        </Form.Item>

        <div style={{ marginBottom: 8 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Custom Fields</span>
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
              style={{ color: 'var(--status-faulty)' }}
            />
          </Space>
        ))}
        <Button
          type="dashed"
          onClick={addCustomField}
          icon={<PlusOutlined />}
          style={{ width: '100%', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', borderRadius: 8 }}
        >
          Add Field
        </Button>
      </Form>
    </GlassModal>
  )
}