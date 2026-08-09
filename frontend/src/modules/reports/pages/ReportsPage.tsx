import React, { useState } from 'react';
import { Row, Col } from 'antd';
import {
  FileTextOutlined,
  BarChartOutlined,
  EnvironmentOutlined,
  ApiOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ReportBuilder from '../components/ReportBuilder';
import { ReportTemplate, useReportTemplates } from '../hooks/useReports';

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  device_inventory: <ApiOutlined style={{ fontSize: 28, color: '#6E7E8A' }} />,
  error_summary: <BarChartOutlined style={{ fontSize: 28, color: 'var(--status-faulty)' }} />,
  location_history: <EnvironmentOutlined style={{ fontSize: 28, color: 'var(--status-working)' }} />,
  pair_status: <FileTextOutlined style={{ fontSize: 28, color: 'var(--status-not-working)' }} />,
  full_system: <GlobalOutlined style={{ fontSize: 28, color: 'var(--text-primary)' }} />,
};

export default function ReportsPage() {
  const { data: templates, isLoading } = useReportTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  const handleSelectTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setBuilderOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate PDF and Excel reports for devices, errors, locations, and system overview"
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <Row gutter={[16, 16]}>
          {templates?.map((template) => (
            <Col xs={24} sm={12} lg={8} key={template.id}>
              <GlassCard
                style={{
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  height: '100%',
                }}
                hoverable
                onClick={() => handleSelectTemplate(template)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {TEMPLATE_ICONS[template.id] || (
                      <FileTextOutlined style={{ fontSize: 28, color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: 15,
                        marginBottom: 4,
                      }}
                    >
                      {template.name}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: '1.5' }}>
                      {template.description}
                    </div>
                  </div>
                </div>

                {template.parameters.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Parameters: </span>
                    {template.parameters.map((p) => (
                      <span
                        key={p}
                        style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: 4,
                          color: 'var(--text-secondary)',
                          fontSize: 10,
                          marginRight: 4,
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                <GlassButton
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTemplate(template);
                  }}
                  style={{ width: '100%', fontSize: 13 }}
                >
                  Generate Report
                </GlassButton>
              </GlassCard>
            </Col>
          ))}
        </Row>
      )}

      <ReportBuilder
        open={builderOpen}
        template={selectedTemplate}
        onClose={() => {
          setBuilderOpen(false);
          setSelectedTemplate(null);
        }}
      />
    </div>
  );
}