import { useState, useCallback } from 'react'
import { Select, Switch, message } from 'antd'
import {
  PlusOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import PageHeader from '@/shared/components/PageHeader'
import GlassCard from '@/shared/components/GlassCard'
import GlassButton from '@/shared/components/GlassButton'
import GlassInput from '@/shared/components/GlassInput'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import CoupleCard from '../components/CoupleCard'
import CoupleTable from '../components/CoupleTable'
import CoupleForm from '../components/CoupleForm'
import { useCouples, useDeleteCouple, useSeedCouples } from '../hooks/useCouples'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useAuthStore } from '@/shared/stores/authStore'
import type { Couple } from '@/shared/types/couples'

export default function CoupleListPage() {
  const user = useAuthStore((s) => s.user)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [hasRf, setHasRf] = useState<boolean | undefined>(undefined)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const [formOpen, setFormOpen] = useState(false)
  const [editCouple, setEditCouple] = useState<Couple | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Couple | null>(null)

  const filters: Record<string, unknown> = { page, size: pageSize }
  if (status) filters.status = status
  if (hasRf !== undefined) filters.has_rf = hasRf
  if (debouncedSearch) filters.name__contains = debouncedSearch

  const { data, isLoading } = useCouples(filters)
  const deleteCouple = useDeleteCouple()
  const seedCouples = useSeedCouples()

  const handlePageChange = useCallback((p: number, s: number) => {
    setPage(p)
    setPageSize(s)
  }, [])

  const handleEdit = useCallback((couple: Couple) => {
    setEditCouple(couple)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback((couple: Couple) => {
    setDeleteTarget(couple)
  }, [])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteCouple.mutateAsync(deleteTarget.id)
      message.success('Couple deleted')
    } catch {
      message.error('Failed to delete couple')
    }
    setDeleteTarget(null)
  }

  const handleSeed = async () => {
    try {
      const result = await seedCouples.mutateAsync()
      if (Array.isArray(result) && result.length > 0) {
        message.success(`Seeded ${result.length} couples`)
      } else {
        message.info('Couples already exist, skipping seed')
      }
    } catch {
      message.error('Seed failed')
    }
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditCouple(null)
  }

  const handleAddClick = () => {
    setEditCouple(null)
    setFormOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="Couples"
        subtitle={`${data?.total ?? 0} total couples`}
        actions={
          <>
            <GlassButton
              variant="ghost"
              icon={viewMode === 'cards' ? <UnorderedListOutlined /> : <AppstoreOutlined />}
              onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
            >
              {viewMode === 'cards' ? 'Table' : 'Cards'}
            </GlassButton>
            {user?.role === 'ADMIN' && (
              <GlassButton
                variant="secondary"
                icon={<DatabaseOutlined />}
                onClick={handleSeed}
                loading={seedCouples.isPending}
              >
                Seed Couples
              </GlassButton>
            )}
            <GlassButton icon={<PlusOutlined />} onClick={handleAddClick}>
              Add Couple
            </GlassButton>
          </>
        }
      />

      <GlassCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Has RF</span>
            <Switch
              checked={hasRf === true}
              onChange={(checked) => {
                setHasRf(checked ? true : undefined)
                setPage(1)
              }}
              size="small"
            />
          </div>
          <GlassInput
            placeholder="Search by name..."
            value={search}
            onChange={(val) => {
              setSearch(val)
              setPage(1)
            }}
          />
        </div>
      </GlassCard>

      {viewMode === 'cards' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {(data?.items ?? []).map((couple) => (
            <CoupleCard key={couple.id} couple={couple} />
          ))}
        </div>
      ) : (
        <GlassCard>
          <CoupleTable
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
      )}

      <CoupleForm
        open={formOpen}
        onClose={handleFormClose}
        couple={editCouple}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Couple"
        message={`Are you sure you want to delete couple "${deleteTarget?.name}"? All device assignments will be removed.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
        loading={deleteCouple.isPending}
      />
    </div>
  )
}