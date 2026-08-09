import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tag, message } from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  SwapOutlined,
  WifiOutlined,
  ToolOutlined,
  EnvironmentOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import PageHeader from '@/shared/components/PageHeader'
import ShareButton from '@/shared/components/ShareButton'
import GlassCard from '@/shared/components/GlassCard'
import GlassButton from '@/shared/components/GlassButton'
import StatusBadge from '@/shared/components/StatusBadge'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import PairForm from '../components/PairForm'
import { usePair, useDeletePair } from '../hooks/usePairs'
import type { Couple } from '@/shared/types/couples'

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function CoupleColumn({ couple, side }: { couple: Couple; side: string }) {
  const navigate = useNavigate()

  return (
    <GlassCard
      style={{ flex: 1 }}
      accentColor={couple.status_color || '#888'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <LinkOutlined style={{ color: 'rgba(255,255,255,0.5)' }} />
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase' }}>
          {side}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h3 style={{ color: '#fff', margin: 0, fontSize: 18 }}>{couple.name}</h3>
        <StatusBadge status={couple.status as 'WORKING' | 'NOT_WORKING' | 'FAULTY'} />
        {couple.has_rf && (
          <Tag color="blue" icon={<WifiOutlined />}>RF</Tag>
        )}
      </div>

      {/* Devices */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8, textTransform: 'uppercase' }}>
          Devices ({couple.devices.length})
        </div>
        {couple.devices.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No devices</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {couple.devices.map((device) => (
              <div
                key={device.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255,255,255,0.04)',
                  padding: '6px 10px',
                  borderRadius: 6,
                }}
              >
                <span style={{ color: '#fff', fontSize: 13, fontFamily: 'monospace' }}>
                  {device.serial_number}
                </span>
                <Tag
                  style={{
                    fontSize: 10,
                    lineHeight: '16px',
                    padding: '0 6px',
                    margin: 0,
                  }}
                  color="blue"
                >
                  {device.device_type}
                </Tag>
                <StatusBadge status={device.status as 'WORKING' | 'NOT_WORKING' | 'FAULTY'} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Materials */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8, textTransform: 'uppercase' }}>
          <ToolOutlined /> Materials ({couple.materials.length})
        </div>
        {couple.materials.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No materials</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {couple.materials.map((mat) => (
              <div key={mat.id} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                {mat.name} × {mat.quantity}{mat.unit ? ` ${mat.unit}` : ''}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Location */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8, textTransform: 'uppercase' }}>
          <EnvironmentOutlined /> Location
        </div>
        {couple.location ? (
          <div>
            <div style={{ color: '#fff', fontSize: 13 }}>
              {couple.location.latitude.toFixed(4)}, {couple.location.longitude.toFixed(4)}
            </div>
            {couple.location.address_note && (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                {couple.location.address_note}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No location set</div>
        )}
      </div>

      <GlassButton
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/couples/${couple.id}`)}
      >
        View Detail →
      </GlassButton>
    </GlassCard>
  )
}

export default function PairDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: pair, isLoading } = usePair(id ?? '')
  const deleteMutation = useDeletePair()

  const [formOpen, setFormOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleDelete = useCallback(() => {
    if (!id) return
    deleteMutation.mutate(id, {
      onSuccess: () => {
        message.success('Pair deleted')
        navigate('/pairs')
      },
      onError: () => {
        message.error('Failed to delete pair')
      },
    })
  }, [id, deleteMutation, navigate])

  if (isLoading) {
    return <LoadingSpinner text="Loading pair..." fullPage />
  }

  if (!pair) {
    return (
      <div style={{ color: '#fff', textAlign: 'center', marginTop: 80 }}>
        Pair not found
      </div>
    )
  }

  const coupleA = pair.couples[0] ?? null
  const coupleB = pair.couples[1] ?? null

  return (
    <div>
      <PageHeader
        title={pair.name}
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Pairs', path: '/pairs' },
          { label: pair.name },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ShareButton title={`Pair ${pair.name} — ${pair.status}`} url={`/pairs/${pair.id}`} />
            <GlassButton icon={<EditOutlined />} variant="ghost" onClick={() => setFormOpen(true)}>
              Edit
            </GlassButton>
            <GlassButton icon={<DeleteOutlined />} variant="danger" onClick={() => setConfirmOpen(true)}>
              Delete
            </GlassButton>
          </div>
        }
      />

      {/* Top Info Bar */}
      <GlassCard style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SwapOutlined style={{ color: pair.status_color, fontSize: 20 }} />
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>{pair.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={pair.status as 'WORKING' | 'NOT_WORKING' | 'FAULTY'} />
            <Tag
              color={pair.status_override ? 'orange' : 'cyan'}
              style={{ fontSize: 11 }}
            >
              {pair.status_override ? 'Manual' : 'Auto'}
            </Tag>
          </div>

          {pair.handling_person_name && (
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              Handled by: <span style={{ color: '#fff' }}>{pair.handling_person_name}</span>
            </div>
          )}

          <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            Created: {formatDateTime(pair.created_at)} · Updated: {formatDateTime(pair.updated_at)}
          </div>
        </div>

        {pair.notes && (
          <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            {pair.notes}
          </div>
        )}
      </GlassCard>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {coupleA && <CoupleColumn couple={coupleA} side="Couple A" />}
        {coupleB && <CoupleColumn couple={coupleB} side="Couple B" />}
      </div>

      <PairForm open={formOpen} onClose={() => setFormOpen(false)} pair={pair} />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Pair"
        message={`Delete "${pair.name}"? The couples will NOT be deleted — they will become unassigned.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  )
}