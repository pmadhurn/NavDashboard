import { useState } from 'react';
import { Tag, Space, message } from 'antd';
import {
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  PaperClipOutlined,
  DownloadOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import EmptyState from '@/shared/components/EmptyState';
import { DocumentItem } from '../hooks/useDocuments';

interface DocumentListProps {
  documents: DocumentItem[];
  loading: boolean;
  onDelete: (id: string) => void;
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'pdf':
      return <FilePdfOutlined style={{ fontSize: 28, color: 'var(--status-faulty)' }} />;
    case 'image':
      return <FileImageOutlined style={{ fontSize: 28, color: 'var(--status-working)' }} />;
    case 'spreadsheet':
      return <FileExcelOutlined style={{ fontSize: 28, color: 'var(--status-working)' }} />;
    case 'document':
      return <FileTextOutlined style={{ fontSize: 28, color: '#6E7E8A' }} />;
    default:
      return <PaperClipOutlined style={{ fontSize: 28, color: 'var(--text-muted)' }} />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const entityTypeColors: Record<string, string> = {
  device: '#6E7E8A',
  couple: 'var(--status-working)',
  pair: 'var(--status-not-working)',
  error: 'var(--status-faulty)',
  general: 'var(--text-muted)',
};

export default function DocumentList({ documents, loading, onDelete }: DocumentListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDownload = (doc: DocumentItem) => {
    const token = localStorage.getItem('access_token');
    const url = `/api/v1/documents/${doc.id}/download`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
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

  if (!loading && documents.length === 0) {
    return <EmptyState title="No Documents" description="Upload your first document to get started." />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Space>
          <GlassButton
            onClick={() => setViewMode('grid')}
            variant={viewMode === 'grid' ? 'primary' : undefined}
            style={{ padding: '4px 8px' }}
          >
            <AppstoreOutlined />
          </GlassButton>
          <GlassButton
            onClick={() => setViewMode('list')}
            variant={viewMode === 'list' ? 'primary' : undefined}
            style={{ padding: '4px 8px' }}
          >
            <UnorderedListOutlined />
          </GlassButton>
        </Space>
      </div>

      {viewMode === 'grid' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {documents.map((doc) => (
            <GlassCard key={doc.id} style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flexShrink: 0, paddingTop: 2 }}>{getFileIcon(doc.file_type)}</div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div
                    style={{
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: 14,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={doc.original_filename}
                  >
                    {doc.original_filename}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    {formatFileSize(doc.file_size)} · {formatDate(doc.created_at)}
                  </div>
                  {doc.entity_type && (
                    <Tag
                      color={entityTypeColors[doc.entity_type] || 'var(--text-muted)'}
                      style={{ marginTop: 6, fontSize: 11 }}
                    >
                      {doc.entity_type}
                    </Tag>
                  )}
                  {doc.description && (
                    <div
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: 12,
                        marginTop: 6,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {doc.description}
                    </div>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  marginTop: 12,
                  borderTop: '1px solid var(--border)',
                  paddingTop: 10,
                }}
              >
                <GlassButton onClick={() => handleDownload(doc)} style={{ padding: '4px 10px', fontSize: 12 }}>
                  <DownloadOutlined /> Download
                </GlassButton>
                <GlassButton
                  onClick={() => setDeleteId(doc.id)}
                  style={{ padding: '4px 10px', fontSize: 12, color: 'var(--status-faulty)' }}
                >
                  <DeleteOutlined />
                </GlassButton>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['File', 'Type', 'Size', 'Entity', 'Date', 'Actions'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      color: 'var(--text-muted)',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {getFileIcon(doc.file_type)}
                      <span
                        style={{
                          color: 'var(--text-primary)',
                          fontSize: 13,
                          maxWidth: 200,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'inline-block',
                        }}
                        title={doc.original_filename}
                      >
                        {doc.original_filename}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>
                    {doc.file_type}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {doc.entity_type ? (
                      <Tag
                        color={entityTypeColors[doc.entity_type] || 'var(--text-muted)'}
                        style={{ fontSize: 11 }}
                      >
                        {doc.entity_type}
                      </Tag>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {formatDate(doc.created_at)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <Space size={4}>
                      <GlassButton
                        onClick={() => handleDownload(doc)}
                        style={{ padding: '2px 8px', fontSize: 11 }}
                      >
                        <DownloadOutlined />
                      </GlassButton>
                      <GlassButton
                        onClick={() => setDeleteId(doc.id)}
                        style={{ padding: '2px 8px', fontSize: 11, color: 'var(--status-faulty)' }}
                      >
                        <DeleteOutlined />
                      </GlassButton>
                    </Space>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        onConfirm={() => {
          if (deleteId) {
            onDelete(deleteId);
            setDeleteId(null);
          }
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}