import React, { useState } from 'react'
import { Switch, Select } from 'antd'
import { FilterOutlined, CloseOutlined } from '@ant-design/icons'
import type { MapFilters as MapFiltersType } from '../hooks/useMapData'
import type { Pair } from '@/shared/types/pairs'

interface MapFiltersProps {
  filters: MapFiltersType
  onChange: (filters: MapFiltersType) => void
  pairs: Pair[]
}

export default function MapFilters({ filters, onChange, pairs }: MapFiltersProps) {
  const [expanded, setExpanded] = useState(true)

  const update = (partial: Partial<MapFiltersType>) => {
    onChange({ ...filters, ...partial })
  }

  const statusItems: { key: keyof Pick<MapFiltersType, 'showWorking' | 'showNotWorking' | 'showFaulty'>; label: string; color: string }[] = [
    { key: 'showWorking', label: 'Working', color: '#5F8F6B' },
    { key: 'showNotWorking', label: 'Not Working', color: '#B68A3C' },
    { key: 'showFaulty', label: 'Faulty', color: '#9B3E3E' },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
      }}
    >
      {/* Toggle button */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(20, 20, 20, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#B8B8B8',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(30, 30, 30, 0.9)'
            e.currentTarget.style.color = '#F2F2F2'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(20, 20, 20, 0.85)'
            e.currentTarget.style.color = '#B8B8B8'
          }}
        >
          <FilterOutlined style={{ fontSize: 16 }} />
        </button>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div
          style={{
            width: 220,
            background: 'rgba(20, 20, 20, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Panel header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#F2F2F2',
              }}
            >
              <FilterOutlined style={{ fontSize: 13 }} />
              Filters
            </div>
            <button
              onClick={() => setExpanded(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                color: '#7A7A7A',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.color = '#F2F2F2'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#7A7A7A'
              }}
            >
              <CloseOutlined style={{ fontSize: 11 }} />
            </button>
          </div>

          {/* Status section */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 11,
                color: '#7A7A7A',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Status
            </div>
            {statusItems.map((item) => (
              <label
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 0',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#B8B8B8',
                }}
              >
                <input
                  type="checkbox"
                  checked={filters[item.key]}
                  onChange={(e) => update({ [item.key]: e.target.checked })}
                  style={{ display: 'none' }}
                />
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: `1px solid ${filters[item.key] ? item.color : 'rgba(255,255,255,0.15)'}`,
                    background: filters[item.key] ? `${item.color}30` : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {filters[item.key] && (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: item.color,
                      }}
                    />
                  )}
                </div>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: item.color,
                    flexShrink: 0,
                  }}
                />
                {item.label}
              </label>
            ))}
          </div>

          {/* RF toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
              paddingTop: 10,
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{ fontSize: 13, color: '#B8B8B8' }}>RF Only</span>
            <Switch
              size="small"
              checked={filters.showRfOnly}
              onChange={(checked) => update({ showRfOnly: checked })}
            />
          </div>

          {/* Pair dropdown */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 11,
                color: '#7A7A7A',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              Pair
            </div>
            <Select
              size="small"
              value={filters.pairId || 'all'}
              onChange={(val) => update({ pairId: val === 'all' ? null : val })}
              style={{ width: '100%' }}
              options={[
                { label: 'All Pairs', value: 'all' },
                ...pairs.map((p) => ({ label: p.name, value: p.id })),
              ]}
              popupClassName="dark-select-dropdown"
            />
          </div>

          {/* Trails toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 10,
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{ fontSize: 13, color: '#B8B8B8' }}>Show Trails</span>
            <Switch
              size="small"
              checked={filters.showTrails}
              onChange={(checked) => update({ showTrails: checked })}
            />
          </div>
        </div>
      )}
    </div>
  )
}