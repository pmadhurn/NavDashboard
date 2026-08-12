import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  SwapOutlined,
  ApiOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import GlassCard from '../../../shared/components/GlassCard'
import LoadingSpinner from '../../../shared/components/LoadingSpinner'
import type { DashboardStats } from '../hooks/useDashboard'

interface StatsCardsProps {
  stats: DashboardStats | undefined
  loading: boolean
}

interface CardDef {
  label: string
  key: keyof DashboardStats
  icon: React.ReactNode
  accent: string
  link?: string
}

const cards: CardDef[] = [
  {
    label: 'Total Links',
    key: 'total_pairs',
    icon: <SwapOutlined style={{ fontSize: 24, color: 'var(--text-muted)' }} />,
    accent: '#2E2E2E',
    link: '/pairs',
  },
  {
    label: 'Total Devices',
    key: 'total_devices',
    icon: <ApiOutlined style={{ fontSize: 24, color: 'var(--text-muted)' }} />,
    accent: '#2E2E2E',
    link: '/devices',
  },
  {
    label: 'Active Errors',
    key: 'active_errors',
    icon: <WarningOutlined style={{ fontSize: 24, color: 'var(--text-muted)' }} />,
    accent: 'var(--status-faulty)',
    link: '/troubleshooting',
  },
  {
    label: 'Working Devices',
    key: 'devices_working',
    icon: <CheckCircleOutlined style={{ fontSize: 24, color: 'var(--text-muted)' }} />,
    accent: 'var(--status-working)',
  },
]

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  const navigate = useNavigate()

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
      }}
    >
      {cards.map((card) => {
        const value = stats ? stats[card.key] : 0
        const dynamicAccent =
          card.key === 'active_errors' && stats && stats.active_errors > 0
            ? 'var(--status-faulty)'
            : card.accent

        return (
          <GlassCard
            key={card.key}
            padding="md"
            hoverable
            style={{
              borderLeft: `3px solid ${dynamicAccent}`,
              position: 'relative',
              minHeight: 120,
              cursor: card.link ? 'pointer' : 'default',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onClick={() => card.link && navigate(card.link)}
          >
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 80,
                }}
              >
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div>{card.icon}</div>
                <div
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    lineHeight: '20px',
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: 32,
                    fontWeight: 700,
                    lineHeight: '38px',
                  }}
                >
                  {value}
                </div>
                {card.link && (
                  <div
                    style={{
                      color: 'var(--status-working)',
                      fontSize: 11,
                      marginTop: 4,
                      opacity: 0.7,
                    }}
                  >
                    Click to view →
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        )
      })}

      {/* Responsive: 2-col on narrow screens */}
      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 500px) {
          div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}