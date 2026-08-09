import { useNavigate } from 'react-router-dom';
import { DeploymentUnitOutlined, ApiOutlined, LinkOutlined, SwapOutlined, AppstoreOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import StatusBadge from '@/shared/components/StatusBadge';
import ShareButton from '@/shared/components/ShareButton';
import { useDeployed, DeployedItem } from '../hooks/useAssets';

const TYPE_ICON: Record<string, React.ReactNode> = {
  device: <ApiOutlined />,
  couple: <LinkOutlined />,
  pair: <SwapOutlined />,
  asset: <AppstoreOutlined />,
};

function ItemRow({ item, onOpen }: { item: DeployedItem; onOpen: (i: DeployedItem) => void }) {
  return (
    <div
      onClick={() => onOpen(item)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 8,
        cursor: 'pointer',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontSize: 13 }}>
        <span style={{ color: '#6F8CB6' }}>{TYPE_ICON[item.type] ?? <AppstoreOutlined />}</span>
        {item.label}
        <span style={{ color: 'var(--chart4)', fontSize: 11, textTransform: 'uppercase' }}>{item.type}</span>
      </span>
      {item.status && <StatusBadge status={item.status} size="sm" />}
    </div>
  );
}

export default function DeployedPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDeployed();

  const openItem = (item: DeployedItem) => {
    if (item.type === 'device') navigate(`/devices/${item.id}`);
    else if (item.type === 'couple') navigate(`/couples/${item.id}`);
    else if (item.type === 'pair') navigate(`/pairs/${item.id}`);
    else navigate(`/inventory/assets/${item.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Deployed"
        subtitle="Equipment and links currently out at project sites"
        actions={<ShareButton title="Deployed equipment" url="/inventory/deployed" />}
      />

      {isLoading ? (
        <LoadingSpinner text="Loading deployed equipment..." />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<DeploymentUnitOutlined />}
          title="Nothing deployed"
          description="When equipment is sent to a project or a link is deployed, it appears here."
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {data.map((group) => (
            <GlassCard key={group.project_id ?? 'unassigned'} padding="md">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div
                  onClick={() => group.project_id && navigate(`/projects/${group.project_id}`)}
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: group.project_id ? 'pointer' : 'default',
                  }}
                >
                  {group.project_name}
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{group.items.length} items</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.items.map((item) => (
                  <ItemRow key={`${item.type}-${item.id}`} item={item} onOpen={openItem} />
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
