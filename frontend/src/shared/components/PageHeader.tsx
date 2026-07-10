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
        borderBottom: '1px solid #242424',
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
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: '#F2F2F2',
              margin: 0,
              lineHeight: 1.3,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {icon && <span style={{ fontSize: 22 }}>{icon}</span>}
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontSize: 14,
                color: '#B8B8B8',
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