import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tag, Input, message } from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  WifiOutlined,
} from '@ant-design/icons'
import PageHeader from '@/shared/components/PageHeader'
import ShareButton from '@/shared/components/ShareButton'
import GlassCard from '@/shared/components/GlassCard'
import GlassButton from '@/shared/components/GlassButton'
import GlassModal from '@/shared/components/GlassModal'
import GlassInput from '@/shared/components/GlassInput'
import StatusBadge from '@/shared/components/StatusBadge'
import EmptyState from '@/shared/components/EmptyState'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import CoupleForm from '../components/CoupleForm'
import {
  useCouple,
  useCoupleLocationHistory,
  useDeleteCouple,
  useChangeCoupleLocation,
} from '../hooks/useCouples'
import { getDeviceTypeColor, getStatusColor } from '@/shared/utils/colors'
import { formatDateTime, formatCoordinates } from '@/shared/utils/formatters'
import type { LocationHistory } from '@/shared/types/locations'

export default function CoupleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: couple, isLoading } = useCouple(id || '')
  const { data: historyData } = useCoupleLocationHistory(id || '')
  const deleteCouple = useDeleteCouple()
  const changeLocation = useChangeCoupleLocation()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [newLat, setNewLat] = useState('')
  const [newLng, setNewLng] = useState('')
  const [newAddrNote, setNewAddrNote] = useState('')
  const [locationNotes, setLocationNotes] = useState('')

  if (isLoading) return <LoadingSpinner text="Loading couple..." />
  if (!couple) return <div style={{ color: '#B8B8B8', padding: 40 }}>Couple not found</div>

  const confirmDelete = async () => {
    try {
      await deleteCouple.mutateAsync(couple.id)
      message.success('Couple deleted')
      navigate('/couples')
    } catch {
      message.error('Failed to delete couple')
    }
    setDeleteOpen(false)
  }

  const openLocationModal = () => {
    setNewLat(couple.location?.latitude?.toString() || '')
    setNewLng(couple.location?.longitude?.toString() || '')
    setNewAddrNote(couple.location?.address_note || '')
    setLocationNotes('')
    setLocationModalOpen(true)
  }

  const handleLocationChange = async () => {
    const lat = parseFloat(newLat)
    const lng = parseFloat(newLng)
    if (isNaN(lat) || isNaN(lng)) {
      message.error('Invalid coordinates')
      return
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      message.error('Coordinates out of range')
      return
    }
    try {
      await changeLocation.mutateAsync({
        id: couple.id,
        data: {
          latitude: lat,
          longitude: lng,
          address_note: newAddrNote || undefined,
          notes: locationNotes || undefined,
        },
      })
      message.success('Location updated')
      setLocationModalOpen(false)
    } catch {
      message.error('Failed to change location')
    }
  }

  const locationHistory: LocationHistory[] = historyData?.items ?? []

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#F2F2F2',
    borderRadius: 8,
  }

  return (
    <div>
      <PageHeader
        title={couple.name}
        breadcrumbs={[
          { label: 'Couples', path: '/couples' },
          { label: couple.name },
        ]}
        actions={
          <>
            <ShareButton
              title={`Couple ${couple.name} — ${couple.status}`}
              url={`/couples/${couple.id}`}
            />
            <GlassButton
              variant="ghost"
              icon={<EnvironmentOutlined />}
              onClick={openLocationModal}
            >
              Change Location
            </GlassButton>
            <GlassButton
              variant="ghost"
              icon={<EditOutlined />}
              onClick={() => setEditOpen(true)}
            >
              Edit
            </GlassButton>
            <GlassButton
              variant="danger"
              icon={<DeleteOutlined />}
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </GlassButton>
          </>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 16,
        }}
      >
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Info Card */}
          <GlassCard>
            <h3 style={{ color: '#F2F2F2', marginBottom: 16, fontSize: 16 }}>Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ color: '#7A7A7A', fontSize: 12, marginBottom: 4 }}>Name</div>
                <div style={{ color: '#F2F2F2', fontSize: 14 }}>{couple.name}</div>
              </div>
              <div>
                <div style={{ color: '#7A7A7A', fontSize: 12, marginBottom: 4 }}>Status</div>
                <StatusBadge status={couple.status as 'WORKING' | 'NOT_WORKING' | 'FAULTY'} />
              </div>
              <div>
                <div style={{ color: '#7A7A7A', fontSize: 12, marginBottom: 4 }}>Has RF</div>
                <div>
                  {couple.has_rf ? (
                    <Tag icon={<WifiOutlined />} color="blue" style={{ borderRadius: 6 }}>RF Active</Tag>
                  ) : (
                    <span style={{ color: '#7A7A7A' }}>No</span>
                  )}
                </div>
              </div>
              <div>
                <div style={{ color: '#7A7A7A', fontSize: 12, marginBottom: 4 }}>Pair</div>
                <div style={{ color: '#F2F2F2', fontSize: 14 }}>
                  {couple.pair_id ? couple.pair_id.slice(0, 8) + '...' : 'Unpaired'}
                </div>
              </div>
              <div>
                <div style={{ color: '#7A7A7A', fontSize: 12, marginBottom: 4 }}>Handling Person</div>
                <div style={{ color: '#F2F2F2', fontSize: 14 }}>
                  {couple.handling_person_name || 'None'}
                </div>
              </div>
              <div>
                <div style={{ color: '#7A7A7A', fontSize: 12, marginBottom: 4 }}>Created</div>
                <div style={{ color: '#B8B8B8', fontSize: 13 }}>{formatDateTime(couple.created_at)}</div>
              </div>
            </div>
          </GlassCard>

          {/* Devices Card */}
          <GlassCard>
            <h3 style={{ color: '#F2F2F2', marginBottom: 16, fontSize: 16 }}>
              Devices ({couple.devices.length})
            </h3>
            {couple.devices.length === 0 ? (
              <EmptyState title="No devices assigned" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {couple.devices.map((device) => (
                  <div
                    key={device.id}
                    onClick={() => navigate(`/devices/${device.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#F2F2F2', fontWeight: 500, fontSize: 13 }}>
                        {device.serial_number}
                      </span>
                      <Tag
                        color={getDeviceTypeColor(device.device_type)}
                        style={{ borderRadius: 6, fontSize: 11 }}
                      >
                        {device.device_type}
                      </Tag>
                    </div>
                    <StatusBadge
                      status={device.status as 'WORKING' | 'NOT_WORKING' | 'FAULTY'}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Materials Card */}
          <GlassCard>
            <h3 style={{ color: '#F2F2F2', marginBottom: 16, fontSize: 16 }}>
              Fitting Materials ({couple.materials.length})
            </h3>
            {couple.materials.length === 0 ? (
              <EmptyState title="No fitting materials" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {couple.materials.map((mat) => (
                  <div
                    key={mat.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <span style={{ color: '#F2F2F2', fontSize: 13 }}>{mat.name}</span>
                    <span style={{ color: '#B8B8B8', fontSize: 12 }}>
                      {mat.quantity}{mat.unit ? ` ${mat.unit}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Location Card */}
          <GlassCard>
            <h3 style={{ color: '#F2F2F2', marginBottom: 16, fontSize: 16 }}>Location</h3>
            {couple.location ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <div style={{ color: '#7A7A7A', fontSize: 12, marginBottom: 4 }}>Coordinates</div>
                  <div style={{ color: '#F2F2F2', fontSize: 14 }}>
                    {formatCoordinates(couple.location.latitude, couple.location.longitude)}
                  </div>
                </div>
                {couple.location.address_note && (
                  <div>
                    <div style={{ color: '#7A7A7A', fontSize: 12, marginBottom: 4 }}>Address Note</div>
                    <div style={{ color: '#B8B8B8', fontSize: 13 }}>{couple.location.address_note}</div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState title="No location set" />
            )}
          </GlassCard>

          {/* Configuration Card */}
          <GlassCard>
            <h3 style={{ color: '#F2F2F2', marginBottom: 16, fontSize: 16 }}>Configuration</h3>
            {couple.configuration && Object.keys(couple.configuration).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {Object.entries(couple.configuration).map(([key, value]) => (
                  <div key={key}>
                    <div style={{ color: '#7A7A7A', fontSize: 12, marginBottom: 4 }}>{key}</div>
                    <div style={{ color: '#F2F2F2', fontSize: 13 }}>{String(value)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: '#7A7A7A', fontSize: 13 }}>No configuration</span>
            )}
          </GlassCard>

          {/* Custom Fields Card */}
          <GlassCard>
            <h3 style={{ color: '#F2F2F2', marginBottom: 16, fontSize: 16 }}>Custom Fields</h3>
            {couple.custom_fields && Object.keys(couple.custom_fields).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {Object.entries(couple.custom_fields).map(([key, value]) => (
                  <div key={key}>
                    <div style={{ color: '#7A7A7A', fontSize: 12, marginBottom: 4 }}>{key}</div>
                    <div style={{ color: '#F2F2F2', fontSize: 13 }}>{String(value)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: '#7A7A7A', fontSize: 13 }}>No custom fields</span>
            )}
          </GlassCard>

          {/* Location History Card */}
          <GlassCard>
            <h3 style={{ color: '#F2F2F2', marginBottom: 16, fontSize: 16 }}>
              Location History ({locationHistory.length})
            </h3>
            {locationHistory.length === 0 ? (
              <EmptyState title="No location changes recorded" />
            ) : (
              <div
                style={{
                  maxHeight: 400,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {locationHistory.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      borderLeft: '3px solid #7A7A7A',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#B8B8B8', fontSize: 12 }}>
                        {formatDateTime(entry.moved_at)}
                      </span>
                      {entry.distance_meters !== null && (
                        <span style={{ color: '#7A7A7A', fontSize: 11 }}>
                          {entry.distance_meters.toFixed(0)}m
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#B8B8B8' }}>
                      <span>
                        {formatCoordinates(entry.old_latitude, entry.old_longitude)}
                      </span>
                      <span style={{ margin: '0 8px', color: '#7A7A7A' }}>→</span>
                      <span>
                        {formatCoordinates(entry.new_latitude, entry.new_longitude)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      {entry.had_rf && (
                        <Tag color="blue" style={{ fontSize: 10, borderRadius: 4 }}>RF</Tag>
                      )}
                      {entry.notes && (
                        <span style={{ color: '#7A7A7A', fontSize: 11 }}>{entry.notes}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Edit Modal */}
      <CoupleForm open={editOpen} onClose={() => setEditOpen(false)} couple={couple} />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete Couple"
        message={`Are you sure you want to delete "${couple.name}"? All device assignments will be removed.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
        danger
        loading={deleteCouple.isPending}
      />

      {/* Location Change Modal */}
      <GlassModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        title="Change Location"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <GlassButton variant="ghost" onClick={() => setLocationModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handleLocationChange}
              loading={changeLocation.isPending}
            >
              Update Location
            </GlassButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#B8B8B8', fontSize: 14, marginBottom: 8 }}>Latitude</div>
              <Input
                type="number"
                value={newLat}
                onChange={(e) => setNewLat(e.target.value)}
                placeholder="-90 to 90"
                step="0.0001"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#B8B8B8', fontSize: 14, marginBottom: 8 }}>Longitude</div>
              <Input
                type="number"
                value={newLng}
                onChange={(e) => setNewLng(e.target.value)}
                placeholder="-180 to 180"
                step="0.0001"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <div style={{ color: '#B8B8B8', fontSize: 14, marginBottom: 8 }}>Address Note</div>
            <Input
              value={newAddrNote}
              onChange={(e) => setNewAddrNote(e.target.value)}
              placeholder="Optional address note"
              style={inputStyle}
            />
          </div>
          <div>
            <div style={{ color: '#B8B8B8', fontSize: 14, marginBottom: 8 }}>Notes (for history)</div>
            <Input.TextArea
              value={locationNotes}
              onChange={(e) => setLocationNotes(e.target.value)}
              rows={2}
              placeholder="Reason for location change..."
              style={inputStyle}
            />
          </div>
        </div>
      </GlassModal>
    </div>
  )
}