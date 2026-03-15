import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag, message } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import DataTable from '@/shared/components/DataTable'
import StatusBadge from '@/shared/components/StatusBadge'
import GlassButton from '@/shared/components/GlassButton'
import { useDeletePair } from '../hooks/usePairs'
import type { Pair } from '@/shared/types/pairs'

interface PairTableProps {
  pairs: Pair[]
  loading: boolean
  onEdit: (pair: Pair) => void
  pagination?: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default function PairTable({ pairs, loading, onEdit, pagination }: PairTableProps) {
  const navigate = useNavigate()
  const deleteMutation = useDeletePair()

  const handleDelete = (pair: Pair, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    deleteMutation.mutate(pair.id, {
      onSuccess: () => {
        message.success(`Pair "${pair.name}" deleted`)
      },
      onError: () => {
        message.error('Failed to delete pair')
      },
    })
  }

  const columns: ColumnsType<Pair> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span style={{ color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          {name}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (_: string, record: Pair) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusBadge status={record.status as 'WORKING' | 'NOT_WORKING' | 'FAULTY'} size="sm" />
          <Tag
            color={record.status_override ? 'orange' : 'cyan'}
            style={{ fontSize: 10, lineHeight: '16px', padding: '0 5px', margin: 0 }}
          >
            {record.status_override ? 'Manual' : 'Auto'}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Couple A',
      key: 'coupleA',
      width: 180,
      render: (_: unknown, record: Pair) => {
        const couple = record.couples[0]
        if (!couple) return <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: couple.status_color || '#888',
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
              {couple.name}
            </span>
          </div>
        )
      },
    },
    {
      title: 'Couple B',
      key: 'coupleB',
      width: 180,
      render: (_: unknown, record: Pair) => {
        const couple = record.couples[1]
        if (!couple) return <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: couple.status_color || '#888',
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
              {couple.name}
            </span>
          </div>
        )
      },
    },
    {
      title: 'Person',
      dataIndex: 'handling_person_name',
      key: 'person',
      width: 150,
      render: (name: string | null) => (
        <span style={{ color: name ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}>
          {name ?? '—'}
        </span>
      ),
    },
    {
      title: 'Updated',
      key: 'updated',
      width: 160,
      render: (_: unknown, record: Pair) => (
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          {formatDateTime(record.updated_at ?? record.created_at)}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Pair) => (
        <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          <GlassButton
            variant="ghost"
            size="sm"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            Edit
          </GlassButton>
          <GlassButton
            variant="danger"
            size="sm"
            icon={<DeleteOutlined />}
            onClick={(e) => handleDelete(record, e as unknown as React.MouseEvent)}
          >
            Delete
          </GlassButton>
        </div>
      ),
    },
  ]

  return (
    <DataTable<Pair>
      columns={columns}
      data={pairs}
      loading={loading}
      rowKey="id"
      onRowClick={(record) => navigate(`/pairs/${record.id}`)}
      pagination={pagination}
      emptyText="No pairs found"
    />
  )
}