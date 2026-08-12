import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatePicker, InputNumber, Segmented, Select, message } from 'antd';
import type { Dayjs } from 'dayjs';
import {
  AppstoreAddOutlined,
  DeleteOutlined,
  ExportOutlined,
  PlusOutlined,
  QrcodeOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import GlassModal from '@/shared/components/GlassModal';
import PersonPicker from '@/shared/components/PersonPicker';
import QrScannerModal from '@/shared/components/QrScanner';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import type { OutwardPreview } from '@/modules/projects/hooks/useProjects';
import { Bundle, useBundles } from '../hooks/useMovement';
import { Asset, useAssets } from '../hooks/useAssets';
import {
  MOVEMENT_PURPOSES,
  MovementPurpose,
  OutwardMovementBody,
  lookupAsset,
  useExecuteOutwardMovement,
  usePreviewOutwardMovement,
} from '../hooks/useOutward';

interface Line {
  key: number;
  /** Set for inventory-backed lines; free-text new items have only a name. */
  assetId?: string;
  label: string;
  serial?: string | null;
  kind?: 'SERIALIZED' | 'BULK';
  name?: string;
  quantity: number;
}

const nextKey = (lines: Line[]) => Math.max(0, ...lines.map((l) => l.key)) + 1;

function KitPickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (kit: Bundle) => void;
}) {
  const { data: kits } = useBundles();
  return (
    <GlassModal open={open} onClose={onClose} title="Start from a kit" width={460} footer={null}>
      {(kits ?? []).length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>
          No kits yet — they are created on the Kits page.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
          {(kits ?? []).map((k) => {
            const ready = k.items.filter((i) => i.available).length;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => onPick(k)}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: '1px solid var(--overlay-subtle)',
                  background: 'var(--overlay-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>{k.name}</div>
                {k.description && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {k.description}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {k.items.length} item{k.items.length === 1 ? '' : 's'} · {ready} available now
                </div>
              </button>
            );
          })}
        </div>
      )}
    </GlassModal>
  );
}

/**
 * The engineer's outward form: purpose, who is taking it, and the items —
 * built from a kit, the scanner, or search — on one screen, ending in a gate
 * pass. Preview runs first so stock conflicts are shown before anything saves.
 */
export default function OutwardPage() {
  const navigate = useNavigate();
  const [purpose, setPurpose] = useState<MovementPurpose>('TESTING');
  const [projectId, setProjectId] = useState<string | undefined>();
  const [handledBy, setHandledBy] = useState<string | undefined>();
  const [expected, setExpected] = useState<Dayjs | null>(null);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState('');
  const [kitOpen, setKitOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [preview, setPreview] = useState<OutwardPreview | null>(null);

  // Scanner callbacks close over the render they were created in; the ref
  // keeps duplicate checks correct even for scans that land back-to-back.
  const linesRef = useRef<Line[]>(lines);
  linesRef.current = lines;

  const { data: projects } = useProjects({ status: 'ACTIVE' });
  const { data: assetData } = useAssets({ search });
  const previewOutward = usePreviewOutwardMovement();
  const executeOutward = useExecuteOutwardMovement();

  const touch = () => setPreview(null);

  const addAsset = (asset: Asset) => {
    const existing = linesRef.current.find((l) => l.assetId === asset.id);
    if (existing) {
      if (asset.item_kind === 'SERIALIZED') {
        message.info(`${asset.asset_code} is already on the list`);
        return;
      }
      setLines((prev) =>
        prev.map((l) => (l.assetId === asset.id ? { ...l, quantity: l.quantity + 1 } : l))
      );
      touch();
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        key: nextKey(prev),
        assetId: asset.id,
        label: `${asset.asset_code} — ${asset.name}`,
        serial: asset.serial_number,
        kind: asset.item_kind,
        quantity: 1,
      },
    ]);
    touch();
  };

  const addFreeText = () => {
    const name = search.trim();
    if (!name) return;
    setLines((prev) => [...prev, { key: nextKey(prev), label: name, name, quantity: 1 }]);
    setSearch('');
    touch();
  };

  const addKit = (kit: Bundle) => {
    setLines((prev) => {
      const next = [...prev];
      for (const item of kit.items) {
        if (next.some((l) => l.assetId === item.id)) continue;
        next.push({
          key: nextKey(next),
          assetId: item.id,
          label: `${item.asset_code} — ${item.name}`,
          quantity: item.quantity,
        });
      }
      return next;
    });
    setKitOpen(false);
    message.success(`Added items from "${kit.name}"`);
    touch();
  };

  const handleScan = async (code: string) => {
    try {
      const asset = await lookupAsset(code);
      addAsset(asset);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        message.error('No item with that code');
      } else {
        message.error(err?.response?.data?.detail || 'Could not look up that code');
      }
    }
  };

  const updateQuantity = (key: number, quantity: number) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity } : l)));
    touch();
  };

  const removeLine = (key: number) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
    touch();
  };

  const buildBody = (confirm: boolean): OutwardMovementBody => ({
    project_id: projectId,
    purpose,
    handled_by: handledBy,
    expected_return_date: expected ? expected.toISOString() : undefined,
    notes: notes.trim() || undefined,
    confirm,
    items: lines.map((l) => ({
      asset_id: l.assetId,
      name: l.assetId ? undefined : l.name,
      quantity: l.quantity,
    })),
  });

  const needsProject = purpose === 'DEPLOYMENT' && !projectId;
  const needsPerson = !projectId && !handledBy;
  const canSubmit = lines.length > 0 && !needsProject && !needsPerson;

  const finish = (movementId: string) => {
    message.success('Recorded — here is the gate pass');
    navigate(`/inventory/outward/${movementId}`);
  };

  const submit = async () => {
    try {
      const result = await previewOutward.mutateAsync(buildBody(false));
      setPreview(result);
      if (result.has_conflicts) {
        message.warning('Some lines need a look — check the notes below');
        return;
      }
      const movement = await executeOutward.mutateAsync(buildBody(false));
      finish(movement.id);
    } catch {
      /* the hooks already toast the server's explanation */
    }
  };

  const confirmAnyway = async () => {
    try {
      const movement = await executeOutward.mutateAsync(buildBody(true));
      finish(movement.id);
    } catch {
      /* toasted by the hook */
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: 'var(--text-muted)',
    marginBottom: 6,
  };

  const assetOptions = (assetData?.items ?? []).map((a) => ({
    value: a.id,
    label: `${a.asset_code} — ${a.name}`,
  }));

  return (
    <div>
      <PageHeader
        title="Take items out"
        icon={<ExportOutlined />}
        subtitle="List what leaves the office — you get a gate pass at the end"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
        <GlassCard padding="md">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Why is it going out?</label>
              <Segmented
                block
                value={purpose}
                onChange={(v) => {
                  setPurpose(v as MovementPurpose);
                  touch();
                }}
                options={MOVEMENT_PURPOSES.map((p) => ({ label: p.label, value: p.value }))}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Project {purpose === 'DEPLOYMENT' ? '(required for deployment)' : '(optional)'}
              </label>
              <Select
                className="dl-select"
                style={{ width: '100%' }}
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder={
                  purpose === 'DEPLOYMENT' ? 'Which project is this for?' : 'Going to a project?'
                }
                status={needsProject ? 'warning' : undefined}
                value={projectId}
                onChange={(v) => {
                  setProjectId(v);
                  touch();
                }}
                options={(projects?.items ?? []).map((p) => ({ value: p.id, label: p.name }))}
              />
              {needsProject && (
                <div style={{ fontSize: 11, color: 'var(--status-not-working)', marginTop: 4 }}>
                  A deployment must name its project.
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>
                Who is taking it {projectId ? '(optional)' : '(required)'}
              </label>
              <PersonPicker
                value={handledBy}
                onChange={(v) => {
                  setHandledBy(v || undefined);
                  touch();
                }}
                placeholder="Person walking out with the items"
              />
              {needsPerson && (
                <div style={{ fontSize: 11, color: 'var(--status-not-working)', marginTop: 4 }}>
                  Without a project, name the person responsible.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={labelStyle}>Expected back (optional)</label>
                <DatePicker
                  value={expected}
                  onChange={setExpected}
                  style={{ width: '100%' }}
                  placeholder="When it should return"
                />
              </div>
              <div style={{ flex: 2, minWidth: 200 }}>
                <label style={labelStyle}>Notes (optional)</label>
                <GlassInput value={notes} onChange={setNotes} placeholder="Anything worth noting" />
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md" title="Items">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 8,
              }}
            >
              <GlassButton
                variant="ghost"
                icon={<AppstoreAddOutlined />}
                onClick={() => setKitOpen(true)}
              >
                Start from a kit
              </GlassButton>
              <GlassButton
                variant="ghost"
                icon={<QrcodeOutlined />}
                onClick={() => setScanOpen(true)}
              >
                Scan
              </GlassButton>
            </div>

            <Select
              className="dl-select"
              style={{ width: '100%' }}
              showSearch
              value={null}
              searchValue={search}
              filterOption={false}
              placeholder="Search inventory to add an item…"
              onSearch={setSearch}
              onChange={(v) => {
                const asset = (assetData?.items ?? []).find((a) => a.id === v);
                if (asset) addAsset(asset);
                setSearch('');
              }}
              options={assetOptions}
              notFoundContent={
                search.trim() ? (
                  <div style={{ padding: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                    Nothing in inventory matches — add it as a new item below.
                  </div>
                ) : (
                  <div style={{ padding: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    Type to search by name, code or serial.
                  </div>
                )
              }
              dropdownRender={(menu) => (
                <>
                  {menu}
                  {search.trim() && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={addFreeText}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderTop: '1px solid var(--overlay-subtle)',
                        cursor: 'pointer',
                        color: 'var(--secondary)',
                        fontSize: 13,
                      }}
                    >
                      <PlusOutlined /> Add “{search.trim()}” as a new item
                    </button>
                  )}
                </>
              )}
            />

            {lines.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  padding: '18px 8px',
                  border: '1px dashed var(--overlay-subtle)',
                  borderRadius: 10,
                }}
              >
                Nothing listed yet — pick a kit, scan the items, or search above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lines.map((line, index) => {
                  const conflict = preview?.lines.find((r) => r.index === index);
                  const hasConflict = conflict && conflict.conflict !== 'NONE';
                  return (
                    <div
                      key={line.key}
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: 'var(--overlay-subtle)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {line.label}
                          {!line.assetId && (
                            <span style={{ fontSize: 10, color: 'var(--secondary)', marginLeft: 6 }}>
                              new item
                            </span>
                          )}
                        </div>
                        {line.serial && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            SN {line.serial}
                          </div>
                        )}
                        {hasConflict && (
                          <div
                            style={{
                              fontSize: 11,
                              marginTop: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              color:
                                conflict.conflict === 'INSUFFICIENT'
                                  ? 'var(--status-not-working)'
                                  : '#6F8CB6',
                            }}
                          >
                            <WarningOutlined />
                            {conflict.message}
                          </div>
                        )}
                      </div>
                      {line.kind === 'SERIALIZED' ? (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 56, textAlign: 'center' }}>
                          × 1
                        </span>
                      ) : (
                        <InputNumber
                          size="small"
                          min={1}
                          value={line.quantity}
                          onChange={(v) => updateQuantity(line.key, v ?? 1)}
                          style={{ width: 64 }}
                        />
                      )}
                      <GlassButton
                        variant="ghost"
                        size="sm"
                        icon={<DeleteOutlined />}
                        onClick={() => removeLine(line.key)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </GlassCard>

        {preview?.has_conflicts && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(182,138,60,0.1)',
              border: '1px solid rgba(182,138,60,0.3)',
              fontSize: 12,
              color: '#D8B77A',
            }}
          >
            Some items exceed stock or aren't in inventory yet. Confirming will create the new
            items and top up recorded stock to cover the extra.
          </div>
        )}

        <div
          style={{
            position: 'sticky',
            bottom: 0,
            padding: '12px 0',
            background: 'var(--bg-main)',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 'auto' }}>
            {lines.length} item{lines.length === 1 ? '' : 's'} listed
          </span>
          {preview?.has_conflicts ? (
            <GlassButton onClick={confirmAnyway} loading={executeOutward.isPending}>
              Confirm anyway
            </GlassButton>
          ) : (
            <GlassButton
              onClick={submit}
              disabled={!canSubmit}
              loading={previewOutward.isPending || executeOutward.isPending}
            >
              Take it out
            </GlassButton>
          )}
        </div>
      </div>

      <KitPickerModal open={kitOpen} onClose={() => setKitOpen(false)} onPick={addKit} />
      <QrScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={handleScan}
        continuous
      />
    </div>
  );
}
