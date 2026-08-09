import { getStatusColor } from '@/shared/utils/colors';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusLabels: Record<string, string> = {
  WORKING: 'Working',
  NOT_WORKING: 'Not Working',
  FAULTY: 'Faulty',
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: isSmall ? '2px 8px' : '4px 12px',
        borderRadius: 20,
        background: `rgba(${hexToRgb(color)}, 0.1)`,
        fontSize: isSmall ? 11 : 13,
        fontWeight: 500,
        color,
        lineHeight: 1,
        // 'Not Working' wrapped to two lines in narrow table columns,
        // which broke row height and collided with lineHeight: 1.
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: isSmall ? 6 : 8,
          height: isSmall ? 6 : 8,
          borderRadius: '50%',
          background: color,
          animation: status === 'WORKING' ? 'pulse 2s ease-in-out infinite' : 'none',
        }}
      />
      {statusLabels[status] || status}
    </span>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}