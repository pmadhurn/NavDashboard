import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUiStore } from '@/shared/stores/uiStore'
import MainMap from '../components/MainMap'
import MapFilters from '../components/MapFilters'
import MapSidePanel from '../components/MapSidePanel'
import {
  useMapCouples,
  useCoupleTrail,
  useMapPairs,
  DEFAULT_MAP_FILTERS,
} from '../hooks/useMapData'
import type { MapFilters as MapFiltersType } from '../hooks/useMapData'
import { api } from '@/shared/api/client'
import type { Couple } from '@/shared/types/couples'

export default function MapViewPage() {
  const setPageTitle = useUiStore((s) => s.setPageTitle)
  const navigate = useNavigate()

  useEffect(() => {
    setPageTitle('Map')
  }, [setPageTitle])

  const [filters, setFilters] = useState<MapFiltersType>(DEFAULT_MAP_FILTERS)
  const [selectedCoupleId, setSelectedCoupleId] = useState<string | null>(null)
  const [coupleDetail, setCoupleDetail] = useState<Couple | null>(null)
  const [sidePanelCollapsed, setSidePanelCollapsed] = useState(false)

  const { data: markers, isLoading } = useMapCouples(filters)
  const { data: trail } = useCoupleTrail(
    filters.showTrails ? selectedCoupleId : null
  )
  const { data: pairs } = useMapPairs()

  const handleMarkerClick = useCallback(
    async (coupleId: string) => {
      setSelectedCoupleId(coupleId)
      try {
        const detail = await api.get<Couple>(`/couples/${coupleId}`)
        setCoupleDetail(detail)
      } catch {
        setCoupleDetail(null)
      }
    },
    []
  )

  const handleSidePanelSelect = useCallback(
    (coupleId: string) => {
      handleMarkerClick(coupleId)
    },
    [handleMarkerClick]
  )

  const handleViewDetail = useCallback(
    (coupleId: string) => {
      navigate(`/couples/${coupleId}`)
    },
    [navigate]
  )

  const handleViewHistory = useCallback(
    (coupleId: string) => {
      setSelectedCoupleId(coupleId)
      setFilters((prev) => ({ ...prev, showTrails: true }))
    },
    []
  )

  const statusLegend = [
    { label: 'Working', color: '#5F8F6B' },
    { label: 'Not Working', color: '#B68A3C' },
    { label: 'Faulty', color: '#9B3E3E' },
  ]

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 56px - 48px)',
        margin: '-24px',
        marginTop: '-24px',
        padding: 0,
        overflow: 'hidden',
      }}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2000,
            background: 'rgba(10, 10, 10, 0.8)',
            backdropFilter: 'blur(10px)',
            padding: '12px 24px',
            borderRadius: 10,
            color: '#B8B8B8',
            fontSize: 13,
          }}
        >
          Loading map data...
        </div>
      )}

      {/* Side panel */}
      <MapSidePanel
        couples={markers}
        selectedCoupleId={selectedCoupleId}
        onSelectCouple={handleSidePanelSelect}
        collapsed={sidePanelCollapsed}
        onToggleCollapse={() => setSidePanelCollapsed(!sidePanelCollapsed)}
      />

      {/* Main map area */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: sidePanelCollapsed ? 0 : 280,
          right: 0,
          bottom: 0,
          transition: 'left 0.3s ease',
        }}
      >
        <MainMap
          markers={markers}
          selectedCoupleId={selectedCoupleId}
          onMarkerClick={handleMarkerClick}
          trail={trail}
          coupleDetail={coupleDetail}
          onViewDetail={handleViewDetail}
          onViewHistory={handleViewHistory}
        />

        {/* Filters - top right */}
        <MapFilters filters={filters} onChange={setFilters} pairs={pairs} />

        {/* Legend - bottom right */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 1000,
            background: 'rgba(20, 20, 20, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 10,
            padding: '10px 14px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: '#7A7A7A',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Status
          </div>
          {statusLegend.map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '2px 0',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: item.color,
                  boxShadow: `0 0 4px ${item.color}60`,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: '#B8B8B8' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}