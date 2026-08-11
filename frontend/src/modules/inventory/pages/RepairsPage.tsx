import { useState } from 'react';
import { Select, Input, InputNumber, Tag } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ToolOutlined, PlusOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassModal from '@/shared/components/GlassModal';
import EmptyState from '@/shared/components/EmptyState';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import ShareButton from '@/shared/components/ShareButton';
import { usePermission } from '@/shared/stores/authStore';
import { usePersonnelList } from '@/modules/personnel/hooks/usePersonnel';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useAssets } from '../hooks/useAssets';
import { useStockLocations, useVendors } from '../hooks/useCustody';
import {
  REPAIR_STATUS_COLOR,
  REPAIR_STATUS_LABEL,
  Repair,
  useCompleteRepair,
  useReportDamage,
  useRepairs,
  useSendForRepair,
} from '../hooks/useMovement';

dayjs.extend(relativeTime);

function ReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [assetId, setAssetId] = useState<string>();
  const [details, setDetails] = useState('');
  const [where, setWhere] = useState('');
  const [personId, setPersonId] = useState<string>();
  const [projectId, setProjectId] = useState<string>();
  const { data: assets } = useAssets({ page: 1 });
  const { data: personnel } = usePersonnelList({ size: 200 });
  const { data: projects } = useProjects({});
  const report = useReportDamage();

  return (
    <GlassModal open={open} onClose={onClose} title="Report damage" footer={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Select
          value={assetId}
          onChange={setAssetId}
          showSearch
          optionFilterProp="label"
          placeholder="Which item?"
          options={(assets?.items ?? []).map((a) => ({
            value: a.id,
            label: `${a.asset_code} — ${a.name}`,
          }))}
        />
        <Input.TextArea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          placeholder="What is wrong with it?"
        />
        <Input
          value={where}
          onChange={(e) => setWhere(e.target.value)}
          placeholder="Where did it happen? (optional)"
        />
        <Select
          value={personId}
          onChange={setPersonId}
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Who had it? (optional)"
          options={(personnel?.items ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
        />
        <Select
          value={projectId}
          onChange={setProjectId}
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Which project? (optional)"
          options={(projects?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
          <GlassButton
            onClick={() =>
              report.mutate(
                {
                  asset_id: assetId!,
                  details: details.trim(),
                  damage_location: where.trim() || undefined,
                  responsible_person_id: personId,
                  project_id: projectId,
                },
                {
                  onSuccess: () => {
                    setAssetId(undefined);
                    setDetails('');
                    setWhere('');
                    onClose();
                  },
                }
              )
            }
            disabled={!assetId || !details.trim() || report.isPending}
          >
            Report
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

function RepairCard({ r }: { r: Repair }) {
  const [mode, setMode] = useState<'send' | 'close' | null>(null);
  const [vendorId, setVendorId] = useState<string>();
  const [cost, setCost] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [locationId, setLocationId] = useState<string>();
  const { data: vendors } = useVendors();
  const { data: locations } = useStockLocations();
  const send = useSendForRepair();
  const complete = useCompleteRepair();
  const canManage = usePermission('assets.repairs');

  const open = r.status === 'REPORTED' || r.status === 'SENT';

  return (
    <GlassCard>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.asset_code}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{r.asset_name}</span>
            <Tag
              style={{
                margin: 0,
                fontSize: 10,
                color: REPAIR_STATUS_COLOR[r.status],
                borderColor: REPAIR_STATUS_COLOR[r.status],
                background: 'transparent',
              }}
            >
              {REPAIR_STATUS_LABEL[r.status] ?? r.status}
            </Tag>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {r.damage_details}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {[
              r.damage_location,
              r.responsible_name && `had by ${r.responsible_name}`,
              `reported ${dayjs(r.created_at).fromNow()}`,
              r.cost != null && `₹${Number(r.cost).toLocaleString('en-IN')}`,
              r.sent_at && `sent ${dayjs(r.sent_at).fromNow()}`,
              r.received_at && `back ${dayjs(r.received_at).fromNow()}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
          {r.outcome_note && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {r.outcome_note}
            </div>
          )}
        </div>

        {open && canManage && (
          <div style={{ minWidth: 210, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {mode === null && (
              <>
                {r.status === 'REPORTED' && (
                  <GlassButton size="sm" onClick={() => setMode('send')}>
                    Send for repair
                  </GlassButton>
                )}
                <GlassButton size="sm" variant="ghost" onClick={() => setMode('close')}>
                  Close it out
                </GlassButton>
              </>
            )}
            {mode === 'send' && (
              <>
                <Select
                  value={vendorId}
                  onChange={setVendorId}
                  allowClear
                  placeholder="Vendor (optional)"
                  size="small"
                  options={(vendors ?? []).map((v) => ({ value: v.id, label: v.name }))}
                  notFoundContent="None added yet"
                />
                <InputNumber
                  value={cost}
                  onChange={setCost}
                  placeholder="Cost"
                  size="small"
                  style={{ width: '100%' }}
                  prefix="₹"
                />
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note"
                  size="small"
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <GlassButton size="sm" variant="ghost" onClick={() => setMode(null)}>
                    Back
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    onClick={() =>
                      send.mutate(
                        { id: r.id, vendor_id: vendorId, cost: cost ?? undefined, note: note || undefined },
                        { onSuccess: () => setMode(null) }
                      )
                    }
                    disabled={send.isPending}
                  >
                    Send
                  </GlassButton>
                </div>
              </>
            )}
            {mode === 'close' && (
              <>
                <Select
                  value={locationId}
                  onChange={setLocationId}
                  placeholder="Back to which location?"
                  size="small"
                  options={(locations ?? []).map((l) => ({ value: l.id, label: l.name }))}
                />
                <InputNumber
                  value={cost}
                  onChange={setCost}
                  placeholder="Final cost"
                  size="small"
                  style={{ width: '100%' }}
                  prefix="₹"
                />
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Outcome"
                  size="small"
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <GlassButton size="sm" variant="ghost" onClick={() => setMode(null)}>
                    Back
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    onClick={() =>
                      complete.mutate(
                        {
                          id: r.id,
                          repaired: true,
                          cost: cost ?? undefined,
                          note: note || undefined,
                          return_location_id: locationId,
                        },
                        { onSuccess: () => setMode(null) }
                      )
                    }
                    disabled={complete.isPending}
                  >
                    Repaired
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      complete.mutate(
                        { id: r.id, repaired: false, note: note || undefined },
                        { onSuccess: () => setMode(null) }
                      )
                    }
                    disabled={complete.isPending}
                  >
                    Beyond repair
                  </GlassButton>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export default function RepairsPage() {
  const [status, setStatus] = useState<string | undefined>();
  const [reportOpen, setReportOpen] = useState(false);
  const { data: repairs, isLoading } = useRepairs(status);
  const canReport = usePermission('assets.condition');

  return (
    <div>
      <PageHeader
        title="Repairs"
        icon={<ToolOutlined />}
        subtitle="Damage reported, sent out, and what came back"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Select
              value={status}
              onChange={setStatus}
              allowClear
              placeholder="All"
              style={{ minWidth: 160 }}
              options={Object.entries(REPAIR_STATUS_LABEL).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <ShareButton title="Equipment repairs" url="/inventory/repairs" />
            {canReport && (
              <GlassButton icon={<PlusOutlined />} onClick={() => setReportOpen(true)}>
                Report damage
              </GlassButton>
            )}
          </div>
        }
      />

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />

      {isLoading ? (
        <LoadingSpinner text="Loading repairs…" />
      ) : (repairs ?? []).length === 0 ? (
        <EmptyState
          icon={<ToolOutlined />}
          title="Nothing in for repair"
          description="Damage reported on any item shows up here until it is closed out."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(repairs ?? []).map((r) => (
            <RepairCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
