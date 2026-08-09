import React, { useState, useEffect } from 'react';
import { Row, Col, Select, DatePicker, Checkbox, Tag, Space } from 'antd';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';

const { RangePicker } = DatePicker;

interface AdvancedFiltersProps {
  visible: boolean;
  onFiltersChange: (filters: Record<string, any>) => void;
}

const ENTITY_TYPES = [
  { label: 'Device', value: 'device' },
  { label: 'Couple', value: 'couple' },
  { label: 'Pair', value: 'pair' },
  { label: 'Personnel', value: 'personnel' },
  { label: 'Error', value: 'error' },
];

const STATUSES = [
  { label: 'Working', value: 'WORKING' },
  { label: 'Not Working', value: 'NOT_WORKING' },
  { label: 'Faulty', value: 'FAULTY' },
];

const DEVICE_TYPES = [
  { label: 'IU', value: 'IU' },
  { label: 'OU', value: 'OU' },
  { label: 'HC', value: 'HC' },
  { label: 'RF', value: 'RF' },
];

const SEVERITIES = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' },
];

const selectStyle: React.CSSProperties = {
  width: '100%',
};

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  visible,
  onFiltersChange,
}) => {
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [deviceType, setDeviceType] = useState<string | undefined>(undefined);
  const [severity, setSeverity] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  const showDeviceType = entityTypes.includes('device');
  const showSeverity = entityTypes.includes('error');

  useEffect(() => {
    const filters: Record<string, any> = {};
    if (entityTypes.length > 0) filters.entity_types = entityTypes;
    if (status) filters.status = status;
    if (deviceType && showDeviceType) filters.device_type = deviceType;
    if (severity && showSeverity) filters.severity = severity;
    if (dateRange && dateRange[0] && dateRange[1]) {
      filters.date_from = dateRange[0].toISOString();
      filters.date_to = dateRange[1].toISOString();
    }
    onFiltersChange(filters);
  }, [entityTypes, status, deviceType, severity, dateRange]);

  const handleReset = () => {
    setEntityTypes([]);
    setStatus(undefined);
    setDeviceType(undefined);
    setSeverity(undefined);
    setDateRange(null);
  };

  const activeFilters: { key: string; label: string; onRemove: () => void }[] = [];

  if (entityTypes.length > 0) {
    entityTypes.forEach((et) => {
      activeFilters.push({
        key: `et-${et}`,
        label: `Type: ${et}`,
        onRemove: () => setEntityTypes((prev) => prev.filter((t) => t !== et)),
      });
    });
  }
  if (status) {
    activeFilters.push({
      key: 'status',
      label: `Status: ${status}`,
      onRemove: () => setStatus(undefined),
    });
  }
  if (deviceType && showDeviceType) {
    activeFilters.push({
      key: 'deviceType',
      label: `Device Type: ${deviceType}`,
      onRemove: () => setDeviceType(undefined),
    });
  }
  if (severity && showSeverity) {
    activeFilters.push({
      key: 'severity',
      label: `Severity: ${severity}`,
      onRemove: () => setSeverity(undefined),
    });
  }
  if (dateRange && dateRange[0] && dateRange[1]) {
    activeFilters.push({
      key: 'dateRange',
      label: 'Date range set',
      onRemove: () => setDateRange(null),
    });
  }

  if (!visible) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <GlassCard>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={8}>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6 }}>
              Entity Types
            </div>
            <Checkbox.Group
              options={ENTITY_TYPES}
              value={entityTypes}
              onChange={(vals) => setEntityTypes(vals as string[])}
              style={{ color: 'var(--text-secondary)' }}
            />
          </Col>

          <Col xs={24} sm={12} md={4}>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6 }}>
              Status
            </div>
            <Select
              allowClear
              placeholder="Any status"
              style={selectStyle}
              value={status}
              onChange={setStatus}
              options={STATUSES}
            />
          </Col>

          {showDeviceType && (
            <Col xs={24} sm={12} md={4}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6 }}>
                Device Type
              </div>
              <Select
                allowClear
                placeholder="Any type"
                style={selectStyle}
                value={deviceType}
                onChange={setDeviceType}
                options={DEVICE_TYPES}
              />
            </Col>
          )}

          {showSeverity && (
            <Col xs={24} sm={12} md={4}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6 }}>
                Severity
              </div>
              <Select
                allowClear
                placeholder="Any severity"
                style={selectStyle}
                value={severity}
                onChange={setSeverity}
                options={SEVERITIES}
              />
            </Col>
          )}

          <Col xs={24} sm={12} md={6}>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6 }}>
              Date Range
            </div>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange as any}
              onChange={(vals) => setDateRange(vals as any)}
            />
          </Col>

          <Col xs={24} sm={12} md={2}>
            <div style={{ color: 'transparent', fontSize: 12, marginBottom: 6 }}>
              &nbsp;
            </div>
            <GlassButton onClick={handleReset} style={{ width: '100%' }}>
              Reset
            </GlassButton>
          </Col>
        </Row>

        {activeFilters.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Space wrap>
              {activeFilters.map((af) => (
                <Tag
                  key={af.key}
                  closable
                  onClose={af.onRemove}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--text-secondary)',
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

export default AdvancedFilters;