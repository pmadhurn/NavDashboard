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
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '4px 12px',
        color: '#C9C9C9',
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      {iconMap[source.entity_type] || <FileOutlined />}
      <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {source.name}
      </span>
    </button>
  );
}