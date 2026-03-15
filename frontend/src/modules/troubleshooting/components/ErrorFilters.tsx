import React from 'react';
import { Checkbox, DatePicker, Segmented, Tag } from 'antd';
import GlassCard from '@/shared/components/GlassCard';
import GlassInput from '@/shared/components/GlassInput';
import type { ErrorFilterState } from '../hooks/useTroubleshooting';

interface ErrorFiltersProps {
  filters: ErrorFilterState;
  onChange: (filters: ErrorFilterState) => void;
}

const SEVERITY_OPTIONS = [
  { label: 'Low', value: 'LOW', color: '#6E6E6E' },
  { label: 'Medium', value: 'MEDIUM', color: '#B68A3C' },
  { label: 'High', value: 'HIGH', color: '#9B3E3E' },
  { label: 'Critical', value: 'CRITICAL', color: '#6E2C2C' },
];

export default function ErrorFilters({ filters, onChange }: ErrorFiltersProps) {
  const handleSeverityChange = (checked: boolean, value: string) => {
    const updated = checked
      ? [...filters.severity, value]
      : filters.severity.filter((s) => s !== value);
    onChange({ ...filters, severity: updated });
  };

  const handleResolvedChange = (value: string | number) => {
    const val = value === 'All' ? null : value === 'Open' ? false : true;
    onChange({ ...filters, resolved: val });
  };

  const handleEntityTypeChange = (value: string | number) => {
    onChange({ ...filters, entity_type: String(value).toLowerCase() });
  };

  const handleErrorTypeSearch = (value: string) => {
    onChange({ ...filters, error_type: value });
  };

  const handleDateRangeStart = (_date: unknown, dateString: string | string[]) => {
    const str = Array.isArray(dateString) ? dateString[0] : dateString;
    onChange({ ...filters, reported_at_gte: str || null });
  };

  const handleDateRangeEnd = (_date: unknown, dateString: string | string[]) => {
    const str = Array.isArray(dateString) ? dateString[0] : dateString;
    onChange({ ...filters, reported_at_lte: str || null });
  };

  const removeFilter = (key: keyof ErrorFilterState) => {
    const updated = { ...filters };
    if (key === 'severity') {
      updated.severity = [];
    } else if (key === 'resolved') {
      updated.resolved = null;
    } else if (key === 'error_type') {
      updated.error_type = '';
    } else if (key === 'entity_type') {
      updated.entity_type = 'all';
    } else if (key === 'reported_at_gte') {
      updated.reported_at_gte = null;
    } else if (key === 'reported_at_lte') {
      updated.reported_at_lte = null;
    }
    onChange(updated);
  };

  const activeTags: { key: keyof ErrorFilterState; label: string }[] = [];
  if (filters.severity.length > 0) {
    activeTags.push({ key: 'severity', label: `Severity: ${filters.severity.join(', ')}` });
  }
  if (filters.resolved !== null) {
    activeTags.push({
      key: 'resolved',
      label: filters.resolved ? 'Resolved' : 'Open',
    });
  }
  if (filters.error_type) {
    activeTags.push({ key: 'error_type', label: `Type: ${filters.error_type}` });
  }
  if (filters.entity_type !== 'all') {
    activeTags.push({
      key: 'entity_type',
      label: `Entity: ${filters.entity_type}`,
    });
  }
  if (filters.reported_at_gte) {
    activeTags.push({ key: 'reported_at_gte', label: `From: ${filters.reported_at_gte}` });
  }
  if (filters.reported_at_lte) {
    activeTags.push({ key: 'reported_at_lte', label: `To: ${filters.reported_at_lte}` });
  }

  return (
    <GlassCard padding="md" style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          alignItems: 'flex-start',
        }}
      >
        {/* Severity checkboxes */}
        <div>
          <div style={{ color: '#8C8C8C', fontSize: 12, marginBottom: 6 }}>Severity</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {SEVERITY_OPTIONS.map((opt) => (
              <Checkbox
                key={opt.value}
                checked={filters.severity.includes(opt.value)}
                onChange={(e) => handleSeverityChange(e.target.checked, opt.value)}
                style={{ color: '#D9D9D9' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: opt.color,
                      display: 'inline-block',
                    }}
                  />
                  {opt.label}
                </span>
              </Checkbox>
            ))}
          </div>
        </div>

        {/* Status segmented */}
        <div>
          <div style={{ color: '#8C8C8C', fontSize: 12, marginBottom: 6 }}>Status</div>
          <Segmented
            options={['All', 'Open', 'Resolved']}
            value={
              filters.resolved === null ? 'All' : filters.resolved ? 'Resolved' : 'Open'
            }
            onChange={handleResolvedChange}
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 8,
            }}
          />
        </div>

        {/* Entity type segmented */}
        <div>
          <div style={{ color: '#8C8C8C', fontSize: 12, marginBottom: 6 }}>Entity</div>
          <Segmented
            options={[
              { label: 'All', value: 'all' },
              { label: 'Device', value: 'device' },
              { label: 'Couple', value: 'couple' },
              { label: 'Pair', value: 'pair' },
            ]}
            value={filters.entity_type}
            onChange={handleEntityTypeChange}
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 8,
            }}
          />
        </div>

        {/* Error type search */}
        <div style={{ minWidth: 180 }}>
          <div style={{ color: '#8C8C8C', fontSize: 12, marginBottom: 6 }}>Error Type</div>
          <GlassInput
            placeholder="Search error type..."
            value={filters.error_type}
            onChange={handleErrorTypeSearch}
            size="sm"
          />
        </div>

        {/* Date range */}
        <div>
          <div style={{ color: '#8C8C8C', fontSize: 12, marginBottom: 6 }}>Date Range</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <DatePicker
              placeholder="From"
              onChange={handleDateRangeStart}
              style={{
                background: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            />
            <span style={{ color: '#8C8C8C' }}>–</span>
            <DatePicker
              placeholder="To"
              onChange={handleDateRangeEnd}
              style={{
                background: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Active filter tags */}
      {activeTags.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {activeTags.map((tag) => (
            <Tag
              key={tag.key}
              closable
              onClose={() => removeFilter(tag.key)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#D9D9D9',
                borderRadius: 6,
              }}
            >
              {tag.label}
            </Tag>
          ))}
        </div>
      )}
    </GlassCard>
  );
}