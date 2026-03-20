import React from 'react';
import GlassCard from '@/shared/components/GlassCard';
import DiffHighlighter from './DiffHighlighter';
import { ComparisonResult, ComparisonField } from '../hooks/useComparison';

interface ComparisonTableProps {
  result: ComparisonResult;
}

const FieldRow: React.FC<{ field: ComparisonField }> = ({ field }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gap: 0,
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}
  >
    <div style={{ padding: '10px 14px' }}>
      <DiffHighlighter value={field.value_a} match={field.match} side="a" />
    </div>
    <div
      style={{
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 140,
        color: '#7A7A7A',
        fontSize: 12,
        fontWeight: 600,
        textAlign: 'center',
        borderLeft: '1px solid rgba(255,255,255,0.04)',
        borderRight: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {field.label}
    </div>
    <div style={{ padding: '10px 14px' }}>
      <DiffHighlighter value={field.value_b} match={field.match} side="b" />
    </div>
  </div>
);

const FieldsSection: React.FC<{
  title?: string;
  fields: ComparisonField[];
  indent?: boolean;
}> = ({ title, fields, indent }) => (
  <div style={{ marginLeft: indent ? 24 : 0 }}>
    {title && (
      <div
        style={{
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          color: '#B8B8B8',
          fontSize: 13,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {title}
      </div>
    )}
    {fields.map((field, idx) => (
      <FieldRow key={`${field.field_name}-${idx}`} field={field} />
    ))}
  </div>
);

const ComparisonTable: React.FC<ComparisonTableProps> = ({ result }) => {
  return (
    <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 0,
          background: '#151515',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            padding: '14px',
            color: '#F2F2F2',
            fontWeight: 700,
            fontSize: 14,
            textAlign: 'center',
          }}
        >
          {result.entity_a_name}
        </div>
        <div
          style={{
            padding: '14px',
            color: '#7A7A7A',
            fontWeight: 600,
            fontSize: 12,
            textAlign: 'center',
            minWidth: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderLeft: '1px solid rgba(255,255,255,0.04)',
            borderRight: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          Field
        </div>
        <div
          style={{
            padding: '14px',
            color: '#F2F2F2',
            fontWeight: 700,
            fontSize: 14,
            textAlign: 'center',
          }}
        >
          {result.entity_b_name}
        </div>
      </div>

      {/* Main fields */}
      <FieldsSection fields={result.fields} />

      {/* Nested comparisons */}
      {result.nested_comparisons &&
        Object.entries(result.nested_comparisons).map(([key, fields]) => (
          <FieldsSection
            key={key}
            title={key.charAt(0).toUpperCase() + key.slice(1)}
            fields={fields}
            indent
          />
        ))}

      {/* Summary footer */}
      <div
        style={{
          padding: '14px',
          background: '#151515',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          fontSize: 13,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#4F7A63',
            }}
          />
          <span style={{ color: '#F2F2F2', fontWeight: 600 }}>
            {result.match_count}
          </span>
          <span style={{ color: '#7A7A7A' }}>matches</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#8A5C3C',
            }}
          />
          <span style={{ color: '#F2F2F2', fontWeight: 600 }}>
            {result.diff_count}
          </span>
          <span style={{ color: '#7A7A7A' }}>differences</span>
        </span>
      </div>
    </GlassCard>
  );
};

export default ComparisonTable;