import { Tag, Button, Space, Tooltip } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import DataTable from '@/shared/components/DataTable'
import StatusBadge from '@/shared/components/StatusBadge'
import { formatDateTime } from '@/shared/utils/formatters'
import { getDeviceTypeColor } from '@/shared/utils/colors'
import type { Device } from '@/shared/types/devices'

interface DeviceTableProps {
  data: Device[]
  loading: boolean
  pagination: { current: number; pageSize: number; total: number }
  onPageChange: (page: number, pageSize: number) => void
  onEdit: (device: Device) => void
  onDelete: (device: Device) => void
}

export default function DeviceTable({
  data,
  loading,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
}: DeviceTableProps) {
  const navigate = useNavigate()

  const columns: ColumnsType<Device> = [
    {
      title: 'Serial Number',
      dataIndex: 'serial_number',
      key: 'serial_number',
      render: (text: string, record: Device) => (
        <div
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/devices/${record.id}`)
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{text}</span>
          {record.device_model_name && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
              {record.device_model_name}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'device_type',
      key: 'device_type',
      width: 100,
      render: (type: string) => (
        <Tag color={getDeviceTypeColor(type)} style={{ borderRadius: 6 }}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: 'Couple',
      dataIndex: 'couple_id',
      key: 'couple_id',
      width: 140,
      render: (val: string | null) => (
        <span style={{ color: val ? 'var(--text-primary)' : '#666' }}>
          {val ? val.slice(0, 8) + '...' : 'Unassigned'}
        </span>
      ),
    },
    {
      title: 'Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (val: string | null) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {val ? formatDateTime(val) : '—'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Device) => (
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
              style={{ color: 'var(--text-secondary)' }}
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
              style={{ color: 'var(--status-faulty)' }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <DataTable<Device>
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
      onRowClick={(record) => navigate(`/devices/${record.id}`)}
      emptyText="No devices found"
    />
  )
}