import React, { useEffect, useState } from 'react';
import { Select, Radio, message } from 'antd';
import GlassModal from '@/shared/components/GlassModal';
import GlassInput from '@/shared/components/GlassInput';
import GlassButton from '@/shared/components/GlassButton';
import { api } from '@/shared/api/client';
import { colors } from '@/styles/theme';
import { PaginatedResponse } from '@/shared/types/common';
import {
  useCreateError,
  useAddStep,
  useResolveError,
  type ErrorLogCreate,
  type StepCreate,
  type ResolveRequest,
} from '../hooks/useTroubleshooting';

interface TroubleshootFormProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'add-step' | 'resolve';
  errorId?: string;
}

interface EntityOption {
  value: string;
  label: string;
}

interface PersonnelOption {
  value: string;
  label: string;
}

const SEVERITY_OPTIONS = [
  { label: 'Low', value: 'LOW', color: colors.severity.low },
  { label: 'Medium', value: 'MEDIUM', color: colors.severity.medium },
  { label: 'High', value: 'HIGH', color: colors.severity.high },
  { label: 'Critical', value: 'CRITICAL', color: colors.severity.critical },
];

export default function TroubleshootForm({
  open,
  onClose,
  mode,
  errorId,
}: TroubleshootFormProps) {
  // Create mode state
  const [entityType, setEntityType] = useState<'device' | 'couple' | 'pair'>('device');
  const [entityId, setEntityId] = useState<string>('');
  const [errorType, setErrorType] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [reportedBy, setReportedBy] = useState<string>('');

  // Step mode state
  const [stepDescription, setStepDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [stepResolution, setStepResolution] = useState('');
  const [performedBy, setPerformedBy] = useState<string>('');

  // Resolve mode state
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvedBy, setResolvedBy] = useState<string>('');

  // Custom fields for create and step
  const [customFieldKey, setCustomFieldKey] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  // Dropdown options
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  const createError = useCreateError();
  const addStep = useAddStep();
  const resolveError = useResolveError();

  // Load personnel
  useEffect(() => {
    if (open) {
      api
        .get<PaginatedResponse<{ id: string; full_name: string }>>('/personnel/', {
          size: 100,
        })
        .then((res) => {
          setPersonnel(res.items.map((p) => ({ value: p.id, label: p.full_name })));
        })
        .catch(() => {});
    }
  }, [open]);

  // Load entities when entityType changes
  useEffect(() => {
    if (!open || mode !== 'create') return;
    setLoadingEntities(true);
    setEntityId('');

    let endpoint = '/devices/';
    if (entityType === 'couple') endpoint = '/couples/';
    if (entityType === 'pair') endpoint = '/pairs/';

    api
      .get<PaginatedResponse<{ id: string; serial_number?: string; name?: string }>>(
        endpoint,
        { size: 100 }
      )
      .then((res) => {
        setEntities(
          res.items.map((item) => ({
            value: item.id,
            label: item.serial_number || item.name || item.id,
          }))
        );
      })
      .catch(() => setEntities([]))
      .finally(() => setLoadingEntities(false));
  }, [open, mode, entityType]);

  const resetForm = () => {
    setEntityType('device');
    setEntityId('');
    setErrorType('');
    setSeverity('MEDIUM');
    setDescription('');
    setReportedBy('');
    setStepDescription('');
    setActionTaken('');
    setStepResolution('');
    setPerformedBy('');
    setResolutionNotes('');
    setResolvedBy('');
    setCustomFieldKey('');
    setCustomFieldValue('');
    setCustomFields({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addCustomField = () => {
    if (customFieldKey.trim()) {
      setCustomFields((prev) => ({
        ...prev,
        [customFieldKey.trim()]: customFieldValue,
      }));
      setCustomFieldKey('');
      setCustomFieldValue('');
    }
  };

  const removeCustomField = (key: string) => {
    setCustomFields((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmitCreate = async () => {
    if (!errorType.trim() || !description.trim()) {
      message.error('Error type and description are required');
      return;
    }
    const payload: ErrorLogCreate = {
      error_type: errorType.trim(),
      severity,
      description: description.trim(),
      reported_by: reportedBy || null,
      custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
    };
    if (entityType === 'device' && entityId) payload.device_id = entityId;
    if (entityType === 'couple' && entityId) payload.couple_id = entityId;
    if (entityType === 'pair' && entityId) payload.pair_id = entityId;

    try {
      await createError.mutateAsync(payload);
      message.success('Error reported successfully');
      handleClose();
    } catch {
      message.error('Failed to report error');
    }
  };

  const handleSubmitStep = async () => {
    if (!stepDescription.trim() || !errorId) {
      message.error('Step description is required');
      return;
    }
    const payload: StepCreate = {
      step_description: stepDescription.trim(),
      action_taken: actionTaken.trim() || null,
      resolution: stepResolution.trim() || null,
      performed_by: performedBy || null,
      custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
    };
    try {
      await addStep.mutateAsync({ errorId, data: payload });
      message.success('Step added successfully');
      handleClose();
    } catch {
      message.error('Failed to add step');
    }
  };

  const handleSubmitResolve = async () => {
    if (!errorId) return;
    const payload: ResolveRequest = {
      resolution_notes: resolutionNotes.trim() || null,
      resolved_by: resolvedBy || null,
    };
    try {
      await resolveError.mutateAsync({ errorId, data: payload });
      message.success('Error resolved successfully');
      handleClose();
    } catch {
      message.error('Failed to resolve error');
    }
  };

  const handleSubmit = () => {
    if (mode === 'create') handleSubmitCreate();
    else if (mode === 'add-step') handleSubmitStep();
    else if (mode === 'resolve') handleSubmitResolve();
  };

  const titles: Record<string, string> = {
    create: 'Report New Error',
    'add-step': 'Add Troubleshoot Step',
    resolve: 'Resolve Error',
  };

  const isLoading =
    createError.isPending || addStep.isPending || resolveError.isPending;

  const selectStyle: React.CSSProperties = {
    width: '100%',
  };

  const selectDropdownStyle: React.CSSProperties = {
    background: '#1A1A2E',
    border: '1px solid rgba(255,255,255,0.1)',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--role-admin)',
    fontSize: 12,
    marginBottom: 4,
    display: 'block',
  };

  const fieldGap: React.CSSProperties = { marginBottom: 16 };

  return (
    <GlassModal
      open={open}
      onClose={handleClose}
      title={titles[mode]}
      width={560}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <GlassButton variant="ghost" onClick={handleClose}>
            Cancel
          </GlassButton>
          <GlassButton
            variant="primary"
            onClick={handleSubmit}
            loading={isLoading}
          >
            {mode === 'create' ? 'Report' : mode === 'add-step' ? 'Add Step' : 'Resolve'}
          </GlassButton>
        </div>
      }
    >
      {/* ── Create mode ─────────────────────── */}
      {mode === 'create' && (
        <>
          <div style={fieldGap}>
            <span style={labelStyle}>Entity Type</span>
            <Radio.Group
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              style={{ color: 'var(--chart1)' }}
            >
              <Radio value="device" style={{ color: 'var(--chart1)' }}>
                Device
              </Radio>
              <Radio value="couple" style={{ color: 'var(--chart1)' }}>
                Couple
              </Radio>
              <Radio value="pair" style={{ color: 'var(--chart1)' }}>
                Link
              </Radio>
            </Radio.Group>
          </div>

          <div style={fieldGap}>
            <span style={labelStyle}>
              {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
            </span>
            <Select
              showSearch
              placeholder={`Select ${entityType === 'pair' ? 'link' : entityType}...`}
              value={entityId || undefined}
              onChange={setEntityId}
              options={entities}
              loading={loadingEntities}
              style={selectStyle}
              dropdownStyle={selectDropdownStyle}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              allowClear
            />
          </div>

          <div style={fieldGap}>
            <span style={labelStyle}>Error Type</span>
            <GlassInput
              placeholder="e.g., Connection Loss, Signal Degradation"
              value={errorType}
              onChange={setErrorType}
            />
          </div>

          <div style={fieldGap}>
            <span style={labelStyle}>Severity</span>
            <Select
              value={severity}
              onChange={setSeverity}
              style={selectStyle}
              dropdownStyle={selectDropdownStyle}
              options={SEVERITY_OPTIONS.map((opt) => ({
                value: opt.value,
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: opt.color,
                      }}
                    />
                    {opt.label}
                  </span>
                ),
              }))}
            />
          </div>

          <div style={fieldGap}>
            <span style={labelStyle}>Description</span>
            <GlassInput
              type="textarea"
              placeholder="Describe the error in detail..."
              value={description}
              onChange={setDescription}
            />
          </div>

          <div style={fieldGap}>
            <span style={labelStyle}>Reported By</span>
            <Select
              showSearch
              placeholder="Select person..."
              value={reportedBy || undefined}
              onChange={setReportedBy}
              options={personnel}
              style={selectStyle}
              dropdownStyle={selectDropdownStyle}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              allowClear
            />
          </div>

          {/* Custom fields */}
          <div style={fieldGap}>
            <span style={labelStyle}>Custom Fields</span>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <GlassInput
                placeholder="Key"
                value={customFieldKey}
                onChange={setCustomFieldKey}
                size="sm"
              />
              <GlassInput
                placeholder="Value"
                value={customFieldValue}
                onChange={setCustomFieldValue}
                size="sm"
              />
              <GlassButton variant="secondary" size="sm" onClick={addCustomField}>
                +
              </GlassButton>
            </div>
            {Object.entries(customFields).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 6,
                  marginBottom: 4,
                  fontSize: 12,
                  color: 'var(--chart1)',
                }}
              >
                <span>
                  <strong>{k}:</strong> {v}
                </span>
                <span
                  style={{ color: 'var(--status-faulty)', cursor: 'pointer' }}
                  onClick={() => removeCustomField(k)}
                >
                  ×
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Add Step mode ───────────────────── */}
      {mode === 'add-step' && (
        <>
          <div style={fieldGap}>
            <span style={labelStyle}>Step Description *</span>
            <GlassInput
              type="textarea"
              placeholder="Describe what was done in this step..."
              value={stepDescription}
              onChange={setStepDescription}
            />
          </div>

          <div style={fieldGap}>
            <span style={labelStyle}>Action Taken</span>
            <GlassInput
              type="textarea"
              placeholder="What specific action was performed?"
              value={actionTaken}
              onChange={setActionTaken}
            />
          </div>

          <div style={fieldGap}>
            <span style={labelStyle}>Resolution</span>
            <GlassInput
              type="textarea"
              placeholder="Any resolution from this step?"
              value={stepResolution}
              onChange={setStepResolution}
            />
          </div>

          <div style={fieldGap}>
            <span style={labelStyle}>Performed By</span>
            <Select
              showSearch
              placeholder="Select person..."
              value={performedBy || undefined}
              onChange={setPerformedBy}
              options={personnel}
              style={selectStyle}
              dropdownStyle={selectDropdownStyle}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              allowClear
            />
          </div>

          {/* Custom fields */}
          <div style={fieldGap}>
            <span style={labelStyle}>Custom Fields</span>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <GlassInput
                placeholder="Key"
                value={customFieldKey}
                onChange={setCustomFieldKey}
                size="sm"
              />
              <GlassInput
                placeholder="Value"
                value={customFieldValue}
                onChange={setCustomFieldValue}
                size="sm"
              />
              <GlassButton variant="secondary" size="sm" onClick={addCustomField}>
                +
              </GlassButton>
            </div>
            {Object.entries(customFields).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 6,
                  marginBottom: 4,
                  fontSize: 12,
                  color: 'var(--chart1)',
                }}
              >
                <span>
                  <strong>{k}:</strong> {v}
                </span>
                <span
                  style={{ color: 'var(--status-faulty)', cursor: 'pointer' }}
                  onClick={() => removeCustomField(k)}
                >
                  ×
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Resolve mode ────────────────────── */}
      {mode === 'resolve' && (
        <>
          <div style={fieldGap}>
            <span style={labelStyle}>Resolution Notes</span>
            <GlassInput
              type="textarea"
              placeholder="Describe how the error was resolved..."
              value={resolutionNotes}
              onChange={setResolutionNotes}
            />
          </div>

          <div style={fieldGap}>
            <span style={labelStyle}>Resolved By</span>
            <Select
              showSearch
              placeholder="Select person..."
              value={resolvedBy || undefined}
              onChange={setResolvedBy}
              options={personnel}
              style={selectStyle}
              dropdownStyle={selectDropdownStyle}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              allowClear
            />
          </div>
        </>
      )}
    </GlassModal>
  );
}