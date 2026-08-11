import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  FileImageOutlined,
  FileOutlined,
  TeamOutlined,
  ToolOutlined,
  DollarOutlined,
  InboxOutlined,
  MessageOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import GlassCard from '@/shared/components/GlassCard';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import EmptyState from '@/shared/components/EmptyState';
import { api } from '@/shared/api/client';
import DocumentUploader from '@/modules/documents/components/DocumentUploader';
import GlassButton from '@/shared/components/GlassButton';
import { useState } from 'react';

interface Archive {
  documents_total: number;
  photos: number;
  other_files: number;
  team_members: number;
  phases: number;
  timeline_entries: number;
  updates: number;
  equipment_movements: number;
  still_out: number;
  deployments: number;
  issues: number;
  expenses: number;
  spend: number;
}

function useArchive(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId, 'archive'],
    queryFn: () => api.get<Archive>(`/projects/${projectId}/archive`),
  });
}

interface Doc {
  id: string;
  title: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

function useProjectFiles(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId, 'files'],
    // Path params, and the response is paginated — the endpoint is
    // /by-entity/{type}/{id}, not a query-string filter.
    queryFn: () =>
      api
        .get<{ items: Doc[] }>(`/documents/by-entity/project/${projectId}`, { size: 100 })
        .then((r) => r.items ?? []),
  });
}

function Stat({
  icon,
  label,
  value,
  sub,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
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
          <span style={{ color: color ?? 'var(--text-muted)' }}>{icon}</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: color ?? 'var(--text-primary)' }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </GlassCard>
  );
}

/**
 * What exists on this project, at a glance.
 *
 * An archive is only useful if you can see what is in it without opening every
 * tab. Counting everything up front is what stops a photo somebody uploaded
 * last year from being effectively invisible.
 */
export function ProjectOverviewTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useArchive(projectId);
  const navigate = useNavigate();

  if (isLoading) return <LoadingSpinner text="Gathering the project record…" />;
  if (!data) return <EmptyState title="Nothing recorded yet" />;

  const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12,
      }}
    >
      <Stat icon={<TeamOutlined />} label="Team" value={data.team_members} sub={`${data.phases} phase${data.phases === 1 ? '' : 's'}`} />
      <Stat icon={<HistoryOutlined />} label="Timeline entries" value={data.timeline_entries} />
      <Stat icon={<MessageOutlined />} label="Updates" value={data.updates} onClick={() => navigate('/updates')} />
      <Stat icon={<FileImageOutlined />} label="Photos" value={data.photos} sub={`${data.other_files} other file${data.other_files === 1 ? '' : 's'}`} />
      <Stat icon={<InboxOutlined />} label="Equipment moves" value={data.equipment_movements} />
      <Stat
        icon={<InboxOutlined />}
        label="Still out"
        value={data.still_out}
        color={data.still_out ? 'var(--status-not-working)' : 'var(--status-working)'}
        sub={data.still_out ? 'not yet returned' : 'nothing outstanding'}
        onClick={() => navigate('/inventory/returns')}
      />
      <Stat icon={<ToolOutlined />} label="Issues" value={data.issues} onClick={() => navigate('/troubleshooting')} />
      <Stat icon={<DollarOutlined />} label="Spend" value={inr(data.spend)} sub={`${data.expenses} expense${data.expenses === 1 ? '' : 's'}`} onClick={() => navigate('/finance')} />
    </div>
  );
}

/** Photos and documents, uploaded from the site and kept with the project. */
export function ProjectFilesTab({ projectId }: { projectId: string }) {
  const { data: files, isLoading, refetch } = useProjectFiles(projectId);
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Photos, reports and documents stay with the project permanently.
        </span>
        <GlassButton onClick={() => setUploadOpen(true)}>Upload</GlassButton>
      </div>

      <DocumentUploader
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          refetch();
        }}
        defaultEntityType="project"
        defaultEntityId={projectId}
      />

      {isLoading ? (
        <LoadingSpinner text="Loading files…" />
      ) : (files ?? []).length === 0 ? (
        <EmptyState
          icon={<FileOutlined />}
          title="Nothing uploaded yet"
          description="Site photos, reports and customer documents belong here — this is what makes the project readable a year from now."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(files ?? []).map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--overlay-subtle)',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>
                {(f.file_type || '').toUpperCase() === 'IMAGE' ? <FileImageOutlined /> : <FileOutlined />}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                {f.title || f.original_filename}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {Math.round((f.file_size ?? 0) / 1024)} KB · {dayjs(f.created_at).format('D MMM YYYY')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
