import React from 'react';
import { InboxOutlined } from '@ant-design/icons';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 48, color: '#7A7A7A', marginBottom: 16 }}>
        {icon || <InboxOutlined />}
      </div>
      <div
        style={{
          fontSize: 18,
          color: '#B8B8B8',
          fontWeight: 500,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 14,
            color: '#7A7A7A',
            maxWidth: 400,
            marginBottom: 16,
          }}
        >
          {description}
        </div>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}