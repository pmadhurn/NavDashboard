import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { message } from 'antd';
import {
  FileImageOutlined,
  FileOutlined,
  TeamOutlined,
  ToolOutlined,
  DollarOutlined,
  InboxOutlined,
  MessageOutlined,
  HistoryOutlined,
  DownloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import GlassCard from '@/shared/components/GlassCard';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import EmptyState from '@/shared/components/EmptyState';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { api } from '@/shared/api/client';
import { usePermission, useAuthStore } from '@/shared/stores/authStore';
import DocumentUploader from '@/modules/documents/components/DocumentUploader';
import {
  useDocumentsByEntity,
  useDeleteDocument,
} from '@/modules/documents/hooks/useDocuments';
import type { DocumentItem } from '@/modules/documents/hooks/useDocuments';
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Photos and documents, uploaded from the site and kept with the project. */
export function ProjectFilesTab({ projectId }: { projectId: string }) {
  // Same store the Documents workspace uses — a file uploaded here shows up
  // there, and vice versa. Only the scope (this project) differs.
  const { data, isLoading } = useDocumentsByEntity('project', projectId);
  const deleteDoc = useDeleteDocument();
  const canUpload = usePermission('documents.create');
  const canDelete = usePermission('documents.delete');
  const currentUser = useAuthStore((s) => s.user);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const files = data?.items ?? [];

  // The API only stores the uploader's user id. "you" is resolvable without
  // extra permissions; anyone else gets the short id rather than a bare UUID.
  const uploaderLabel = (f: DocumentItem) =>
    currentUser && f.uploaded_by === currentUser.id
      ? 'you'
      : (f.uploaded_by || '').slice(0, 8) || 'unknown';

  const handleDownload = (doc: DocumentItem) => {
    const token = localStorage.getItem('access_token');
    fetch(`/api/v1/documents/${doc.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = doc.original_filename;
        a.click();
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch(() => message.error('Download failed'));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc.mutateAsync(deleteId);
      message.success('Document deleted');
    } catch {
      message.error('Failed to delete document');
    }
    setDeleteId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Photos, reports and documents stay with the project permanently.
        </span>
        {canUpload && <GlassButton onClick={() => setUploadOpen(true)}>Upload</GlassButton>}
      </div>

      <DocumentUploader
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        defaultEntityType="project"
        defaultEntityId={projectId}
      />

      {isLoading ? (
        <LoadingSpinner text="Loading files…" />
      ) : files.length === 0 ? (
        <EmptyState
          icon={<FileOutlined />}
          title="Nothing uploaded yet"
          description="Site photos, reports and customer documents belong here — this is what makes the project readable a year from now."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map((f) => (
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
                {f.file_type === 'image' ? <FileImageOutlined /> : <FileOutlined />}
              </span>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                  {f.original_filename}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {(f.file_type || 'file').toUpperCase()} · {formatFileSize(f.file_size ?? 0)} · by{' '}
                  {uploaderLabel(f)} · {dayjs(f.created_at).format('D MMM YYYY')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <GlassButton
                  variant="ghost"
                  size="sm"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(f)}
                >
                  Download
                </GlassButton>
                {canDelete && (
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    icon={<DeleteOutlined />}
                    onClick={() => setDeleteId(f.id)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Document"
        message="Delete this file from the project? This cannot be undone."
        confirmText="Delete"
        danger
        loading={deleteDoc.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
