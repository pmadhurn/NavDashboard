import React, { useState } from 'react';
import { Upload, Select, Progress, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile as AntUploadFile } from 'antd/es/upload/interface';
import GlassModal from '@/shared/components/GlassModal';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import { useUploadDocument } from '../hooks/useDocuments';

const { Dragger } = Upload;

interface DocumentUploaderProps {
  open: boolean;
  onClose: () => void;
  defaultEntityType?: string;
  defaultEntityId?: string;
}

const ENTITY_TYPES = [
  { value: 'device', label: 'Device' },
  { value: 'couple', label: 'Couple' },
  { value: 'pair', label: 'Pair' },
  { value: 'error', label: 'Error' },
  { value: 'general', label: 'General' },
];

export default function DocumentUploader({
  open,
  onClose,
  defaultEntityType,
  defaultEntityId,
}: DocumentUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [entityType, setEntityType] = useState<string>(defaultEntityType || '');
  const [entityId, setEntityId] = useState<string>(defaultEntityId || '');
  const [description, setDescription] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const uploadMutation = useUploadDocument();

  const handleUpload = async () => {
    if (!selectedFile) {
      message.warning('Please select a file first');
      return;
    }

    setUploadProgress(10);

    try {
      setUploadProgress(40);
      await uploadMutation.mutateAsync({
        file: selectedFile,
        entityType: entityType || undefined,
        entityId: entityId || undefined,
        description: description || undefined,
      });
      setUploadProgress(100);
      message.success('Document uploaded successfully');
      handleReset();
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Upload failed');
      setUploadProgress(0);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setEntityType(defaultEntityType || '');
    setEntityId(defaultEntityId || '');
    setDescription('');
    setUploadProgress(0);
  };

  const handleInputChange = (setter: (val: string) => void) => (val: any) => {
    if (typeof val === 'string') {
      setter(val);
    } else if (val && val.target) {
      setter(val.target.value);
    } else {
      setter(String(val ?? ''));
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Upload Document"
      width={560}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Dragger
          beforeUpload={(file) => {
            setSelectedFile(file);
            return false;
          }}
          onRemove={() => setSelectedFile(null)}
          maxCount={1}
          fileList={
            selectedFile
              ? [
                  {
                    uid: '-1',
                    name: selectedFile.name,
                    status: 'done',
                    size: selectedFile.size,
                  } as AntUploadFile,
                ]
              : []
          }
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed #242424',
            borderRadius: 8,
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: '#7A7A7A', fontSize: 40 }} />
          </p>
          <p style={{ color: '#F2F2F2', fontSize: 14 }}>
            Click or drag a file to upload
          </p>
          <p style={{ color: '#7A7A7A', fontSize: 12 }}>
            PDF, images, documents, spreadsheets supported
          </p>
        </Dragger>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: '#B8B8B8', fontSize: 12, marginBottom: 4, display: 'block' }}>
              Entity Type
            </label>
            <Select
              value={entityType || undefined}
              onChange={setEntityType}
              placeholder="Select type (optional)"
              allowClear
              style={{ width: '100%' }}
              options={ENTITY_TYPES}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: '#B8B8B8', fontSize: 12, marginBottom: 4, display: 'block' }}>
              Entity ID
            </label>
            <GlassInput
              value={entityId}
              onChange={handleInputChange(setEntityId)}
              placeholder="Entity UUID (optional)"
            />
          </div>
        </div>

        <div>
          <label style={{ color: '#B8B8B8', fontSize: 12, marginBottom: 4, display: 'block' }}>
            Description
          </label>
          <GlassInput
            value={description}
            onChange={handleInputChange(setDescription)}
            placeholder="Optional description..."
          />
        </div>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <Progress
            percent={uploadProgress}
            strokeColor="#5F8F6B"
            trailColor="#242424"
            showInfo={false}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <GlassButton
            onClick={() => {
              handleReset();
              onClose();
            }}
          >
            Cancel
          </GlassButton>
          <GlassButton
            variant="primary"
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            loading={uploadMutation.isPending}
          >
            Upload
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}