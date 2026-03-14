import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function formatDate(date: string | Date | null): string {
  if (!date) return '—';
  const d = dayjs(date);
  if (!d.isValid()) return '—';
  return d.format('MMM D, YYYY');
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '—';
  const d = dayjs(date);
  if (!d.isValid()) return '—';
  return d.format('MMM D, YYYY HH:mm');
}

export function formatRelativeTime(date: string | Date): string {
  const d = dayjs(date);
  if (!d.isValid()) return '—';
  return d.fromNow();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function formatSerialNumber(serial: string): string {
  return serial.toUpperCase();
}

export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}