import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from '@/shared/api/client'
import type { MapDataPoint, LocationHistory } from '@/shared/types/locations'
import type { Pair } from '@/shared/types/pairs'
import type { PaginatedResponse } from '@/shared/types/common'

export interface MapFilters {
  showWorking: boolean
  showNotWorking: boolean
  showFaulty: boolean
  showRfOnly: boolean
  showDeployedOnly: boolean
  pairId: string | null
  showTrails: boolean
}

export const DEFAULT_MAP_FILTERS: MapFilters = {
  showWorking: true,
  showNotWorking: true,
  showFaulty: true,
  showRfOnly: false,
  showDeployedOnly: false,
  pairId: null,
  showTrails: true,
}

export function useMapCouples(filters?: MapFilters) {
  const mapQuery = useQuery({
    queryKey: ['couples', 'map-data'],
    queryFn: () => api.get<MapDataPoint[]>('/couples/map-data'),
    refetchInterval: 30000,
  })

  const pairsQuery = useQuery({
    queryKey: ['pairs', 'map-all'],
    queryFn: () => api.get<PaginatedResponse<Pair>>('/pairs/', { size: 100 }),
    staleTime: 60000,
  })

  const filtered = useMemo(() => {
    if (!mapQuery.data) return []
    let result = [...mapQuery.data]

    if (filters) {
      if (!filters.showWorking) {
        result = result.filter((p) => p.status !== 'WORKING')
      }
      if (!filters.showNotWorking) {
        result = result.filter((p) => p.status !== 'NOT_WORKING')
      }
      if (!filters.showFaulty) {
        result = result.filter((p) => p.status !== 'FAULTY')
      }
      if (filters.showRfOnly) {
        result = result.filter((p) => p.has_rf)
      }
      if (filters.showDeployedOnly) {
        result = result.filter((p) => p.project_id)
      }
      if (filters.pairId && pairsQuery.data) {
        const pair = pairsQuery.data.items.find((p) => p.id === filters.pairId)
        if (pair) {
          const coupleIds = new Set(pair.couples.map((c) => c.id))
          result = result.filter((p) => coupleIds.has(p.couple_id))
        }
      }
    }

    return result
  }, [mapQuery.data, pairsQuery.data, filters])

  return {
    data: filtered,
    allData: mapQuery.data ?? [],
    isLoading: mapQuery.isLoading,
    error: mapQuery.error,
  }
}

export function useCoupleTrail(coupleId: string | null) {
  const query = useQuery({
    queryKey: ['couple', coupleId, 'location-history'],
    queryFn: () =>
      api.get<PaginatedResponse<LocationHistory>>(
        `/couples/${coupleId}/location-history`,
        { size: 100 }
      ),
    enabled: !!coupleId,
  })

  return {
    data: query.data?.items ?? [],
    isLoading: query.isLoading,
  }
}

export function useMapPairs() {
  const query = useQuery({
    queryKey: ['pairs', 'map-all'],
    queryFn: () => api.get<PaginatedResponse<Pair>>('/pairs/', { size: 100 }),
    staleTime: 60000,
  })

  return {
    data: query.data?.items ?? [],
    isLoading: query.isLoading,
  }
}