import React from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

interface DataTableProps<T> {
  columns: ColumnsType<T>;
  data: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  onRowClick?: (record: T) => void;
  selectedRowKeys?: React.Key[];
  onSelectionChange?: (keys: React.Key[]) => void;
  emptyText?: string;
  rowKey?: string | ((record: T) => string);
  /**
   * Which column carries the row's identity. On a phone the table becomes a
   * list of cards and this is the card's heading; without it the first column
   * is used, which is right often enough to be a sensible default.
   */
  titleKey?: string;
}

export default function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  pagination,
  onRowClick,
  selectedRowKeys,
  onSelectionChange,
  emptyText = 'No data available',
  rowKey = 'id',
  titleKey,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();

  if (loading && data.length === 0) {
    return <LoadingSpinner text="Loading data..." />;
  }

  // Columns can opt out of small screens with `className: 'hide-on-mobile'`.
  const visibleColumns = isMobile
    ? columns.filter((col) => col.className !== 'hide-on-mobile')
    : columns;

  /**
   * Below 768px a table becomes a list of cards.
   *
   * A horizontally-scrolling table technically fits, but reading one on a
   * phone means scrolling right to find the column you want and losing the row
   * you were on. A card keeps every field of one record together, which is how
   * people actually read them.
   */
  if (isMobile && data.length > 0) {
    const keyOf = (record: T, index: number): string =>
      typeof rowKey === 'function'
        ? rowKey(record)
        : String((record as Record<string, unknown>)[rowKey] ?? index);

    const cellFor = (col: (typeof visibleColumns)[number], record: T, index: number) => {
      const dataIndex = (col as { dataIndex?: string }).dataIndex;
      const raw = dataIndex ? (record as Record<string, unknown>)[dataIndex] : undefined;
      const render = (col as { render?: (v: unknown, r: T, i: number) => React.ReactNode }).render;
      return render ? render(raw, record, index) : (raw as React.ReactNode);
    };

    type Col = (typeof visibleColumns)[number];
    const [titleCol, ...restCols]: (Col | undefined)[] = titleKey
      ? [
          visibleColumns.find(
            (c) => (c as { dataIndex?: string }).dataIndex === titleKey
          ) ?? visibleColumns[0],
          ...visibleColumns.filter(
            (c) => (c as { dataIndex?: string }).dataIndex !== titleKey
          ),
        ]
      : visibleColumns;
    const bodyCols = restCols.filter((c): c is Col => Boolean(c));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((record, index) => (
          <div
            key={keyOf(record, index)}
            onClick={onRowClick ? () => onRowClick(record) : undefined}
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'var(--overlay-subtle)',
              border: '1px solid var(--overlay-subtle)',
              cursor: onRowClick ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              {titleCol ? cellFor(titleCol, record, index) : null}
            </div>
            {bodyCols.map((col, ci) => {
              const value = cellFor(col, record, index);
              if (value === null || value === undefined || value === '') return null;
              return (
                <div
                  key={ci}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    {String(col.title ?? '')}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', textAlign: 'right', minWidth: 0 }}>
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
        {pagination && pagination.total > pagination.pageSize && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
            <Table<T>
              columns={[]}
              dataSource={[]}
              rowKey={rowKey}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onChange: pagination.onChange,
                simple: true,
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <Table<T>
      columns={visibleColumns}
      scroll={isMobile ? { x: 'max-content' } : undefined}
      size={isMobile ? 'small' : undefined}
      dataSource={data}
      loading={loading}
      rowKey={rowKey}
      locale={{
        emptyText: <EmptyState title={emptyText} />,
      }}
      pagination={
        pagination
          ? {
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: pagination.onChange,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} items`,
            }
          : false
      }
      onRow={
        onRowClick
          ? (record) => ({
              onClick: () => onRowClick(record),
              style: { cursor: 'pointer' },
            })
          : undefined
      }
      rowSelection={
        onSelectionChange
          ? {
              selectedRowKeys,
              onChange: (keys) => onSelectionChange(keys),
            }
          : undefined
      }
      style={{ background: 'transparent' }}
    />
  );
}