import { useState } from 'react';
import { Select } from 'antd';
import { PlusOutlined, SearchOutlined, ProjectOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import GlassModal from '@/shared/components/GlassModal';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import StatusBadge from '@/shared/components/StatusBadge';
import { usePermission } from '@/shared/stores/authStore';
import { formatRelativeTime } from '@/shared/utils/formatters';
import { useProjects, useCreateProject, Project } from '../hooks/useProjects';

const PROJECT_TYPES = ['POC', 'DEMO', 'INSTALLATION', 'OTHER'] as const;

const TYPE_COLORS: Record<string, string> = {
  POC: 'var(--role-technician)',
  DEMO: '#8C8468',
  INSTALLATION: 'var(--status-working)',
  OTHER: 'var(--text-muted)',
};

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const activeMembers = project.members.filter((m) => !m.left_at);
  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <GlassCard padding="md">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600 }}>
                {project.name}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  color: TYPE_COLORS[project.project_type],
                  background: `${TYPE_COLORS[project.project_type]}22`,
                  padding: '2px 8px',
                  borderRadius: 8,
                }}
              >
                {project.project_type}
              </span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
              {[project.customer_name, project.site_location].filter(Boolean).join(' · ') ||
                'No customer/site yet'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {activeMembers.length > 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', gap: 4, alignItems: 'center' }}>
                <TeamOutlined /> {activeMembers.length}
              </span>
            )}
            <StatusBadge status={project.status} />
          </div>
        </div>
        <div style={{ color: 'var(--chart4)', fontSize: 11, marginTop: 8 }}>
          Started {formatRelativeTime(project.start_date ?? project.created_at)}
        </div>
      </GlassCard>
    </div>
  );
}

export default function ProjectListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [newType, setNewType] = useState<string>('POC');
  const [customer, setCustomer] = useState('');

  const canEdit = usePermission('projects.create');
  const { data, isLoading } = useProjects({ search, type, status });
  const createProject = useCreateProject();

  const handleCreate = async () => {
    if (!name.trim()) return;
    const project = await createProject.mutateAsync({
      name: name.trim(),
      project_type: newType,
      customer_name: customer.trim() || undefined,
    });
    setCreateOpen(false);
    setName('');
    setCustomer('');
    navigate(`/projects/${project.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="POCs, demos, and installations"
        actions={
          canEdit ? (
            <GlassButton variant="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              New Project
            </GlassButton>
          ) : undefined
        }
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, maxWidth: 380 }}>
          <GlassInput
            value={search}
            onChange={setSearch}
            placeholder="Search projects..."
            prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
          />
        </div>
        <Select
          className="dl-select"
          style={{ minWidth: 130 }}
          placeholder="Type"
          allowClear
          value={type}
          onChange={setType}
          options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))}
        />
        <Select
          className="dl-select"
          style={{ minWidth: 130 }}
          placeholder="Status"
          allowClear
          value={status}
          onChange={setStatus}
          options={['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CLOSED'].map((s) => ({
            value: s,
            label: s.replace('_', ' '),
          }))}
        />
      </div>

      <style>{`
        .dl-select .ant-select-selector {
          background: rgba(255,255,255,0.03) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          color: var(--text-primary) !important;
        }
        .dl-select .ant-select-selection-placeholder { color: var(--chart4) !important; }
        .dl-select .ant-select-selection-item { color: var(--text-primary) !important; }
      `}</style>

      {isLoading ? (
        <LoadingSpinner text="Loading projects..." />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<ProjectOutlined />}
          title="No projects yet"
          description={
            canEdit
              ? 'Create the first project — just a name and type is enough to start.'
              : 'Projects shared with you will appear here.'
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 14,
          }}
        >
          {data.items.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/projects/${project.id}`)}
            />
          ))}
        </div>
      )}

      <GlassModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Project"
        width={440}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <GlassButton variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handleCreate}
              loading={createProject.isPending}
              disabled={!name.trim()}
            >
              Create
            </GlassButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Project name
            </label>
            <GlassInput value={name} onChange={setName} placeholder="e.g. Metro Line 3 POC" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Type
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {PROJECT_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: 8,
                    border: `1px solid ${newType === t ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    background: newType === t ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                    color: newType === t ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Customer / site (optional)
            </label>
            <GlassInput value={customer} onChange={setCustomer} placeholder="Who is this for?" />
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
