import React, { useEffect, useState } from 'react'
import { Form, Select, Input, Button, Space, message } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import GlassModal from '@/shared/components/GlassModal'
import GlassButton from '@/shared/components/GlassButton'
import GlassInput from '@/shared/components/GlassInput'
import { useCreateDevice, useUpdateDevice } from '../hooks/useDevices'
import type { Device } from '@/shared/types/devices'

interface DeviceFormProps {
  open: boolean
  onClose: () => void
  device?: Device | null
}

interface CustomFieldRow {
  key: string
  value: string
}

export default function DeviceForm({ open, onClose, device }: DeviceFormProps) {
  const [form] = Form.useForm()
  const [customFields, setCustomFields] = useState<CustomFieldRow[]>([])
  const createDevice = useCreateDevice()
  const updateDevice = useUpdateDevice()
  const isEdit = !!device

  useEffect(() => {
    if (open) {
      if (device) {
        form.setFieldsValue({
          serial_number: device.serial_number,
          device_type: device.device_type,
          status: device.status,
          notes: device.notes || '',
        })
        if (device.custom_fields) {
          setCustomFields(
            Object.entries(device.custom_fields).map(([k, v]) => ({
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
        setCustomFields([])
      }
    }
  }, [open, device, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const cfObj: Record<string, string> | null =
        customFields.length > 0
          ? customFields.reduce(
              (acc, row) => {
                if (row.key.trim()) {
                  acc[row.key.trim()] = row.value
                }
                return acc
              },
              {} as Record<string, string>
            )
          : null

      const payload = {
        serial_number: values.serial_number,
        device_type: values.device_type,
        status: values.status,
        notes: values.notes || null,
        custom_fields: cfObj,
      }

      if (isEdit && device) {
        await updateDevice.mutateAsync({ id: device.id, data: payload })
        message.success('Device updated')
      } else {
        await createDevice.mutateAsync(payload)
        message.success('Device created')
      }
      onClose()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } }
        message.error(axiosErr.response?.data?.detail || 'Operation failed')
      }
    }
  }

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }])
  }

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }

  const updateCustomField = (
    index: number,
    field: 'key' | 'value',
    val: string
  ) => {
    const updated = [...customFields]
    updated[index] = { ...updated[index], [field]: val }
    setCustomFields(updated)
  }

  const isLoading = createDevice.isPending || updateDevice.isPending

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Device' : 'Add Device'}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <GlassButton onClick={onClose}>Cancel</GlassButton>
          <GlassButton
            type="primary"
            onClick={handleSubmit}
            loading={isLoading}
          >
            {isEdit ? 'Update' : 'Create'}
          </GlassButton>
        </div>
      }
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="serial_number"
          label={<span style={{ color: '#B8B8B8' }}>Serial Number</span>}
          rules={[{ required: true, message: 'Serial number is required' }]}
        >
          <GlassInput
            placeholder="e.g. IU-00001"
            disabled={isEdit}
          />
        </Form.Item>

        <Form.Item
          name="device_type"
          label={<span style={{ color: '#B8B8B8' }}>Device Type</span>}
          rules={[{ required: true, message: 'Device type is required' }]}
        >
          <Select
            placeholder="Select type"
            options={[
              { label: 'IU — Indoor Unit', value: 'IU' },
              { label: 'OU — Outdoor Unit', value: 'OU' },
              { label: 'HC — Hub Controller', value: 'HC' },
              { label: 'RF — RF Module', value: 'RF' },
            ]}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="status"
          label={<span style={{ color: '#B8B8B8' }}>Status</span>}
        >
          <Select
            options={[
              { label: 'Working', value: 'WORKING' },
              { label: 'Not Working', value: 'NOT_WORKING' },
              { label: 'Faulty', value: 'FAULTY' },
            ]}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="notes"
          label={<span style={{ color: '#B8B8B8' }}>Notes</span>}
        >
          <Input.TextArea
            rows={3}
            placeholder="Optional notes..."
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#F2F2F2',
              borderRadius: 8,
            }}
          />
        </Form.Item>

        <div style={{ marginBottom: 8 }}>
          <span style={{ color: '#B8B8B8', fontSize: 14 }}>Custom Fields</span>
        </div>
        {customFields.map((cf, idx) => (
          <Space
            key={idx}
            style={{ display: 'flex', marginBottom: 8 }}
            align="start"
          >
            <Input
              placeholder="Key"
              value={cf.key}
              onChange={(e) => updateCustomField(idx, 'key', e.target.value)}
              style={{
                width: 150,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#F2F2F2',
                borderRadius: 8,
              }}
            />
            <Input
              placeholder="Value"
              value={cf.value}
              onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
              style={{
                width: 200,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#F2F2F2',
                borderRadius: 8,
              }}
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
          style={{
            width: '100%',
            borderColor: 'rgba(255,255,255,0.1)',
            color: '#B8B8B8',
            borderRadius: 8,
          }}
        >
          Add Field
        </Button>
      </Form>
    </GlassModal>
  )
}