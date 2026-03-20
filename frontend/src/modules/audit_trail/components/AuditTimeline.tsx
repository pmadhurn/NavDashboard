import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Tooltip } from 'antd';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import GlassCard from '@/shared/components/GlassCard';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { AuditEntry } from '../hooks/useAuditTrail';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface AuditTimelineProps {
  entries: AuditEntry[];
  loading: boolean;
  onLoadMore?: () => void;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: '#5F8F6B',
  SEED_CREATE: '#5F8F6B',
  UPDATE: '#7A7A7A',
  STATUS_CHANGE: '#7A7A7A',
  DELETE: '#9B3E3E',
  RESOLVE: '#5F8F6B',
  ADD_STEP: '#7A7A7A',
};

function getEntityRoute(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case 'device':
      return `/devices/${entityId}`;
    case 'couple':
      return `/couples/${entityId}`;
    case 'pair':
      return `/pairs/${entityId}`;
    default:
      return null;
  }
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'object') {
    const str = JSON.stringify(val);
    return str.length > 200 ? str.slice(0, 200) + '...' : str;
  }
  const str = String(val);
  return str.length > 200 ? str.slice(0, 200) + '...' : str;
}

const ChangesDiff: React.FC<{
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
}> = ({ oldValues, newValues }) => {
  const allKeys = new Set<string>();
  if (oldValues) Object.keys(oldValues).forEach((k) => allKeys.add(k));
  if (newValues) Object.keys(newValues).forEach((k) => allKeys.add(k));

  if (allKeys.size === 0) {
    return (
      <div style={{ color: '#7A7A7A', fontSize: 12, padding: '8px 0' }}>
        No change details available
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      {Array.from(allKeys).map((key) => {
        const oldVal = oldValues?.[key];
        const newVal = newValues?.[key];
        const changed = oldVal !== newVal;

        return (
          <div
            key={key}
            style={{
              display: 'flex',
              gap: 12,
              padding: '4px 0',
              fontSize: 12,
              borderBottom: '1px solid rgba(255,255,255,0.03)',
            }}
          >
            <div
              style={{
                width: 120,
                color: '#7A7A7A',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {key}
            </div>
            <div
              style={{
                flex: 1,
                background: changed
                  ? 'rgba(155,62,62,0.15)'
                  : 'transparent',
                padding: changed ? '2px 6px' : '2px 0',
                borderRadius: 3,
                color: '#B8B8B8',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}
            >
              {formatValue(oldVal)}
            </div>
            <div
              style={{
                flex: 1,
                background: changed
                  ? 'rgba(95,143,107,0.15)'
                  : 'transparent',
                padding: changed ? '2px 6px' : '2px 0',
                borderRadius: 3,
                color: '#B8B8B8',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}
            >
              {formatValue(newVal)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AuditTimelineEntry: React.FC<{ entry: AuditEntry }> = ({ entry }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const dotColor = ACTION_COLORS[entry.action] || '#7A7A7A';
  const entityRoute = getEntityRoute(entry.entity_type, entry.entity_id);
  const hasChanges =
    (entry.old_values && Object.keys(entry.old_values).length > 0) ||
    (entry.new_values && Object.keys(entry.new_values).length > 0);

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 0 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 20,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
            marginTop: 14,
          }}
        />
        <div
          style={{
            width: 2,
            flex: 1,
            background: '#2C2C2C',
            marginTop: 4,
          }}
        />
      </div>

      <div style={{ flex: 1, paddingBottom: 16 }}>
        <GlassCard style={{ padding: '12px 16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 6,
            }}
          >
            <Tag
              color={dotColor}
              style={{
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {entry.action}
            </Tag>
            <Tag
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#7A7A7A',
                borderRadius: 4,
                fontSize: 11,
              }}
            >
              {entry.entity_type}
            </Tag>
            <Tooltip title={new Date(entry.timestamp).toLocaleString()}>
              <span style={{ color: '#7A7A7A', fontSize: 12 }}>
                {dayjs(entry.timestamp).fromNow()}
              </span>
            </Tooltip>
          </div>

          <div style={{ color: '#F2F2F2', fontSize: 13, marginBottom: 6 }}>
            {entry.description || `${entry.action} on ${entry.entity_type}`}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 12,
            }}
          >
            {entry.user_name && (
              <span style={{ color: '#7A7A7A' }}>by {entry.user_name}</span>
            )}
            {entityRoute && (
              <span
                style={{
                  color: '#5F8F6B',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
                onClick={() => navigate(entityRoute)}
              >
                View entity
              </span>
            )}
            {hasChanges && (
              <span
                style={{
                  color: '#B8B8B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <DownOutlined /> : <RightOutlined />}
                {expanded ? 'Hide changes' : 'Show changes'}
              </span>
            )}
          </div>

          {expanded && hasChanges && (
            <ChangesDiff
              oldValues={entry.old_values}
              newValues={entry.new_values}
            />
          )}
        </GlassCard>
      </div>
    </div>
  );
};

const AuditTimeline: React.FC<AuditTimelineProps> = ({
  entries,
  loading,
  onLoadMore,
}) => {
  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {entries.map((entry) => (
        <AuditTimelineEntry key={entry.id} entry={entry} />
      ))}
      {onLoadMore && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span
            style={{ color: '#5F8F6B', cursor: 'pointer', fontSize: 13 }}
            onClick={onLoadMore}
          >
            Load more
          </span>
        </div>
      )}
    </div>
  );
};

export default AuditTimeline;