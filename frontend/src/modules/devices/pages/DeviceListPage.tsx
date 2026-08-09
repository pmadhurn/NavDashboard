import { useState, useCallback } from 'react'
import { Select, message } from 'antd'
import { PlusOutlined, DatabaseOutlined } from '@ant-design/icons'
import PageHeader from '@/shared/components/PageHeader'
import GlassCard from '@/shared/components/GlassCard'
import GlassButton from '@/shared/components/GlassButton'
import GlassInput from '@/shared/components/GlassInput'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import DeviceTable from '../components/DeviceTable'
import DeviceForm from '../components/DeviceForm'
import { useDevices, useDeleteDevice, useSeedDevices } from '../hooks/useDevices'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useAuthStore } from '@/shared/stores/authStore'
import type { Device } from '@/shared/types/devices'

export default function DeviceListPage() {
  const user = useAuthStore((s) => s.user)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [deviceType, setDeviceType] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const [formOpen, setFormOpen] = useState(false)
  const [editDevice, setEditDevice] = useState<Device | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null)

  const filters: Record<string, unknown> = { page, size: pageSize }
  if (deviceType) filters.device_type = deviceType
  if (status) filters.status = status
  if (debouncedSearch) filters.serial_number__contains = debouncedSearch

  const { data, isLoading } = useDevices(filters)
  const deleteDevice = useDeleteDevice()
  const seedDevices = useSeedDevices()

  const handlePageChange = useCallback((p: number, s: number) => {
    setPage(p)
    setPageSize(s)
  }, [])

  const handleEdit = useCallback((device: Device) => {
    setEditDevice(device)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback((device: Device) => {
    setDeleteTarget(device)
  }, [])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteDevice.mutateAsync(deleteTarget.id)
      message.success('Device deleted')
    } catch {
      message.error('Failed to delete device')
    }
    setDeleteTarget(null)
  }

  const handleSeed = async () => {
    try {
      const result = await seedDevices.mutateAsync()
      if (Array.isArray(result) && result.length > 0) {
        message.success(`Seeded ${result.length} devices`)
      } else {
        message.info('Devices already exist, skipping seed')
      }
    } catch {
      message.error('Seed failed')
    }
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditDevice(null)
  }

  const handleAddClick = () => {
    setEditDevice(null)
    setFormOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Devices"
        subtitle={`${data?.total ?? 0} total devices`}
        actions={
          <>
            {user?.role === 'ADMIN' && (
              <GlassButton
                icon={<DatabaseOutlined />}
                onClick={handleSeed}
                loading={seedDevices.isPending}
              >
                Seed Devices
              </GlassButton>
            )}
            <GlassButton
              variant="primary"
              icon={<PlusOutlined />}
              onClick={handleAddClick}
            >
              Add Device
            </GlassButton>
          </>
        }
      />

      <GlassCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Select
            placeholder="Device Type"
            allowClear
            value={deviceType}
            onChange={(val) => {
              setDeviceType(val)
              setPage(1)
            }}
            style={{ width: 160 }}
            options={[
              { label: 'IU', value: 'IU' },
              { label: 'OU', value: 'OU' },
              { label: 'HC', value: 'HC' },
              { label: 'RF', value: 'RF' },
            ]}
          />
          <Select
            placeholder="Status"
            allowClear
            value={status}
            onChange={(val) => {
              setStatus(val)
              setPage(1)
            }}
            style={{ width: 160 }}
            options={[
              { label: 'Working', value: 'WORKING' },
              { label: 'Not Working', value: 'NOT_WORKING' },
              { label: 'Faulty', value: 'FAULTY' },
            ]}
          />
          <GlassInput
            placeholder="Search serial number..."
            value={search}
            onChange={(val) => {
              setSearch(val)
              setPage(1)
            }}
            style={{ width: 250 }}
          />
        </div>
      </GlassCard>

      <GlassCard>
        <DeviceTable
          data={data?.items ?? []}
          loading={isLoading}
          pagination={{
            current: data?.page ?? 1,
            pageSize: data?.size ?? pageSize,
            total: data?.total ?? 0,
          }}
          onPageChange={handlePageChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </GlassCard>

      <DeviceForm
        open={formOpen}
        onClose={handleFormClose}
        device={editDevice}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Device"
        message={`Are you sure you want to delete device "${deleteTarget?.serial_number}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteDevice.isPending}
      />
    </div>
  )
}