import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { Polyline, Tooltip, Popup } from 'react-leaflet'
import type { MapDataPoint } from '@/shared/types/locations'
import type { Pair } from '@/shared/types/pairs'
import LineColorPicker from './LineColorPicker'

const STORAGE_KEY = 'navdash-pair-line-colors'

interface CoupleConnectionsProps {
  markers: MapDataPoint[]
  pairs: Pair[]
  selectedCoupleId: string | null
}

function loadStoredColors(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return {}
}

function saveStoredColors(colors: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
  } catch {
    // ignore
  }
}

/**
 * Draws lines between couples that belong to the same pair.
 * Each pair's couples are connected with a polyline so users
 * can visually see which couples are linked.
 * Clicking a line opens a color wheel to customize the line color.
 */
export default function CoupleConnections({
  markers,
  pairs,
  selectedCoupleId,
}: CoupleConnectionsProps) {
  const [lineColors, setLineColors] = useState<Record<string, string>>(loadStoredColors)
  const [activePickerPairId, setActivePickerPairId] = useState<string | null>(null)

  // Persist colors when they change
  useEffect(() => {
    saveStoredColors(lineColors)
  }, [lineColors])

  const handleColorChange = useCallback((pairId: string, color: string) => {
    setLineColors((prev) => ({ ...prev, [pairId]: color }))
    setActivePickerPairId(null)
  }, [])

  const handleClose = useCallback(() => {
    setActivePickerPairId(null)
  }, [])

  const connections = useMemo(() => {
    // Build a lookup map: couple_id -> MapDataPoint (with coordinates)
    const markerMap = new Map<string, MapDataPoint>()
    markers.forEach((m) => markerMap.set(m.couple_id, m))

    // For each pair, collect the coordinates of its couples that are on the map
    return pairs
      .map((pair) => {
        const couplePoints = pair.couples
          .map((c) => markerMap.get(c.id))
          .filter((p): p is MapDataPoint => !!p)

        if (couplePoints.length < 2) return null

        // Check if any couple in this pair is currently selected
        const isHighlighted = couplePoints.some(
          (p) => p.couple_id === selectedCoupleId
        )

        // Use stored color if available, otherwise default
        const customColor = lineColors[pair.id]
        const defaultColor = isHighlighted ? '#A8C4B0' : '#6B7B8D'

        return {
          pairId: pair.id,
          pairName: pair.name,
          positions: couplePoints.map(
            (p) => [p.latitude, p.longitude] as [number, number]
          ),
          isHighlighted,
          coupleNames: couplePoints.map((p) => p.couple_name),
          color: customColor || defaultColor,
          hasCustomColor: !!customColor,
        }
      })
      .filter(Boolean) as Array<{
      pairId: string
      pairName: string
      positions: [number, number][]
      isHighlighted: boolean
      coupleNames: string[]
      color: string
      hasCustomColor: boolean
    }>
  }, [markers, pairs, selectedCoupleId, lineColors])

  return (
    <>
      {connections.map((conn) => (
        <Polyline
          key={`pair-line-${conn.pairId}`}
          positions={conn.positions}
          pathOptions={{
            color: conn.color,
            weight: conn.isHighlighted || conn.hasCustomColor ? 2.5 : 1.5,
            opacity: conn.isHighlighted || conn.hasCustomColor ? 0.85 : 0.45,
            dashArray: conn.hasCustomColor
              ? undefined
              : conn.isHighlighted
                ? '8, 6'
                : '4, 8',
          }}
          eventHandlers={{
            click: (e) => {
              // Prevent map click from firing
              e.originalEvent.stopPropagation()
              setActivePickerPairId(
                activePickerPairId === conn.pairId ? null : conn.pairId
              )
            },
          }}
        >
          {/* Color picker popup - shown when line is clicked */}
          {activePickerPairId === conn.pairId && (
            <Popup
              closeButton={false}
              closeOnClick={false}
              autoPan={true}
              className="color-picker-popup"
            >
              <LineColorPicker
                currentColor={conn.color}
                pairName={conn.pairName}
                onColorChange={(color) => handleColorChange(conn.pairId, color)}
                onClose={handleClose}
              />
            </Popup>
          )}

          {/* Tooltip - only show when picker is not active */}
          {activePickerPairId !== conn.pairId && (
            <Tooltip
              sticky
              direction="top"
              offset={[0, -8]}
              opacity={0.95}
            >
              <div style={{ fontSize: 11 }}>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 2,
                    color: '#E0E0E0',
                  }}
                >
                  {conn.pairName}
                </div>
                <div style={{ color: '#999', fontSize: 10 }}>
                  {conn.coupleNames.join(' ↔ ')}
                </div>
                <div style={{ color: '#666', fontSize: 9, marginTop: 3 }}>
                  Click to change color
                </div>
              </div>
            </Tooltip>
          )}
        </Polyline>
      ))}
    </>
  )
}
