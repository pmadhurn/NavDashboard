import React from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../../../shared/components/GlassCard'
import LoadingSpinner from '../../../shared/components/LoadingSpinner'
import EmptyState from '../../../shared/components/EmptyState'
import { formatRelativeTime } from '../../../shared/utils/formatters'
import type { RecentActivityItem } from '../hooks/useDashboard'

interface RecentActivityProps {
  items: RecentActivityItem[] | undefined
  loading: boolean
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: '#5F8F6B',
  UPDATE: '#7A7A7A',
  DELETE: '#9B3E3E',
  STATUS_CHANGE: '#B68A3C',
}

export default function RecentActivity({
  items,
  loading,
}: RecentActivityProps) {
  const navigate = useNavigate()

  return (
    <GlassCard padding="lg" fullHeight>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            color: '#F2F2F2',
            fontSize: 16,
            fontWeight: 600,
            margin: 0,
          }}
        >
          Recent Activity
        </h3>
        <span
          onClick={() => navigate('/audit')}
          style={{
            color: '#7A7A7A',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            ;(e.target as HTMLSpanElement).style.color = '#B8B8B8'
          }}
          onMouseLeave={(e) => {
            ;(e.target as HTMLSpanElement).style.color = '#7A7A7A'
          }}
        >
          View All →
        </span>
      </div>

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
          }}
        >
          <LoadingSpinner size="md" />
        </div>
      ) : !items || items.length === 0 ? (
        <EmptyState title="No recent activity" description="Activity will appear here as changes are made" />
      ) : (
        <div
          style={{
            maxHeight: 400,
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {items.map((item, index) => {
            const dotColor = ACTION_COLORS[item.action] || '#7A7A7A'
            const isLast = index === items.length - 1

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  position: 'relative',
                  paddingBottom: isLast ? 0 : 16,
                }}
              >
                {/* Timeline line */}
                {!isLast && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 5,
                      top: 14,
                      bottom: 0,
                      width: 1,
                      background: '#2C2C2C',
                    }}
                  />
                )}

                {/* Dot */}
                <div
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: '50%',
                    background: dotColor,
                    flexShrink: 0,
                    marginTop: 3,
                    zIndex: 1,
                  }}
                />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: '#D6D6D6',
                      fontSize: 13,
                      lineHeight: '18px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.description}
                  </div>
                  <div
                    style={{
                      color: '#666',
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  >
                    {formatRelativeTime(item.timestamp)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </GlassCard>
  )
}