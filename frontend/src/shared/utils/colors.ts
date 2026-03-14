import { colors } from '@/styles/theme';

export { colors };

export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'WORKING':
      return colors.status.working;
    case 'NOT_WORKING':
      return colors.status.notWorking;
    case 'FAULTY':
      return colors.status.faulty;
    default:
      return colors.text.muted;
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'LOW':
      return colors.severity.low;
    case 'MEDIUM':
      return colors.severity.medium;
    case 'HIGH':
      return colors.severity.high;
    case 'CRITICAL':
      return colors.severity.critical;
    default:
      return colors.text.muted;
  }
}

export function getDeviceTypeColor(type: string): string {
  switch (type.toUpperCase()) {
    case 'IU':
      return colors.tag.iu;
    case 'OU':
      return colors.tag.ou;
    case 'HC':
      return colors.tag.hc;
    case 'RF':
      return colors.tag.rf;
    default:
      return colors.text.muted;
  }
}

export function getRoleColor(role: string): string {
  switch (role.toUpperCase()) {
    case 'ADMIN':
      return colors.role.admin;
    case 'TECHNICIAN':
      return colors.role.technician;
    case 'VIEWER':
      return colors.role.viewer;
    default:
      return colors.text.muted;
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}