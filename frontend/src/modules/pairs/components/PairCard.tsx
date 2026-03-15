import React from 'react'
import { Tag } from 'antd'
import { SwapOutlined, UserOutlined } from '@ant-design/icons'
import GlassCard from '@/shared/components/GlassCard'
import StatusBadge from '@/shared/components/StatusBadge'
import type { Pair } from '@/shared/types/pairs'

interface PairCardProps {
  pair: Pair
  onClick: () => void
  onEdit?: (pair: Pair) => void
}

function CoupleMinSection({ couple, label }: { couple: { name: string; status: string; status_color: string; deviceCount: number }; label: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: couple.status_color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            color: '#fff',
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {couple.name}
        </span>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
        {couple.deviceCount} device{couple.deviceCount !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

export default function PairCard({ pair, onClick, onEdit }: PairCardProps) {
  const coupleA = pair.couples[0]
  const coupleB = pair.couples[1]

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString()
  }

  return (
    <GlassCard
      hoverable
      accentColor={pair.status_color}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Top: Name + Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <SwapOutlined style={{ color: pair.status_color, fontSize: 18 }} />
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 16, flex: 1 }}>
          {pair.name}
        </span>
        <StatusBadge status={pair.status as 'WORKING' | 'NOT_WORKING' | 'FAULTY'} size="sm" />
        <Tag
          color={pair.status_override ? 'orange' : 'cyan'}
          style={{ fontSize: 10, lineHeight: '16px', padding: '0 5px', margin: 0 }}
        >
          {pair.status_override ? 'Manual' : 'Auto'}
        </Tag>
      </div>

      {/* Body: side-by-side couples */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '10px 0',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {coupleA && (
          <CoupleMinSection
            couple={{
              name: coupleA.name,
              status: coupleA.status,
              status_color: coupleA.status_color,
              deviceCount: coupleA.devices.length,
            }}
            label="Couple A"
          />
        )}
        {coupleB && (
          <CoupleMinSection
            couple={{
              name: coupleB.name,
              status: coupleB.status,
              status_color: coupleB.status_color,
              deviceCount: coupleB.devices.length,
            }}
            label="Couple B"
          />
        )}
      </div>

      {/* Bottom: person + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        {pair.handling_person_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            <UserOutlined />
            {pair.handling_person_name}
          </div>
        )}
        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
          {formatDate(pair.updated_at ?? pair.created_at)}
        </span>
      </div>
    </GlassCard>
  )
}