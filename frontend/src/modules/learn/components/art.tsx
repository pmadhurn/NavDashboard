import React from 'react';

/**
 * The shared visual vocabulary for the Learn guides.
 *
 * Every step illustration in every guide is composed from these primitives so
 * the whole section reads as one hand: same stroke, same fills, same phone
 * frame, same arrows. All colors are CSS variables, so the art follows the
 * theme for free.
 *
 * Canvas convention: every illustration lives on a 320x200 viewBox (see
 * <Art>), and children position themselves in those absolute coordinates.
 */

export const INK = 'var(--text-muted)';
export const HI = 'var(--secondary)';
export const OK = 'var(--status-working)';
export const WARN = 'var(--status-not-working)';
export const FILL = 'var(--overlay-subtle)';
export const TEXT = 'var(--text-primary)';

/** The outer SVG frame every step draws inside. */
export function Art({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 320 200"
      width="100%"
      height="auto"
      role="img"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {children}
    </svg>
  );
}

/** A phone screen frame. Children are drawn in canvas coordinates on top. */
export function Screen({
  x,
  y,
  w = 110,
  h = 160,
  children,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  children?: React.ReactNode;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={14} fill={FILL} stroke={INK} strokeWidth={1.5} />
      {/* home indicator */}
      <line
        x1={x + w / 2 - 14}
        y1={y + h - 8}
        x2={x + w / 2 + 14}
        y2={y + h - 8}
        stroke={INK}
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.5}
      />
      {children}
    </g>
  );
}

/** A button. tone: default | primary (highlight) | ok (success). */
export function Btn({
  x,
  y,
  w = 80,
  h = 22,
  label,
  tone = 'default',
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  tone?: 'default' | 'primary' | 'ok';
}) {
  const stroke = tone === 'primary' ? HI : tone === 'ok' ? OK : INK;
  const textColor = tone === 'default' ? TEXT : stroke;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill={FILL}
        stroke={stroke}
        strokeWidth={tone === 'default' ? 1 : 1.6}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={tone === 'default' ? 400 : 600}
        fill={textColor}
      >
        {label}
      </text>
    </g>
  );
}

/** A list row, optionally with a status dot, a check, or a highlight border. */
export function Row({
  x,
  y,
  w = 90,
  label,
  dot,
  checked = false,
  active = false,
}: {
  x: number;
  y: number;
  w?: number;
  label: string;
  dot?: 'ok' | 'warn';
  checked?: boolean;
  active?: boolean;
}) {
  const dotColor = dot === 'ok' ? OK : WARN;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={18}
        rx={5}
        fill={FILL}
        stroke={active ? HI : INK}
        strokeWidth={active ? 1.6 : 0.8}
        opacity={active ? 1 : 0.9}
      />
      <text x={x + 7} y={y + 12.5} fontSize={10} fill={TEXT}>
        {label}
      </text>
      {dot && <circle cx={x + w - 10} cy={y + 9} r={3.5} fill={dotColor} />}
      {checked && (
        <polyline
          points={`${x + w - 15},${y + 9} ${x + w - 12},${y + 12.5} ${x + w - 6.5},${y + 5.5}`}
          fill="none"
          stroke={OK}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

/** An arrow with a drawn head (no markers, so ids never collide). */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  color = HI,
  dash = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  dash?: boolean;
}) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 8;
  const headW = 3.6;
  const bx = x2 - headLen * Math.cos(a);
  const by = y2 - headLen * Math.sin(a);
  const px = -Math.sin(a) * headW;
  const py = Math.cos(a) * headW;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={bx}
        y2={by}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeDasharray={dash ? '4 4' : undefined}
      />
      <polygon
        points={`${x2},${y2} ${bx + px},${by + py} ${bx - px},${by - py}`}
        fill={color}
      />
    </g>
  );
}

/** The fingertip: where the user taps. */
export function Tap({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={10} fill="none" stroke={HI} strokeWidth={1.6} opacity={0.65} />
      <circle cx={x} cy={y} r={4.5} fill={HI} />
    </g>
  );
}

/** A stylized QR sticker. */
export function QrBox({ x, y, size = 34 }: { x: number; y: number; size?: number }) {
  const u = size / 9;
  const finder = (fx: number, fy: number) => (
    <g>
      <rect x={fx} y={fy} width={u * 2.6} height={u * 2.6} fill="none" stroke={INK} strokeWidth={1.2} />
      <rect x={fx + u * 0.85} y={fy + u * 0.85} width={u * 0.9} height={u * 0.9} fill={INK} />
    </g>
  );
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx={3} fill={FILL} stroke={INK} strokeWidth={1.2} />
      {finder(x + u, y + u)}
      {finder(x + size - u * 3.6, y + u)}
      {finder(x + u, y + size - u * 3.6)}
      <rect x={x + size - u * 3.2} y={y + size - u * 3.2} width={u} height={u} fill={INK} />
      <rect x={x + size - u * 1.9} y={y + size - u * 2.6} width={u} height={u} fill={INK} />
      <rect x={x + size - u * 3.2} y={y + size - u * 1.7} width={u} height={u} fill={INK} />
      <rect x={x + u * 4.2} y={y + u * 4.2} width={u} height={u} fill={INK} />
    </g>
  );
}

/** A piece of equipment: a labelled box. */
export function DeviceBox({
  x,
  y,
  w = 62,
  h = 44,
  label,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={FILL} stroke={INK} strokeWidth={1.5} />
      <circle cx={x + w - 9} cy={y + 9} r={2.5} fill="none" stroke={INK} strokeWidth={1} />
      <text
        x={x + w / 2}
        y={y + h / 2 + 4.5}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill={TEXT}
      >
        {label}
      </text>
    </g>
  );
}

/** A person: head, shoulders, name below. */
export function Person({
  x,
  y,
  label,
  color = INK,
}: {
  x: number;
  y: number;
  label?: string;
  color?: string;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={8} fill={FILL} stroke={color} strokeWidth={1.5} />
      <path
        d={`M ${x - 13} ${y + 26} Q ${x} ${y + 8} ${x + 13} ${y + 26}`}
        fill={FILL}
        stroke={color}
        strokeWidth={1.5}
      />
      {label && (
        <text x={x} y={y + 39} textAnchor="middle" fontSize={11} fill={INK}>
          {label}
        </text>
      )}
    </g>
  );
}

/** A document / pass / receipt: page with a folded corner. */
export function Doc({
  x,
  y,
  w = 42,
  h = 54,
  label,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  label?: string;
}) {
  const fold = 11;
  return (
    <g>
      <path
        d={`M ${x} ${y} H ${x + w - fold} L ${x + w} ${y + fold} V ${y + h} H ${x} Z`}
        fill={FILL}
        stroke={INK}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path d={`M ${x + w - fold} ${y} V ${y + fold} H ${x + w}`} fill="none" stroke={INK} strokeWidth={1.2} />
      <line x1={x + 7} y1={y + 20} x2={x + w - 9} y2={y + 20} stroke={INK} strokeWidth={1.4} opacity={0.6} />
      <line x1={x + 7} y1={y + 28} x2={x + w - 9} y2={y + 28} stroke={INK} strokeWidth={1.4} opacity={0.6} />
      <line x1={x + 7} y1={y + 36} x2={x + w - 15} y2={y + 36} stroke={INK} strokeWidth={1.4} opacity={0.6} />
      {label && (
        <text x={x + w / 2} y={y + h + 13} textAnchor="middle" fontSize={11} fill={INK}>
          {label}
        </text>
      )}
    </g>
  );
}

/** A small status pill. */
export function Tag({
  x,
  y,
  label,
  color = HI,
}: {
  x: number;
  y: number;
  label: string;
  color?: string;
}) {
  const w = label.length * 6 + 16;
  return (
    <g>
      <rect x={x} y={y} width={w} height={18} rx={9} fill={FILL} stroke={color} strokeWidth={1.3} />
      <text
        x={x + w / 2}
        y={y + 12.5}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fill={color}
      >
        {label}
      </text>
    </g>
  );
}

/** A success check in a circle. */
export function Check({ x, y, r = 10 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={OK} strokeWidth={1.8} />
      <polyline
        points={`${x - r * 0.45},${y} ${x - r * 0.1},${y + r * 0.38} ${x + r * 0.5},${y - r * 0.35}`}
        fill="none"
        stroke={OK}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Camera viewfinder corner brackets, framing whatever sits inside. */
export function ScanFrame({ x, y, size = 52 }: { x: number; y: number; size?: number }) {
  const s = 12;
  const c = (d: string) => (
    <path d={d} fill="none" stroke={HI} strokeWidth={2} strokeLinecap="round" />
  );
  return (
    <g>
      {c(`M ${x} ${y + s} V ${y} H ${x + s}`)}
      {c(`M ${x + size - s} ${y} H ${x + size} V ${y + s}`)}
      {c(`M ${x + size} ${y + size - s} V ${y + size} H ${x + size - s}`)}
      {c(`M ${x + s} ${y + size} H ${x} V ${y + size - s}`)}
    </g>
  );
}

/** Plain text on the canvas. */
export function Label({
  x,
  y,
  children,
  size = 11,
  color = INK,
  anchor = 'middle',
  weight = 400,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  color?: string;
  anchor?: 'start' | 'middle' | 'end';
  weight?: number;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={color}>
      {children}
    </text>
  );
}
