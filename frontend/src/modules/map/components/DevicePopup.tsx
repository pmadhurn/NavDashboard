import { Popup } from 'react-leaflet'
import { WifiOutlined, EnvironmentOutlined, EyeOutlined, HistoryOutlined } from '@ant-design/icons'
import type { MapDataPoint } from '@/shared/types/locations'
import type { Couple } from '@/shared/types/couples'
import { formatCoordinates } from '@/shared/utils/formatters'

interface DevicePopupProps {
  point: MapDataPoint
  couple: Couple | null
  onViewDetail: () => void
  onViewHistory: () => void
}

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

function getStatusLabel(status: string): string {
  switch (status) {
    case 'WORKING':
      return 'Working'
    case 'NOT_WORKING':
      return 'Not Working'
    case 'FAULTY':
      return 'Faulty'
    default:
      return status
  }
}

export default function DevicePopup({
  point,
  couple,
  onViewDetail,
  onViewHistory,
}: DevicePopupProps) {
  const statusColor = getMarkerColor(point.status)

  return (
    <Popup
      closeButton={true}
      maxWidth={280}
      minWidth={220}
      autoPan={true}
    >
      <div style={{ padding: '4px 0' }}>
        {/* Header */}
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 6,
            }}
          >
            {point.couple_name}
          </div>

          {/* Status badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              borderRadius: 20,
              background: `${statusColor}1A`,
              fontSize: 12,
              fontWeight: 500,
              color: statusColor,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: statusColor,
              }}
            />
            {getStatusLabel(point.status)}
          </div>
        </div>

        {/* RF indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6,
            fontSize: 12,
            color: point.has_rf ? '#A8C4B0' : 'var(--text-muted)',
          }}
        >
          <WifiOutlined style={{ fontSize: 13 }} />
          <span>{point.has_rf ? 'RF Enabled' : 'No RF'}</span>
        </div>

        {/* Coordinates */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 10,
            fontSize: 12,
            color: 'var(--secondary)',
          }}
        >
          <EnvironmentOutlined style={{ fontSize: 13 }} />
          <span>{formatCoordinates(point.latitude, point.longitude)}</span>
        </div>

        {/* Full couple detail section */}
        {couple && (
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: 8,
              marginBottom: 8,
            }}
          >
            {/* Devices list */}
            {couple.devices && couple.devices.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 4,
                  }}
                >
                  Devices
                </div>
                {couple.devices.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      padding: '2px 0',
                    }}
                  >
                    {d.serial_number}{' '}
                    <span style={{ color: 'var(--text-muted)' }}>({d.device_type})</span>
                  </div>
                ))}
              </div>
            )}

            {/* Handling person */}
            {couple.handling_person_name && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Handler: </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {couple.handling_person_name}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action links */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 8,
          }}
        >
          <button
            onClick={onViewDetail}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <EyeOutlined style={{ fontSize: 12 }} />
            View Detail
          </button>
          <button
            onClick={onViewHistory}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <HistoryOutlined style={{ fontSize: 12 }} />
            Show Trail
          </button>
        </div>
      </div>
    </Popup>
  )
}