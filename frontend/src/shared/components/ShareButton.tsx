import { WhatsAppOutlined } from '@ant-design/icons';
import GlassButton from './GlassButton';
import { ShareLine, buildMessage, whatsappUrl } from '@/shared/utils/share';

interface ShareButtonProps {
  /** Heading of the message, e.g. "Marina Rooftop Rollout". */
  title: string;
  /** Path or absolute URL. Defaults to the current page. */
  url?: string;
  /** One line under the heading. */
  subtitle?: string;
  /** Label/value pairs — the figures that make the message worth sending. */
  lines?: ShareLine[];
  /** Free-form bullets, for lists rather than figures. */
  bullets?: string[];
  /** A closing sentence. */
  note?: string;
  /** Legacy: plain extra text. Superseded by `lines`. */
  details?: string;
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
}

export function buildWhatsAppUrl(title: string, url?: string, details?: string): string {
  return whatsappUrl(buildMessage({ heading: title, note: details, url }));
}

/**
 * Share to WhatsApp with content, not just a link.
 *
 * Most recipients have no login here — a customer, a manager in a group, a
 * vendor. The figures travel in the message; the link is a footnote for the
 * people who can follow it.
 *
 * The content is built from what the page already has, which is what the
 * server already decided this user may see. Nothing is fetched, so nothing can
 * be shared that the page itself would not show.
 */
export default function ShareButton({
  title,
  url,
  subtitle,
  lines,
  bullets,
  note,
  details,
  size = 'sm',
  compact = false,
}: ShareButtonProps) {
  const handleShare = () => {
    const message = buildMessage({
      heading: title,
      subheading: subtitle,
      lines,
      bullets,
      note: note ?? details,
      url,
    });
    window.open(whatsappUrl(message), '_blank', 'noopener');
  };

  return (
    <GlassButton
      variant="ghost"
      size={size}
      icon={<WhatsAppOutlined />}
      onClick={handleShare}
      title="Share a readable summary to WhatsApp"
    >
      {compact ? '' : 'Share'}
    </GlassButton>
  );
}
