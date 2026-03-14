import React, { useState, useEffect } from 'react'
import { Input, Button, Select, Space } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { api } from '@/shared/api/client'
import { useDebounce } from '@/shared/hooks/useDebounce'
import type { MaterialCreateInline } from '@/shared/types/couples'

interface MaterialSelectorProps {
  value: MaterialCreateInline[]
  onChange: (materials: MaterialCreateInline[]) => void
}

interface SuggestionItem {
  name: string
  count: number
}

interface TemplateItem {
  id: string
  template_name: string
  materials: Array<{ name: string; quantity: number; unit?: string }>
}

export default function MaterialSelector({ value, onChange }: MaterialSelectorProps) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({})

  useEffect(() => {
    api
      .get<TemplateItem[]>('/inventory/templates')
      .then(setTemplates)
      .catch(() => {})
  }, [])

  const debouncedSearch = useDebounce(searchTerms, 300)

  useEffect(() => {
    const entries = Object.entries(debouncedSearch)
    if (entries.length === 0) return
    const lastEntry = entries[entries.length - 1]
    const query = lastEntry[1]
    if (typeof query === 'string' && query.length >= 2) {
      api
        .get<SuggestionItem[]>('/inventory/suggestions', { q: query })
        .then(setSuggestions)
        .catch(() => {})
    }
  }, [debouncedSearch])

  const addRow = () => {
    onChange([...value, { name: '', quantity: 1, unit: null }])
  }

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const updateRow = (index: number, field: keyof MaterialCreateInline, val: string | number | null) => {
    const updated = [...value]
    updated[index] = { ...updated[index], [field]: val }
    onChange(updated)
  }

  const handleNameSearch = (index: number, query: string) => {
    updateRow(index, 'name', query)
    setSearchTerms((prev) => ({ ...prev, [index]: query }))
  }

  const handleTemplateSelect = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) return
    const materials: MaterialCreateInline[] = tpl.materials.map((m) => ({
      name: m.name,
      quantity: m.quantity,
      unit: m.unit || null,
    }))
    onChange(materials)
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#F2F2F2',
    borderRadius: 8,
  }

  return (
    <div>
      {templates.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Select
            placeholder="Copy from template..."
            allowClear
            onChange={handleTemplateSelect}
            style={{ width: '100%' }}
            options={templates.map((t) => ({
              label: t.template_name,
              value: t.id,
            }))}
          />
        </div>
      )}

      {value.map((mat, idx) => (
        <Space key={idx} style={{ display: 'flex', marginBottom: 8 }} align="start">
          <Select
            showSearch
            value={mat.name || undefined}
            placeholder="Material name"
            style={{ width: 200 }}
            filterOption={false}
            onSearch={(q) => handleNameSearch(idx, q)}
            onChange={(val) => updateRow(idx, 'name', val)}
            options={
              suggestions.length > 0
                ? suggestions.map((s) => ({ label: `${s.name} (${s.count})`, value: s.name }))
                : mat.name
                  ? [{ label: mat.name, value: mat.name }]
                  : []
            }
          />
          <Input
            type="number"
            placeholder="Qty"
            value={mat.quantity}
            onChange={(e) => updateRow(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
            style={{ ...inputStyle, width: 80 }}
            min={1}
          />
          <Input
            placeholder="Unit"
            value={mat.unit || ''}
            onChange={(e) => updateRow(idx, 'unit', e.target.value || null)}
            style={{ ...inputStyle, width: 100 }}
          />
          <Button
            type="text"
            icon={<MinusCircleOutlined />}
            onClick={() => removeRow(idx)}
            style={{ color: '#9B3E3E' }}
          />
        </Space>
      ))}

      <Button
        type="dashed"
        onClick={addRow}
        icon={<PlusOutlined />}
        style={{
          width: '100%',
          borderColor: 'rgba(255,255,255,0.1)',
          color: '#B8B8B8',
          borderRadius: 8,
        }}
      >
        Add Material
      </Button>
    </div>
  )
}