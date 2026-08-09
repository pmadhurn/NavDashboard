import { useState } from 'react';
import { Checkbox, Radio, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import { useTableCounts, useExportXlsx, useExportCsv } from '../hooks/useBackup';

const EXPORT_TABLES = [
  { key: 'devices', label: 'Devices' },
  { key: 'couples', label: 'Couples' },
  { key: 'pairs', label: 'Pairs' },
  { key: 'locations', label: 'Locations' },
  { key: 'location_history', label: 'Location History' },
  { key: 'personnel', label: 'Personnel' },
  { key: 'fitting_materials', label: 'Fitting Materials' },
  { key: 'material_templates', label: 'Material Templates' },
  { key: 'error_logs', label: 'Error Logs' },
  { key: 'troubleshoot_entries', label: 'Troubleshoot Entries' },
  { key: 'status_change_logs', label: 'Status Change Logs' },
  { key: 'users', label: 'Users' },
];

export default function ExportOptions() {
  const [selectedTables, setSelectedTables] = useState<string[]>(
    EXPORT_TABLES.map((t) => t.key)
  );
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');

  const { data: counts, isLoading: countsLoading } = useTableCounts();
  const exportXlsx = useExportXlsx();
  const exportCsv = useExportCsv();

  const allSelected = selectedTables.length === EXPORT_TABLES.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedTables([]);
    } else {
      setSelectedTables(EXPORT_TABLES.map((t) => t.key));
    }
  };

  const toggleTable = (key: string) => {
    setSelectedTables((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleExport = async () => {
    const tables = selectedTables.length === EXPORT_TABLES.length ? undefined : selectedTables;
    try {
      if (format === 'xlsx') {
        await exportXlsx.mutateAsync(tables);
      } else {
        await exportCsv.mutateAsync(tables);
      }
      message.success(`Export completed (${format.toUpperCase()})`);
    } catch {
      message.error('Export failed');
    }
  };

  const isExporting = exportXlsx.isPending || exportCsv.isPending;

  return (
    <div>
      <h3 style={{ color: 'var(--text-primary)', fontSize: 16, marginBottom: 12 }}>Data Export</h3>

      {countsLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <GlassButton onClick={toggleAll} style={{ fontSize: 12, padding: '4px 10px' }}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </GlassButton>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
              marginBottom: 16,
            }}
          >
            {EXPORT_TABLES.map((table) => (
              <div
                key={table.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <Checkbox
                  checked={selectedTables.includes(table.key)}
                  onChange={() => toggleTable(table.key)}
                  style={{ color: 'var(--text-secondary)', fontSize: 12 }}
                >
                  {table.label}
                </Checkbox>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  {counts?.[table.key] ?? 0}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginBottom: 6 }}>
              Format
            </label>
            <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)}>
              <Radio value="xlsx" style={{ color: 'var(--text-secondary)' }}>
                XLSX (Excel)
              </Radio>
              <Radio value="csv" style={{ color: 'var(--text-secondary)' }}>
                CSV (ZIP)
              </Radio>
            </Radio.Group>
          </div>

          <GlassButton
            variant="primary"
            onClick={handleExport}
            disabled={selectedTables.length === 0 || isExporting}
            loading={isExporting}
          >
            <DownloadOutlined /> Export {format.toUpperCase()}
          </GlassButton>
        </>
      )}
    </div>
  );
}