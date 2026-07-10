import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ApiOutlined,
  ToolOutlined,
  ProjectOutlined,
  DeploymentUnitOutlined,
  WarningOutlined,
  DollarOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import GlassCard from '@/shared/components/GlassCard'
import StatusOverview from '../components/StatusOverview'
import PairStatusPie from '../components/PairStatusPie'
import DeviceChart from '../components/DeviceChart'
import ErrorTrendChart from '../components/ErrorTrendChart'
import { useAuthStore, hasPermission } from '@/shared/stores/authStore'
import { useUiStore } from '@/shared/stores/uiStore'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import {
  useHomeSummary,
  useStatusDistribution,
  useDeviceTypeBreakdown,
  useErrorTrends,
  usePairStatus,
  HomeSummary,
} from '../hooks/useDashboard'

interface Widget {
  key: string
  label: string
  value: (s: HomeSummary) => string
  hint: (s: HomeSummary) => string
  icon: ReactNode
  accent: string
  to: string
  section: string
  showWhenZero?: boolean
}

const WIDGETS: Widget[] = [
  {
    key: 'devices',
    label: 'Devices working',
    value: (s) => `${s.devices_working}/${s.devices_total}`,
    hint: (s) => (s.devices_faulty > 0 ? `${s.devices_faulty} faulty` : 'all healthy'),
    icon: <ApiOutlined />,
    accent: '#5E8C86',
    to: '/devices',
    section: 'devices',
    showWhenZero: true,
  },
  {
    key: 'errors',
    label: 'Open issues',
    value: (s) => String(s.active_errors),
    hint: () => 'troubleshooting',
    icon: <ToolOutlined />,
    accent: '#9B3E3E',
    to: '/troubleshooting',
    section: 'troubleshooting',
    showWhenZero: true,
  },
  {
    key: 'projects',
    label: 'Active projects',
    value: (s) => String(s.projects_active),
    hint: () => 'in progress',
    icon: <ProjectOutlined />,
    accent: '#B68A3C',
    to: '/projects',
    section: 'projects',
    showWhenZero: true,
  },
  {
    key: 'deployed',
    label: 'Equipment out',
    value: (s) => String(s.equipment_out),
    hint: () => 'at project sites',
    icon: <DeploymentUnitOutlined />,
    accent: '#6F8CB6',
    to: '/inventory/assets',
    section: 'inventory',
    showWhenZero: true,
  },
  {
    key: 'damaged',
    label: 'Damaged items',
    value: (s) => String(s.damaged_open),
    hint: () => 'need attention',
    icon: <WarningOutlined />,
    accent: '#8C5F5F',
    to: '/inventory/assets',
    section: 'inventory',
  },
  {
    key: 'myspend',
    label: 'My spend this month',
    value: (s) => `₹${s.my_expenses_month_total.toLocaleString('en-IN')}`,
    hint: (s) => `${s.my_expenses_month_count} expenses`,
    icon: <DollarOutlined />,
    accent: '#5F8F6B',
    to: '/finance',
    section: 'finance',
    showWhenZero: true,
  },
  {
    key: 'approvals',
    label: 'Pending approvals',
    value: (s) => String(s.pending_user_approvals),
    hint: () => 'awaiting review',
    icon: <UserAddOutlined />,
    accent: '#6F7A8C',
    to: '/settings',
    section: 'admin',
  },
]

function KpiCard({ w, summary }: { w: Widget; summary: HomeSummary }) {
  const navigate = useNavigate()
  return (
    <div onClick={() => navigate(w.to)} style={{ cursor: 'pointer' }}>
      <GlassCard padding="md">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#7A7A7A', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {w.label}
            </div>
            <div style={{ color: '#F2F2F2', fontSize: 26, fontWeight: 700, marginTop: 6 }}>
              {w.value(summary)}
            </div>
            <div style={{ color: '#6A6A6A', fontSize: 12, marginTop: 2 }}>{w.hint(summary)}</div>
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              color: w.accent,
              background: `${w.accent}1F`,
            }}
          >
            {w.icon}
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const setPageTitle = useUiStore((s) => s.setPageTitle)
  const isMobile = useIsMobile()
  const { data: summary } = useHomeSummary()

  const canSeeDevices = hasPermission(user, 'devices')
  const { data: distribution, isLoading: distLoading } = useStatusDistribution()
  const { data: deviceBreakdown, isLoading: deviceLoading } = useDeviceTypeBreakdown()
  const { data: errorTrends, isLoading: errorLoading } = useErrorTrends(30)
  const { data: pairStatus, isLoading: pairLoading } = usePairStatus()

  useEffect(() => {
    setPageTitle('Home')
  }, [setPageTitle])

  const greeting = (() => {
    const name = user?.full_name?.split(' ')[0] || user?.username || 'there'
    return `Welcome back, ${name}`
  })()

  const visibleWidgets = summary
    ? WIDGETS.filter((w) => {
        if (!hasPermission(user, w.section)) return false
        const v = w.value(summary)
        const isZero = v === '0' || v === '₹0'
        return w.showWhenZero || !isZero
      })
    : []

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#F2F2F2', fontSize: 24, fontWeight: 700, margin: 0 }}>{greeting}</h1>
        <p style={{ color: '#7A7A7A', fontSize: 13, marginTop: 4 }}>
          Here's what's happening across NavOS today.
        </p>
      </div>

      {/* KPI widgets */}
      {summary && visibleWidgets.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'repeat(auto-fill, minmax(150px, 1fr))'
              : 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 14,
            marginBottom: 28,
          }}
        >
          {visibleWidgets.map((w) => (
            <KpiCard key={w.key} w={w} summary={summary} />
          ))}
        </div>
      )}

      {/* Device analytics (only for users with device access) */}
      {canSeeDevices && (
        <>
          <div
            style={{
              color: '#7A7A7A',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 12,
            }}
          >
            Device analytics
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: 24,
            }}
          >
            <div style={{ gridColumn: 'span 8' }}>
              <StatusOverview distribution={distribution} loading={distLoading} />
            </div>
            <div style={{ gridColumn: 'span 4' }}>
              <PairStatusPie data={pairStatus} loading={pairLoading} />
            </div>
            <div style={{ gridColumn: 'span 6' }}>
              <DeviceChart data={deviceBreakdown} loading={deviceLoading} />
            </div>
            <div style={{ gridColumn: 'span 6' }}>
              <ErrorTrendChart data={errorTrends} loading={errorLoading} />
            </div>
          </div>
          <style>{`
            @media (max-width: 1024px) {
              div[style*="grid-template-columns: repeat(12"] > div[style*="span 8"],
              div[style*="grid-template-columns: repeat(12"] > div[style*="span 4"],
              div[style*="grid-template-columns: repeat(12"] > div[style*="span 6"] {
                grid-column: span 12 !important;
              }
            }
          `}</style>
        </>
      )}
    </div>
  )
}
