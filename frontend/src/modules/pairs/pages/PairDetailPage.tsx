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
  CheckCircleOutlined,
  WarningOutlined,
  CompassOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import PageHeader from '@/shared/components/PageHeader'
import ShareButton from '@/shared/components/ShareButton'
import GlassCard from '@/shared/components/GlassCard'
import GlassButton from '@/shared/components/GlassButton'
import StatusBadge from '@/shared/components/StatusBadge'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import PairForm from '../components/PairForm'
import { usePair, useDeletePair, usePairComposition } from '../hooks/usePairs'
import type { CompositionSide } from '../hooks/usePairs'
import type { Couple } from '@/shared/types/couples'

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

// Render order + human names for the expected build of one side of a link.
const COMPOSITION_TYPE_ORDER = ['IU', 'OU', 'HC', 'RF', 'GYRO', 'GYRO_CTRL']
const COMPOSITION_TYPE_LABELS: Record<string, string> = {
  IU: 'Indoor Unit',
  OU: 'Outdoor Unit',
  HC: 'Hub Controller',
  RF: 'RF Module',
  GYRO: 'Gyro',
  GYRO_CTRL: 'Gyro Controller',
}

function CompositionSideCard({ side }: { side: CompositionSide }) {
  const fittedTypes = COMPOSITION_TYPE_ORDER.filter(
    (t) => (side.devices[t]?.length ?? 0) > 0
  )

  return (
    <div
      style={{
        background: 'var(--overlay-subtle)',
        borderRadius: 12,
        padding: 14,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>
          {side.couple_name}
        </span>
        {side.has_rf && <Tag color="blue" icon={<WifiOutlined />}>RF</Tag>}
        {side.has_gyro && <Tag color="purple" icon={<CompassOutlined />}>Gyro</Tag>}
      </div>

      {fittedTypes.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
          No devices fitted yet
        </div>
      )}

      {fittedTypes.map((type) => (
        <div key={type} style={{ marginBottom: 8 }}>
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 4,
            }}
          >
            {COMPOSITION_TYPE_LABELS[type] ?? type}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(side.devices[type] ?? []).map((device) => (
              <div
                key={device.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: 'var(--overlay-subtle)',
                }}
              >
                <span style={{ color: 'var(--text-primary)', fontSize: 13, fontFamily: 'monospace' }}>
                  {device.serial_number}
                </span>
                {device.model && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{device.model}</span>
                )}
                <StatusBadge status={device.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {side.missing.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {side.missing.map((m) => (
            <Tag key={m} color="orange" icon={<WarningOutlined />} style={{ margin: 0 }}>
              {/* The API may send type codes ("OU") or full sentences; phrase codes, pass sentences through. */}
              {COMPOSITION_TYPE_LABELS[m] || /^[A-Z_]+$/.test(m) ? `No ${COMPOSITION_TYPE_LABELS[m] ?? m} fitted` : m}
            </Tag>
          ))}
        </div>
      )}
    </div>
  )
}

function CompositionCard({ pairId }: { pairId: string }) {
  const { data: composition, isLoading } = usePairComposition(pairId)

  if (isLoading) {
    return (
      <GlassCard style={{ marginBottom: 24 }}>
        <LoadingSpinner text="Checking composition..." />
      </GlassCard>
    )
  }

  if (!composition) return null

  return (
    <GlassCard style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <ApartmentOutlined style={{ color: 'var(--text-secondary)' }} />
        <span
          style={{
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Composition
        </span>
        {composition.complete && (
          <Tag color="green" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>
            Complete
          </Tag>
        )}
      </div>

      {composition.notes.map((note) => (
        <div
          key={note}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'var(--overlay-subtle)',
            color: 'var(--status-not-working)',
            fontSize: 13,
            marginBottom: 10,
          }}
        >
          <WarningOutlined style={{ flexShrink: 0 }} />
          <span>{note}</span>
        </div>
      ))}

      {/* Sides stack vertically on a phone, sit side by side when there is room. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        {composition.sides.map((side) => (
          <CompositionSideCard key={side.couple_id} side={side} />
        ))}
      </div>
    </GlassCard>
  )
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
        message.success('Link deleted')
        navigate('/pairs')
      },
      onError: () => {
        message.error('Failed to delete link')
      },
    })
  }, [id, deleteMutation, navigate])

  if (isLoading) {
    return <LoadingSpinner text="Loading link..." fullPage />
  }

  if (!pair) {
    return (
      <div style={{ color: '#fff', textAlign: 'center', marginTop: 80 }}>
        Link not found
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
          { label: 'Links', path: '/pairs' },
          { label: pair.name },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <ShareButton title={`Link ${pair.name} — ${pair.status}`} url={`/pairs/${pair.id}`} />
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

      {/* Composition: expected build per side, with gaps called out */}
      <CompositionCard pairId={pair.id} />

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {coupleA && <CoupleColumn couple={coupleA} side="Couple A" />}
        {coupleB && <CoupleColumn couple={coupleB} side="Couple B" />}
      </div>

      <PairForm open={formOpen} onClose={() => setFormOpen(false)} pair={pair} />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Link"
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