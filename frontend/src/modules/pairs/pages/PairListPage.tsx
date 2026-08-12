import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Input } from 'antd'
import {
  PlusOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import PageHeader from '@/shared/components/PageHeader'
import GlassButton from '@/shared/components/GlassButton'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import EmptyState from '@/shared/components/EmptyState'
import { usePairs } from '../hooks/usePairs'
import PairCard from '../components/PairCard'
import PairTable from '../components/PairTable'
import PairForm from '../components/PairForm'
import { useDebounce } from '@/shared/hooks/useDebounce'
import type { Pair } from '@/shared/types/pairs'

export default function PairListPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [page, setPage] = useState(1)
  const [size] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [nameSearch, setNameSearch] = useState('')
  const debouncedSearch = useDebounce(nameSearch, 400)
  const [formOpen, setFormOpen] = useState(false)
  const [editingPair, setEditingPair] = useState<Pair | null>(null)

  const filters: Record<string, unknown> = { page, size }
  if (statusFilter) filters.status = statusFilter
  if (debouncedSearch) filters['name__contains'] = debouncedSearch

  const { data, isLoading } = usePairs(filters)

  const handleEdit = useCallback((pair: Pair) => {
    setEditingPair(pair)
    setFormOpen(true)
  }, [])

  const handleCreate = useCallback(() => {
    setEditingPair(null)
    setFormOpen(true)
  }, [])

  const handleFormClose = useCallback(() => {
    setFormOpen(false)
    setEditingPair(null)
  }, [])

  const items = data?.items ?? []

  return (
    <div>
      <PageHeader
        title="Links"
        subtitle={`${data?.total ?? 0} links total`}
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Links' }]}
        actions={
          <GlassButton icon={<PlusOutlined />} variant="primary" onClick={handleCreate}>
            Add Link
          </GlassButton>
        }
      />

      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 24,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Input
          placeholder="Search links..."
          value={nameSearch}
          onChange={(e) => {
            setNameSearch(e.target.value)
            setPage(1)
          }}
          style={{
            width: 240,
            background: 'rgba(255,255,255,0.06)',
            borderColor: 'rgba(255,255,255,0.12)',
            color: '#fff',
          }}
          allowClear
        />
        <Select
          placeholder="Status"
          value={statusFilter}
          onChange={(val) => {
            setStatusFilter(val)
            setPage(1)
          }}
          allowClear
          style={{ width: 160 }}
          options={[
            { label: 'Working', value: 'WORKING' },
            { label: 'Not Working', value: 'NOT_WORKING' },
            { label: 'Faulty', value: 'FAULTY' },
          ]}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <GlassButton
            variant={viewMode === 'card' ? 'primary' : 'ghost'}
            size="sm"
            icon={<AppstoreOutlined />}
            onClick={() => setViewMode('card')}
          >
            Cards
          </GlassButton>
          <GlassButton
            variant={viewMode === 'table' ? 'primary' : 'ghost'}
            size="sm"
            icon={<UnorderedListOutlined />}
            onClick={() => setViewMode('table')}
          >
            Table
          </GlassButton>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner text="Loading links..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<SwapOutlined style={{ fontSize: 48 }} />}
          title="No links found"
          description="Create a link to connect two couples together."
          action={
            <GlassButton variant="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Add Link
            </GlassButton>
          }
        />
      ) : viewMode === 'card' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(480, 1fr))',
            gap: 20,
          }}
        >
          {items.map((pair) => (
            <PairCard
              key={pair.id}
              pair={pair}
              onClick={() => navigate(`/pairs/${pair.id}`)}
              onEdit={() => handleEdit(pair)}
            />
          ))}
        </div>
      ) : (
        <PairTable
          pairs={items}
          loading={false}
          onEdit={handleEdit}
          pagination={{
            current: data?.page ?? 1,
            pageSize: data?.size ?? size,
            total: data?.total ?? 0,
            onChange: (p) => {
              setPage(p)
            },
          }}
        />
      )}

      <PairForm open={formOpen} onClose={handleFormClose} pair={editingPair} />
    </div>
  )
}