import { useState, useCallback } from 'react'
import { Select, message } from 'antd'
import { PlusOutlined, DatabaseOutlined, UserOutlined, LinkOutlined } from '@ant-design/icons'
import PageHeader from '@/shared/components/PageHeader'
import GlassCard from '@/shared/components/GlassCard'
import GlassButton from '@/shared/components/GlassButton'
import GlassInput from '@/shared/components/GlassInput'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import PersonnelTable from '../components/PersonnelTable'
import PersonnelForm from '../components/PersonnelForm'
import {
  usePersonnelList,
  useDeletePerson,
  useSeedPersonnel,
  useBackfillPersonLinks,
} from '../hooks/usePersonnel'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useAuthStore } from '@/shared/stores/authStore'
import type { Person } from '@/shared/types/personnel'

export default function PersonnelListPage() {
  const user = useAuthStore((s) => s.user)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [role, setRole] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const [formOpen, setFormOpen] = useState(false)
  const [editPerson, setEditPerson] = useState<Person | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null)

  const filters: Record<string, unknown> = { page, size: pageSize }
  if (role) filters.role = role
  if (debouncedSearch) filters.full_name__contains = debouncedSearch

  const { data, isLoading } = usePersonnelList(filters)
  const deletePerson = useDeletePerson()
  const seedPersonnel = useSeedPersonnel()
  const backfillLinks = useBackfillPersonLinks()

  const handleBackfillLinks = async () => {
    try {
      const r = await backfillLinks.mutateAsync()
      message.success(
        `Linked ${r.linked} to logins (${r.already_linked} already linked, ${r.unmatched_personnel} unmatched)`
      )
    } catch {
      message.error('Link logins failed')
    }
  }

  const handlePageChange = useCallback((p: number, s: number) => {
    setPage(p)
    setPageSize(s)
  }, [])

  const handleEdit = useCallback((person: Person) => {
    setEditPerson(person)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback((person: Person) => {
    setDeleteTarget(person)
  }, [])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePerson.mutateAsync(deleteTarget.id)
      message.success('Personnel deleted')
    } catch {
      message.error('Failed to delete personnel')
    }
    setDeleteTarget(null)
  }

  const handleSeed = async () => {
    try {
      const result = await seedPersonnel.mutateAsync()
      if (Array.isArray(result) && result.length > 0) {
        message.success(`Seeded ${result.length} personnel`)
      } else {
        message.info('Personnel already exist, skipping seed')
      }
    } catch {
      message.error('Seed failed')
    }
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditPerson(null)
  }

  const handleAddClick = () => {
    setEditPerson(null)
    setFormOpen(true)
  }

  const ROLES = ['TECHNICIAN', 'ENGINEER', 'MANAGER', 'CONTRACTOR', 'OTHER']

  return (
    <div>
      <PageHeader
        title="Personnel"
        icon={<UserOutlined />}
        subtitle={`${data?.total ?? 0} total personnel`}
        actions={
          <>
            {user?.role === 'ADMIN' && (
              <>
                <GlassButton
                  icon={<LinkOutlined />}
                  onClick={handleBackfillLinks}
                  loading={backfillLinks.isPending}
                >
                  Link Logins
                </GlassButton>
                <GlassButton
                  icon={<DatabaseOutlined />}
                  onClick={handleSeed}
                  loading={seedPersonnel.isPending}
                >
                  Seed Personnel
                </GlassButton>
              </>
            )}
            <GlassButton
              variant="primary"
              icon={<PlusOutlined />}
              onClick={handleAddClick}
            >
              Add Personnel
            </GlassButton>
          </>
        }
      />

      <GlassCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Select
            placeholder="Role"
            allowClear
            value={role}
            onChange={(val) => {
              setRole(val)
              setPage(1)
            }}
            style={{ width: 160 }}
            options={ROLES.map(r => ({ label: r, value: r }))}
          />
          <GlassInput
            placeholder="Search name..."
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
        <PersonnelTable
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

      <PersonnelForm
        open={formOpen}
        onClose={handleFormClose}
        person={editPerson}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Personnel"
        message={`Are you sure you want to delete "${deleteTarget?.full_name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
        loading={deletePerson.isPending}
      />
    </div>
  )
}
