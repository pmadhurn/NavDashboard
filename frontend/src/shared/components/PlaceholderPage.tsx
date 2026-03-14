import React from 'react';
import { ClockCircleOutlined } from '@ant-design/icons';
import PageHeader from './PageHeader';
import GlassCard from './GlassCard';

interface PlaceholderPageProps {
  title: string;
  icon?: React.ReactNode;
}

export default function PlaceholderPage({ title, icon }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingTop: 60,
        }}
      >
        <GlassCard padding="lg" style={{ maxWidth: 460, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 56, color: '#7A7A7A', marginBottom: 20 }}>
            {icon || <ClockCircleOutlined />}
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: '#F2F2F2',
              marginBottom: 8,
            }}
          >
            Coming Soon
          </h2>
          <p style={{ color: '#7A7A7A', fontSize: 14, margin: 0 }}>
            The <strong style={{ color: '#B8B8B8' }}>{title}</strong> module is
            under development and will be available in a future phase.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}