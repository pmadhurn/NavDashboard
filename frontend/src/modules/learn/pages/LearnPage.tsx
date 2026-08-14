import { useState } from 'react';
import { ReadOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GuideViewer from '../components/GuideViewer';
import { GUIDES, type Guide } from '../guides';

/**
 * /learn — a grid of short illustrated walkthroughs. Deliberately unguarded:
 * learning how the system works is for everyone, before they have the
 * permission to do the thing.
 */
export default function LearnPage() {
  const [active, setActive] = useState<Guide | null>(null);
  const [open, setOpen] = useState(false);

  const openGuide = (guide: Guide) => {
    setActive(guide);
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Learn"
        icon={<ReadOutlined />}
        subtitle="Short picture guides to how things work here — a minute each"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: 16,
        }}
      >
        {GUIDES.map((guide) => (
          <GlassCard
            key={guide.key}
            hoverable
            accentColor={guide.accent}
            padding="md"
            onClick={() => openGuide(guide)}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 26, color: guide.accent, lineHeight: 1 }}>
                {guide.icon}
              </span>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                }}
              >
                {guide.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {guide.subtitle}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {guide.steps.length} steps
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GuideViewer guide={active} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
