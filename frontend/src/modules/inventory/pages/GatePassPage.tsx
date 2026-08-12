import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import EmptyState from '@/shared/components/EmptyState';
import { formatDate } from '@/shared/utils/formatters';
import { escapeHtml, openPrintWindow, qrDataUrl } from '@/shared/utils/qrLabels';
import {
  MOVEMENT_PURPOSES,
  OutwardMovement,
  movementItemStatus,
  passNumber,
  useOutwardMovement,
} from '../hooks/useOutward';

function purposeLabel(purpose: string | null): string {
  return MOVEMENT_PURPOSES.find((p) => p.value === purpose)?.label ?? purpose ?? '—';
}

function takenBy(movement: OutwardMovement): string {
  return movement.handler?.full_name ?? movement.received_by_name ?? '—';
}

/** Self-contained printable pass — no app CSS, physical units, one page. */
function gatePassHtml(movement: OutwardMovement, qr: string): string {
  const rows = movement.items
    .map(
      (item) => `
      <tr>
        <td class="mono">${escapeHtml(item.asset?.asset_code ?? '—')}</td>
        <td>${escapeHtml(item.asset?.name ?? 'New item')}</td>
        <td class="mono">${escapeHtml(item.asset?.serial_number ?? '—')}</td>
        <td class="num">${item.quantity}</td>
        <td>${escapeHtml(item.condition_note ?? '')}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Gate pass ${passNumber(movement.id)}</title><style>
    * { box-sizing: border-box; }
    @page { size: A4; margin: 14mm; }
    body { margin: 0; font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #000; background: #fff; font-size: 11pt; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; border-bottom: 2px solid #000; padding-bottom: 4mm; }
    h1 { font-size: 15pt; margin: 0 0 2mm; }
    .pass-no { font-family: Consolas, Menlo, monospace; font-size: 13pt; font-weight: 700; }
    .qr { width: 30mm; height: 30mm; }
    .facts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2mm 8mm; margin: 5mm 0; }
    .fact .k { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5pt; color: #555; }
    .fact .v { font-size: 11pt; }
    table { width: 100%; border-collapse: collapse; margin-top: 2mm; }
    th, td { border: 1px solid #999; padding: 2mm 2.5mm; text-align: left; font-size: 9.5pt; vertical-align: top; }
    th { background: #eee; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5pt; }
    .mono { font-family: Consolas, Menlo, monospace; }
    .num { text-align: right; }
    .sigs { display: flex; justify-content: space-between; gap: 16mm; margin-top: 18mm; }
    .sig { flex: 1; border-top: 1px solid #000; padding-top: 2mm; font-size: 9pt; text-align: center; }
    .foot { margin-top: 8mm; font-size: 8pt; color: #666; }
  </style></head><body>
    <div class="head">
      <div>
        <h1>NavDashboard — Equipment Gate Pass</h1>
        <div class="pass-no">Pass No. ${passNumber(movement.id)}</div>
      </div>
      <img class="qr" src="${qr}" alt="${escapeHtml(movement.id)}"/>
    </div>
    <div class="facts">
      <div class="fact"><div class="k">Date</div><div class="v">${escapeHtml(formatDate(movement.movement_date))}</div></div>
      <div class="fact"><div class="k">Purpose</div><div class="v">${escapeHtml(purposeLabel(movement.purpose))}</div></div>
      <div class="fact"><div class="k">Project</div><div class="v">${escapeHtml(movement.project_name ?? '—')}</div></div>
      <div class="fact"><div class="k">Taken by</div><div class="v">${escapeHtml(takenBy(movement))}</div></div>
      <div class="fact"><div class="k">Expected return</div><div class="v">${escapeHtml(formatDate(movement.expected_return_date))}</div></div>
      <div class="fact"><div class="k">Notes</div><div class="v">${escapeHtml(movement.notes ?? '—')}</div></div>
    </div>
    <table>
      <thead><tr><th>Code</th><th>Item</th><th>Serial</th><th>Qty</th><th>Condition note</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="sigs">
      <div class="sig">Taken by</div>
      <div class="sig">Checked by security</div>
    </div>
    <div class="foot">Scan the QR at the gate or on the Receive items back screen to pull this pass up.</div>
    <script>window.addEventListener("load",function(){setTimeout(function(){window.print();},150);});</script>
  </body></html>`;
}

/**
 * The gate pass for one outward movement — printable for the security desk,
 * and on screen it doubles as the movement detail with live per-item status.
 */
export default function GatePassPage() {
  const { movementId } = useParams<{ movementId: string }>();
  const navigate = useNavigate();
  const { data: movement, isLoading } = useOutwardMovement(movementId);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (movement) {
      qrDataUrl(movement.id, 300).then((url) => {
        if (!cancelled) setQr(url);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [movement]);

  if (isLoading) return <LoadingSpinner text="Loading the pass…" />;

  if (!movement) {
    return (
      <EmptyState
        title="Pass not found"
        description="This movement may have been removed, or the link is wrong."
        action={
          <GlassButton icon={<ArrowLeftOutlined />} onClick={() => navigate('/inventory/inward')}>
            Open passes
          </GlassButton>
        }
      />
    );
  }

  const resolved = movement.items.filter((i) => i.resolved_at).length;

  const printPass = async () => {
    const passQr = qr ?? (await qrDataUrl(movement.id, 300));
    openPrintWindow(gatePassHtml(movement, passQr));
  };

  const factStyle: React.CSSProperties = { minWidth: 120 };
  const factLabel: React.CSSProperties = {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  };
  const factValue: React.CSSProperties = { fontSize: 14, color: 'var(--text-primary)' };

  return (
    <div>
      <PageHeader
        title={`Gate pass ${passNumber(movement.id)}`}
        subtitle="Print it for the gate — this page tracks what has come back"
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <GlassButton icon={<PrinterOutlined />} onClick={printPass}>
              Print pass
            </GlassButton>
            <GlassButton
              variant="ghost"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
            >
              Back
            </GlassButton>
          </div>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
        <GlassCard padding="md">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px', flex: 1 }}>
              <div style={factStyle}>
                <div style={factLabel}>Date</div>
                <div style={factValue}>{formatDate(movement.movement_date)}</div>
              </div>
              <div style={factStyle}>
                <div style={factLabel}>Purpose</div>
                <div style={factValue}>{purposeLabel(movement.purpose)}</div>
              </div>
              <div style={factStyle}>
                <div style={factLabel}>Project</div>
                <div style={factValue}>{movement.project_name ?? '—'}</div>
              </div>
              <div style={factStyle}>
                <div style={factLabel}>Taken by</div>
                <div style={factValue}>{takenBy(movement)}</div>
              </div>
              <div style={factStyle}>
                <div style={factLabel}>Expected return</div>
                <div style={factValue}>{formatDate(movement.expected_return_date)}</div>
              </div>
              <div style={factStyle}>
                <div style={factLabel}>Returned</div>
                <div style={factValue}>
                  {resolved} of {movement.items.length} resolved
                </div>
              </div>
            </div>
            {qr && (
              <img
                src={qr}
                alt="Pass QR"
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 8,
                  background: '#fff',
                  padding: 4,
                }}
              />
            )}
          </div>
          {movement.notes && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 12 }}>
              {movement.notes}
            </div>
          )}
        </GlassCard>

        <GlassCard padding="md" title="Items on this pass">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {movement.items.map((item) => {
              const status = movementItemStatus(item);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--overlay-subtle)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', minWidth: 78 }}>
                    {item.asset?.asset_code ?? '—'}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, minWidth: 140 }}>
                    {item.asset?.name ?? 'New item'}
                    {item.asset?.serial_number && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                        SN {item.asset.serial_number}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>× {item.quantity}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: status.color,
                      border: `1px solid ${status.color}`,
                      borderRadius: 10,
                      padding: '1px 8px',
                    }}
                  >
                    {status.label}
                  </span>
                  {item.outcome_note && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', width: '100%' }}>
                      {item.outcome_note}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
