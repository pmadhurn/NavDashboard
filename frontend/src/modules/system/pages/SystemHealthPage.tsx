import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  CheckCircleFilled,
  WarningFilled,
  CloseCircleFilled,
  HeartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { api } from '@/shared/api/client';

dayjs.extend(relativeTime);

type Status = 'OK' | 'WARN' | 'FAIL';

interface Check {
  name: string;
  status: Status;
  summary: string;
  detail: string | null;
  why: string | null;
  action: string | null;
  value: string | number | null;
}

interface Health {
  status: Status;
  headline: string;
  checked_at: string;
  failing: number;
  warning: number;
  passing: number;
  checks: Check[];
  environment: Record<string, string>;
}

const COLOR: Record<Status, string> = {
  OK: 'var(--status-working)',
  WARN: 'var(--status-not-working)',
  FAIL: '#B0413E',
};

const ICON: Record<Status, React.ReactNode> = {
  OK: <CheckCircleFilled />,
  WARN: <WarningFilled />,
  FAIL: <CloseCircleFilled />,
};

function useHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: () => api.get<Health>('/system/health'),
    refetchInterval: 60_000,
  });
}

/**
 * Platform health for whoever maintains it.
 *
 * Every problem states what happened, why it matters, and what to do — because
 * the person reading this at 11pm may not be the person who built it. A row
 * that only says "ERROR" sends them to the logs, which is the thing this page
 * exists to avoid.
 */
export default function SystemHealthPage() {
  const { data, isLoading, refetch, isFetching } = useHealth();

  if (isLoading) return <LoadingSpinner text="Checking the platform…" />;
  if (!data) return null;

  // Problems first. Anything else buries the one row that matters.
  const ordered = [...data.checks].sort(
    (a, b) =>
      ({ FAIL: 0, WARN: 1, OK: 2 }[a.status] - { FAIL: 0, WARN: 1, OK: 2 }[b.status])
  );

  return (
    <div>
      <PageHeader
        title="System health"
        icon={<HeartOutlined />}
        subtitle={`Checked ${dayjs(data.checked_at).fromNow()}`}
        actions={
          <GlassButton
            variant="ghost"
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isFetching}
          >
            Check again
          </GlassButton>
        }
      />

      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 34, color: COLOR[data.status], display: 'flex' }}>
            {ICON[data.status]}
          </span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{data.headline}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {data.passing} passing
              {data.warning > 0 && ` · ${data.warning} worth a look`}
              {data.failing > 0 && ` · ${data.failing} broken`}
              {' · '}
              {data.environment?.environment} · Python {data.environment?.python}
            </div>
          </div>
        </div>
      </GlassCard>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {ordered.map((c) => (
          <GlassCard key={c.name}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ color: COLOR[c.status], fontSize: 16, display: 'flex', marginTop: 2 }}>
                {ICON[c.status]}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.summary}</span>
                </div>
                {c.detail && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {c.detail}
                  </div>
                )}
                {/* What happened → why → what to do. */}
                {c.why && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'var(--overlay-subtle)',
                      borderLeft: `3px solid ${COLOR[c.status]}`,
                    }}
                  >
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Why it matters: </strong>
                      {c.why}
                    </div>
                    {c.action && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>What to do: </strong>
                        {c.action}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
