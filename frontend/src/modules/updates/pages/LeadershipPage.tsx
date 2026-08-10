import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  CrownOutlined,
  TeamOutlined,
  ProjectOutlined,
  ApiOutlined,
  DollarOutlined,
  MessageOutlined,
  WarningOutlined,
  DeploymentUnitOutlined,
} from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import EmptyState from '@/shared/components/EmptyState';
import ShareButton from '@/shared/components/ShareButton';
import { useLeadershipSummary } from '../hooks/useUpdates';

dayjs.extend(relativeTime);

function Metric({
  label,
  value,
  sub,
  color,
  icon,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <GlassCard>
      <div
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            {label}
          </span>
          {icon && <span style={{ color: color ?? 'var(--text-muted)' }}>{icon}</span>}
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: color ?? 'var(--text-primary)' }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </GlassCard>
  );
}

/**
 * The leadership home: density of information, not density of controls.
 *
 * Deliberately has no sub-navigation and no create actions — everything here is
 * a read, and every tile is a jumping-off point into the module that owns it.
 */
export default function LeadershipPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useLeadershipSummary();

  if (isLoading) return <LoadingSpinner text="Gathering today's picture…" />;

  if (!data) {
    return (
      <EmptyState
        title="Nothing to show yet"
        description="Once the team starts logging days, projects and expenses, this page fills in."
      />
    );
  }

  const inr = (n: number) =>
    `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div>
      <PageHeader
        title="Leadership"
        icon={<CrownOutlined />}
        subtitle={`Everything at a glance · updated ${dayjs(data.generated_at).fromNow()}`}
        actions={<ShareButton title="NavOS leadership summary" url="/leadership" />}
      />

      {/* People today */}
      <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
        People today
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Metric
          label="On field"
          value={data.on_field_today}
          sub={`of ${data.people_total} people`}
          color="var(--status-not-working)"
          icon={<TeamOutlined />}
          onClick={() => navigate('/attendance')}
        />
        <Metric
          label="In office"
          value={data.in_office_today}
          color="var(--status-working)"
          onClick={() => navigate('/attendance')}
        />
        <Metric label="Away" value={data.away_today} sub="leave, holiday, comp-off" />
        <Metric
          label="Not logged"
          value={data.not_logged_today}
          sub={data.not_logged_today > 0 ? 'no entry for today' : 'everyone accounted for'}
          color={data.not_logged_today > 0 ? 'var(--status-not-working)' : 'var(--status-working)'}
        />
      </div>

      {/* Work */}
      <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
        Work
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Metric
          label="Active projects"
          value={data.active_projects}
          sub={Object.entries(data.projects_by_status)
            .map(([s, c]) => `${c} ${s.toLowerCase()}`)
            .join(' · ')}
          icon={<ProjectOutlined />}
          onClick={() => navigate('/projects')}
        />
        <Metric
          label="Devices working"
          value={`${data.devices_working}/${data.devices_total}`}
          sub={`${data.devices_faulty} faulty`}
          color="var(--status-working)"
          icon={<ApiOutlined />}
          onClick={() => navigate('/devices')}
        />
        <Metric
          label="Open issues"
          value={data.open_errors}
          sub="unresolved errors"
          color={data.open_errors > 0 ? 'var(--status-not-working)' : 'var(--status-working)'}
          icon={<WarningOutlined />}
          onClick={() => navigate('/troubleshooting')}
        />
        <Metric
          label="Equipment out"
          value={data.assets_deployed}
          sub="at project sites"
          icon={<DeploymentUnitOutlined />}
          onClick={() => navigate('/inventory/deployed')}
        />
      </div>

      {/* Money */}
      <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
        Money
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Metric
          label="Spend this month"
          value={inr(data.spend_this_month)}
          icon={<DollarOutlined />}
          onClick={() => navigate('/finance')}
        />
        <Metric
          label="Pending claims"
          value={data.pending_claims}
          sub={inr(data.pending_claim_value) + ' awaiting settlement'}
          color={data.pending_claims > 0 ? 'var(--status-not-working)' : undefined}
          onClick={() => navigate('/finance/settlement')}
        />
      </div>

      {/* Recent updates */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '4px 0 8px',
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Latest updates
        </span>
        <GlassButton variant="ghost" size="sm" onClick={() => navigate('/updates')}>
          Open the timeline
        </GlassButton>
      </div>

      <GlassCard>
        {data.recent_updates.length === 0 ? (
          <EmptyState
            icon={<MessageOutlined />}
            title="No updates posted yet"
            description="Daily updates from the team appear here as soon as they start posting."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.recent_updates.map((u) => (
              <div
                key={u.id}
                onClick={() => navigate('/updates')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--overlay-subtle)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {u.author_name ?? 'Unknown'}
                  </span>
                  {u.project_name && (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {u.project_name}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {dayjs(u.posted_for).format('ddd, D MMM')}
                  </span>
                  {u.comment_count > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      <MessageOutlined /> {u.comment_count}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    marginTop: 4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {u.body}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
