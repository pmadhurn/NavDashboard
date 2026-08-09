import React, { useMemo } from 'react'
import { Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import type { MapDataPoint } from '@/shared/types/locations'

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

interface DeviceMarkerProps {
  point: MapDataPoint
  isSelected: boolean
  onClick: () => void
  children?: React.ReactNode
}

export default function DeviceMarker({
  point,
  isSelected,
  onClick,
  children,
}: DeviceMarkerProps) {
  const icon = useMemo(() => {
    const color = getMarkerColor(point.status)
    const size = isSelected ? 22 : 16
    const borderColor = isSelected ? 'var(--text-primary)' : 'rgba(255,255,255,0.3)'
    const borderWidth = isSelected ? 3 : 2
    const glowSpread = isSelected ? 24 : 16

    const rfIndicator = point.has_rf
      ? `<div style="
          position: absolute;
          top: -3px;
          right: -3px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #A8C4B0;
          border: 1px solid rgba(0,0,0,0.4);
        "></div>`
      : ''

    return L.divIcon({
      className: '',
      html: `<div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
      ">
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 8px ${color}, 0 0 ${glowSpread}px ${color}40;
          border: ${borderWidth}px solid ${borderColor};
          cursor: pointer;
          transition: all 0.2s ease;
        "></div>
        ${rfIndicator}
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }, [point.status, point.has_rf, isSelected])

  return (
    <Marker
      position={[point.latitude, point.longitude]}
      icon={icon}
      eventHandlers={{
        click: onClick,
      }}
    >
      <Tooltip
        direction="top"
        offset={[0, -12]}
        opacity={0.95}
      >
        <span style={{ fontSize: 12, fontWeight: 500 }}>{point.couple_name}</span>
      </Tooltip>
      {children}
    </Marker>
  )
}