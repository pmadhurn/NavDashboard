import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightOutlined } from '@ant-design/icons';
import GlassModal from '@/shared/components/GlassModal';
import GlassButton from '@/shared/components/GlassButton';
import type { Guide } from '../guides';

interface GuideViewerProps {
  guide: Guide | null;
  open: boolean;
  onClose: () => void;
}

/**
 * One step at a time: art on top, title, one-line caption, progress dots, and
 * Back/Next pinned at the bottom where a thumb can reach them on a phone.
 */
export default function GuideViewer({ guide, open, onClose }: GuideViewerProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // A fresh guide (or a re-open) always starts at step one.
  useEffect(() => {
    if (open) setStep(0);
  }, [open, guide?.key]);

  if (!guide) return null;

  const steps = guide.steps;
  const current = steps[Math.min(step, steps.length - 1)];
  if (!current) return null;
  const isLast = step >= steps.length - 1;

  const tryItNow = () => {
    onClose();
    navigate(guide.tryRoute);
  };

  return (
    <GlassModal open={open} onClose={onClose} title={guide.title} width={420} footer={null}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Art. Fixed aspect (320x200) so steps don't jump in height. */}
        <div
          style={{
            background: 'var(--overlay-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '12px 8px',
          }}
        >
          {current.art}
        </div>

        <div style={{ textAlign: 'center', minHeight: 64 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            {current.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{current.caption}</div>
        </div>

        {/* Progress dots */}
        <div
          style={{ display: 'flex', justifyContent: 'center', gap: 8 }}
          aria-label={`Step ${step + 1} of ${steps.length}`}
        >
          {steps.map((s, i) => (
            <span
              key={s.title}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? 20 : 8,
                height: 8,
                borderRadius: 4,
                cursor: 'pointer',
                background: i === step ? guide.accent : 'var(--text-muted)',
                opacity: i === step ? 1 : 0.35,
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>

        {/* Back / Next, thumb-reachable at the bottom. */}
        <div style={{ display: 'flex', gap: 10 }}>
          <GlassButton
            variant="ghost"
            size="lg"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            style={{ flex: 1 }}
          >
            Back
          </GlassButton>
          {isLast ? (
            <GlassButton variant="primary" size="lg" onClick={tryItNow} style={{ flex: 2 }}>
              Try it now <ArrowRightOutlined />
            </GlassButton>
          ) : (
            <GlassButton
              variant="primary"
              size="lg"
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              style={{ flex: 2 }}
            >
              Next
            </GlassButton>
          )}
        </div>
      </div>
    </GlassModal>
  );
}
