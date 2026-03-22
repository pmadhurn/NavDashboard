import React, { useState } from 'react';
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  UserOutlined,
  WifiOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import GlassCard from '@/shared/components/GlassCard';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { formatRelativeTime, formatDateTime, formatCoordinates } from '@/shared/utils/formatters';
import type { LocationHistoryEntry } from '../hooks/useLocationHistory';

interface HistoryTimelineProps {
  entries: LocationHistoryEntry[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export default function HistoryTimeline({
  entries,
  loading,
  selectedId,
  onSelect,
  hasMore,
  onLoadMore,
}: HistoryTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return <LoadingSpinner text="Loading location history..." />;
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<EnvironmentOutlined />}
        title="No location changes recorded"
        description="Location history will appear here when couples are moved."
      />
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      {/* Vertical timeline line */}
      <div
        style={{
          position: 'absolute',
          left: 8,
          top: 0,
          bottom: 0,
          width: 2,
          background: '#2C2C2C',
          borderRadius: 1,
        }}
      />

      {entries.map((entry, idx) => {
        const isSelected = selectedId === entry.id;
        const isExpanded = expandedIds.has(entry.id);

        return (
          <div key={entry.id} style={{ position: 'relative', marginBottom: 12 }}>
            {/* Timeline dot */}
            <div
              style={{
                position: 'absolute',
                left: -16,
                top: 18,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: isSelected ? '#E6E6E6' : '#4A4A4A',
                border: `2px solid ${isSelected ? '#E6E6E6' : '#2C2C2C'}`,
                boxShadow: isSelected ? '0 0 8px rgba(230, 230, 230, 0.4)' : 'none',
                zIndex: 1,
                transition: 'all 0.3s ease',
              }}
            />

            <GlassCard
              hoverable
              padding="sm"
              onClick={() => onSelect(entry.id)}
              style={{
                borderLeft: isSelected ? '3px solid #E6E6E6' : '3px solid transparent',
                background: isSelected
                  ? 'rgba(255, 255, 255, 0.06)'
                  : 'rgba(255, 255, 255, 0.03)',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Top row: couple name + time */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {entry.couple_name && (
                    <span
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        color: '#B8B8B8',
                        fontWeight: 500,
                      }}
                    >
                      {entry.couple_name}
                    </span>
                  )}
                </div>
                <span
                  style={{ fontSize: 11, color: '#7A7A7A' }}
                  title={formatDateTime(entry.moved_at)}
                >
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {formatRelativeTime(entry.moved_at)}
                </span>
              </div>

              {/* Middle: Location change */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 12, color: '#7A7A7A' }}>
                  {formatCoordinates(entry.old_latitude, entry.old_longitude)}
                </span>
                <span style={{ fontSize: 14, color: '#4A4A4A' }}>→</span>
                <span style={{ fontSize: 12, color: '#F2F2F2' }}>
                  {formatCoordinates(entry.new_latitude, entry.new_longitude)}
                </span>
                {entry.distance_meters != null && (
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '1px 8px',
                      borderRadius: 10,
                      fontSize: 11,
                      color: '#7A7A7A',
                      fontWeight: 500,
                    }}
                  >
                    {entry.distance_meters.toFixed(0)}m
                  </span>
                )}
              </div>

              {/* Details row */}
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  fontSize: 11,
                  color: '#7A7A7A',
                  marginBottom: 4,
                }}
              >
                {entry.handler_name && (
                  <span>
                    <UserOutlined style={{ marginRight: 4 }} />
                    {entry.handler_name}
                  </span>
                )}
                <span>
                  <WifiOutlined style={{ marginRight: 4 }} />
                  RF: {entry.had_rf ? 'Yes' : 'No'}
                </span>
              </div>

              {/* Expandable section */}
              {(entry.fitting_materials_snapshot ||
                entry.configuration_snapshot ||
                entry.notes) && (
                <div style={{ marginTop: 6 }}>
                  <button
                    onClick={(e) => toggleExpand(entry.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#7A7A7A',
                      fontSize: 11,
                      cursor: 'pointer',
                      padding: '2px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {isExpanded ? (
                      <DownOutlined style={{ fontSize: 9 }} />
                    ) : (
                      <RightOutlined style={{ fontSize: 9 }} />
                    )}
                    {isExpanded ? 'Hide details' : 'Show details'}
                  </button>

                  {isExpanded && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 12,
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    >
                      {/* Notes */}
                      {entry.notes && (
                        <div style={{ marginBottom: 8 }}>
                          <div
                            style={{
                              fontSize: 10,
                              color: '#7A7A7A',
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              marginBottom: 4,
                            }}
                          >
                            Notes
                          </div>
                          <div style={{ color: '#B8B8B8' }}>{entry.notes}</div>
                        </div>
                      )}

                      {/* Fitting materials snapshot */}
                      {entry.fitting_materials_snapshot &&
                        Array.isArray(entry.fitting_materials_snapshot) &&
                        entry.fitting_materials_snapshot.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <div
                              style={{
                                fontSize: 10,
                                color: '#7A7A7A',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                marginBottom: 4,
                              }}
                            >
                              Fitting Materials
                            </div>
                            <ul
                              style={{
                                margin: 0,
                                paddingLeft: 16,
                                color: '#B8B8B8',
                              }}
                            >
                              {entry.fitting_materials_snapshot.map(
                                (mat: Record<string, unknown>, i: number) => (
                                  <li key={i} style={{ marginBottom: 2 }}>
                                    {String(mat.name || 'Unknown')}
                                    {mat.quantity && ` ×${mat.quantity}`}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}

                      {/* Configuration snapshot */}
                      {entry.configuration_snapshot && (
                        <div>
                          <div
                            style={{
                              fontSize: 10,
                              color: '#7A7A7A',
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              marginBottom: 4,
                            }}
                          >
                            Configuration
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              color: '#B8B8B8',
                              fontSize: 11,
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                            }}
                          >
                            {JSON.stringify(entry.configuration_snapshot, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          </div>
        );
      })}

      {/* Load more */}
      {hasMore && onLoadMore && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <button
            onClick={onLoadMore}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#B8B8B8',
              padding: '8px 24px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.2s ease',
            }}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
