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
      <div style={{ fontSize: 48, color: 'var(--text-muted)', marginBottom: 16 }}>
        {icon || <InboxOutlined />}
      </div>
      <div
        style={{
          fontSize: 18,
          color: 'var(--text-secondary)',
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
            color: 'var(--text-muted)',
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