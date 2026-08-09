import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input, Space, Tag } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import PageHeader from '@/shared/components/PageHeader';
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import EmptyState from '@/shared/components/EmptyState';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useGlobalSearch } from '../hooks/useSearch';
import SearchResults from '../components/SearchResults';
import AdvancedFilters from '../components/AdvancedFilters';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const inputRef = useRef<any>(null);

  const debouncedQuery = useDebounce(query, 300);

  const entityTypes = filters.entity_types as string[] | undefined;

  const { data, isLoading } = useGlobalSearch(
    debouncedQuery,
    entityTypes,
    50,
  );

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) {
      setSearchParams({ q: debouncedQuery });
    } else {
      setSearchParams({});
    }
  }, [debouncedQuery, setSearchParams]);

  const activeFilterCount = Object.keys(filters).filter(
    (k) => filters[k] !== undefined && filters[k] !== null && filters[k] !== '',
  ).length;

  return (
    <div>
      <PageHeader title="Search" />

      <GlassCard style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Input
            ref={inputRef}
            size="large"
            placeholder="Search across devices, couples, pairs, personnel, and errors..."
            prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'var(--text-primary)',
              borderRadius: 8,
            }}
          />
          <GlassButton
            onClick={() => setFiltersVisible(!filtersVisible)}
            icon={<FilterOutlined />}
            style={{
              borderColor: filtersVisible ? 'var(--status-working)' : undefined,
            }}
          >
            Filters
            {activeFilterCount > 0 && (
              <Tag
                color="var(--status-working)"
                style={{ marginLeft: 6, borderRadius: 10, fontSize: 11, padding: '0 6px' }}
              >
                {activeFilterCount}
              </Tag>
            )}
          </GlassButton>
        </div>
      </GlassCard>

      <AdvancedFilters
        visible={filtersVisible}
        onFiltersChange={setFilters}
      />

      {!debouncedQuery && (
        <EmptyState
          icon={<SearchOutlined style={{ fontSize: 48, color: 'var(--text-muted)' }} />}
          title="Search across all entities"
          description="Search across all devices, couples, pairs, personnel, and more"
        />
      )}

      {debouncedQuery && isLoading && <LoadingSpinner />}

      {debouncedQuery && !isLoading && data && data.total > 0 && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                Found <strong style={{ color: 'var(--text-primary)' }}>{data.total}</strong> results
              </span>
              {Object.entries(data.entity_counts).map(([type, count]) => (
                <Tag
                  key={type}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--text-secondary)',
                    borderRadius: 12,
                  }}
                >
                  {type}: {count}
                </Tag>
              ))}
            </Space>
          </div>
          <SearchResults
            results={data.results}
            entityCounts={data.entity_counts}
            query={data.query}
          />
        </div>
      )}

      {debouncedQuery && !isLoading && data && data.total === 0 && (
        <EmptyState
          icon={<SearchOutlined style={{ fontSize: 48, color: 'var(--text-muted)' }} />}
          title={`No results found for "${debouncedQuery}"`}
          description="Try a different search term or adjust filters"
        />
      )}
    </div>
  );
};

export default SearchPage;