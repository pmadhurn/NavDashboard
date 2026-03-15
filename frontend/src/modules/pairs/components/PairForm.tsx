import React, { useState, useEffect, useMemo } from 'react'
import { Select, Switch, message } from 'antd'
import GlassModal from '@/shared/components/GlassModal'
import GlassInput from '@/shared/components/GlassInput'
import GlassButton from '@/shared/components/GlassButton'
import { useCreatePair, useUpdatePair } from '../hooks/usePairs'
import { useCouples } from '@/modules/couples/hooks/useCouples'
import type { Pair, PairCreate, PairUpdate } from '@/shared/types/pairs'
import type { Couple } from '@/shared/types/couples'

interface PairFormProps {
  open: boolean
  onClose: () => void
  pair?: Pair | null
}

interface PersonOption {
  label: string
  value: string
}

function usePersonnel() {
  const { data } = useCouples({ size: 1 })
  // Fetch personnel from API
  const [options, setOptions] = useState<PersonOption[]>([])
  useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch('/api/v1/personnel/?size=100', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setOptions(
            data.items.map((p: { id: string; full_name: string }) => ({
              label: p.full_name,
              value: p.id,
            }))
          )
        }
      } catch {
        // ignore
      }
    }
    fetchPersonnel()
  }, [])
  return options
}

export default function PairForm({ open, onClose, pair }: PairFormProps) {
  const isEdit = !!pair
  const createMutation = useCreatePair()
  const updateMutation = useUpdatePair()
  const personnelOptions = usePersonnel()

  const [name, setName] = useState('')
  const [coupleAId, setCoupleAId] = useState<string | undefined>(undefined)
  const [coupleBId, setCoupleBId] = useState<string | undefined>(undefined)
  const [handlingPersonId, setHandlingPersonId] = useState<string | undefined>(undefined)
  const [statusOverride, setStatusOverride] = useState(false)
  const [status, setStatus] = useState<string>('WORKING')
  const [notes, setNotes] = useState('')

  // Fetch all couples to populate selects
  const { data: couplesData } = useCouples({ size: 100 })
  const allCouples: Couple[] = couplesData?.items ?? []

  // Unassigned couples: pair_id is null OR belongs to current pair
  const availableCouples = useMemo(() => {
    return allCouples.filter(
      (c) => c.pair_id === null || (pair && c.pair_id === pair.id)
    )
  }, [allCouples, pair])

  // Options for Couple A (exclude selected Couple B)
  const coupleAOptions = useMemo(
    () =>
      availableCouples
        .filter((c) => c.id !== coupleBId)
        .map((c) => ({ label: `${c.name} (${c.status})`, value: c.id })),
    [availableCouples, coupleBId]
  )

  // Options for Couple B (exclude selected Couple A)
  const coupleBOptions = useMemo(
    () =>
      availableCouples
        .filter((c) => c.id !== coupleAId)
        .map((c) => ({ label: `${c.name} (${c.status})`, value: c.id })),
    [availableCouples, coupleAId]
  )

  // Reset form when pair changes or modal opens
  useEffect(() => {
    if (open) {
      if (pair) {
        setName(pair.name)
        setCoupleAId(pair.couples[0]?.id)
        setCoupleBId(pair.couples[1]?.id)
        setHandlingPersonId(pair.handling_person_id ?? undefined)
        setStatusOverride(pair.status_override)
        setStatus(pair.status)
        setNotes(pair.notes ?? '')
      } else {
        setName('')
        setCoupleAId(undefined)
        setCoupleBId(undefined)
        setHandlingPersonId(undefined)
        setStatusOverride(false)
        setStatus('WORKING')
        setNotes('')
      }
    }
  }, [open, pair])

  const handleSubmit = () => {
    if (!name.trim()) {
      message.error('Name is required')
      return
    }

    if (isEdit && pair) {
      const updateData: PairUpdate = {
        name: name.trim(),
        handling_person_id: handlingPersonId ?? null,
        status_override: statusOverride,
        notes: notes || null,
      }
      if (statusOverride) {
        updateData.status = status
      }
      updateMutation.mutate(
        { id: pair.id, data: updateData },
        {
          onSuccess: () => {
            message.success('Pair updated')
            onClose()
          },
          onError: () => {
            message.error('Failed to update pair')
          },
        }
      )
    } else {
      if (!coupleAId || !coupleBId) {
        message.error('Please select exactly 2 couples')
        return
      }
      const createData: PairCreate = {
        name: name.trim(),
        couple_ids: [coupleAId, coupleBId],
        handling_person_id: handlingPersonId ?? null,
        notes: notes || null,
      }
      createMutation.mutate(createData, {
        onSuccess: () => {
          message.success('Pair created')
          onClose()
        },
        onError: (err) => {
          const detail = (err as unknown as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          message.error(detail ?? 'Failed to create pair')
        },
      })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Pair' : 'Create Pair'}
      width={560}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <GlassButton variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </GlassButton>
          <GlassButton variant="primary" onClick={handleSubmit} loading={isSubmitting}>
            {isEdit ? 'Update' : 'Create'}
          </GlassButton>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Name */}
        <div>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4, display: 'block' }}>
            Name *
          </label>
          <GlassInput
            value={name}
            onChange={setName}
            placeholder="Pair name"
          />
        </div>

        {/* Couple A */}
        <div>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4, display: 'block' }}>
            Couple A *
          </label>
          {isEdit ? (
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              padding: '8px 12px',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13,
            }}>
              {pair?.couples[0]?.name ?? '—'} (read-only)
            </div>
          ) : (
            <Select
              value={coupleAId}
              onChange={setCoupleAId}
              placeholder="Select Couple A"
              options={coupleAOptions}
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              allowClear
            />
          )}
        </div>

        {/* Couple B */}
        <div>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4, display: 'block' }}>
            Couple B *
          </label>
          {isEdit ? (
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              padding: '8px 12px',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13,
            }}>
              {pair?.couples[1]?.name ?? '—'} (read-only)
            </div>
          ) : (
            <Select
              value={coupleBId}
              onChange={setCoupleBId}
              placeholder="Select Couple B"
              options={coupleBOptions}
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              allowClear
            />
          )}
        </div>

        {/* Handling Person */}
        <div>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4, display: 'block' }}>
            Handling Person
          </label>
          <Select
            value={handlingPersonId}
            onChange={setHandlingPersonId}
            placeholder="Select person"
            options={personnelOptions}
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
            allowClear
          />
        </div>

        {/* Status Override */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              Manual Status Override
            </label>
            <Switch
              checked={statusOverride}
              onChange={setStatusOverride}
              size="small"
            />
          </div>
        </div>

        {/* Status (only if override) */}
        {statusOverride && (
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4, display: 'block' }}>
              Status
            </label>
            <Select
              value={status}
              onChange={setStatus}
              style={{ width: '100%' }}
              options={[
                { label: 'Working', value: 'WORKING' },
                { label: 'Not Working', value: 'NOT_WORKING' },
                { label: 'Faulty', value: 'FAULTY' },
              ]}
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4, display: 'block' }}>
            Notes
          </label>
          <GlassInput
            type="textarea"
            value={notes}
            onChange={setNotes}
            placeholder="Optional notes"
          />
        </div>
      </div>
    </GlassModal>
  )
}