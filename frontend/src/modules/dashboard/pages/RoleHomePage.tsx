import { useNavigate } from 'react-router-dom';
import {
  InboxOutlined,
  SwapOutlined,
  ToolOutlined,
  WarningOutlined,
  DollarOutlined,
  ApiOutlined,
  TeamOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import GlassCard from '@/shared/components/GlassCard';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { useAuthStore } from '@/shared/stores/authStore';
import DashboardPage from './DashboardPage';
import MyDayPage from '@/modules/tasks/pages/MyDayPage';
import LeadershipPage from '@/modules/updates/pages/LeadershipPage';
import { useRoleHome } from '../hooks/useRoleHome';

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function Tile({
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
      <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
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
        <div style={{ fontSize: 28, fontWeight: 700, color: color ?? 'var(--text-primary)' }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </GlassCard>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Greeting() {
  const user = useAuthStore((s) => s.user);
  const first = user?.full_name?.split(' ')[0] || user?.username || 'there';
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
        Welcome back, {first}
      </h1>
    </div>
  );
}

function InventoryHome({ d }: { d: Record<string, any> }) {
  const navigate = useNavigate();
  return (
    <div>
      <Greeting />
      <Section title="Needs you">
        <Tile
          label="Handovers to accept"
          value={d.pending_handovers ?? 0}
          color={d.pending_handovers ? '#B0413E' : undefined}
          icon={<SwapOutlined />}
          onClick={() => navigate('/inventory/handovers')}
        />
        <Tile
          label="Open repairs"
          value={d.open_repairs ?? 0}
          color={d.open_repairs ? 'var(--status-not-working)' : undefined}
          icon={<ToolOutlined />}
          onClick={() => navigate('/inventory/repairs')}
        />
        <Tile
          label="Overdue"
          value={d.overdue ?? 0}
          color={d.overdue ? '#B0413E' : undefined}
          icon={<WarningOutlined />}
          onClick={() => navigate('/inventory/returns')}
        />
        <Tile
          label="Location unknown"
          value={d.needs_reconciliation ?? 0}
          sub={d.needs_reconciliation ? 'please confirm where these are' : 'all accounted for'}
          color={d.needs_reconciliation ? '#B0413E' : 'var(--status-working)'}
          onClick={() => navigate('/inventory/assets')}
        />
      </Section>
      <Section title="Where everything is">
        <Tile label="Total items" value={d.total ?? 0} onClick={() => navigate('/inventory/assets')} />
        <Tile
          label="Available"
          value={d.available ?? 0}
          color="var(--status-working)"
          icon={<InboxOutlined />}
          onClick={() => navigate('/inventory/assets')}
        />
        <Tile
          label="With people"
          value={d.with_people ?? 0}
          icon={<TeamOutlined />}
          onClick={() => navigate('/inventory/assets')}
        />
        <Tile
          label="At customers"
          value={d.at_customers ?? 0}
          icon={<ShopOutlined />}
          onClick={() => navigate('/inventory/assets')}
        />
        <Tile
          label="Damaged"
          value={d.by_condition?.DAMAGED ?? 0}
          color={d.by_condition?.DAMAGED ? '#B0413E' : undefined}
          onClick={() => navigate('/inventory/repairs')}
        />
      </Section>
      {(d.by_location ?? []).length > 0 && (
        <Section title="By location">
          {(d.by_location ?? []).map((l: any) => (
            <Tile key={l.location} label={l.location} value={l.count} />
          ))}
        </Section>
      )}
    </div>
  );
}

function FinanceHome({ d }: { d: Record<string, any> }) {
  const navigate = useNavigate();
  const owed = (d.outstanding ?? 0) < 0;
  return (
    <div>
      <Greeting />
      <Section title="Needs you">
        <Tile
          label="Pending claims"
          value={d.pending_claims ?? 0}
          color={d.pending_claims ? 'var(--status-not-working)' : undefined}
          onClick={() => navigate('/finance/settlement')}
        />
        <Tile
          label="Awaiting review"
          value={d.awaiting_review ?? 0}
          onClick={() => navigate('/finance')}
        />
      </Section>
      <Section title="Money">
        <Tile
          label="Spend this month"
          value={inr(d.spend_this_month)}
          icon={<DollarOutlined />}
          onClick={() => navigate('/finance')}
        />
        <Tile label="Advanced" value={inr(d.advanced_total)} />
        <Tile label="Spent" value={inr(d.spent_total)} />
        <Tile
          label={owed ? 'Owed to staff' : 'Unspent advance'}
          value={inr(Math.abs(d.outstanding ?? 0))}
          color={owed ? '#B0413E' : undefined}
          sub={owed ? 'people are out of pocket' : 'issued but not yet spent'}
        />
      </Section>
    </div>
  );
}

function RnDHome({ d }: { d: Record<string, any> }) {
  const navigate = useNavigate();
  return (
    <div>
      <Greeting />
      <Section title="Needs you">
        <Tile
          label="Critical errors"
          value={d.critical_errors ?? 0}
          color={d.critical_errors ? '#B0413E' : 'var(--status-working)'}
          icon={<WarningOutlined />}
          onClick={() => navigate('/troubleshooting')}
        />
        <Tile
          label="Open errors"
          value={d.open_errors ?? 0}
          color={d.open_errors ? 'var(--status-not-working)' : undefined}
          onClick={() => navigate('/troubleshooting')}
        />
        <Tile
          label="Items needing attention"
          value={d.items_needing_attention ?? 0}
          icon={<ToolOutlined />}
          onClick={() => navigate('/inventory/repairs')}
        />
      </Section>
      <Section title="Devices">
        <Tile
          label="Working"
          value={`${d.devices_working ?? 0}/${d.devices_total ?? 0}`}
          color="var(--status-working)"
          icon={<ApiOutlined />}
          onClick={() => navigate('/devices')}
        />
        <Tile
          label="Faulty"
          value={d.devices_faulty ?? 0}
          color={d.devices_faulty ? '#B0413E' : undefined}
          onClick={() => navigate('/devices')}
        />
        <Tile label="Not working" value={d.devices_not_working ?? 0} onClick={() => navigate('/devices')} />
      </Section>
    </div>
  );
}

/**
 * The landing page, chosen by what the person can do.
 *
 * An Inventory Manager and a rigger open the same app to do entirely different
 * jobs; showing them the same numbers means at least one is reading a page
 * built for somebody else.
 */
export default function RoleHomePage() {
  const { data, isLoading } = useRoleHome();

  if (isLoading) return <LoadingSpinner text="Loading your dashboard…" />;

  switch (data?.home) {
    case 'leadership':
      return <LeadershipPage />;
    case 'inventory':
      return <InventoryHome d={data.data} />;
    case 'finance':
      return <FinanceHome d={data.data} />;
    case 'rnd':
      return <RnDHome d={data.data} />;
    case 'me':
      return <MyDayPage />;
    default:
      return <DashboardPage />;
  }
}
