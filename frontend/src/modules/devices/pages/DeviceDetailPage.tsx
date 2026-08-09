import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tag, Table, Select, Input, message } from 'antd'
import { EditOutlined, DeleteOutlined, SwapOutlined } from '@ant-design/icons'
import PageHeader from '@/shared/components/PageHeader'
import ShareButton from '@/shared/components/ShareButton'
import GlassCard from '@/shared/components/GlassCard'
import GlassButton from '@/shared/components/GlassButton'
import GlassModal from '@/shared/components/GlassModal'
import StatusBadge from '@/shared/components/StatusBadge'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import DeviceForm from '../components/DeviceForm'
import {
  useDevice,
  useDeviceStatusHistory,
  useDeleteDevice,
  useChangeDeviceStatus,
} from '../hooks/useDevices'
import { getDeviceTypeColor } from '@/shared/utils/colors'
import { formatDateTime } from '@/shared/utils/formatters'
import type { ColumnsType } from 'antd/es/table'
import type { DeviceStatusHistory as DSH } from '@/shared/types/devices'

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: device, isLoading } = useDevice(id || '')
  const { data: statusHistory } = useDeviceStatusHistory(id || '')
  const deleteDevice = useDeleteDevice()
  const changeStatus = useChangeDeviceStatus()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusReason, setStatusReason] = useState('')

  if (isLoading) return <LoadingSpinner text="Loading device..." />
  if (!device) return <div style={{ color: 'var(--text-secondary)', padding: 40 }}>Device not found</div>

  const confirmDelete = async () => {
    try {
      await deleteDevice.mutateAsync(device.id)
      message.success('Device deleted')
      navigate('/devices')
    } catch {
      message.error('Failed to delete device')
    }
    setDeleteOpen(false)
  }

  const handleStatusChange = async () => {
    if (!newStatus) return
    try {
      await changeStatus.mutateAsync({
        id: device.id,
        data: { status: newStatus, reason: statusReason || null },
      })
      message.success('Status changed')
      setStatusModalOpen(false)
      setNewStatus('')
      setStatusReason('')
    } catch {
      message.error('Failed to change status')
    }
  }

  const openStatusModal = () => {
    setNewStatus(device.status)
    setStatusReason('')
    setStatusModalOpen(true)
  }

  const historyColumns: ColumnsType<DSH> = [
    {
      title: 'Date',
      dataIndex: 'changed_at',
      key: 'changed_at',
      render: (val: string) => (
        <span style={{ color: 'var(--text-secondary)' }}>{formatDateTime(val)}</span>
      ),
    },
    {
      title: 'Change',
      key: 'change',
      render: (_: unknown, record: DSH) => (
        <span>
          <StatusBadge status={record.old_status} /> → <StatusBadge status={record.new_status} />
        </span>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (val: string | null) => (
        <span style={{ color: 'var(--text-secondary)' }}>{val || '—'}</span>
      ),
    },
  ]

  const infoItems = [
    { label: 'Serial Number', value: device.serial_number },
    { label: 'Device Type', value: device.device_type },
    { label: 'Status', value: device.status },
    { label: 'Couple', value: device.couple_id || 'Unassigned' },
    { label: 'Handling Person', value: device.handling_person_id || 'None' },
    { label: 'Created', value: formatDateTime(device.created_at) },
    { label: 'Updated', value: device.updated_at ? formatDateTime(device.updated_at) : '—' },
    { label: 'Notes', value: device.notes || '—' },
  ]

  return (
    <div>
      <PageHeader
        title={device.serial_number}
        breadcrumbs={[
          { label: 'Devices', path: '/devices' },
          { label: device.serial_number },
        ]}
        actions={
          <>
            <ShareButton
              title={`Device ${device.serial_number} (${device.device_type}) — ${device.status}`}
              url={`/devices/${device.id}`}
            />
            <GlassButton icon={<SwapOutlined />} onClick={openStatusModal}>
              Change Status
            </GlassButton>
            <GlassButton icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
              Edit
            </GlassButton>
            <GlassButton
              icon={<DeleteOutlined />}
              onClick={() => setDeleteOpen(true)}
              style={{ borderColor: 'var(--status-faulty)', color: 'var(--status-faulty)' }}
            >
              Delete
            </GlassButton>
          </>
        }
      />

      <GlassCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
            {device.serial_number}
          </span>
          <StatusBadge status={device.status} />
          <Tag color={getDeviceTypeColor(device.device_type)} style={{ borderRadius: 6 }}>
            {device.device_type}
          </Tag>
        </div>
      </GlassCard>

      <GlassCard title="Device Information" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: 16,
          }}
        >
          {infoItems.map((item) => (
            <div key={item.label}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ color: 'var(--text-primary)', fontSize: 14 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {device.custom_fields && Object.keys(device.custom_fields).length > 0 && (
        <GlassCard title="Custom Fields" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 16,
            }}
          >
            {Object.entries(device.custom_fields).map(([key, value]) => (
              <div key={key}>
                <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>
                  {key}
                </div>
                <div style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                  {String(value)}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard title="Status History">
        <Table<DSH>
          columns={historyColumns}
          dataSource={statusHistory ?? []}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: <span style={{ color: '#666' }}>No status changes recorded</span> }}
          style={{ background: 'transparent' }}
        />
      </GlassCard>

      <DeviceForm open={editOpen} onClose={() => setEditOpen(false)} device={device} />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Device"
        message={`Are you sure you want to delete "${device.serial_number}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
        loading={deleteDevice.isPending}
      />

      <GlassModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Change Device Status"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <GlassButton onClick={() => setStatusModalOpen(false)}>Cancel</GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleStatusChange}
              loading={changeStatus.isPending}
            >
              Change Status
            </GlassButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>New Status</div>
            <Select
              value={newStatus}
              onChange={(val) => setNewStatus(val)}
              style={{ width: '100%' }}
              options={[
                { label: 'Working', value: 'WORKING' },
                { label: 'Not Working', value: 'NOT_WORKING' },
                { label: 'Faulty', value: 'FAULTY' },
              ]}
            />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>Reason (optional)</div>
            <Input.TextArea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              rows={3}
              placeholder="Reason for status change..."
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-primary)',
                borderRadius: 8,
              }}
            />
          </div>
        </div>
      </GlassModal>
    </div>
  )
}