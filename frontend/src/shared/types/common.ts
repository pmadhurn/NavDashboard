export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export type DeviceType = 'IU' | 'OU' | 'HC' | 'RF';
export type DeviceStatus = 'WORKING' | 'NOT_WORKING' | 'FAULTY';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type UserRole = 'ADMIN' | 'TECHNICIAN' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string | null;
  custom_fields: Record<string, unknown> | null;
}