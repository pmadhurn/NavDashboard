import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import GlassCard from '../../../shared/components/GlassCard'
import LoadingSpinner from '../../../shared/components/LoadingSpinner'
import EmptyState from '../../../shared/components/EmptyState'
import type { ErrorTrendPoint } from '../hooks/useDashboard'

interface ErrorTrendChartProps {
  data: ErrorTrendPoint[] | undefined
  loading: boolean
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    dataKey: string
    value: number
    color: string
  }>
  label?: string
}

function GlassTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const dateLabel = label || ''
  const parts = dateLabel.split('-')
  const formatted =
    parts.length === 3
      ? new Date(`${dateLabel}T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : dateLabel

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
      <p style={{ margin: '0 0 4px 0', fontWeight: 600 }}>{formatted}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          style={{
            margin: '2px 0',
            color: entry.color,
            fontSize: 12,
          }}
        >
          {entry.dataKey.replace('severity_', '').replace('count', 'Total')}:{' '}
          {entry.value}
        </p>
      ))}
    </div>
  )
}

function formatXAxisDate(dateStr: string): string {
  try {
    const date = new Date(`${dateStr}T00:00:00`)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

export default function ErrorTrendChart({
  data,
  loading,
}: ErrorTrendChartProps) {
  const hasAnyErrors =
    data && data.some((point) => point.count > 0)

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
          Error Trends (30 Days)
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
      ) : !data || data.length === 0 || !hasAnyErrors ? (
        <EmptyState title="No errors in the last 30 days" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#262626"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxisDate}
              tick={{ fill: '#B8B8B8', fontSize: 11 }}
              axisLine={{ stroke: '#262626' }}
              tickLine={{ stroke: '#7A7A7A' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#B8B8B8', fontSize: 13 }}
              axisLine={{ stroke: '#262626' }}
              tickLine={{ stroke: '#7A7A7A' }}
              allowDecimals={false}
            />
            <Tooltip content={<GlassTooltip />} />
            <Area
              type="monotone"
              dataKey="severity_critical"
              stackId="1"
              stroke="#6E2C2C"
              fill="#6E2C2C"
              fillOpacity={0.3}
              name="Critical"
            />
            <Area
              type="monotone"
              dataKey="severity_high"
              stackId="1"
              stroke="#9B3E3E"
              fill="#9B3E3E"
              fillOpacity={0.2}
              name="High"
            />
            <Area
              type="monotone"
              dataKey="severity_medium"
              stackId="1"
              stroke="#B68A3C"
              fill="#B68A3C"
              fillOpacity={0.15}
              name="Medium"
            />
            <Area
              type="monotone"
              dataKey="severity_low"
              stackId="1"
              stroke="#6E6E6E"
              fill="#6E6E6E"
              fillOpacity={0.1}
              name="Low"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </GlassCard>
  )
}