import React from 'react';
import {
  RobotOutlined,
  ApiOutlined,
  WarningOutlined,
  ToolOutlined,
  EnvironmentOutlined,
  AlertOutlined,
  HeartOutlined,
} from '@ant-design/icons';

interface SuggestedQueriesProps {
  onSelect: (query: string) => void;
}

const suggestions = [
  {
    icon: <ApiOutlined style={{ fontSize: 22, color: '#C9C9C9' }} />,
    query: 'What is the current status of all pairs?',
  },
  {
    icon: <WarningOutlined style={{ fontSize: 22, color: '#C9C9C9' }} />,
    query: 'Show me all faulty devices',
  },
  {
    icon: <ToolOutlined style={{ fontSize: 22, color: '#C9C9C9' }} />,
    query: 'How to troubleshoot OU connection issues?',
  },
  {
    icon: <EnvironmentOutlined style={{ fontSize: 22, color: '#C9C9C9' }} />,
    query: 'List all devices at each location',
  },
  {
    icon: <AlertOutlined style={{ fontSize: 22, color: '#C9C9C9' }} />,
    query: 'What errors were reported recently?',
  },
  {
    icon: <HeartOutlined style={{ fontSize: 22, color: '#C9C9C9' }} />,
    query: 'Summarize the system health',
  },
];

export default function SuggestedQueries({ onSelect }: SuggestedQueriesProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 40,
      }}
    >
      <RobotOutlined style={{ fontSize: 48, color: '#C9C9C9', marginBottom: 16 }} />
      <h1 style={{ color: '#F2F2F2', fontSize: 24, fontWeight: 600, margin: 0 }}>
        NavDashboard AI Assistant
      </h1>
      <p style={{ color: '#7A7A7A', fontSize: 14, marginTop: 8, marginBottom: 32 }}>
        Ask me anything about your LiFi devices
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
          maxWidth: 800,
          width: '100%',
        }}
      >
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(item.query)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 18px',
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              cursor: 'pointer',
              textAlign: 'left',
              color: '#E0E0E0',
              fontSize: 13,
              lineHeight: 1.4,
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
            }}
          >
            <span style={{ flexShrink: 0 }}>{item.icon}</span>
            <span>{item.query}</span>
          </button>
        ))}
      </div>
    </div>
  );
}