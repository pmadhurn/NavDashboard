import React from 'react'
import GlassCard from '../../../shared/components/GlassCard'
import LoadingSpinner from '../../../shared/components/LoadingSpinner'
import type { StatusDistribution } from '../hooks/useDashboard'

interface StatusOverviewProps {
  distribution: StatusDistribution[] | undefined
  loading: boolean
}

const ENTITY_LABELS: Record<string, string> = {
  device: 'Devices',
  couple: 'Couples',
  pair: 'Pairs',
}

const STATUS_COLORS = {
  working: '#5F8F6B',
  not_working: '#B68A3C',
  faulty: '#9B3E3E',
}

function StatusBar({ item }: { item: StatusDistribution }) {
  const total = item.working + item.not_working + item.faulty
  const label = ENTITY_LABELS[item.entity_type] || item.entity_type

  const getWidth = (count: number): string => {
    if (total === 0) return '0%'
    return `${(count / total) * 100}%`
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <span style={{ color: '#F2F2F2', fontSize: 14, fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ color: '#7A7A7A', fontSize: 13 }}>
          {total} total
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          height: 24,
          borderRadius: 8,
          overflow: 'hidden',
          background: '#1A1A1A',
        }}
      >
        {total === 0 ? (
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#555',
              fontSize: 11,
            }}
          >
            No data
          </div>
        ) : (
          <>
            {item.working > 0 && (
              <div
                style={{
                  width: getWidth(item.working),
                  background: STATUS_COLORS.working,
                  transition: 'width 0.5s ease',
                  minWidth: item.working > 0 ? 2 : 0,
                }}
              />
            )}
            {item.not_working > 0 && (
              <div
                style={{
                  width: getWidth(item.not_working),
                  background: STATUS_COLORS.not_working,
                  transition: 'width 0.5s ease',
                  minWidth: item.not_working > 0 ? 2 : 0,
                }}
              />
            )}
            {item.faulty > 0 && (
              <div
                style={{
                  width: getWidth(item.faulty),
                  background: STATUS_COLORS.faulty,
                  transition: 'width 0.5s ease',
                  minWidth: item.faulty > 0 ? 2 : 0,
                }}
              />
            )}
          </>
        )}
      </div>

      {total > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 6,
            fontSize: 12,
          }}
        >
          <span style={{ color: STATUS_COLORS.working }}>
            ● Working: {item.working}
          </span>
          <span style={{ color: STATUS_COLORS.not_working }}>
            ● Not Working: {item.not_working}
          </span>
          <span style={{ color: STATUS_COLORS.faulty }}>
            ● Faulty: {item.faulty}
          </span>
        </div>
      )}
    </div>
  )
}

export default function StatusOverview({
  distribution,
  loading,
}: StatusOverviewProps) {
  return (
    <GlassCard padding="lg" fullHeight>
      <div style={{ marginBottom: 16 }}>
        <h3
          style={{
            color: '#F2F2F2',
            fontSize: 16,
            fontWeight: 600,
            margin: 0,
          }}
        >
          Status Overview
        </h3>
      </div>

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 160,
          }}
        >
          <LoadingSpinner size="md" />
        </div>
      ) : distribution && distribution.length > 0 ? (
        distribution.map((item) => (
          <StatusBar key={item.entity_type} item={item} />
        ))
      ) : (
        <div style={{ color: '#7A7A7A', textAlign: 'center', padding: 32 }}>
          No status data available
        </div>
      )}
    </GlassCard>
  )
}