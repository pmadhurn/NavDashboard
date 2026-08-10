import { useMemo, useState } from 'react';
import {
  DownloadOutlined,
  UploadOutlined,
  SearchOutlined,
  FileZipOutlined,
  FileOutlined,
  CodeOutlined,
  DeleteOutlined,
  PlusOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import ShareButton from '@/shared/components/ShareButton';
import { useAuthStore, usePermission } from '@/shared/stores/authStore';
import UploadDownloadModal from '../components/UploadDownloadModal';
import {
  useDownloadItems,
  useDeleteDownloadItem,
  downloadVersionFile,
  formatFileSize,
  DownloadItem,
} from '../hooks/useDownloads';

function ItemIcon({ item }: { item: DownloadItem }) {
  const style = { fontSize: 20, color: '#8BC34A' };
  if (item.item_type === 'SOFTWARE') return <CodeOutlined style={style} />;
  const name = item.versions[0]?.original_filename ?? '';
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return <FileZipOutlined style={style} />;
  return <FileOutlined style={style} />;
}

function ItemCard({
  item,
  canDelete,
  onDelete,
  onAddVersion,
}: {
  item: DownloadItem;
  canDelete: boolean;
  onDelete: () => void;
  onAddVersion: () => void;
}) {
  const [showVersions, setShowVersions] = useState(false);
  const latest = item.versions[0];
  const canEdit = usePermission('downloads.update');

  return (
    <GlassCard padding="sm">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <ItemIcon item={item} />
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>
              {item.title}
            </span>
            {latest?.version_label && (
              <span
                style={{
                  fontSize: 11,
                  color: '#8BC34A',
                  background: 'rgba(139,195,74,0.12)',
                  padding: '1px 8px',
                  borderRadius: 10,
                }}
              >
                {latest.version_label}
              </span>
            )}
            {item.visibility === 'RESTRICTED' && (
              <span
                style={{
                  fontSize: 11,
                  color: '#8C8468',
                  background: 'rgba(140,132,104,0.12)',
                  padding: '1px 8px',
                  borderRadius: 10,
                }}
              >
                Restricted
              </span>
            )}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
            {item.description || latest?.original_filename}
            {latest && ` · ${formatFileSize(latest.file_size)}`}
            {latest && latest.download_count > 0 && ` · ${latest.download_count} downloads`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {item.versions.length > 1 && (
            <GlassButton
              variant="ghost"
              size="sm"
              icon={<HistoryOutlined />}
              onClick={() => setShowVersions(!showVersions)}
            >
              {item.versions.length} versions
            </GlassButton>
          )}
          {canEdit && item.item_type === 'SOFTWARE' && (
            <GlassButton variant="ghost" size="sm" icon={<PlusOutlined />} onClick={onAddVersion}>
              Version
            </GlassButton>
          )}
          <ShareButton title={`Download: ${item.title}`} url="/downloads" />
          {latest && (
            <GlassButton
              size="sm"
              icon={<DownloadOutlined />}
              onClick={() => downloadVersionFile(latest)}
            >
              Download
            </GlassButton>
          )}
          {canDelete && (
            <GlassButton variant="danger" size="sm" icon={<DeleteOutlined />} onClick={onDelete} />
          )}
        </div>
      </div>

      {showVersions && (
        <div
          style={{
            marginTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {item.versions.map((version) => (
            <div
              key={version.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  {version.version_label || version.original_filename}
                </span>
                {' · '}
                {formatFileSize(version.file_size)}
                {version.release_notes && ` · ${version.release_notes}`}
              </div>
              <GlassButton
                variant="ghost"
                size="sm"
                icon={<DownloadOutlined />}
                onClick={() => downloadVersionFile(version)}
              >
                Get
              </GlassButton>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

export default function DownloadsPage() {
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [addVersionItemId, setAddVersionItemId] = useState<string | undefined>();
  const [deleteItem, setDeleteItem] = useState<DownloadItem | null>(null);

  const user = useAuthStore((s) => s.user);
  const canEdit = usePermission('downloads.update');
  const canManage = usePermission('downloads.categories');

  const { data, isLoading } = useDownloadItems(search);
  const deleteMutation = useDeleteDownloadItem();

  const grouped = useMemo(() => {
    const groups = new Map<string, DownloadItem[]>();
    for (const item of data?.items ?? []) {
      const key = item.category?.name ?? 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return [...groups.entries()].sort(([a], [b]) =>
      a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)
    );
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Downloads"
        subtitle="Shared files and software for the team"
        actions={
          canEdit ? (
            <GlassButton
              variant="primary"
              icon={<UploadOutlined />}
              onClick={() => {
                setAddVersionItemId(undefined);
                setUploadOpen(true);
              }}
            >
              Upload
            </GlassButton>
          ) : undefined
        }
      />

      <div style={{ maxWidth: 420, marginBottom: 20 }}>
        <GlassInput
          value={search}
          onChange={setSearch}
          placeholder="Search downloads..."
          prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
        />
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading downloads..." />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<DownloadOutlined />}
          title="Nothing here yet"
          description={
            canEdit
              ? 'Upload the first file to share it with the team.'
              : 'Files shared with you will appear here.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grouped.map(([categoryName, items]) => (
            <div key={categoryName}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 10,
                }}
              >
                {categoryName}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    canDelete={canManage || item.uploaded_by === user?.id}
                    onDelete={() => setDeleteItem(item)}
                    onAddVersion={() => {
                      setAddVersionItemId(item.id);
                      setUploadOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadDownloadModal
        key={addVersionItemId ?? 'new'}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        addVersionToItemId={addVersionItemId}
      />

      <ConfirmDialog
        open={!!deleteItem}
        title="Delete Download"
        message={`Delete "${deleteItem?.title}" and all its versions? This cannot be undone.`}
        confirmText="Delete"
        onConfirm={async () => {
          if (deleteItem) {
            await deleteMutation.mutateAsync(deleteItem.id);
            setDeleteItem(null);
          }
        }}
        onCancel={() => setDeleteItem(null)}
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
