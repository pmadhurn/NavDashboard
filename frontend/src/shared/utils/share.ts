/**
 * Building WhatsApp messages that are useful without the app.
 *
 * The people who receive these often have no NavDashboard login — a customer,
 * a manager in a group chat, a vendor. A bare link is useless to them, so the
 * message carries the actual figures and the link is a footnote.
 *
 * Everything here is built from data the sharer is already looking at, which
 * is data the server already decided they may see. Nothing fetches anything,
 * so nothing can leak something the page itself would not show.
 */

export interface ShareLine {
  label: string;
  value: string | number | null | undefined;
}

const FOOTER = 'Shared via NavDashboard.com';

export const inr = (n: number | null | undefined) =>
  `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/**
 * WhatsApp renders *bold* between single asterisks. Blank lines separate
 * blocks; more than one in a row collapses, so they are used deliberately.
 */
export function buildMessage(opts: {
  heading: string;
  subheading?: string;
  lines?: ShareLine[];
  bullets?: string[];
  note?: string;
  url?: string;
}): string {
  const { heading, subheading, lines = [], bullets = [], note, url } = opts;
  const out: string[] = [`*${heading}*`];
  if (subheading) out.push(subheading);

  const kept = lines.filter(
    (l) => l.value !== null && l.value !== undefined && l.value !== ''
  );
  if (kept.length) {
    out.push('');
    // Empty rows are dropped rather than shown as "—": a message padded with
    // blanks reads as broken, and the recipient cannot tell missing from zero.
    kept.forEach((l) => out.push(`${l.label}: ${l.value}`));
  }

  if (bullets.length) {
    out.push('');
    bullets.forEach((b) => out.push(`• ${b}`));
  }

  if (note) {
    out.push('');
    out.push(note);
  }

  if (url) {
    const link = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    out.push('');
    out.push(link);
  }

  out.push('');
  out.push(FOOTER);
  return out.join('\n');
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
