import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { message } from 'antd';
import { CameraOutlined, RightOutlined, WarningOutlined } from '@ant-design/icons';
import GlassModal from './GlassModal';
import GlassButton from './GlassButton';
import GlassInput from './GlassInput';

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the decoded text (or the manually typed code). */
  onScan: (text: string) => void;
  /**
   * Keep the camera running after a read. Duplicate reads of the same code
   * within 2s are dropped; each accepted read shows a small toast. Without
   * this flag the modal closes itself after the first read.
   */
  continuous?: boolean;
}

function cameraErrorMessage(err: unknown): string {
  const name = (err as DOMException)?.name ?? '';
  const text =
    typeof err === 'string' ? err : String((err as Error)?.message ?? err ?? '');
  if (name === 'NotAllowedError' || /NotAllowedError|permission/i.test(text)) {
    return 'Camera blocked — allow camera access in the browser, or type the code below.';
  }
  if (name === 'NotFoundError' || /NotFoundError|device not found|no camera/i.test(text)) {
    return 'No camera found on this device — type the code below instead.';
  }
  return 'Could not start the camera — type the code below instead.';
}

/**
 * Camera QR scanner in a modal. The camera starts when the modal opens and is
 * stopped and released on close/unmount — never leaked. If the camera cannot
 * start (blocked, absent), the manual code input below still works, so a scan
 * flow always has a keyboard fallback.
 */
export default function QrScannerModal({
  open,
  onClose,
  onScan,
  continuous = false,
}: QrScannerModalProps) {
  // Stable per-instance container id: html5-qrcode addresses the DOM by id.
  const containerId = useRef(
    `qr-reader-${Math.random().toString(36).slice(2)}`
  ).current;
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');

  // Latest callbacks via refs so the camera does not restart on every render.
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const continuousRef = useRef(continuous);
  continuousRef.current = continuous;

  // Debounce duplicate decodes: the library fires several times per second
  // while the code is in front of the lens.
  const lastReadRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });

  useEffect(() => {
    if (!open) return;
    setError(null);
    setManual('');
    lastReadRef.current = { text: '', at: 0 };

    let cancelled = false;
    const scanner = new Html5Qrcode(containerId);

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          const now = Date.now();
          const last = lastReadRef.current;
          if (continuousRef.current) {
            if (text === last.text && now - last.at < 2000) return;
            lastReadRef.current = { text, at: now };
            message.info(`Scanned ${text}`, 1.2);
            onScanRef.current(text);
          } else {
            // Guard against a second decode racing the close animation.
            if (now - last.at < 2000) return;
            lastReadRef.current = { text, at: now };
            onScanRef.current(text);
            onCloseRef.current();
          }
        },
        () => {
          /* per-frame "nothing decoded" noise — ignore */
        }
      )
      .catch((err) => {
        if (!cancelled) setError(cameraErrorMessage(err));
      });

    return () => {
      cancelled = true;
      // stop() rejects if the camera never started (e.g. permission denied);
      // clear() alone is enough in that case.
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {
          try {
            scanner.clear();
          } catch {
            /* container already gone */
          }
        });
    };
  }, [open, containerId]);

  const submitManual = () => {
    const code = manual.trim();
    if (!code) return;
    setManual('');
    onScanRef.current(code);
    if (!continuousRef.current) onCloseRef.current();
  };

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={continuous ? 'Scan items' : 'Scan a code'}
      width={420}
      footer={null}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error ? (
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              padding: '14px 16px',
              borderRadius: 10,
              background: 'rgba(176,65,62,0.12)',
              border: '1px solid rgba(176,65,62,0.35)',
              color: 'var(--text-secondary)',
              fontSize: 13,
            }}
          >
            <WarningOutlined style={{ color: '#B0413E', marginTop: 2 }} />
            <span>{error}</span>
          </div>
        ) : (
          <div
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid var(--overlay-subtle)',
              background: 'rgba(0,0,0,0.4)',
              minHeight: 240,
            }}
          >
            {/* html5-qrcode renders the video + viewfinder shading in here */}
            <div id={containerId} style={{ width: '100%' }} />
          </div>
        )}

        {continuous && !error && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Keep scanning — each code is added as it is read.
          </div>
        )}

        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              color: 'var(--text-muted)',
              marginBottom: 6,
            }}
          >
            Or type the code
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <GlassInput
                value={manual}
                onChange={setManual}
                placeholder="Asset code or serial number"
                prefix={<CameraOutlined style={{ color: 'var(--text-muted)' }} />}
                onPressEnter={submitManual}
              />
            </div>
            <GlassButton
              icon={<RightOutlined />}
              onClick={submitManual}
              disabled={!manual.trim()}
            >
              Go
            </GlassButton>
          </div>
        </div>
      </div>
    </GlassModal>
  );
}
