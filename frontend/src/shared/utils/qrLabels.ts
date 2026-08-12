import QRCode from 'qrcode';
import { message } from 'antd';

/** The subset of an asset a printed label needs. */
export interface LabelAsset {
  asset_code: string;
  name: string;
  serial_number?: string | null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** QR image as a data URI. The payload for asset labels is exactly the asset_code. */
export function qrDataUrl(payload: string, sizePx = 256): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: sizePx,
  });
}

/**
 * Open a new window, write a self-contained printable document into it and let
 * its own load handler call print(). Shared by label printing and the gate
 * pass — anything that must print without the app chrome around it.
 */
export function openPrintWindow(html: string): boolean {
  const win = window.open('', '_blank', 'width=900,height=650');
  if (!win) {
    message.error('Popup blocked — allow popups for this site to print.');
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

const PRINT_SCRIPT =
  '<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},150);});</script>';

interface RenderedLabel extends LabelAsset {
  qr: string;
}

function labelHtml(l: RenderedLabel): string {
  return (
    `<div class="label">` +
    `<img src="${l.qr}" alt="${escapeHtml(l.asset_code)}"/>` +
    `<div class="meta">` +
    `<div class="code">${escapeHtml(l.asset_code)}</div>` +
    `<div class="name">${escapeHtml(l.name)}</div>` +
    (l.serial_number ? `<div class="serial">SN ${escapeHtml(l.serial_number)}</div>` : '') +
    `</div></div>`
  );
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// Print styles are deliberately physical units (mm) and inline — the document
// must render identically with no app CSS in reach.
const SHARED_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #000; background: #fff; }
  .label { display: flex; align-items: center; overflow: hidden; }
  .meta { min-width: 0; flex: 1; }
  .code { font-family: 'SFMono-Regular', Consolas, Menlo, monospace; font-weight: 700; }
  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .serial { color: #444; }
`;

/** A4 sheet: 3 × 8 grid of 63.5 × 33.9 mm labels (standard 24-up stickers). */
function a4Document(labels: RenderedLabel[]): string {
  const sheets = chunk(labels, 24)
    .map((page) => `<div class="sheet">${page.map(labelHtml).join('')}</div>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Asset labels</title><style>
    @page { size: A4; margin: 8mm; }
    ${SHARED_CSS}
    .sheet { display: grid; grid-template-columns: repeat(3, 63.5mm); grid-auto-rows: 33.9mm; justify-content: center; break-after: page; }
    .sheet:last-child { break-after: auto; }
    .label { width: 63.5mm; height: 33.9mm; padding: 2mm 3mm; gap: 2.5mm; }
    .label img { width: 22mm; height: 22mm; flex-shrink: 0; }
    .code { font-size: 10pt; }
    .name { font-size: 7.5pt; }
    .serial { font-size: 6.5pt; }
  </style></head><body>${sheets}${PRINT_SCRIPT}</body></html>`;
}

/** One 50 × 25 mm label per page, for thermal roll printers. */
function singleDocument(labels: RenderedLabel[]): string {
  const body = labels.map(labelHtml).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Asset labels</title><style>
    @page { size: 50mm 25mm; margin: 0; }
    ${SHARED_CSS}
    .label { width: 50mm; height: 25mm; padding: 1.5mm 2mm; gap: 2mm; page-break-after: always; }
    .label:last-child { page-break-after: auto; }
    .label img { width: 20mm; height: 20mm; flex-shrink: 0; }
    .code { font-size: 9pt; }
    .name { font-size: 6.5pt; }
    .serial { font-size: 6pt; }
  </style></head><body>${body}${PRINT_SCRIPT}</body></html>`;
}

/**
 * Build QR labels for the given assets and open the browser's print dialog.
 * 'a4' → 24-up sticker sheet; 'single' → one label per page for thermal rolls.
 */
export async function printLabels(
  assets: LabelAsset[],
  format: 'a4' | 'single'
): Promise<void> {
  if (assets.length === 0) return;
  const labels: RenderedLabel[] = await Promise.all(
    assets.map(async (a) => ({ ...a, qr: await qrDataUrl(a.asset_code) }))
  );
  const html = format === 'a4' ? a4Document(labels) : singleDocument(labels);
  openPrintWindow(html);
}
