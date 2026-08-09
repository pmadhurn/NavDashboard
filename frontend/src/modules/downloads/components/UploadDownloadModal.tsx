import React, { useMemo, useRef, useState } from 'react';
import { Select, Switch } from 'antd';
import { InboxOutlined, FileOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import GlassModal from '@/shared/components/GlassModal';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import { api } from '@/shared/api/client';
import {
  useDownloadCategories,
  useUploadDownload,
  useDownloadItems,
  formatFileSize,
} from '../hooks/useDownloads';

interface BasicUser {
  id: string;
  full_name: string;
  username: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Preselect an item to add a new version to. */
  addVersionToItemId?: string;
}

const selectStyles = `
  .dl-select .ant-select-selector {
    background: rgba(255,255,255,0.03) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    color: var(--text-primary) !important;
  }
  .dl-select .ant-select-selection-placeholder { color: var(--chart4) !important; }
  .dl-select .ant-select-selection-item { color: var(--text-primary) !important; }
`;

export default function UploadDownloadModal({ open, onClose, addVersionToItemId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [newCategory, setNewCategory] = useState('');
  const [isSoftware, setIsSoftware] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>([]);
  const [existingItemId, setExistingItemId] = useState<string | undefined>(addVersionToItemId);
  const [versionLabel, setVersionLabel] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: categories } = useDownloadCategories();
  const { data: itemsData } = useDownloadItems();
  const upload = useUploadDownload();

  const { data: users } = useQuery({
    queryKey: ['users-basic'],
    queryFn: () => api.get<BasicUser[]>('/auth/users/basic'),
    enabled: restricted,
  });

  const addingVersion = Boolean(existingItemId);

  // Suggest "add as version" when an item with a similar title exists
  const similarItem = useMemo(() => {
    if (!file || addingVersion || !itemsData?.items) return null;
    const name = (title || file.name).toLowerCase().replace(/\.[^.]+$/, '');
    return (
      itemsData.items.find(
        (item) =>
          item.title.toLowerCase().includes(name) ||
          name.includes(item.title.toLowerCase())
      ) ?? null
    );
  }, [file, title, itemsData, addingVersion]);

  const reset = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setCategoryId(undefined);
    setNewCategory('');
    setIsSoftware(false);
    setRestricted(false);
    setAllowedUserIds([]);
    setExistingItemId(addVersionToItemId);
    setVersionLabel('');
    setReleaseNotes('');
    setShowAdvanced(false);
  };

  const handleFile = (f: File) => {
    setFile(f);
    if (!title && !addingVersion) {
      setTitle(f.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    await upload.mutateAsync({
      file,
      title: addingVersion ? undefined : title || file.name,
      description: description || undefined,
      categoryId,
      newCategory: newCategory || undefined,
      itemType: isSoftware ? 'SOFTWARE' : 'FILE',
      visibility: restricted ? 'RESTRICTED' : 'PUBLIC',
      allowedUserIds: restricted ? allowedUserIds : undefined,
      existingItemId,
      versionLabel: versionLabel || undefined,
      releaseNotes: releaseNotes || undefined,
    });
    reset();
    onClose();
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: 'var(--text-muted)',
    marginBottom: 6,
  };

  return (
    <GlassModal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={addingVersion ? 'Add New Version' : 'Upload to Downloads'}
      width={520}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <GlassButton variant="ghost" onClick={() => { reset(); onClose(); }}>
            Cancel
          </GlassButton>
          <GlassButton
            onClick={handleSubmit}
            loading={upload.isPending}
            disabled={!file}
          >
            Upload
          </GlassButton>
        </div>
      }
    >
      <style>{selectStyles}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* File drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
          }}
          style={{
            border: `1.5px dashed ${dragOver ? '#8BC34A' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 12,
            padding: file ? '14px 16px' : '28px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'rgba(139,195,74,0.05)' : 'rgba(255,255,255,0.02)',
            transition: 'all 0.2s ease',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
            }}
          />
          {file ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
              <FileOutlined style={{ color: '#8BC34A', fontSize: 18 }} />
              <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{file.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatFileSize(file.size)}</span>
            </div>
          ) : (
            <div>
              <InboxOutlined style={{ fontSize: 28, color: 'var(--chart4)' }} />
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
                Drop a file here or click to browse
              </div>
            </div>
          )}
        </div>

        {/* Similar item hint */}
        {similarItem && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(111,122,140,0.1)',
              border: '1px solid rgba(111,122,140,0.25)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span>
              "{similarItem.title}" already exists. Add this as a new version?
            </span>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => setExistingItemId(similarItem.id)}
            >
              Add as version
            </GlassButton>
          </div>
        )}

        {addingVersion ? (
          <>
            <div
              style={{
                fontSize: 12,
                color: '#8BC34A',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                Adding a version to "
                {itemsData?.items.find((i) => i.id === existingItemId)?.title ?? 'item'}"
              </span>
              {!addVersionToItemId && (
                <GlassButton size="sm" variant="ghost" onClick={() => setExistingItemId(undefined)}>
                  Create new item instead
                </GlassButton>
              )}
            </div>
            <div>
              <label style={labelStyle}>Version label (e.g. v2.1)</label>
              <GlassInput value={versionLabel} onChange={setVersionLabel} placeholder="v1.0" />
            </div>
            <div>
              <label style={labelStyle}>What changed? (optional)</label>
              <GlassInput
                value={releaseNotes}
                onChange={setReleaseNotes}
                placeholder="Release notes"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label style={labelStyle}>Title</label>
              <GlassInput value={title} onChange={setTitle} placeholder="Name people will see" />
            </div>

            <div>
              <label style={labelStyle}>Group</label>
              <Select
                className="dl-select"
                style={{ width: '100%' }}
                placeholder="Pick a group or type to create one"
                value={categoryId ?? (newCategory || undefined)}
                showSearch
                allowClear
                options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
                onSearch={(v) => setNewCategory(v)}
                onChange={(v) => {
                  setCategoryId(v);
                  if (v) setNewCategory('');
                }}
                onClear={() => {
                  setCategoryId(undefined);
                  setNewCategory('');
                }}
                notFoundContent={
                  newCategory ? (
                    <div style={{ padding: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                      Press upload to create group "{newCategory}"
                    </div>
                  ) : null
                }
              />
            </div>

            {/* Visibility */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <div style={{ color: 'var(--primary)', fontSize: 13 }}>Visible to everyone</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  Turn off to pick specific people
                </div>
              </div>
              <Switch
                checked={!restricted}
                onChange={(checked) => setRestricted(!checked)}
                style={{ background: !restricted ? 'var(--status-working)' : '#4A4A4A' }}
              />
            </div>

            {restricted && (
              <Select
                className="dl-select"
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="Who can see this?"
                value={allowedUserIds}
                onChange={setAllowedUserIds}
                optionFilterProp="label"
                options={(users ?? []).map((u) => ({ value: u.id, label: u.full_name }))}
              />
            )}

            {/* Advanced */}
            <div
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
            >
              {showAdvanced ? '▾' : '▸'} Advanced options
            </div>
            {showAdvanced && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--primary)', fontSize: 13 }}>This is a software</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      Enables version history (v1.0, v2.0, …)
                    </div>
                  </div>
                  <Switch
                    checked={isSoftware}
                    onChange={setIsSoftware}
                    style={{ background: isSoftware ? 'var(--status-working)' : '#4A4A4A' }}
                  />
                </div>
                {isSoftware && (
                  <div>
                    <label style={labelStyle}>Version label</label>
                    <GlassInput value={versionLabel} onChange={setVersionLabel} placeholder="v1.0" />
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Description</label>
                  <GlassInput
                    value={description}
                    onChange={setDescription}
                    placeholder="Short description (optional)"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </GlassModal>
  );
}
