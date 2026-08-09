import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ApiOutlined,
  LinkOutlined,
  SwapOutlined,
  WarningOutlined,
  UserOutlined,
  FileOutlined,
} from '@ant-design/icons';
import type { SourceRef } from '../hooks/useAIChat';

interface SourceReferenceProps {
  source: SourceRef;
}

const iconMap: Record<string, React.ReactNode> = {
  device: <ApiOutlined />,
  couple: <LinkOutlined />,
  pair: <SwapOutlined />,
  error_log: <WarningOutlined />,
  personnel: <UserOutlined />,
  troubleshoot: <WarningOutlined />,
  material: <FileOutlined />,
  location: <FileOutlined />,
};

export default function SourceReference({ source }: SourceReferenceProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    switch (source.entity_type) {
      case 'device':
        if (source.entity_id) navigate(`/devices/${source.entity_id}`);
        break;
      case 'couple':
        if (source.entity_id) navigate(`/couples/${source.entity_id}`);
        break;
      case 'pair':
        if (source.entity_id) navigate(`/pairs/${source.entity_id}`);
        break;
      case 'error_log':
      case 'troubleshoot':
        navigate('/troubleshooting');
        break;
      default:
        break;
    }
  };

  return (
    <button
      onClick={handleClick}
      title={source.snippet}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--overlay-subtle)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '4px 10px',
        color: 'var(--text-muted)',
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--overlay-medium)';
        e.currentTarget.style.borderColor = 'var(--overlay-strong)';
        e.currentTarget.style.color = 'var(--input-focus)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--overlay-subtle)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.color = 'var(--text-muted)';
      }}
    >
      {iconMap[source.entity_type] || <FileOutlined />}
      <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {source.name}
      </span>
    </button>
  );
}