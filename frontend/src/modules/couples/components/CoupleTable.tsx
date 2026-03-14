import React from 'react'
import { Button, Space, Tooltip } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import DataTable from '@/shared/components/DataTable'
import StatusBadge from '@/shared/components/StatusBadge'
import { formatDateTime, formatCoordinates } from '@/shared/utils/formatters'
import type { Couple } from '@/shared/types/couples'

interface CoupleTableProps {
  data: Couple[]
  loading: boolean
  pagination: { current: number; pageSize: number; total: number }
  onPageChange: (page: number, pageSize: number) => void
  onEdit: (couple: Couple) => void
  onDelete: (couple: Couple) => void
}

export default function CoupleTable({
  data,
  loading,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
}: CoupleTableProps) {
  const navigate = useNavigate()

  const columns: ColumnsType<Couple> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Couple) => (
        <span
          style={{ fontWeight: 600, color: '#F2F2F2', cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/couples/${record.id}`)
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => (
        <StatusBadge status={status as 'WORKING' | 'NOT_WORKING' | 'FAULTY'} />
      ),
    },
    {
      title: 'Has RF',
      dataIndex: 'has_rf',
      key: 'has_rf',
      width: 80,
      render: (val: boolean) => (
        <span style={{ color: val ? '#5F8F6B' : '#7A7A7A' }}>
          {val ? '✅' : '—'}
        </span>
      ),
    },
    {
      title: 'Devices',
      key: 'devices',
      width: 80,
      render: (_: unknown, record: Couple) => (
        <span style={{ color: '#B8B8B8' }}>{record.devices.length}</span>
      ),
    },
    {
      title: 'Person',
      key: 'person',
      width: 160,
      render: (_: unknown, record: Couple) => (
        <span style={{ color: record.handling_person_name ? '#F2F2F2' : '#666' }}>
          {record.handling_person_name || '—'}
        </span>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      width: 200,
      render: (_: unknown, record: Couple) => (
        <span style={{ color: '#B8B8B8', fontSize: 12 }}>
          {record.location
            ? formatCoordinates(record.location.latitude, record.location.longitude)
            : '—'}
        </span>
      ),
    },
    {
      title: 'Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (val: string | null) => (
        <span style={{ color: '#B8B8B8' }}>{val ? formatDateTime(val) : '—'}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Couple) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                onEdit(record)
              }}
              style={{ color: '#B8B8B8' }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                onDelete(record)
              }}
              style={{ color: '#9B3E3E' }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <DataTable<Couple>
      columns={columns}
      data={data}
      loading={loading}
      rowKey="id"
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onChange: onPageChange,
      }}
      onRowClick={(record) => navigate(`/couples/${record.id}`)}
      emptyText="No couples found"
    />
  )
}