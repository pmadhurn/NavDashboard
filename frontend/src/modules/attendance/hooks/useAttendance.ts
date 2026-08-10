import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '@/shared/api/client';

export type DayType =
  | 'ON_FIELD'
  | 'IN_OFFICE'
  | 'AT_HOME'
  | 'HOLIDAY'
  | 'LEAVE'
  | 'COMP_OFF_TAKEN';

/** Ordered for the day-type picker: most frequently logged first. */
export const DAY_TYPES: { value: DayType; label: string; hint: string }[] = [
  { value: 'ON_FIELD', label: 'On field', hint: 'At a site — pick the project' },
  { value: 'IN_OFFICE', label: 'In office', hint: 'Working from the office' },
  { value: 'AT_HOME', label: 'At home', hint: 'No site work available' },
  { value: 'COMP_OFF_TAKEN', label: 'Comp off', hint: 'Spending accrued comp-off' },
  { value: 'LEAVE', label: 'Leave', hint: 'Personal leave' },
  { value: 'HOLIDAY', label: 'Holiday', hint: 'Company holiday' },
];

export const DAY_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  DAY_TYPES.map((d) => [d.value, d.label])
);

/** Colour per day type, drawn from the existing token ramp. */
export const DAY_TYPE_COLOR: Record<string, string> = {
  ON_FIELD: 'var(--status-not-working)',
  IN_OFFICE: 'var(--status-working)',
  AT_HOME: '#7E8FA6',
  HOLIDAY: '#7E6F9E',
  LEAVE: '#9E7E8A',
  COMP_OFF_TAKEN: '#5E8C86',
};

export interface AttendanceDay {
  id: string;
  person_id: string;
  person_name: string | null;
  day: string;
  day_type: DayType;
  project_id: string | null;
  project_name: string | null;
  phase_id: string | null;
  departed_at: string | null;
  completed_at: string | null;
  note: string | null;
  logged_by: string;
  created_at: string;
}

export interface AttendanceSummary {
  person_id: string;
  person_name: string | null;
  date_from: string;
  date_to: string;
  counts: Record<string, number>;
  total_logged: number;
  comp_off_balance: number;
}

export interface CompOffBalance {
  person_id: string;
  person_name: string | null;
  balance: number;
  accrued: number;
  consumed: number;
}

export interface CompOffEntry {
  id: string;
  person_id: string;
  entry_type: 'ACCRUED' | 'CONSUMED' | 'ADJUSTED';
  days: number;
  source_day_id: string | null;
  reason: string | null;
  created_by: string;
  created_at: string;
}

interface Range {
  date_from?: string;
  date_to?: string;
}

export function useMyAttendance(range: Range = {}) {
  return useQuery({
    queryKey: ['attendance', 'me', range],
    queryFn: () => api.get<AttendanceDay[]>('/attendance/me', range),
  });
}

export function useMySummary(range: Range = {}) {
  return useQuery({
    queryKey: ['attendance', 'me', 'summary', range],
    queryFn: () => api.get<AttendanceSummary>('/attendance/me/summary', range),
  });
}

export function useMyCompOff() {
  return useQuery({
    queryKey: ['attendance', 'me', 'comp-off'],
    queryFn: () => api.get<CompOffBalance>('/attendance/me/comp-off'),
  });
}

export function useAttendanceBoard(range: Range = {}) {
  return useQuery({
    queryKey: ['attendance', 'board', range],
    queryFn: () => api.get<AttendanceDay[]>('/attendance/board', range),
  });
}

export function usePersonAttendance(personId: string | undefined, range: Range = {}) {
  return useQuery({
    queryKey: ['attendance', 'person', personId, range],
    queryFn: () => api.get<AttendanceDay[]>(`/attendance/person/${personId}`, range),
    enabled: !!personId,
  });
}

export function useCompOffBalance(personId: string | undefined) {
  return useQuery({
    queryKey: ['attendance', 'comp-off', personId],
    queryFn: () => api.get<CompOffBalance>(`/attendance/comp-off/${personId}`),
    enabled: !!personId,
  });
}

export function useCompOffLedger(personId: string | undefined) {
  return useQuery({
    queryKey: ['attendance', 'comp-off', personId, 'ledger'],
    queryFn: () => api.get<CompOffEntry[]>(`/attendance/comp-off/${personId}/ledger`),
    enabled: !!personId,
  });
}

/** Everything attendance-related is invalidated together: logging a day moves
 *  the summary, the board and the comp-off balance at once. */
function invalidateAttendance(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['attendance'] });
}

export interface LogDayInput {
  person_id: string;
  day: string;
  day_type: DayType;
  project_id?: string | null;
  departed_at?: string | null;
  completed_at?: string | null;
  note?: string | null;
}

export function useLogDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LogDayInput) => api.post<AttendanceDay>('/attendance', data),
    onSuccess: () => {
      invalidateAttendance(qc);
      message.success('Day logged');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Could not log the day');
    },
  });
}

export function useUpdateDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LogDayInput> }) =>
      api.put<AttendanceDay>(`/attendance/${id}`, data),
    onSuccess: () => {
      invalidateAttendance(qc);
      message.success('Day updated');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Could not update the day');
    },
  });
}

export function useDeleteDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/attendance/${id}`),
    onSuccess: () => {
      invalidateAttendance(qc);
      message.success('Day removed');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Could not remove the day');
    },
  });
}

export function useAdjustCompOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { person_id: string; days: number; reason: string }) =>
      api.post<CompOffEntry>('/attendance/comp-off/adjust', data),
    onSuccess: () => {
      invalidateAttendance(qc);
      message.success('Comp-off adjusted');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Could not adjust comp-off');
    },
  });
}
