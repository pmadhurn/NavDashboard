import { useState } from 'react';
import { Select, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import DocumentList from '../components/DocumentList';
import DocumentUploader from '../components/DocumentUploader';
import { useDocuments, useDeleteDocument } from '../hooks/useDocuments';

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All Entities' },
  { value: 'device', label: 'Device' },
  { value: 'couple', label: 'Couple' },
  { value: 'pair', label: 'Pair' },
  { value: 'error', label: 'Error' },
  { value: 'general', label: 'General' },
];

const FILE_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'pdf', label: 'PDF' },
  { value: 'image', label: 'Image' },
  { value: 'document', label: 'Document' },
  { value: 'spreadsheet', label: 'Spreadsheet' },
];

export default function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [fileType, setFileType] = useState('');
  const [uploaderOpen, setUploaderOpen] = useState(false);

  const { data, isLoading } = useDocuments({
    page,
    size: 20,
    entity_type: entityType || undefined,
    file_type: fileType || undefined,
  });

  const deleteMutation = useDeleteDocument();

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      message.success('Document deleted');
    } catch {
      message.error('Failed to delete document');
    }
  };

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Upload and manage files attached to devices, couples, and pairs"
        actions={
          <GlassButton variant="primary" onClick={() => setUploaderOpen(true)}>
            <UploadOutlined /> Upload
          </GlassButton>
        }
      />

      <GlassCard style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginBottom: 4 }}>
              Entity Type
            </label>
            <Select
              value={entityType}
              onChange={(val) => {
                setEntityType(val);
                setPage(1);
              }}
              options={ENTITY_TYPE_OPTIONS}
              style={{ width: 160 }}
            />
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginBottom: 4 }}>
              File Type
            </label>
            <Select
              value={fileType}
              onChange={(val) => {
                setFileType(val);
                setPage(1);
              }}
              options={FILE_TYPE_OPTIONS}
              style={{ width: 160 }}
            />
          </div>
        </div>
      </GlassCard>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <DocumentList
            documents={data?.items || []}
            loading={isLoading}
            onDelete={handleDelete}
          />

          {data && data.pages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                marginTop: 20,
              }}
            >
              <GlassButton disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </GlassButton>
              <span style={{ color: 'var(--text-secondary)', lineHeight: '32px', fontSize: 13 }}>
                Page {data.page} of {data.pages}
              </span>
              <GlassButton disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </GlassButton>
            </div>
          )}
        </>
      )}

      <DocumentUploader open={uploaderOpen} onClose={() => setUploaderOpen(false)} />
    </div>
  );
}