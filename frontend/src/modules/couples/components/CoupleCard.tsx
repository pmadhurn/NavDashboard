import { useNavigate } from 'react-router-dom'
import { Tag } from 'antd'
import { WifiOutlined } from '@ant-design/icons'
import GlassCard from '@/shared/components/GlassCard'
import StatusBadge from '@/shared/components/StatusBadge'
import { formatCoordinates } from '@/shared/utils/formatters'
import type { Couple } from '@/shared/types/couples'

interface CoupleCardProps {
  couple: Couple
  onClick?: () => void
}

export default function CoupleCard({ couple, onClick }: CoupleCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      navigate(`/couples/${couple.id}`)
    }
  }

  return (
    <GlassCard
      hoverable
      onClick={handleClick}
      accentColor={couple.status_color}
      style={{ minHeight: 140 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
          {couple.name}
        </span>
        <StatusBadge status={couple.status as 'WORKING' | 'NOT_WORKING' | 'FAULTY'} size="sm" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {couple.devices.length} device{couple.devices.length !== 1 ? 's' : ''}
          </span>
          {couple.has_rf && (
            <Tag
              icon={<WifiOutlined />}
              color="blue"
              style={{ borderRadius: 6, fontSize: 11 }}
            >
              RF
            </Tag>
          )}
        </div>

        {couple.handling_person_name && (
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            {couple.handling_person_name}
          </span>
        )}
      </div>

      <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          {couple.location
            ? formatCoordinates(couple.location.latitude, couple.location.longitude)
            : 'No location'}
        </span>
      </div>
    </GlassCard>
  )
}