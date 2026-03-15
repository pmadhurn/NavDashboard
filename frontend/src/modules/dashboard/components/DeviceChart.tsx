import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import GlassCard from '../../../shared/components/GlassCard'
import LoadingSpinner from '../../../shared/components/LoadingSpinner'
import EmptyState from '../../../shared/components/EmptyState'
import type { DeviceTypeBreakdown } from '../hooks/useDashboard'

interface DeviceChartProps {
  data: DeviceTypeBreakdown[] | undefined
  loading: boolean
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: DeviceTypeBreakdown }>
  label?: string
}

function GlassTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
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
        {label}: {payload[0].value}
      </p>
    </div>
  )
}

export default function DeviceChart({ data, loading }: DeviceChartProps) {
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
          Devices by Type
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
      ) : !data || data.length === 0 ? (
        <EmptyState title="No device data" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#262626"
              vertical={false}
            />
            <XAxis
              dataKey="device_type"
              tick={{ fill: '#B8B8B8', fontSize: 13 }}
              axisLine={{ stroke: '#262626' }}
              tickLine={{ stroke: '#7A7A7A' }}
            />
            <YAxis
              tick={{ fill: '#B8B8B8', fontSize: 13 }}
              axisLine={{ stroke: '#262626' }}
              tickLine={{ stroke: '#7A7A7A' }}
              allowDecimals={false}
            />
            <Tooltip
              content={<GlassTooltip />}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </GlassCard>
  )
}