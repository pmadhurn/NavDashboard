import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import DeviceMarker from './DeviceMarker'
import DevicePopup from './DevicePopup'
import LocationTrail from './LocationTrail'
import type { MapDataPoint, LocationHistory } from '@/shared/types/locations'
import type { Couple } from '@/shared/types/couples'

interface MainMapProps {
  markers: MapDataPoint[]
  selectedCoupleId: string | null
  onMarkerClick: (coupleId: string) => void
  onMapClick?: (lat: number, lng: number) => void
  trail: LocationHistory[]
  coupleDetail: Couple | null
  onViewDetail: (coupleId: string) => void
  onViewHistory: (coupleId: string) => void
  pickerMode?: boolean
  pickerPosition?: { lat: number; lng: number } | null
}

const PICKER_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #E6E6E6;
    border: 3px solid #F2F2F2;
    box-shadow: 0 0 12px rgba(230,230,230,0.5), 0 0 24px rgba(230,230,230,0.2);
    cursor: grab;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function FitBounds({ markers }: { markers: MapDataPoint[] }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (markers.length > 0 && !fitted.current) {
      const bounds = L.latLngBounds(
        markers.map((m) => [m.latitude, m.longitude] as [number, number])
      )
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
      fitted.current = true
    }
  }, [markers, map])

  return null
}

function FlyToSelected({
  selectedCoupleId,
  markers,
}: {
  selectedCoupleId: string | null
  markers: MapDataPoint[]
}) {
  const map = useMap()
  const prevId = useRef<string | null>(null)

  useEffect(() => {
    if (selectedCoupleId && selectedCoupleId !== prevId.current) {
      const point = markers.find((m) => m.couple_id === selectedCoupleId)
      if (point) {
        map.flyTo([point.latitude, point.longitude], 16, { duration: 0.8 })
      }
      prevId.current = selectedCoupleId
    }
  }, [selectedCoupleId, markers, map])

  return null
}

function MapClickHandler({
  onClick,
}: {
  onClick?: (lat: number, lng: number) => void
}) {
  const map = useMap()

  useEffect(() => {
    if (!onClick) return
    const handler = (e: L.LeafletMouseEvent) => {
      onClick(e.latlng.lat, e.latlng.lng)
    }
    map.on('click', handler)
    return () => {
      map.off('click', handler)
    }
  }, [map, onClick])

  return null
}

export default function MainMap({
  markers,
  selectedCoupleId,
  onMarkerClick,
  onMapClick,
  trail,
  coupleDetail,
  onViewDetail,
  onViewHistory,
  pickerMode,
  pickerPosition,
}: MainMapProps) {
  const selectedPoint = selectedCoupleId
    ? markers.find((m) => m.couple_id === selectedCoupleId) ?? null
    : null

  const currentLocation = selectedPoint
    ? { latitude: selectedPoint.latitude, longitude: selectedPoint.longitude }
    : null

  return (
    <MapContainer
      center={[48.856, 2.352]}
      zoom={13}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 12,
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <FitBounds markers={markers} />
      <FlyToSelected selectedCoupleId={selectedCoupleId} markers={markers} />

      {(pickerMode || onMapClick) && <MapClickHandler onClick={onMapClick} />}

      {/* Render couple markers */}
      {markers.map((point) => {
        const isSelected = point.couple_id === selectedCoupleId
        return (
          <DeviceMarker
            key={point.couple_id}
            point={point}
            isSelected={isSelected}
            onClick={() => onMarkerClick(point.couple_id)}
          >
            {isSelected && (
              <DevicePopup
                point={point}
                couple={coupleDetail}
                onViewDetail={() => onViewDetail(point.couple_id)}
                onViewHistory={() => onViewHistory(point.couple_id)}
              />
            )}
          </DeviceMarker>
        )
      })}

      {/* Location trail for selected couple */}
      {trail.length > 0 && selectedCoupleId && (
        <LocationTrail history={trail} currentLocation={currentLocation} />
      )}

      {/* Picker mode: draggable marker */}
      {pickerMode && pickerPosition && (
        <Marker
          position={[pickerPosition.lat, pickerPosition.lng]}
          icon={PICKER_ICON}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const latlng = e.target.getLatLng()
              if (onMapClick) {
                onMapClick(latlng.lat, latlng.lng)
              }
            },
          }}
        />
      )}
    </MapContainer>
  )
}