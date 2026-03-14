import React from 'react';
import {
  SwapOutlined,
  ApiOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import { useAuthStore } from '@/shared/stores/authStore';

const statCards = [
  {
    title: 'Total Pairs',
    value: '—',
    icon: <SwapOutlined />,
    color: '#E6E6E6',
  },
  {
    title: 'Total Devices',
    value: '—',
    icon: <ApiOutlined />,
    color: '#9FA3A8',
  },
  {
    title: 'Active Errors',
    value: '—',
    icon: <WarningOutlined />,
    color: '#9B3E3E',
  },
  {
    title: 'System Status',
    value: 'Online',
    icon: <CheckCircleOutlined />,
    color: '#5F8F6B',
  },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="System overview" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {statCards.map((card) => (
          <GlassCard key={card.title} hoverable padding="md">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: '#7A7A7A',
                    marginBottom: 4,
                    fontWeight: 500,
                  }}
                >
                  {card.title}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: card.color,
                  }}
                >
                  {card.value}
                </div>
              </div>
              <div
                style={{
                  fontSize: 24,
                  color: card.color,
                  opacity: 0.4,
                }}
              >
                {card.icon}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard padding="lg">
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#F2F2F2',
            marginBottom: 12,
          }}
        >
          Welcome{user?.full_name ? `, ${user.full_name}` : ''}
        </h3>
        <p style={{ color: '#B8B8B8', fontSize: 14, margin: 0, lineHeight: 1.7 }}>
          This is the NavDashboard control panel. Use the sidebar to navigate between
          modules. This dashboard will be populated with real data in Phase 10 —
          including device statistics, pair metrics, and system health indicators.
        </p>
        <p
          style={{
            color: '#7A7A7A',
            fontSize: 13,
            marginTop: 12,
            marginBottom: 0,
          }}
        >
          Current role:{' '}
          <span style={{ color: '#B8B8B8', fontWeight: 500 }}>
            {user?.role || '—'}
          </span>
        </p>
      </GlassCard>
    </div>
  );
}