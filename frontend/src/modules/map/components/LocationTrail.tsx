import React, { useMemo } from 'react'
import { Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import type { LocationHistory } from '@/shared/types/locations'
import { formatDateTime } from '@/shared/utils/formatters'

interface LocationTrailProps {
  history: LocationHistory[]
  currentLocation: { latitude: number; longitude: number } | null
}

export default function LocationTrail({ history, currentLocation }: LocationTrailProps) {
  const sortedHistory = useMemo(() => {
    return [...history].sort(
      (a, b) => new Date(a.moved_at).getTime() - new Date(b.moved_at).getTime()
    )
  }, [history])

  const trailPoints = useMemo(() => {
    const points: { lat: number; lng: number; date: string; distance: number | null; opacity: number }[] = []

    sortedHistory.forEach((h, idx) => {
      if (idx === 0) {
        points.push({
          lat: h.old_latitude,
          lng: h.old_longitude,
          date: h.moved_at,
          distance: null,
          opacity: Math.max(0.3, (idx + 1) / (sortedHistory.length + 1)),
        })
      }
      points.push({
        lat: h.new_latitude,
        lng: h.new_longitude,
        date: h.moved_at,
        distance: h.distance_meters,
        opacity: Math.max(0.3, (idx + 1) / sortedHistory.length),
      })
    })

    return points
  }, [sortedHistory])

  const polylinePositions = useMemo(() => {
    const positions: [number, number][] = trailPoints.map((p) => [p.lat, p.lng])

    if (currentLocation) {
      positions.push([currentLocation.latitude, currentLocation.longitude])
    }

    return positions
  }, [trailPoints, currentLocation])

  if (sortedHistory.length === 0) return null

  return (
    <>
      {/* Polyline connecting all points */}
      {polylinePositions.length > 1 && (
        <Polyline
          positions={polylinePositions}
          pathOptions={{
            color: '#7C7C7C',
            weight: 2,
            dashArray: '6, 8',
            opacity: 0.7,
          }}
        />
      )}

      {/* Historical point markers */}
      {trailPoints.map((point, idx) => (
        <CircleMarker
          key={`trail-point-${idx}`}
          center={[point.lat, point.lng]}
          radius={4}
          pathOptions={{
            color: '#7C7C7C',
            fillColor: '#7C7C7C',
            fillOpacity: point.opacity,
            opacity: point.opacity,
            weight: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
            <div style={{ fontSize: 11 }}>
              <div style={{ fontWeight: 500 }}>{formatDateTime(point.date)}</div>
              {point.distance !== null && (
                <div style={{ color: '#999', marginTop: 2 }}>
                  Distance: {point.distance.toFixed(1)}m
                </div>
              )}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  )
}