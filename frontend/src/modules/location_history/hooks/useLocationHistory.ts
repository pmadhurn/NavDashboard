import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '@/shared/api/client';
import type { PaginatedResponse } from '@/shared/types/common';
import type { LocationHistory } from '@/shared/types/locations';

export interface LocationHistoryEntry extends LocationHistory {
  handler_name?: string;
  couple_name?: string;
}

interface CoupleOption {
  id: string;
  name: string;
  status: string;
}

interface TrailPoint {
  lat: number;
  lng: number;
  date: string;
  distance: number | null;
}

export function useLocationHistory(
  coupleId: string | null,
  dateRange: [string, string] | null,
  page: number = 1,
  size: number = 50
) {
  return useQuery({
    queryKey: ['location-history', coupleId, dateRange, page, size],
    queryFn: () => {
      const params: Record<string, unknown> = { page, size };
      if (coupleId) params.couple_id = coupleId;
      if (dateRange) {
        params.date_from = dateRange[0];
        params.date_to = dateRange[1];
      }
      return api.get<PaginatedResponse<LocationHistoryEntry>>(
        '/locations/history',
        params
      );
    },
  });
}

export function useAllLocationHistory(
  page: number = 1,
  size: number = 50,
  coupleId?: string | null,
  dateRange?: [string, string] | null
) {
  return useQuery({
    queryKey: ['location-history-all', page, size, coupleId, dateRange],
    queryFn: () => {
      const params: Record<string, unknown> = { page, size };
      if (coupleId) params.couple_id = coupleId;
      if (dateRange) {
        params.date_from = dateRange[0];
        params.date_to = dateRange[1];
      }
      return api.get<PaginatedResponse<LocationHistoryEntry>>(
        '/locations/history',
        params
      );
    },
  });
}

export function useCoupleTrailData(coupleId: string | null) {
  const query = useQuery({
    queryKey: ['couple-trail', coupleId],
    queryFn: () =>
      api.get<PaginatedResponse<LocationHistory>>(
        `/locations/history/${coupleId}`,
        { size: 100 }
      ),
    enabled: !!coupleId,
  });

  const trailPoints = useMemo<TrailPoint[]>(() => {
    if (!query.data?.items) return [];
    const sorted = [...query.data.items].sort(
      (a, b) => new Date(a.moved_at).getTime() - new Date(b.moved_at).getTime()
    );
    const points: TrailPoint[] = [];
    sorted.forEach((h, idx) => {
      if (idx === 0) {
        points.push({
          lat: h.old_latitude,
          lng: h.old_longitude,
          date: h.moved_at,
          distance: null,
        });
      }
      points.push({
        lat: h.new_latitude,
        lng: h.new_longitude,
        date: h.moved_at,
        distance: h.distance_meters,
      });
    });
    return points;
  }, [query.data]);

  return {
    data: query.data?.items ?? [],
    trailPoints,
    isLoading: query.isLoading,
  };
}

export function useCouplesForSelect() {
  return useQuery({
    queryKey: ['couples-select'],
    queryFn: () =>
      api.get<PaginatedResponse<CoupleOption>>('/couples/', { size: 200 }),
    staleTime: 60000,
    select: (data) => data.items,
  });
}
