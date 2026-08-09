import { useState } from 'react';
import { Tag, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { formatDateTime, formatRelativeTime, truncateText } from '@/shared/utils/formatters';
import { colors } from '@/styles/theme';
import type { ErrorLog, TroubleshootEntryData } from '../hooks/useTroubleshooting';

interface ErrorTimelineProps {
  errors: ErrorLog[];
  loading: boolean;
  onSelectError: (error: ErrorLog) => void;
  onResolve: (errorId: string) => void;
  onAddStep: (errorId: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: colors.severity.low,
  MEDIUM: colors.severity.medium,
  HIGH: colors.severity.high,
  CRITICAL: colors.severity.critical,
};

function getEntityLabel(error: ErrorLog): string {
  if (error.device_id) return 'Device';
  if (error.couple_id) return 'Couple';
  if (error.pair_id) return 'Pair';
  return 'Unknown';
}

function getEntityId(error: ErrorLog): string {
  return error.device_id || error.couple_id || error.pair_id || '';
}

function StepItem({ step }: { step: TroubleshootEntryData }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '8px 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: 'var(--role-admin)',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {step.step_number}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--chart1)', fontSize: 13, fontWeight: 500 }}>
          {step.step_description}
        </div>
        {step.action_taken && (
          <div style={{ color: 'var(--role-admin)', fontSize: 12, marginTop: 2 }}>
            Action: {step.action_taken}
          </div>
        )}
        {step.resolution && (
          <div style={{ color: '#5BB98B', fontSize: 12, marginTop: 2 }}>
            Resolution: {step.resolution}
          </div>
        )}
        <div style={{ color: '#595959', fontSize: 11, marginTop: 4 }}>
          {step.performed_by_name && <span>{step.performed_by_name} · </span>}
          {formatDateTime(step.performed_at)}
        </div>
      </div>
    </div>
  );
}

function TimelineEntry({
  error,
  onSelectError,
  onResolve,
  onAddStep,
  isLast,
}: {
  error: ErrorLog;
  onSelectError: (error: ErrorLog) => void;
  onResolve: (errorId: string) => void;
  onAddStep: (errorId: string) => void;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const severityColor = SEVERITY_COLORS[error.severity] || 'var(--severity-low)';

  return (
    <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
      {/* Timeline dot + line */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 20,
          flexShrink: 0,
        }}
      >
        <Tooltip title={error.severity}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: severityColor,
              border: `2px solid ${severityColor}`,
              boxShadow: `0 0 8px ${severityColor}66`,
              marginTop: 18,
              zIndex: 1,
            }}
          />
        </Tooltip>
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              background: 'var(--audit-line)',
              minHeight: 40,
            }}
          />
        )}
      </div>

      {/* Card */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
        <GlassCard
          padding="md"
          hoverable
          onClick={() => setExpanded(!expanded)}
          accentColor={severityColor}
        >
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  color: '#F0F0F0',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {error.error_type}
              </span>
              <Tag
                style={{
                  background: `${severityColor}33`,
                  border: `1px solid ${severityColor}`,
                  color:
                    severityColor === colors.severity.low ? 'var(--chart1)' : severityColor,
                  borderRadius: 12,
                  fontSize: 11,
                  padding: '0 8px',
                }}
              >
                {error.severity}
              </Tag>
              {error.resolved ? (
                <Tag
                  icon={<CheckCircleOutlined />}
                  style={{
                    background: 'rgba(91,185,139,0.15)',
                    border: '1px solid rgba(91,185,139,0.3)',
                    color: '#5BB98B',
                    borderRadius: 12,
                    fontSize: 11,
                  }}
                >
                  Resolved
                </Tag>
              ) : (
                <Tag
                  icon={<ClockCircleOutlined />}
                  style={{
                    background: 'rgba(182,138,60,0.15)',
                    border: '1px solid rgba(182,138,60,0.3)',
                    color: 'var(--status-not-working)',
                    borderRadius: 12,
                    fontSize: 11,
                  }}
                >
                  Open
                </Tag>
              )}
            </div>
          </div>

          {/* Description */}
          <div style={{ color: '#BFBFBF', fontSize: 13, marginTop: 8 }}>
            {expanded ? error.description : truncateText(error.description, 120)}
          </div>

          {/* Entity reference */}
          <div style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span
              style={{
                color: '#5B8AF0',
                fontSize: 12,
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectError(error);
              }}
            >
              {getEntityLabel(error)}: {getEntityId(error).slice(0, 8)}…
            </span>
          </div>

          {/* Reporter + date */}
          <div style={{ color: '#595959', fontSize: 11, marginTop: 6 }}>
            {error.reported_by_name && <span>Reported by {error.reported_by_name} · </span>}
            {formatRelativeTime(error.reported_at)}
          </div>

          {/* Expanded: steps */}
          {expanded && error.steps && error.steps.length > 0 && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ color: 'var(--role-admin)', fontSize: 12, marginBottom: 8, fontWeight: 500 }}>
                Troubleshoot Steps ({error.steps.length})
              </div>
              {error.steps.map((step) => (
                <StepItem key={step.id} step={step} />
              ))}
            </div>
          )}

          {/* Action buttons */}
          {expanded && !error.resolved && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                gap: 8,
              }}
            >
              <GlassButton
                size="sm"
                variant="secondary"
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e?.stopPropagation();
                  onAddStep(error.id);
                }}
              >
                Add Step
              </GlassButton>
              <GlassButton
                size="sm"
                variant="primary"
                icon={<CheckCircleOutlined />}
                onClick={(e) => {
                  e?.stopPropagation();
                  onResolve(error.id);
                }}
              >
                Resolve
              </GlassButton>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

export default function ErrorTimeline({
  errors,
  loading,
  onSelectError,
  onResolve,
  onAddStep,
}: ErrorTimelineProps) {
  if (loading) {
    return <LoadingSpinner text="Loading errors..." />;
  }

  if (!errors || errors.length === 0) {
    return (
      <EmptyState
        icon={<ExclamationCircleOutlined style={{ fontSize: 48, color: '#595959' }} />}
        title="No errors found"
        description="No error logs match your current filters."
      />
    );
  }

  return (
    <div style={{ paddingLeft: 4 }}>
      {errors.map((error, idx) => (
        <TimelineEntry
          key={error.id}
          error={error}
          onSelectError={onSelectError}
          onResolve={onResolve}
          onAddStep={onAddStep}
          isLast={idx === errors.length - 1}
        />
      ))}
    </div>
  );
}