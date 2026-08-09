import React from 'react';

interface DiffHighlighterProps {
  value: any;
  match: boolean;
  side: 'a' | 'b';
}

const DiffHighlighter: React.FC<DiffHighlighterProps> = ({
  value,
  match,
}) => {
  const bgColor = match
    ? 'rgba(79, 122, 99, 0.15)'
    : 'rgba(138, 92, 60, 0.15)';

  if (value === null || value === undefined) {
    return (
      <span
        style={{
          color: 'var(--text-muted)',
          fontStyle: 'italic',
          fontSize: 13,
        }}
      >
        —
      </span>
    );
  }

  if (typeof value === 'object') {
    const formatted = JSON.stringify(value, null, 2);
    return (
      <pre
        style={{
          background: bgColor,
          color: 'var(--text-primary)',
          padding: '6px 10px',
          borderRadius: 4,
          fontSize: 12,
          fontFamily: 'monospace',
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: 200,
          overflow: 'auto',
        }}
      >
        {formatted}
      </pre>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <span
        style={{
          background: bgColor,
          color: 'var(--text-primary)',
          padding: '4px 10px',
          borderRadius: 4,
          fontSize: 13,
          display: 'inline-block',
        }}
      >
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  return (
    <span
      style={{
        background: bgColor,
        color: 'var(--text-primary)',
        padding: '4px 10px',
        borderRadius: 4,
        fontSize: 13,
        display: 'inline-block',
        wordBreak: 'break-all',
      }}
    >
      {String(value)}
    </span>
  );
};

export default DiffHighlighter;