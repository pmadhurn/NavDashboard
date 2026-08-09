import { Dropdown } from 'antd'
import { EditOutlined, DeleteOutlined, EllipsisOutlined } from '@ant-design/icons'
import DataTable from '@/shared/components/DataTable'
import GlassButton from '@/shared/components/GlassButton'
import type { Person } from '@/shared/types/personnel'

interface PersonnelTableProps {
  data: Person[]
  loading: boolean
  pagination: {
    current: number
    pageSize: number
    total: number
  }
  onPageChange: (page: number, size: number) => void
  onEdit: (person: Person) => void
  onDelete: (person: Person) => void
}

export default function PersonnelTable({
  data,
  loading,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
}: PersonnelTableProps) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (text: string) => (
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (text: string) => (
        <span style={{ color: '#E0E0E0' }}>{text}</span>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_: unknown, record: Person) => (
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {record.email && <span>{record.email}</span>}
          {record.phone && <span>{record.phone}</span>}
        </div>
      ),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (text: string) => (
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {text && text.length > 50 ? `${text.substring(0, 50)}...` : text || '—'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'action',
      width: 80,
      render: (_: unknown, record: Person) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined />,
                onClick: () => onEdit(record),
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => onDelete(record),
              },
            ],
          }}
        >
          <GlassButton
            variant="ghost"
            icon={<EllipsisOutlined />}
            style={{ color: 'var(--text-secondary)', padding: '4px 8px' }}
          />
        </Dropdown>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={data}
      rowKey="id"
      loading={loading}
      pagination={{
        ...pagination,
        onChange: onPageChange,
      }}
    />
  )
}
