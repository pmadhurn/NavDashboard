import { useState, useMemo } from 'react'
import {
  LeftOutlined,
  RightOutlined,
  EnvironmentOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import type { MapDataPoint } from '@/shared/types/locations'
import { formatCoordinates } from '@/shared/utils/formatters'

function getMarkerColor(status: string): string {
  switch (status) {
    case 'WORKING':
      return 'var(--status-working)'
    case 'NOT_WORKING':
      return 'var(--status-not-working)'
    case 'FAULTY':
      return 'var(--status-faulty)'
    default:
      return '#7C7C7C'
  }
}

interface MapSidePanelProps {
  couples: MapDataPoint[]
  selectedCoupleId: string | null
  onSelectCouple: (coupleId: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function MapSidePanel({
  couples,
  selectedCoupleId,
  onSelectCouple,
  collapsed,
  onToggleCollapse,
}: MapSidePanelProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return couples
    const term = search.toLowerCase()
    return couples.filter((c) => c.couple_name.toLowerCase().includes(term))
  }, [couples, search])

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: collapsed ? 0 : 280,
        background: 'rgba(15, 15, 15, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: collapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
        zIndex: 1000,
        overflow: 'hidden',
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Toggle button */}
      <button
        onClick={onToggleCollapse}
        style={{
          position: 'absolute',
          top: '50%',
          right: collapsed ? -32 : -16,
          transform: 'translateY(-50%)',
          width: 32,
          height: 48,
          borderRadius: collapsed ? '0 8px 8px 0' : '0 8px 8px 0',
          background: 'rgba(20, 20, 20, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderLeft: collapsed ? '1px solid rgba(255,255,255,0.08)' : 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)'
          e.currentTarget.style.background = 'rgba(30, 30, 30, 0.95)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)'
          e.currentTarget.style.background = 'rgba(20, 20, 20, 0.9)'
        }}
      >
        {collapsed ? (
          <RightOutlined style={{ fontSize: 12 }} />
        ) : (
          <LeftOutlined style={{ fontSize: 12 }} />
        )}
      </button>

      {/* Header */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            <EnvironmentOutlined style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
            Locations
          </div>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              fontSize: 11,
              color: 'var(--text-muted)',
            }}
          >
            {couples.length}
          </span>
        </div>

        {/* Search */}
        <div
          style={{
            position: 'relative',
          }}
        >
          <SearchOutlined
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 12,
              color: 'var(--text-muted)',
              zIndex: 1,
            }}
          />
          <input
            type="text"
            placeholder="Search couples..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 30px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-primary)',
              fontSize: 12,
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.15)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.08)'
            }}
          />
        </div>
      </div>

      {/* List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
        }}
      >
        {filtered.map((couple) => {
          const isSelected = couple.couple_id === selectedCoupleId
          const statusColor = getMarkerColor(couple.status)

          return (
            <div
              key={couple.couple_id}
              onClick={() => onSelectCouple(couple.couple_id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                cursor: 'pointer',
                background: isSelected ? 'var(--sidebar-active)' : 'transparent',
                borderLeft: isSelected
                  ? '3px solid var(--primary)'
                  : '3px solid transparent',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'var(--sidebar-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {/* Status dot */}
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: statusColor,
                  boxShadow: `0 0 6px ${statusColor}60`,
                  flexShrink: 0,
                }}
              />

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: isSelected ? 'var(--text-primary)' : '#D0D0D0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {couple.couple_name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    marginTop: 2,
                  }}
                >
                  {formatCoordinates(couple.latitude, couple.longitude)}
                </div>
              </div>

              {/* RF indicator */}
              {couple.has_rf && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#A8C4B0',
                    flexShrink: 0,
                  }}
                />
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 12,
            }}
          >
            No couples found
          </div>
        )}
      </div>
    </div>
  )
}