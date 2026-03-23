import React, { useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useSettings } from '../../settings/hooks/useSettings'

interface LocationPickerProps {
  value: { latitude: number; longitude: number } | null
  onChange: (coords: { latitude: number; longitude: number }) => void
  height?: string
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

function ClickHandler({
  onChange,
}: {
  onChange: (coords: { latitude: number; longitude: number }) => void
}) {
  useMapEvents({
    click(e) {
      onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng })
    },
  })
  return null
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  const prevRef = React.useRef<string>('')

  React.useEffect(() => {
    const key = `${lat.toFixed(4)}-${lng.toFixed(4)}`
    if (key !== prevRef.current) {
      map.setView([lat, lng], map.getZoom(), { animate: true })
      prevRef.current = key
    }
  }, [lat, lng, map])

  return null
}

function MapResizer() {
  const map = useMap()
  React.useEffect(() => {
    setTimeout(() => map.invalidateSize(), 150)
    const obs = new ResizeObserver(() => map.invalidateSize())
    obs.observe(map.getContainer())
    return () => obs.disconnect()
  }, [map])
  return null
}

export default function LocationPicker({
  value,
  onChange,
  height = '300px',
}: LocationPickerProps) {
  const { data: settings } = useSettings()

  const mapLat = parseFloat(settings?.find(s => s.key === 'default_map_lat')?.value || '48.856')
  const mapLng = parseFloat(settings?.find(s => s.key === 'default_map_lng')?.value || '2.352')
  const mapZoom = parseInt(settings?.find(s => s.key === 'default_map_zoom')?.value || '13', 10)

  const center: [number, number] = useMemo(() => {
    if (value) return [value.latitude, value.longitude]
    return [mapLat, mapLng]
  }, [value, mapLat, mapLng])

  const handleDragEnd = useCallback(
    (e: L.DragEndEvent) => {
      const latlng = (e.target as L.Marker).getLatLng()
      onChange({ latitude: latlng.lat, longitude: latlng.lng })
    },
    [onChange]
  )

  const handleLatChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const lat = parseFloat(e.target.value)
      if (!isNaN(lat)) {
        onChange({
          latitude: lat,
          longitude: value?.longitude ?? 2.352,
        })
      }
    },
    [onChange, value]
  )

  const handleLngChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const lng = parseFloat(e.target.value)
      if (!isNaN(lng)) {
        onChange({
          latitude: value?.latitude ?? 48.856,
          longitude: lng,
        })
      }
    },
    [onChange, value]
  )

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#F2F2F2',
    fontSize: 12,
    outline: 'none',
  }

  if (!settings) return null;

  return (
    <div>
      <div
        style={{
          height,
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
        }}
      >
        <MapContainer
          key={`${mapLat}-${mapLng}-${mapZoom}`}
          center={center}
          zoom={value ? 15 : mapZoom}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <MapResizer />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <ClickHandler onChange={onChange} />

          {value && (
            <>
              <RecenterMap lat={value.latitude} lng={value.longitude} />
              <Marker
                position={[value.latitude, value.longitude]}
                icon={PICKER_ICON}
                draggable={true}
                eventHandlers={{
                  dragend: handleDragEnd,
                }}
              />
            </>
          )}
        </MapContainer>

        {/* Instruction overlay */}
        {!value && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(10, 10, 10, 0.75)',
              backdropFilter: 'blur(10px)',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 12,
              color: '#B8B8B8',
              pointerEvents: 'none',
              zIndex: 500,
              whiteSpace: 'nowrap',
            }}
          >
            Click on the map to set location
          </div>
        )}
      </div>

      {/* Coordinate display + manual inputs */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 8,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          <span style={{ fontSize: 11, color: '#7A7A7A', width: 24, flexShrink: 0 }}>Lat</span>
          <input
            type="number"
            step="0.0001"
            value={value?.latitude ?? ''}
            onChange={handleLatChange}
            placeholder="Latitude"
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          <span style={{ fontSize: 11, color: '#7A7A7A', width: 24, flexShrink: 0 }}>Lng</span>
          <input
            type="number"
            step="0.0001"
            value={value?.longitude ?? ''}
            onChange={handleLngChange}
            placeholder="Longitude"
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  )
}