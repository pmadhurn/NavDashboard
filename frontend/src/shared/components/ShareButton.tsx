import { WhatsAppOutlined } from '@ant-design/icons';
import GlassButton from './GlassButton';

interface ShareButtonProps {
  /** Text shown before the link, e.g. "Project: Mumbai POC". */
  title: string;
  /** Path or absolute URL to share. Defaults to the current page. */
  url?: string;
  /** Extra lines appended after the title (e.g. a short summary). */
  details?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Icon-only compact mode. */
  compact?: boolean;
}

export function buildWhatsAppUrl(title: string, url?: string, details?: string): string {
  const link = url
    ? url.startsWith('http')
      ? url
      : `${window.location.origin}${url}`
    : window.location.href;
  const parts = [title, details, link].filter(Boolean);
  return `https://wa.me/?text=${encodeURIComponent(parts.join('\n'))}`;
}

/** Opens WhatsApp with a prefilled message linking to a section of the app. */
export default function ShareButton({
  title,
  url,
  details,
  size = 'sm',
  compact = false,
}: ShareButtonProps) {
  const handleShare = () => {
    window.open(buildWhatsAppUrl(title, url, details), '_blank', 'noopener');
  };

  return (
    <GlassButton
      variant="ghost"
      size={size}
      icon={<WhatsAppOutlined />}
      onClick={handleShare}
    >
      {compact ? '' : 'Share'}
    </GlassButton>
  );
}
