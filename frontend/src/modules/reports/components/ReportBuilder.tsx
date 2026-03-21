import React, { useState } from 'react';
import { DatePicker, Radio, Select, message } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import GlassModal from '@/shared/components/GlassModal';
import GlassButton from '@/shared/components/GlassButton';
import { ReportTemplate, useGenerateReport } from '../hooks/useReports';

const { RangePicker } = DatePicker;

interface ReportBuilderProps {
  open: boolean;
  template: ReportTemplate | null;
  onClose: () => void;
}

export default function ReportBuilder({ open, template, onClose }: ReportBuilderProps) {
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const generateMutation = useGenerateReport();

  const handleGenerate = async () => {
    if (!template) return;

    try {
      await generateMutation.mutateAsync({
        template_id: template.id,
        format,
        date_from: dateRange?.[0] || undefined,
        date_to: dateRange?.[1] || undefined,
      });
      message.success('Report generated and downloaded');
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Report generation failed');
    }
  };

  if (!template) return null;

  const hasDateParams =
    template.parameters.includes('date_from') || template.parameters.includes('date_to');

  return (
    <GlassModal open={open} onClose={onClose} title="Generate Report" width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            padding: 14,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileTextOutlined style={{ color: '#5F8F6B', fontSize: 22 }} />
            <div>
              <div style={{ color: '#F2F2F2', fontSize: 15, fontWeight: 600 }}>
                {template.name}
              </div>
              <div style={{ color: '#7A7A7A', fontSize: 12 }}>{template.description}</div>
            </div>
          </div>
        </div>

        {hasDateParams && (
          <div>
            <label style={{ color: '#B8B8B8', fontSize: 12, display: 'block', marginBottom: 6 }}>
              Date Range (optional)
            </label>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(_, dateStrings) => {
                if (dateStrings[0] && dateStrings[1]) {
                  setDateRange([dateStrings[0], dateStrings[1]]);
                } else {
                  setDateRange(null);
                }
              }}
            />
          </div>
        )}

        <div>
          <label style={{ color: '#B8B8B8', fontSize: 12, display: 'block', marginBottom: 6 }}>
            Format
          </label>
          <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)}>
            <Radio value="pdf" style={{ color: '#B8B8B8' }}>
              PDF
            </Radio>
            <Radio value="xlsx" style={{ color: '#B8B8B8' }}>
              Excel (XLSX)
            </Radio>
          </Radio.Group>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <GlassButton onClick={onClose}>Cancel</GlassButton>
          <GlassButton
            variant="primary"
            onClick={handleGenerate}
            loading={generateMutation.isPending}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Generating...' : 'Generate Report'}
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}