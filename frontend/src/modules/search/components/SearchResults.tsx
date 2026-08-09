import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs } from 'antd';
import {
  ApiOutlined,
  LinkOutlined,
  SwapOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import GlassCard from '@/shared/components/GlassCard';
import StatusBadge from '@/shared/components/StatusBadge';
import EmptyState from '@/shared/components/EmptyState';
import { SearchResult } from '../hooks/useSearch';

interface SearchResultsProps {
  results: SearchResult[];
  entityCounts: Record<string, number>;
  query: string;
}

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  device: <ApiOutlined style={{ fontSize: 20, color: 'var(--status-working)' }} />,
  couple: <LinkOutlined style={{ fontSize: 20, color: 'var(--status-not-working)' }} />,
  pair: <SwapOutlined style={{ fontSize: 20, color: 'var(--text-muted)' }} />,
  personnel: <UserOutlined style={{ fontSize: 20, color: 'var(--status-working)' }} />,
  error: <WarningOutlined style={{ fontSize: 20, color: 'var(--status-faulty)' }} />,
};

const ENTITY_LABELS: Record<string, string> = {
  device: 'Device',
  couple: 'Couple',
  pair: 'Pair',
  personnel: 'Personnel',
  error: 'Error',
};

function getEntityRoute(entityType: string, entityId: string): string {
  switch (entityType) {
    case 'device':
      return `/devices/${entityId}`;
    case 'couple':
      return `/couples/${entityId}`;
    case 'pair':
      return `/pairs/${entityId}`;
    case 'error':
      return '/troubleshooting';
    default:
      return '#';
  }
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!text || !query) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const startIndex = lowerText.indexOf(lowerQuery);

  if (startIndex === -1) return text;

  const before = text.substring(0, startIndex);
  const match = text.substring(startIndex, startIndex + query.length);
  const after = text.substring(startIndex + query.length);

  return (
    <>
      {before}
      <span
        style={{
          background: 'rgba(230,230,230,0.15)',
          padding: '0 2px',
          borderRadius: 2,
        }}
      >
        {match}
      </span>
      {after}
    </>
  );
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  entityCounts,
  query,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

  const filteredResults =
    activeTab === 'all'
      ? results
      : results.filter((r) => r.entity_type === activeTab);

  const totalCount = results.length;

  const tabItems = [
    {
      key: 'all',
      label: `All (${totalCount})`,
    },
    ...Object.entries(entityCounts)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        key: type,
        label: `${ENTITY_LABELS[type] || type} (${count})`,
      })),
  ];

  if (results.length === 0) {
    return (
      <EmptyState
        icon={<ApiOutlined style={{ fontSize: 48, color: 'var(--text-muted)' }} />}
        title={`No results found for "${query}"`}
        description="Try a different search term or adjust your filters"
      />
    );
  }

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredResults.map((result) => (
          <GlassCard
            key={result.id}
            style={{
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onClick={() => {
              const route = getEntityRoute(result.entity_type, result.id);
              if (route !== '#') navigate(route);
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {ENTITY_ICONS[result.entity_type] || (
                  <ApiOutlined style={{ fontSize: 20, color: 'var(--text-muted)' }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: 15,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {highlightText(result.name, query)}
                </div>
                {result.description && (
                  <div
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 500,
                    }}
                  >
                    {highlightText(
                      result.description.length > 100
                        ? result.description.slice(0, 100) + '...'
                        : result.description,
                      query,
                    )}
                  </div>
                )}
                <div style={{ marginTop: 4 }}>
                  <span
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      background: 'rgba(255,255,255,0.04)',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {ENTITY_LABELS[result.entity_type] || result.entity_type}
                  </span>
                </div>
              </div>

              <div style={{ flexShrink: 0 }}>
                {result.status && <StatusBadge status={result.status} />}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;