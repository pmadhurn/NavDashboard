import React, { useState } from 'react';
import { Upload, message, Tag } from 'antd';
import {
  InboxOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { UploadFile as AntUploadFile } from 'antd/es/upload/interface';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useImportXlsx, useImportCsv, ImportSummary } from '../hooks/useBackup';

const { Dragger } = Upload;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const importXlsx = useImportXlsx();
  const importCsv = useImportCsv();

  const isImporting = importXlsx.isPending || importCsv.isPending;

  const handleImport = async () => {
    if (!selectedFile) return;
    setConfirmOpen(false);
    setImportResult(null);

    try {
      let result: ImportSummary;
      if (selectedFile.name.endsWith('.xlsx')) {
        result = await importXlsx.mutateAsync(selectedFile);
      } else {
        result = await importCsv.mutateAsync(selectedFile);
      }
      setImportResult(result);
      if (result.errors === 0) {
        message.success(`Import completed: ${result.created} created, ${result.updated} updated`);
      } else {
        message.warning(`Import completed with ${result.errors} error(s)`);
      }
    } catch (err: any) {
      message.error(err.message || 'Import failed');
    }
  };

  return (
    <div>
      <h3 style={{ color: '#F2F2F2', fontSize: 16, marginBottom: 12 }}>Data Import</h3>

      <Dragger
        beforeUpload={(file) => {
          setSelectedFile(file);
          setImportResult(null);
          return false;
        }}
        onRemove={() => {
          setSelectedFile(null);
          setImportResult(null);
        }}
        maxCount={1}
        accept=".xlsx,.csv,.zip"
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
          marginBottom: 12,
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined style={{ color: '#7A7A7A', fontSize: 36 }} />
        </p>
        <p style={{ color: '#F2F2F2', fontSize: 13 }}>Drop XLSX, CSV, or ZIP file here</p>
        <p style={{ color: '#7A7A7A', fontSize: 11 }}>
          Records will be matched by ID or serial_number/name
        </p>
      </Dragger>

      {selectedFile && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 6,
            marginBottom: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#B8B8B8', fontSize: 12 }}>
            {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </span>
          <GlassButton
            variant="primary"
            onClick={() => setConfirmOpen(true)}
            disabled={isImporting}
            loading={isImporting}
            style={{ fontSize: 12, padding: '4px 12px' }}
          >
            <UploadOutlined /> Import
          </GlassButton>
        </div>
      )}

      <div
        style={{
          padding: '8px 12px',
          background: 'rgba(182,138,60,0.1)',
          border: '1px solid rgba(182,138,60,0.2)',
          borderRadius: 6,
          marginBottom: 12,
        }}
      >
        <span style={{ color: '#B68A3C', fontSize: 12 }}>
          ⚠️ Existing records will be updated. New records will be created.
        </span>
      </div>

      {importResult && (
        <GlassCard style={{ padding: 16, marginTop: 12 }}>
          <h4 style={{ color: '#F2F2F2', fontSize: 14, marginBottom: 12 }}>Import Result</h4>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#7A7A7A', fontSize: 11 }}>Total Rows</div>
              <div style={{ color: '#F2F2F2', fontSize: 20, fontWeight: 600 }}>
                {importResult.total_rows}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#7A7A7A', fontSize: 11 }}>Created</div>
              <div style={{ color: '#5F8F6B', fontSize: 20, fontWeight: 600 }}>
                <CheckCircleOutlined /> {importResult.created}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#7A7A7A', fontSize: 11 }}>Updated</div>
              <div style={{ color: '#B68A3C', fontSize: 20, fontWeight: 600 }}>
                <WarningOutlined /> {importResult.updated}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#7A7A7A', fontSize: 11 }}>Errors</div>
              <div style={{ color: '#9B3E3E', fontSize: 20, fontWeight: 600 }}>
                <CloseCircleOutlined /> {importResult.errors}
              </div>
            </div>
          </div>

          {importResult.error_details && importResult.error_details.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <GlassButton
                onClick={() => setShowErrors(!showErrors)}
                style={{ fontSize: 11, padding: '2px 8px' }}
              >
                {showErrors ? 'Hide' : 'Show'} Error Details ({importResult.error_details.length})
              </GlassButton>
              {showErrors && (
                <div
                  style={{
                    marginTop: 8,
                    maxHeight: 200,
                    overflowY: 'auto',
                    padding: 10,
                    background: 'rgba(155,62,62,0.1)',
                    borderRadius: 6,
                    border: '1px solid rgba(155,62,62,0.2)',
                  }}
                >
                  {importResult.error_details.map((err, idx) => (
                    <div key={idx} style={{ color: '#B8B8B8', fontSize: 11, marginBottom: 4 }}>
                      {err}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </GlassCard>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Import"
        message="This will create new records and update existing ones that match by ID or name. Are you sure?"
        confirmText="Import"
        onConfirm={handleImport}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}