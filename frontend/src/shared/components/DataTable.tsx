import React from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';

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
}: DataTableProps<T>) {
  if (loading && data.length === 0) {
    return <LoadingSpinner text="Loading data..." />;
  }

  return (
    <Table<T>
      columns={columns}
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