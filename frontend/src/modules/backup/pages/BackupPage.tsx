import React from 'react';
import { Upload, message, Row, Col, Space } from 'antd';
import {
  DatabaseOutlined,
  DownloadOutlined,
  DeleteOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import ExportOptions from '../components/ExportOptions';
import ImportUploader from '../components/ImportUploader';
import {
  useBackupHistory,
  useCreateBackup,
  useDeleteBackup,
  BackupInfo,
} from '../hooks/useBackup';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupPage() {
  const { data: backups, isLoading } = useBackupHistory();
  const createBackup = useCreateBackup();
  const deleteBackup = useDeleteBackup();

  const [restoreFile, setRestoreFile] = React.useState<File | null>(null);
  const [confirmRestore, setConfirmRestore] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [restoring, setRestoring] = React.useState(false);

  const handleCreateBackup = async () => {
    try {
      await createBackup.mutateAsync();
      message.success('Backup created successfully');
    } catch {
      message.error('Failed to create backup. Ensure postgresql-client is installed.');
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    try {
      await deleteBackup.mutateAsync(filename);
      message.success('Backup deleted');
    } catch {
      message.error('Failed to delete backup');
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    setConfirmRestore(false);
    setRestoring(true);
    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', restoreFile);
      const res = await fetch('/api/v1/backup/pg-dump/restore', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Restore failed' }));
        throw new Error(err.detail);
      }
      message.success('Database restored successfully');
      setRestoreFile(null);
    } catch (err: any) {
      message.error(err.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  const handleDownloadBackup = (filename: string) => {
    const token = localStorage.getItem('access_token');
    fetch(`/api/v1/backup/pg-dump/download/${filename}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => message.error('Download failed'));
  };

  return (
    <div>
      <PageHeader
        title="Backup & Restore"
        subtitle="Database backups, data export, and import tools"
      />

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <GlassCard style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: 16, margin: 0 }}>
                <DatabaseOutlined style={{ marginRight: 8 }} /> Database Backup
              </h3>
              <GlassButton
                variant="primary"
                onClick={handleCreateBackup}
                loading={createBackup.isPending}
              >
                Create Backup
              </GlassButton>
            </div>

            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Filename', 'Size', 'Created', 'Actions'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '8px 12px',
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
                    {(!backups || backups.length === 0) && (
                      <tr>
                        <td
                          colSpan={4}
                          style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}
                        >
                          No backups yet. Create your first backup above.
                        </td>
                      </tr>
                    )}
                    {backups?.map((backup: BackupInfo) => (
                      <tr
                        key={backup.filename}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <td style={{ padding: '8px 12px', color: 'var(--text-primary)', fontSize: 13 }}>
                          {backup.filename}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>
                          {formatBytes(backup.size)}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>
                          {new Date(backup.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <Space size={4}>
                            <GlassButton
                              onClick={() => handleDownloadBackup(backup.filename)}
                              style={{ padding: '2px 8px', fontSize: 11 }}
                            >
                              <DownloadOutlined /> Download
                            </GlassButton>
                            <GlassButton
                              onClick={() => setDeleteTarget(backup.filename)}
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
              </div>
            )}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <h4 style={{ color: 'var(--text-primary)', fontSize: 14, marginBottom: 8 }}>Restore from Backup</h4>
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(155,62,62,0.1)',
                  border: '1px solid rgba(155,62,62,0.2)',
                  borderRadius: 6,
                  marginBottom: 12,
                }}
              >
                <span style={{ color: 'var(--status-faulty)', fontSize: 12 }}>
                  ⚠️ This will overwrite existing data. Make sure you have a current backup.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Upload
                  beforeUpload={(file) => {
                    setRestoreFile(file);
                    return false;
                  }}
                  maxCount={1}
                  accept=".sql,.dump"
                  fileList={
                    restoreFile
                      ? [{ uid: '-1', name: restoreFile.name, status: 'done' as const }]
                      : []
                  }
                  onRemove={() => setRestoreFile(null)}
                >
                  <GlassButton>
                    <CloudUploadOutlined /> Select .sql file
                  </GlassButton>
                </Upload>
                {restoreFile && (
                  <GlassButton
                    variant="primary"
                    onClick={() => setConfirmRestore(true)}
                    loading={restoring}
                    style={{ color: 'var(--status-faulty)' }}
                  >
                    Restore
                  </GlassButton>
                )}
              </div>
            </div>
          </GlassCard>
        </Col>

        <Col xs={24} lg={12}>
          <GlassCard style={{ padding: 20 }}>
            <ExportOptions />
          </GlassCard>
        </Col>

        <Col xs={24} lg={12}>
          <GlassCard style={{ padding: 20 }}>
            <ImportUploader />
          </GlassCard>
        </Col>
      </Row>

      <ConfirmDialog
        open={confirmRestore}
        title="Confirm Restore"
        message="This will overwrite your current database with the backup file. This action cannot be undone. Continue?"
        confirmText="Restore"
        onConfirm={handleRestore}
        onCancel={() => setConfirmRestore(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Backup"
        message={`Are you sure you want to delete backup "${deleteTarget}"?`}
        confirmText="Delete"
        onConfirm={() => {
          if (deleteTarget) {
            handleDeleteBackup(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}