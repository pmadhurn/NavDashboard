import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

export interface SearchResult {
  id: string;
  entity_type: 'device' | 'couple' | 'pair' | 'personnel' | 'error';
  name: string;
  description?: string;
  status?: string;
  extra?: Record<string, any>;
  score: number;
}

export interface GlobalSearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  entity_counts: Record<string, number>;
}

export interface SearchSuggestion {
  text: string;
  entity_type: string;
  entity_id: string;
}

export function useGlobalSearch(
  query: string,
  entityTypes?: string[],
  limit?: number,
) {
  return useQuery({
    queryKey: ['search', 'global', query, entityTypes, limit],
    queryFn: () => {
      const params: Record<string, any> = { q: query };
      if (entityTypes && entityTypes.length > 0) {
        params.entity_types = entityTypes.join(',');
      }
      if (limit) {
        params.limit = limit;
      }
      return api.get<GlobalSearchResponse>('/search/global', params);
    },
    enabled: query.length >= 2,
  });
}

export function useSearchSuggestions(query: string, limit?: number) {
  return useQuery({
    queryKey: ['search', 'suggestions', query, limit],
    queryFn: () => {
      const params: Record<string, any> = { q: query };
      if (limit) {
        params.limit = limit;
      }
      return api.get<SearchSuggestion[]>('/search/suggestions', params);
    },
    enabled: query.length >= 2,
  });
}