import React, { useEffect } from 'react';
import { Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';
import { useUiStore } from '@/shared/stores/uiStore';

interface PageHeaderProps {
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  breadcrumbs?: { label: string; path?: string }[];
  actions?: React.ReactNode;
}

export default function PageHeader({
  title,
  icon,
  subtitle,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  const setPageTitle = useUiStore((s) => s.setPageTitle);

  useEffect(() => {
    setPageTitle(title);
  }, [title, setPageTitle]);

  return (
    <div
      style={{
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: '1px solid var(--border)',
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 8 }}
          items={breadcrumbs.map((bc) => ({
            title: bc.path ? <Link to={bc.path}>{bc.label}</Link> : bc.label,
          }))}
        />
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          // Title and actions sat on one nowrap row, so a long title plus two
          // buttons pushed the page past the viewport at 390px.
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.3,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            {icon && <span style={{ fontSize: 22 }}>{icon}</span>}
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                margin: '4px 0 0 0',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
      </div>
    </div>
  );
}