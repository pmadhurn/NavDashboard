import React from 'react'
import PageHeader from '../../../shared/components/PageHeader'
import StatsCards from '../components/StatsCards'
import StatusOverview from '../components/StatusOverview'
import PairStatusPie from '../components/PairStatusPie'
import DeviceChart from '../components/DeviceChart'
import ErrorTrendChart from '../components/ErrorTrendChart'
import RecentActivity from '../components/RecentActivity'
import {
  useDashboardStats,
  useStatusDistribution,
  useDeviceTypeBreakdown,
  useErrorTrends,
  useRecentActivity,
  usePairStatus,
} from '../hooks/useDashboard'

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: distribution, isLoading: distLoading } =
    useStatusDistribution()
  const { data: deviceBreakdown, isLoading: deviceLoading } =
    useDeviceTypeBreakdown()
  const { data: errorTrends, isLoading: errorLoading } = useErrorTrends(30)
  const { data: recentActivity, isLoading: activityLoading } =
    useRecentActivity(20)
  const { data: pairStatus, isLoading: pairLoading } = usePairStatus()

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="System overview" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 24,
          marginTop: 24,
        }}
      >
        {/* Row 1: Stats cards — full width */}
        <div style={{ gridColumn: 'span 12' }}>
          <StatsCards stats={stats} loading={statsLoading} />
        </div>

        {/* Row 2: Status overview (8 cols) + Pair pie (4 cols) */}
        <div style={{ gridColumn: 'span 8' }}>
          <StatusOverview distribution={distribution} loading={distLoading} />
        </div>
        <div style={{ gridColumn: 'span 4' }}>
          <PairStatusPie data={pairStatus} loading={pairLoading} />
        </div>

        {/* Row 3: Device chart (6 cols) + Error trend (6 cols) */}
        <div style={{ gridColumn: 'span 6' }}>
          <DeviceChart data={deviceBreakdown} loading={deviceLoading} />
        </div>
        <div style={{ gridColumn: 'span 6' }}>
          <ErrorTrendChart data={errorTrends} loading={errorLoading} />
        </div>

        {/* Row 4: Recent activity — full width */}
        <div style={{ gridColumn: 'span 12' }}>
          <RecentActivity items={recentActivity} loading={activityLoading} />
        </div>
      </div>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 1024px) {
          div[style*="grid-template-columns: repeat(12"] > div[style*="span 8"] {
            grid-column: span 12 !important;
          }
          div[style*="grid-template-columns: repeat(12"] > div[style*="span 4"] {
            grid-column: span 12 !important;
          }
          div[style*="grid-template-columns: repeat(12"] > div[style*="span 6"] {
            grid-column: span 12 !important;
          }
        }
      `}</style>
    </div>
  )
}