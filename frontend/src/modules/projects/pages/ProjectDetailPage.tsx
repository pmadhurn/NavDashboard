import React, { useState } from 'react';
import { Select, Tabs } from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  SendOutlined,
  PhoneOutlined,
  CarOutlined,
  EditOutlined,
  ToolOutlined,
  FileOutlined,
  SwapOutlined,
  WarningOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import GlassModal from '@/shared/components/GlassModal';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import StatusBadge from '@/shared/components/StatusBadge';
import ShareButton from '@/shared/components/ShareButton';
import { usePermission } from '@/shared/stores/authStore';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { useAssets } from '@/modules/inventory/hooks/useAssets';
import {
  useProject,
  useProjectTimeline,
  useProjectMovements,
  useUpdateProject,
  useAddTimelineEntry,
  useAddMember,
  useRemoveMember,
  useCreateMovement,
  useUpdateMovementItem,
  useProjectDeployments,
  useAddDeployment,
  useRemoveDeployment,
  useProjectPhases,
  useCreatePhase,
  useCloseProject,
} from '../hooks/useProjects';
import OutwardForm from '../components/OutwardForm';
import { ProjectFilesTab, ProjectOverviewTab } from '../components/ProjectArchive';

const ENTRY_ICONS: Record<string, React.ReactNode> = {
  VISIT: <CarOutlined />,
  CALL: <PhoneOutlined />,
  NOTE: <EditOutlined />,
  STATUS_CHANGE: <SwapOutlined />,
  EQUIPMENT: <ToolOutlined />,
  DOCUMENT: <FileOutlined />,
  ISSUE: <WarningOutlined />,
  EXPENSE: <DollarOutlined />,
};

function TimelineTab({ projectId }: { projectId: string }) {
  const [quickText, setQuickText] = useState('');
  const [entryType, setEntryType] = useState('NOTE');
  const canEdit = usePermission('projects.update');
  const { data, isLoading } = useProjectTimeline(projectId);
  const addEntry = useAddTimelineEntry(projectId);

  const handleQuickAdd = async () => {
    if (!quickText.trim()) return;
    await addEntry.mutateAsync({ entry_type: entryType, title: quickText.trim() });
    setQuickText('');
  };

  return (
    <div>
      {canEdit && (
        <GlassCard padding="sm" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Select
              className="dl-select"
              style={{ width: 110 }}
              value={entryType}
              onChange={setEntryType}
              options={[
                { value: 'NOTE', label: 'Note' },
                { value: 'CALL', label: 'Call' },
                { value: 'VISIT', label: 'Visit' },
                { value: 'ISSUE', label: 'Issue' },
              ]}
            />
            <div style={{ flex: 1, minWidth: 180 }}>
              <GlassInput
                value={quickText}
                onChange={setQuickText}
                placeholder="Log a call, visit, or note..."
                onPressEnter={handleQuickAdd}
              />
            </div>
            <GlassButton
              icon={<SendOutlined />}
              onClick={handleQuickAdd}
              loading={addEntry.isPending}
              disabled={!quickText.trim()}
            >
              Log
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {isLoading ? (
        <LoadingSpinner text="Loading timeline..." />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Calls, visits, notes, and equipment moves will show up here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {data.items.map((entry) => (
            <div key={entry.id} style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'rgba(139,195,74,0.1)',
                    border: '1px solid rgba(139,195,74,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8BC34A',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {ENTRY_ICONS[entry.entry_type] ?? <EditOutlined />}
                </div>
                <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>
              <div style={{ paddingBottom: 20, minWidth: 0 }}>
                <div style={{ color: 'var(--primary)', fontSize: 13 }}>{entry.title}</div>
                {entry.body && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>{entry.body}</div>
                )}
                <div style={{ color: 'var(--chart4)', fontSize: 11, marginTop: 4 }}>
                  {formatDateTime(entry.entry_date)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EquipmentTab({ projectId }: { projectId: string }) {
  const [sendOpen, setSendOpen] = useState(false);
  const [outwardOpen, setOutwardOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');

  const canEdit = usePermission('projects.update');
  const { data: movements, isLoading } = useProjectMovements(projectId);
  const { data: assetData } = useAssets({ search: assetSearch });
  const createMovement = useCreateMovement(projectId);
  const updateItem = useUpdateMovementItem(projectId);

  const handleSend = async () => {
    if (!selectedAssets.length) return;
    await createMovement.mutateAsync({
      direction: 'OUTWARD',
      received_by_name: receivedBy.trim() || undefined,
      notes: notes.trim() || undefined,
      items: selectedAssets.map((assetId) => ({ asset_id: assetId })),
    });
    setSendOpen(false);
    setSelectedAssets([]);
    setReceivedBy('');
    setNotes('');
  };

  const statusColors: Record<string, string> = {
    WITH_CLIENT: '#8C8468',
    RETURNED: 'var(--status-working)',
    DAMAGED: '#8C5F5F',
    LOST: '#8C5F5F',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        {canEdit && (
          <>
            <GlassButton variant="ghost" icon={<SendOutlined />} onClick={() => setSendOpen(true)}>
              Quick Send
            </GlassButton>
            <GlassButton variant="primary" icon={<SendOutlined />} onClick={() => setOutwardOpen(true)}>
              Outward Form
            </GlassButton>
          </>
        )}
      </div>
      <OutwardForm projectId={projectId} open={outwardOpen} onClose={() => setOutwardOpen(false)} />

      {isLoading ? (
        <LoadingSpinner text="Loading equipment..." />
      ) : !movements || movements.length === 0 ? (
        <EmptyState
          title="No equipment movements"
          description="Track what goes out to this project and what comes back."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {movements.map((movement) => (
            <GlassCard key={movement.id} padding="sm">
              <div style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                {movement.direction === 'OUTWARD' ? '↗ Sent out' : '↙ Received back'}
                <span style={{ color: 'var(--chart4)', fontWeight: 400, marginLeft: 8, fontSize: 11 }}>
                  {formatDateTime(movement.movement_date)}
                  {movement.received_by_name && ` · taken by ${movement.received_by_name}`}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {movement.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: '#8BC34A', fontFamily: 'monospace' }}>
                        {item.asset.asset_code}
                      </span>{' '}
                      {item.asset.name}
                      {item.quantity > 1 && ` ×${item.quantity}`}
                    </span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: statusColors[item.item_status],
                          background: `${statusColors[item.item_status]}22`,
                          padding: '2px 8px',
                          borderRadius: 8,
                        }}
                      >
                        {item.item_status.replace('_', ' ')}
                      </span>
                      {canEdit &&
                        movement.direction === 'OUTWARD' &&
                        item.item_status === 'WITH_CLIENT' && (
                          <Select
                            className="dl-select"
                            size="small"
                            style={{ width: 120 }}
                            placeholder="Receive..."
                            onChange={(status) =>
                              updateItem.mutate({ itemId: item.id, data: { item_status: status } })
                            }
                            options={[
                              { value: 'RETURNED', label: 'Returned OK' },
                              { value: 'DAMAGED', label: 'Damaged' },
                              { value: 'LOST', label: 'Lost' },
                            ]}
                          />
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <GlassModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Send Equipment to Project"
        width={500}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <GlassButton variant="ghost" onClick={() => setSendOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handleSend}
              loading={createMovement.isPending}
              disabled={!selectedAssets.length}
            >
              Record Outward
            </GlassButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Pick assets
            </label>
            <Select
              className="dl-select"
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Search inventory..."
              filterOption={false}
              onSearch={setAssetSearch}
              value={selectedAssets}
              onChange={setSelectedAssets}
              options={(assetData?.items ?? []).map((a) => ({
                value: a.id,
                label: `${a.asset_code} — ${a.name}`,
                // Only what is actually in stock and working can be sent out.
                disabled: !a.is_available,
              }))}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Who is taking it? (optional)
            </label>
            <GlassInput value={receivedBy} onChange={setReceivedBy} placeholder="Name" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Notes (optional)
            </label>
            <GlassInput value={notes} onChange={setNotes} placeholder="Condition, purpose..." />
          </div>
        </div>
      </GlassModal>
    </div>
  );
}

function TeamTab({ projectId }: { projectId: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [personId, setPersonId] = useState<string | undefined>();
  const [newName, setNewName] = useState('');
  const [role, setRole] = useState('');

  const canEdit = usePermission('projects.update');
  const { data: project } = useProject(projectId);
  const addMember = useAddMember(projectId);
  const removeMember = useRemoveMember(projectId);

  const { data: personnel } = useQuery({
    queryKey: ['personnel-list'],
    queryFn: () => api.get<{ items: { id: string; full_name: string }[] }>('/personnel/', { size: 100 }),
    enabled: addOpen,
  });

  const activeMembers = (project?.members ?? []).filter((m) => !m.left_at);

  const handleAdd = async () => {
    if (!personId && !newName.trim()) return;
    await addMember.mutateAsync({
      person_id: personId,
      new_person_name: personId ? undefined : newName.trim(),
      role_in_project: role.trim() || undefined,
    });
    setAddOpen(false);
    setPersonId(undefined);
    setNewName('');
    setRole('');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {canEdit && (
          <GlassButton icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            Add Member
          </GlassButton>
        )}
      </div>
      {activeMembers.length === 0 ? (
        <EmptyState title="No team members yet" description="Add who's working on this project." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeMembers.map((member) => (
            <GlassCard key={member.id} padding="sm">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13 }}>{member.person.full_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {member.role_in_project || member.person.role || 'Team member'} · joined{' '}
                    {formatRelativeTime(member.joined_at)}
                  </div>
                </div>
                {canEdit && (
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMember.mutate(member.id)}
                  >
                    Remove
                  </GlassButton>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <GlassModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Team Member"
        width={440}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <GlassButton variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handleAdd}
              loading={addMember.isPending}
              disabled={!personId && !newName.trim()}
            >
              Add
            </GlassButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Existing person
            </label>
            <Select
              className="dl-select"
              style={{ width: '100%' }}
              placeholder="Pick from personnel"
              showSearch
              allowClear
              optionFilterProp="label"
              value={personId}
              onChange={setPersonId}
              options={(personnel?.items ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
            />
          </div>
          {!personId && (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Or add someone new
              </label>
              <GlassInput value={newName} onChange={setNewName} placeholder="Full name" />
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Role in project (optional)
            </label>
            <GlassInput value={role} onChange={setRole} placeholder="e.g. Site engineer" />
          </div>
        </div>
      </GlassModal>
    </div>
  );
}

function DeployedTab({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [entityType, setEntityType] = useState('device');
  const [entityId, setEntityId] = useState<string | undefined>();
  const [search, setSearch] = useState('');

  const canEdit = usePermission('projects.update');
  const { data: deployments, isLoading } = useProjectDeployments(projectId);
  const addDeployment = useAddDeployment(projectId);
  const removeDeployment = useRemoveDeployment(projectId);

  // Devices/equipment come from the unified inventory; couples/pairs from their lists.
  const { data: assetData } = useAssets({
    search,
    source: entityType === 'asset' ? 'equipment' : 'device',
  });
  const { data: coupleData } = useQuery({
    queryKey: ['couples-lite'],
    queryFn: () => api.get<{ items: { id: string; name: string }[] }>('/couples/', { size: 200 }),
    enabled: addOpen && entityType === 'couple',
  });
  const { data: pairData } = useQuery({
    queryKey: ['pairs-lite'],
    queryFn: () => api.get<{ items: { id: string; name: string }[] }>('/pairs/', { size: 200 }),
    enabled: addOpen && entityType === 'pair',
  });

  const options = (() => {
    if (entityType === 'couple')
      return (coupleData?.items ?? []).map((c) => ({ value: c.id, label: c.name }));
    if (entityType === 'pair')
      return (pairData?.items ?? []).map((p) => ({ value: p.id, label: p.name }));
    // device → use the mirror's device_id; asset → the asset id
    return (assetData?.items ?? [])
      .filter((a) => (entityType === 'device' ? a.device_id : !a.device_id))
      .map((a) => ({
        value: entityType === 'device' ? (a.device_id as string) : a.id,
        label: `${a.asset_code} — ${a.name}`,
      }));
  })();

  const handleAdd = async () => {
    if (!entityId) return;
    await addDeployment.mutateAsync({ entity_type: entityType, entity_id: entityId });
    setAddOpen(false);
    setEntityId(undefined);
    setSearch('');
  };

  const openEntity = (d: { entity_type: string; entity_id: string }) => {
    if (d.entity_type === 'device') navigate(`/devices/${d.entity_id}`);
    else if (d.entity_type === 'couple') navigate(`/couples/${d.entity_id}`);
    else if (d.entity_type === 'pair') navigate(`/pairs/${d.entity_id}`);
    else navigate(`/inventory/assets/${d.entity_id}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {canEdit && (
          <GlassButton icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            Attach Link
          </GlassButton>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading deployed links..." />
      ) : !deployments || deployments.length === 0 ? (
        <EmptyState
          title="No links deployed"
          description="Attach the devices, couples, or links deployed at this project site."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {deployments.map((d) => (
            <GlassCard key={d.id} padding="sm">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div onClick={() => openEntity(d)} style={{ cursor: 'pointer' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{d.label || d.entity_id}</span>
                  <span style={{ color: 'var(--chart4)', fontSize: 11, marginLeft: 8, textTransform: 'uppercase' }}>
                    {d.entity_type}
                  </span>
                </div>
                {canEdit && (
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDeployment.mutate(d.id)}
                  >
                    Remove
                  </GlassButton>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <GlassModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Attach Deployed Link"
        width={460}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <GlassButton variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton onClick={handleAdd} loading={addDeployment.isPending} disabled={!entityId}>
              Attach
            </GlassButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Type</label>
            <Select
              className="dl-select"
              style={{ width: '100%' }}
              value={entityType}
              onChange={(v) => {
                setEntityType(v);
                setEntityId(undefined);
              }}
              options={[
                { value: 'device', label: 'Device' },
                { value: 'couple', label: 'Couple' },
                { value: 'pair', label: 'Link' },
                { value: 'asset', label: 'Equipment' },
              ]}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Pick {entityType}
            </label>
            <Select
              className="dl-select"
              style={{ width: '100%' }}
              showSearch
              placeholder={`Search ${entityType}...`}
              filterOption={
                entityType === 'couple' || entityType === 'pair'
                  ? (input, opt) =>
                      String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  : false
              }
              onSearch={
                entityType === 'device' || entityType === 'asset' ? setSearch : undefined
              }
              value={entityId}
              onChange={setEntityId}
              options={options}
            />
          </div>
        </div>
      </GlassModal>
    </div>
  );
}

const PHASE_TYPES = [
  'DESKTOP_SURVEY',
  'PHYSICAL_SURVEY',
  'INSTALLATION',
  'MAINTENANCE',
  'OTHER',
];

function PhasesTab({ projectId }: { projectId: string }) {
  const canEdit = usePermission('projects.update');
  const { data: phases, isLoading } = useProjectPhases(projectId);
  const createPhase = useCreatePhase(projectId);
  const [addOpen, setAddOpen] = useState(false);
  const [phaseType, setPhaseType] = useState('DESKTOP_SURVEY');
  const [note, setNote] = useState('');

  const handleAdd = async () => {
    await createPhase.mutateAsync({ phase_type: phaseType, note: note.trim() || undefined });
    setAddOpen(false);
    setNote('');
  };

  if (isLoading) return <LoadingSpinner text="Loading phases..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {canEdit && (
          <GlassButton icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            Start Phase
          </GlassButton>
        )}
      </div>
      {!phases || phases.length === 0 ? (
        <EmptyState
          title="No phases yet"
          description="Track stages like desktop survey → physical survey → installation."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {phases.map((ph) => (
            <GlassCard key={ph.id} padding="sm">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
                    {ph.phase_type.replace(/_/g, ' ')}
                  </div>
                  {ph.note && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ph.note}</div>}
                </div>
                <StatusBadge status={ph.status} size="sm" />
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <GlassModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Start a Phase"
        width={420}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <GlassButton variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton onClick={handleAdd} loading={createPhase.isPending}>
              Start
            </GlassButton>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Phase</label>
            <Select
              className="dl-select"
              style={{ width: '100%' }}
              value={phaseType}
              onChange={setPhaseType}
              options={PHASE_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Note (optional)
            </label>
            <GlassInput value={note} onChange={setNote} placeholder="e.g. LOS analysis by Piyush" />
          </div>
        </div>
      </GlassModal>
    </div>
  );
}

function CloseProjectModal({
  projectId,
  members,
  open,
  onClose,
}: {
  projectId: string;
  members: { id: string; person: { full_name: string }; left_at: string | null }[];
  open: boolean;
  onClose: () => void;
}) {
  const closeProject = useCloseProject(projectId);
  const [departing, setDeparting] = useState<string[]>([]);
  const [force, setForce] = useState(false);
  const active = members.filter((m) => !m.left_at);

  const handleClose = async () => {
    await closeProject.mutateAsync({ departing_member_ids: departing, force });
    onClose();
  };

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title="Close Project"
      width={460}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton variant="danger" onClick={handleClose} loading={closeProject.isPending}>
            Close Project
          </GlassButton>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            Mark departing members (set their leave date)
          </label>
          <Select
            className="dl-select"
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Who is leaving the project?"
            value={departing}
            onChange={setDeparting}
            options={active.map((m) => ({ value: m.id, label: m.person.full_name }))}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
          Force close even if equipment is still out
        </label>
      </div>
    </GlassModal>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const { data: phases } = useProjectPhases(id);
  const updateProject = useUpdateProject();
  const canEdit = usePermission('projects.update');
  const [closeOpen, setCloseOpen] = useState(false);

  // Not every project sends a team to a site. A desktop survey — locations
  // arrive from someone else, LOS analysis is done at a desk, a report goes
  // back — has nothing to issue from the store and no site team, so showing it
  // the outward/inward and Team tabs invites rows that will never be filled.
  //
  // A project earns those tabs once it has a phase that actually goes out. A
  // project with no phases yet is *unknown*, not desk-only, so it keeps them:
  // hiding a capability someone is about to need is worse than showing one they
  // will not.
  // Tested positively (every phase is a desktop survey) rather than by absence
  // of a field phase: seeded rows carry phase_type values the API itself would
  // reject (`SURVEY`, `COMMISSIONING`), and an unrecognised value must never be
  // read as "desk-only" and silently hide a tab the project needs.
  const deskOnly = Boolean(
    phases && phases.length > 0 && phases.every((p) => p.phase_type === 'DESKTOP_SURVEY')
  );

  // `isLoading` and "no data" are distinct states: a 404 ends the load with
  // `project` still undefined, so folding them together spins forever.
  if (isLoading) {
    return <LoadingSpinner text="Loading project..." />;
  }

  if (!project || !id) {
    return (
      <EmptyState
        title="Project not found"
        description="This project may have been deleted, or the link is wrong."
        action={
          <GlassButton icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>
            Back to Projects
          </GlassButton>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={[project.project_type, project.customer_name, project.site_location]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {canEdit ? (
              <Select
                className="dl-select"
                value={project.status}
                style={{ width: 130 }}
                onChange={(status) => updateProject.mutate({ id, data: { status } })}
                options={['UPCOMING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'ARCHIVED'].map((s) => ({
                  value: s,
                  label: s.replace('_', ' '),
                }))}
              />
            ) : (
              <StatusBadge status={project.status} />
            )}
            {canEdit && project.status !== 'CLOSED' && (
              <GlassButton variant="ghost" onClick={() => setCloseOpen(true)}>
                Close
              </GlassButton>
            )}
            <ShareButton title={`Project: ${project.name}`} url={`/projects/${id}`} />
            <GlassButton variant="ghost" icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>
              Back
            </GlassButton>
          </div>
        }
      />

      <CloseProjectModal
        projectId={id}
        members={project.members}
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
      />

      {deskOnly && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: '0 0 12px',
            padding: '8px 12px',
            borderRadius: 8,
            background: 'var(--overlay-subtle)',
            color: 'var(--text-muted)',
            fontSize: 12,
          }}
        >
          <FileOutlined />
          <span>
            Desktop survey — no equipment or site team yet. Start a physical survey
            phase to issue equipment and add a site team.
          </span>
        </div>
      )}

      <Tabs
        defaultActiveKey="overview"
        items={[
          // Overview first: what exists on this project, before any one part
          // of it. An archive nobody can survey is a filing cabinet.
          { key: 'overview', label: 'Overview', children: <ProjectOverviewTab projectId={id} /> },
          { key: 'timeline', label: 'Timeline', children: <TimelineTab projectId={id} /> },
          { key: 'phases', label: 'Phases', children: <PhasesTab projectId={id} /> },
          ...(deskOnly
            ? []
            : [{ key: 'equipment', label: 'Equipment', children: <EquipmentTab projectId={id} /> }]),
          { key: 'files', label: 'Files & photos', children: <ProjectFilesTab projectId={id} /> },
          { key: 'deployed', label: 'Deployed', children: <DeployedTab projectId={id} /> },
          ...(deskOnly
            ? []
            : [{ key: 'team', label: 'Team', children: <TeamTab projectId={id} /> }]),
        ]}
      />
      <style>{`
        .ant-tabs-tab { color: var(--text-muted) !important; }
        .ant-tabs-tab-active .ant-tabs-tab-btn { color: var(--primary) !important; }
        .ant-tabs-ink-bar { background: var(--primary) !important; }
      `}</style>
    </div>
  );
}
