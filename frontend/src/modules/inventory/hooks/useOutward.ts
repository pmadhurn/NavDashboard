import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { api } from '@/shared/api/client';
import type { Asset } from './useAssets';
import { OUTCOMES, ReturnOutcome } from './useMovement';
import type { OutwardLineInput, OutwardPreview } from '@/modules/projects/hooks/useProjects';

export type MovementPurpose = 'DEPLOYMENT' | 'TESTING' | 'POC' | 'OTHER';

/** Purposes in the order the segmented control shows them (Testing first —
 *  it is the default and by far the most common reason to take items out). */
export const MOVEMENT_PURPOSES: { value: MovementPurpose; label: string }[] = [
  { value: 'TESTING', label: 'Testing' },
  { value: 'POC', label: 'POC' },
  { value: 'DEPLOYMENT', label: 'Deployment' },
  { value: 'OTHER', label: 'Other' },
];

export interface MovementAssetBrief {
  id: string;
  asset_code: string;
  name: string;
  serial_number: string | null;
}

export interface OutwardMovementItem {
  id: string;
  asset: MovementAssetBrief | null;
  quantity: number;
  condition_note: string | null;
  item_status: string;
  return_outcome: ReturnOutcome | null;
  outcome_note: string | null;
  resolved_at: string | null;
}

export interface OutwardMovement {
  id: string;
  project_id: string | null;
  project_name: string | null;
  direction: 'OUTWARD' | 'INWARD';
  purpose: MovementPurpose | null;
  movement_date: string;
  handled_by: string | null;
  handler: { id: string; full_name: string } | null;
  received_by_name: string | null;
  expected_return_date: string | null;
  notes: string | null;
  created_at: string;
  items: OutwardMovementItem[];
}

export interface OutwardMovementBody {
  project_id?: string;
  phase_id?: string;
  purpose: MovementPurpose;
  handled_by?: string;
  expected_return_date?: string;
  notes?: string;
  confirm: boolean;
  items: OutwardLineInput[];
}

/** "GP-XXXXXXXX" style pass number — first 8 chars of the movement id. */
export function passNumber(movementId: string): string {
  return movementId.slice(0, 8).toUpperCase();
}

/** Screen-side status of one movement line: still out, or how it resolved. */
export function movementItemStatus(item: OutwardMovementItem): { label: string; color: string } {
  if (!item.resolved_at) {
    return { label: 'Still out', color: 'var(--status-not-working)' };
  }
  const spec = OUTCOMES.find((o) => o.value === item.return_outcome);
  if (spec) return { label: spec.label, color: spec.color };
  return { label: item.item_status, color: 'var(--text-muted)' };
}

/**
 * Resolve a scanned/typed code to an asset. Accepts asset_code, serial number
 * or a tag value — every scan in the app goes through this one endpoint.
 */
export function lookupAsset(code: string): Promise<Asset> {
  return api.get<Asset>(`/assets/lookup/${encodeURIComponent(code.trim())}`);
}

// Query keys live under ['assets', ...] on purpose: every custody-changing
// mutation in this module (returns, outwards, handovers) already invalidates
// ['assets'], so open passes refresh without each mutation knowing about them.

export function useOpenOutwards() {
  return useQuery({
    queryKey: ['assets', 'movements', 'open'],
    queryFn: () => api.get<OutwardMovement[]>('/projects/movements/open'),
  });
}

export function useOutwardMovement(id: string | undefined) {
  return useQuery({
    queryKey: ['assets', 'movements', id],
    queryFn: () => api.get<OutwardMovement>(`/projects/movements/${id}`),
    enabled: !!id,
  });
}

export function usePreviewOutwardMovement() {
  return useMutation({
    mutationFn: (body: OutwardMovementBody) =>
      api.post<OutwardPreview>('/projects/movements/outward/preview', body),
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not check the items'),
  });
}

export function useExecuteOutwardMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OutwardMovementBody) =>
      api.post<OutwardMovement>('/projects/movements/outward', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (err: any) =>
      message.error(err?.response?.data?.detail || 'Could not record the outward'),
  });
}
