import { useState } from 'react';
import { FileOutlined, PrinterOutlined } from '@ant-design/icons';
import GlassModal from '@/shared/components/GlassModal';
import GlassButton from '@/shared/components/GlassButton';
import { LabelAsset, printLabels } from '@/shared/utils/qrLabels';

interface Props {
  open: boolean;
  onClose: () => void;
  assets: LabelAsset[];
}

/** Asks which physical label stock to print on, then hands off to printLabels. */
export default function PrintLabelsModal({ open, onClose, assets }: Props) {
  const [busy, setBusy] = useState<'a4' | 'single' | null>(null);

  const run = async (format: 'a4' | 'single') => {
    setBusy(format);
    try {
      await printLabels(assets, format);
      onClose();
    } finally {
      setBusy(null);
    }
  };

  const options: {
    format: 'a4' | 'single';
    icon: React.ReactNode;
    title: string;
    hint: string;
  }[] = [
    {
      format: 'a4',
      icon: <FileOutlined />,
      title: 'A4 sheet of stickers',
      hint: '24 labels per sheet (3 × 8, 63.5 × 33.9 mm) — any office printer',
    },
    {
      format: 'single',
      icon: <PrinterOutlined />,
      title: 'Single labels for thermal roll',
      hint: 'One 50 × 25 mm label per page — thermal label printers',
    },
  ];

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={`Print ${assets.length} label${assets.length === 1 ? '' : 's'}`}
      width={420}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <GlassButton variant="ghost" onClick={onClose}>
            Cancel
          </GlassButton>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map((o) => (
          <button
            key={o.format}
            type="button"
            disabled={busy !== null}
            onClick={() => run(o.format)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              borderRadius: 10,
              textAlign: 'left',
              cursor: busy ? 'wait' : 'pointer',
              border: '1px solid var(--overlay-subtle)',
              background: 'var(--overlay-subtle)',
              color: 'var(--text-primary)',
              opacity: busy && busy !== o.format ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: 22, color: 'var(--primary)' }}>{o.icon}</span>
            <span>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>
                {o.title}
              </span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>
                {o.hint}
              </span>
            </span>
          </button>
        ))}
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Each QR encodes the asset code — any phone camera or the in-app scanner reads it.
        </div>
      </div>
    </GlassModal>
  );
}
