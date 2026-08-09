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
    icon: <ApiOutlined style={{ fontSize: 22, color: 'var(--input-focus)' }} />,
    query: 'What is the current status of all pairs?',
  },
  {
    icon: <WarningOutlined style={{ fontSize: 22, color: 'var(--input-focus)' }} />,
    query: 'Show me all faulty devices',
  },
  {
    icon: <ToolOutlined style={{ fontSize: 22, color: 'var(--input-focus)' }} />,
    query: 'How to troubleshoot OU connection issues?',
  },
  {
    icon: <EnvironmentOutlined style={{ fontSize: 22, color: 'var(--input-focus)' }} />,
    query: 'List all devices at each location',
  },
  {
    icon: <AlertOutlined style={{ fontSize: 22, color: 'var(--input-focus)' }} />,
    query: 'What errors were reported recently?',
  },
  {
    icon: <HeartOutlined style={{ fontSize: 22, color: 'var(--input-focus)' }} />,
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
        padding: '16px 24px 8px',
      }}
    >
      <RobotOutlined style={{ fontSize: 36, color: '#6A6A6A', marginBottom: 8 }} />
      <h1 style={{ color: 'var(--primary)', fontSize: 18, fontWeight: 600, margin: 0 }}>
        NavDashboard AI Assistant
      </h1>
      <p style={{ color: '#6A6A6A', fontSize: 12, marginTop: 4, marginBottom: 16 }}>
        Ask about devices, troubleshooting, configurations
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 8,
          maxWidth: 720,
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
              gap: 10,
              padding: '10px 14px',
              background: 'var(--overlay-subtle)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              cursor: 'pointer',
              textAlign: 'left',
              color: '#A0A0A0',
              fontSize: 12,
              lineHeight: 1.4,
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--overlay-medium)';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = '#D0D0D0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--overlay-subtle)';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = '#A0A0A0';
            }}
          >
            <span style={{ flexShrink: 0, fontSize: 16 }}>{item.icon}</span>
            <span>{item.query}</span>
          </button>
        ))}
      </div>
    </div>
  );
}