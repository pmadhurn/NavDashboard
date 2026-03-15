import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import GlassCard from '../../../shared/components/GlassCard'
import LoadingSpinner from '../../../shared/components/LoadingSpinner'
import type { PairStatusData } from '../hooks/useDashboard'

interface PairStatusPieProps {
  data: PairStatusData[] | undefined
  loading: boolean
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    payload: PairStatusData
  }>
}

function GlassTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div
      style={{
        background: 'rgba(20, 20, 20, 0.9)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 8,
        padding: '8px 12px',
        color: '#F2F2F2',
        fontSize: 13,
      }}
    >
      <p style={{ margin: 0 }}>
        {item.payload.status}: {item.value}
      </p>
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  WORKING: 'Working',
  NOT_WORKING: 'Not Working',
  FAULTY: 'Faulty',
}

interface CenterLabelProps {
  viewBox?: { cx: number; cy: number }
  total: number
}

function CenterLabel({ viewBox, total }: CenterLabelProps) {
  const cx = viewBox?.cx ?? 0
  const cy = viewBox?.cy ?? 0
  return (
    <g>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 28, fontWeight: 700, fill: '#F2F2F2' }}
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 12, fill: '#7A7A7A' }}
      >
        Total
      </text>
    </g>
  )
}

export default function PairStatusPie({ data, loading }: PairStatusPieProps) {
  const total = data ? data.reduce((sum, item) => sum + item.count, 0) : 0

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
          Pair Status
        </h3>
      </div>

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 250,
          }}
        >
          <LoadingSpinner size="md" />
        </div>
      ) : !data || data.length === 0 || total === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 250,
            color: '#7A7A7A',
            fontSize: 14,
          }}
        >
          No pairs
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                stroke="#0A0A0A"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <CenterLabel total={total} />
              </Pie>
              <Tooltip content={<GlassTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
              flexWrap: 'wrap',
              marginTop: 8,
            }}
          >
            {data.map((item) => (
              <div
                key={item.status}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: item.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: '#B8B8B8' }}>
                  {STATUS_LABELS[item.status] || item.status}: {item.count}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </GlassCard>
  )
}