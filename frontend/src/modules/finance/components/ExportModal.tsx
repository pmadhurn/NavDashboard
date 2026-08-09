import { useState } from 'react';
import { Select, Switch, message } from 'antd';
import {
  FilePdfOutlined,
  FileExcelOutlined,
  FileZipOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import GlassModal from '@/shared/components/GlassModal';
import GlassButton from '@/shared/components/GlassButton';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useClaims, exportExpenses, ExportOptions } from '../hooks/useFinance';

const FORMATS = [
  {
    value: 'pdf' as const,
    label: 'PDF report',
    hint: 'Itemised report, optionally with receipt images appended',
    icon: <FilePdfOutlined />,
  },
  {
    value: 'xlsx' as const,
    label: 'Excel sheet',
    hint: 'Itemised rows with totals',
    icon: <FileExcelOutlined />,
  },
  {
    value: 'zip' as const,
    label: 'ZIP of receipts',
    hint: 'Every raw receipt file plus a summary CSV',
    icon: <FileZipOutlined />,
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-scope the export (e.g. from a project page). */
  defaultScope?: ExportOptions['scope'];
  defaultScopeId?: string;
}

export default function ExportModal({ open, onClose, defaultScope, defaultScopeId }: Props) {
  const [format, setFormat] = useState<ExportOptions['format']>('pdf');
  const [scope, setScope] = useState<ExportOptions['scope']>(defaultScope ?? 'all');
  const [scopeId, setScopeId] = useState<string | undefined>(defaultScopeId);
  const [includeImages, setIncludeImages] = useState(true);
  const [busy, setBusy] = useState(false);

  const { data: projectData } = useProjects({});
  const { data: claims } = useClaims();

  const scopeOptions =
    scope === 'project'
      ? (projectData?.items ?? []).map((p) => ({ value: p.id, label: p.name }))
      : scope === 'claim'
        ? (claims ?? []).map((c) => ({ value: c.id, label: c.title }))
        : [];

  const handleExport = async () => {
    setBusy(true);
    try {
      await exportExpenses({ format, scope, scopeId, includeImages });
      onClose();
    } catch {
      message.error('Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Export bills & expenses"
      width={520}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton icon={<DownloadOutlined />} onClick={handleExport} loading={busy}>
            Download
          </GlassButton>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            Format
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FORMATS.map((f) => {
              const active = format === f.value;
              return (
                <div
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    border: `1px solid ${active ? 'var(--status-working)' : 'rgba(255,255,255,0.07)'}`,
                    background: active ? 'rgba(95,143,107,0.1)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ color: active ? 'var(--status-working)' : 'var(--text-muted)', fontSize: 18 }}>{f.icon}</span>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: 13 }}>{f.label}</div>
                    <div style={{ color: '#6A6A6A', fontSize: 11 }}>{f.hint}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {format === 'pdf' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: 'var(--primary)', fontSize: 13 }}>Include receipt images</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                Appends each bill photo after the report
              </div>
            </div>
            <Switch
              checked={includeImages}
              onChange={setIncludeImages}
              style={{ background: includeImages ? 'var(--status-working)' : '#4A4A4A' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Scope
            </label>
            <Select
              className="dl-select"
              style={{ width: '100%' }}
              value={scope}
              onChange={(v) => {
                setScope(v);
                setScopeId(undefined);
              }}
              options={[
                { value: 'all', label: 'Everything' },
                { value: 'project', label: 'One project' },
                { value: 'claim', label: 'One claim' },
              ]}
            />
          </div>
          {(scope === 'project' || scope === 'claim') && (
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Pick {scope}
              </label>
              <Select
                className="dl-select"
                style={{ width: '100%' }}
                showSearch
                optionFilterProp="label"
                placeholder={`Select a ${scope}`}
                value={scopeId}
                onChange={setScopeId}
                options={scopeOptions}
              />
            </div>
          )}
        </div>
      </div>
    </GlassModal>
  );
}
