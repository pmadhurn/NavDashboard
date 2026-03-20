import React from 'react';
import { Row, Col, Select, DatePicker, Tag, Space } from 'antd';
import GlassCard from '@/shared/components/GlassCard';

const { RangePicker } = DatePicker;

interface AuditFiltersProps {
  filters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
}

const ACTION_OPTIONS = [
  { label: 'CREATE', value: 'CREATE' },
  { label: 'UPDATE', value: 'UPDATE' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'STATUS_CHANGE', value: 'STATUS_CHANGE' },
  { label: 'RESOLVE', value: 'RESOLVE' },
  { label: 'SEED_CREATE', value: 'SEED_CREATE' },
  { label: 'ADD_STEP', value: 'ADD_STEP' },
];

const ENTITY_TYPE_OPTIONS = [
  { label: 'Device', value: 'device' },
  { label: 'Couple', value: 'couple' },
  { label: 'Pair', value: 'pair' },
  { label: 'Error Log', value: 'error_log' },
  { label: 'Personnel', value: 'personnel' },
  { label: 'User', value: 'user' },
  { label: 'Fitting Material', value: 'fitting_material' },
  { label: 'Location', value: 'location' },
  { label: 'Status Change', value: 'status_change' },
  { label: 'Material Template', value: 'material_template' },
];

const AuditFilters: React.FC<AuditFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const handleActionChange = (value: string | undefined) => {
    onFiltersChange({ action: value || undefined });
  };

  const handleEntityTypeChange = (value: string | undefined) => {
    onFiltersChange({ entity_type: value || undefined });
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      onFiltersChange({
        date_from: dates[0].toISOString(),
        date_to: dates[1].toISOString(),
      });
    } else {
      onFiltersChange({ date_from: undefined, date_to: undefined });
    }
  };

  const handleClearAll = () => {
    onFiltersChange({
      action: undefined,
      entity_type: undefined,
      user_id: undefined,
      date_from: undefined,
      date_to: undefined,
    });
  };

  const activeFilters: { key: string; label: string; onRemove: () => void }[] =
    [];

  if (filters.action) {
    activeFilters.push({
      key: 'action',
      label: `Action: ${filters.action}`,
      onRemove: () => onFiltersChange({ action: undefined }),
    });
  }
  if (filters.entity_type) {
    activeFilters.push({
      key: 'entity_type',
      label: `Entity: ${filters.entity_type}`,
      onRemove: () => onFiltersChange({ entity_type: undefined }),
    });
  }
  if (filters.date_from) {
    activeFilters.push({
      key: 'date_range',
      label: 'Date range set',
      onRemove: () =>
        onFiltersChange({ date_from: undefined, date_to: undefined }),
    });
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <GlassCard>
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <div style={{ color: '#B8B8B8', fontSize: 12, marginBottom: 4 }}>
              Action
            </div>
            <Select
              allowClear
              placeholder="Filter by action"
              style={{ width: '100%' }}
              value={filters.action}
              onChange={handleActionChange}
              options={ACTION_OPTIONS}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <div style={{ color: '#B8B8B8', fontSize: 12, marginBottom: 4 }}>
              Entity Type
            </div>
            <Select
              allowClear
              placeholder="Filter by entity"
              style={{ width: '100%' }}
              value={filters.entity_type}
              onChange={handleEntityTypeChange}
              options={ENTITY_TYPE_OPTIONS}
            />
          </Col>
          <Col xs={24} sm={8} md={8}>
            <div style={{ color: '#B8B8B8', fontSize: 12, marginBottom: 4 }}>
              Date Range
            </div>
            <RangePicker style={{ width: '100%' }} onChange={handleDateRangeChange} />
          </Col>
          <Col xs={24} sm={24} md={4}>
            <div style={{ color: 'transparent', fontSize: 12, marginBottom: 4 }}>
              &nbsp;
            </div>
            {activeFilters.length > 0 && (
              <span
                style={{
                  color: '#5F8F6B',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
                onClick={handleClearAll}
              >
                Clear All
              </span>
            )}
          </Col>
        </Row>

        {activeFilters.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <Space wrap>
              {activeFilters.map((af) => (
                <Tag
                  key={af.key}
                  closable
                  onClose={af.onRemove}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#B8B8B8',
                    borderRadius: 6,
                  }}
                >
                  {af.label}
                </Tag>
              ))}
            </Space>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default AuditFilters;