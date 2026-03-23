import React, { useEffect, useState } from 'react'
import { Form, Input, Button, Space, message, Select } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import GlassModal from '@/shared/components/GlassModal'
import GlassButton from '@/shared/components/GlassButton'
import GlassInput from '@/shared/components/GlassInput'
import { useCreatePerson, useUpdatePerson } from '../hooks/usePersonnel'
import type { Person } from '@/shared/types/personnel'

interface PersonnelFormProps {
  open: boolean
  onClose: () => void
  person?: Person | null
}

interface CustomFieldRow {
  key: string
  value: string
}

export default function PersonnelForm({ open, onClose, person }: PersonnelFormProps) {
  const [form] = Form.useForm()
  const createPerson = useCreatePerson()
  const updatePerson = useUpdatePerson()
  const isEdit = !!person

  const [customFields, setCustomFields] = useState<CustomFieldRow[]>([])

  useEffect(() => {
    if (open) {
      if (person) {
        form.setFieldsValue({
          full_name: person.full_name,
          role: person.role,
          email: person.email || '',
          phone: person.phone || '',
          notes: person.notes || '',
        })
        if (person.custom_fields) {
          setCustomFields(
            Object.entries(person.custom_fields).map(([k, v]) => ({
              key: k,
              value: String(v),
            }))
          )
        } else {
          setCustomFields([])
        }
      } else {
        form.resetFields()
        setCustomFields([])
      }
    }
  }, [open, person, form])

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

      if (isEdit && person) {
        await updatePerson.mutateAsync({
          id: person.id,
          data: {
            full_name: values.full_name,
            role: values.role,
            email: values.email || null,
            phone: values.phone || null,
            notes: values.notes || null,
            custom_fields: cfObj,
          },
        })
        message.success('Personnel updated')
      } else {
        await createPerson.mutateAsync({
          full_name: values.full_name,
          role: values.role,
          email: values.email || null,
          phone: values.phone || null,
          notes: values.notes || null,
          custom_fields: cfObj,
        })
        message.success('Personnel created')
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

  const isLoading = createPerson.isPending || updatePerson.isPending

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#F2F2F2',
    borderRadius: 8,
  }

  const ROLES = ['TECHNICIAN', 'ENGINEER', 'MANAGER', 'CONTRACTOR', 'OTHER']

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Personnel' : 'Add Personnel'}
      width={500}
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
          name="full_name"
          label={<span style={{ color: '#B8B8B8' }}>Full Name</span>}
          rules={[{ required: true, message: 'Name is required' }]}
        >
          <GlassInput placeholder="John Doe" />
        </Form.Item>

        <Form.Item
          name="role"
          label={<span style={{ color: '#B8B8B8' }}>Role</span>}
          rules={[{ required: true, message: 'Role is required' }]}
        >
          <Select
            options={ROLES.map(r => ({ label: r, value: r }))}
            placeholder="Select Role"
          />
        </Form.Item>

        <Form.Item
          name="email"
          label={<span style={{ color: '#B8B8B8' }}>Email</span>}
        >
          <GlassInput placeholder="example@email.com" />
        </Form.Item>

        <Form.Item
          name="phone"
          label={<span style={{ color: '#B8B8B8' }}>Phone Number</span>}
        >
          <GlassInput placeholder="+1234567890" />
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
              style={{ ...inputStyle, width: 140 }}
            />
            <Input
              placeholder="Value"
              value={cf.value}
              onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
              style={{ ...inputStyle, width: 180 }}
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
