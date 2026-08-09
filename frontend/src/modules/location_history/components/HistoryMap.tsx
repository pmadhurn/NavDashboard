import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDateTime, formatCoordinates } from '@/shared/utils/formatters';
import type { LocationHistoryEntry } from '../hooks/useLocationHistory';
import { useSettings } from '../../settings/hooks/useSettings';

interface HistoryMapProps {
  entries: LocationHistoryEntry[];
  selectedEntryId: string | null;
  coupleId: string | null;
}

function MapController({
  entries,
  selectedEntryId,
}: {
  entries: LocationHistoryEntry[];
  selectedEntryId: string | null;
}) {
  const map = useMap();
  const initialFitDone = useRef(false);

  // Fit bounds to all points on initial load or when entries change
  useEffect(() => {
    if (entries.length === 0) return;

    const lats: number[] = [];
    const lngs: number[] = [];

    entries.forEach((e) => {
      lats.push(e.old_latitude, e.new_latitude);
      lngs.push(e.old_longitude, e.new_longitude);
    });

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    if (maxLat - minLat < 0.001 && maxLng - minLng < 0.001) {
      map.setView([minLat, minLng], 16);
    } else {
      map.fitBounds(
        [
          [minLat - 0.002, minLng - 0.002],
          [maxLat + 0.002, maxLng + 0.002],
        ],
        { padding: [30, 30], animate: true }
      );
    }
    initialFitDone.current = true;
  }, [entries, map]);

  // Fly to selected entry
  useEffect(() => {
    if (!selectedEntryId || !initialFitDone.current) return;

    const entry = entries.find((e) => e.id === selectedEntryId);
    if (entry) {
      map.flyTo([entry.new_latitude, entry.new_longitude], 16, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedEntryId, entries, map]);

  return null;
}

export default function HistoryMap({
  entries,
  selectedEntryId,
  coupleId,
}: HistoryMapProps) {
  const { data: settings } = useSettings();

  // Build trail points from entries (sorted chronologically)
  const sortedEntries = useMemo(() => {
    return [...entries].sort(
      (a, b) => new Date(a.moved_at).getTime() - new Date(b.moved_at).getTime()
    );
  }, [entries]);

  const trailPoints = useMemo(() => {
    const points: {
      lat: number;
      lng: number;
      date: string;
      distance: number | null;
      opacity: number;
      entryId: string;
    }[] = [];

    sortedEntries.forEach((h, idx) => {
      if (idx === 0) {
        points.push({
          lat: h.old_latitude,
          lng: h.old_longitude,
          date: h.moved_at,
          distance: null,
          opacity: Math.max(0.3, (idx + 1) / (sortedEntries.length + 1)),
          entryId: h.id,
        });
      }
      points.push({
        lat: h.new_latitude,
        lng: h.new_longitude,
        date: h.moved_at,
        distance: h.distance_meters,
        opacity: Math.max(0.3, (idx + 1) / sortedEntries.length),
        entryId: h.id,
      });
    });

    return points;
  }, [sortedEntries]);

  const polylinePositions: [number, number][] = useMemo(
    () => trailPoints.map((p) => [p.lat, p.lng]),
    [trailPoints]
  );

  const mapLat = parseFloat(settings?.find(s => s.key === 'default_map_lat')?.value || '48.8566');
  const mapLng = parseFloat(settings?.find(s => s.key === 'default_map_lng')?.value || '2.3522');
  const mapZoom = parseInt(settings?.find(s => s.key === 'default_map_zoom')?.value || '13', 10);

  if (!settings) return null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <MapContainer
        key={`${mapLat}-${mapLng}-${mapZoom}`}
        center={[mapLat, mapLng]}
        zoom={mapZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <MapController entries={entries} selectedEntryId={selectedEntryId} />

        {/* Polyline connecting trail */}
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

        {/* Trail points */}
        {trailPoints.map((point, idx) => {
          const isLatest = idx === trailPoints.length - 1;
          const isSelected = point.entryId === selectedEntryId;

          return (
            <CircleMarker
              key={`trail-${idx}`}
              center={[point.lat, point.lng]}
              radius={isLatest ? 7 : isSelected ? 6 : 4}
              pathOptions={{
                color: isSelected ? 'var(--primary)' : '#7C7C7C',
                fillColor: isSelected
                  ? 'var(--primary)'
                  : isLatest
                  ? 'var(--status-working)'
                  : '#7C7C7C',
                fillOpacity: isSelected ? 1 : point.opacity,
                opacity: isSelected ? 1 : point.opacity,
                weight: isLatest || isSelected ? 2 : 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div style={{ fontSize: 11 }}>
                  <div style={{ fontWeight: 500 }}>{formatDateTime(point.date)}</div>
                  <div style={{ color: '#666', marginTop: 2 }}>
                    {formatCoordinates(point.lat, point.lng)}
                  </div>
                  {point.distance !== null && (
                    <div style={{ color: '#999', marginTop: 2 }}>
                      Distance: {point.distance.toFixed(1)}m
                    </div>
                  )}
                  {isLatest && (
                    <div style={{ color: 'var(--status-working)', marginTop: 2, fontWeight: 500 }}>
                      Current
                    </div>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* If showing all couples (no specific coupleId), show entry new locations as standalone markers */}
        {!coupleId &&
          entries.map((entry) => {
            const isSelected = entry.id === selectedEntryId;
            return (
              <CircleMarker
                key={`entry-marker-${entry.id}`}
                center={[entry.new_latitude, entry.new_longitude]}
                radius={isSelected ? 7 : 5}
                pathOptions={{
                  color: isSelected ? 'var(--primary)' : 'var(--status-working)',
                  fillColor: isSelected ? 'var(--primary)' : 'var(--status-working)',
                  fillOpacity: isSelected ? 1 : 0.7,
                  opacity: isSelected ? 1 : 0.7,
                  weight: isSelected ? 2 : 1,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <div style={{ fontSize: 11 }}>
                    {entry.couple_name && (
                      <div style={{ fontWeight: 500 }}>{entry.couple_name}</div>
                    )}
                    <div>{formatDateTime(entry.moved_at)}</div>
                    {entry.distance_meters != null && (
                      <div style={{ color: '#999', marginTop: 2 }}>
                        {entry.distance_meters.toFixed(0)}m moved
                      </div>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}
