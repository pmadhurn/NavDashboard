import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from 'antd';
import {
  SearchOutlined,
  ApiOutlined,
  LinkOutlined,
  SwapOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useSearchSuggestions, SearchSuggestion } from '../hooks/useSearch';

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  device: <ApiOutlined style={{ color: '#5F8F6B' }} />,
  couple: <LinkOutlined style={{ color: '#B68A3C' }} />,
  pair: <SwapOutlined style={{ color: '#7A7A7A' }} />,
  personnel: <UserOutlined style={{ color: '#5F8F6B' }} />,
  error: <WarningOutlined style={{ color: '#9B3E3E' }} />,
};

const ENTITY_LABELS: Record<string, string> = {
  device: 'Device',
  couple: 'Couple',
  pair: 'Pair',
  personnel: 'Personnel',
  error: 'Error',
};

function getEntityRoute(entityType: string, entityId: string): string {
  switch (entityType) {
    case 'device':
      return `/devices/${entityId}`;
    case 'couple':
      return `/couples/${entityId}`;
    case 'pair':
      return `/pairs/${entityId}`;
    case 'error':
      return '/troubleshooting';
    default:
      return `/search?q=`;
  }
}

const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: suggestions } = useSearchSuggestions(debouncedQuery, 10);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion: SearchSuggestion) => {
    setOpen(false);
    setQuery('');
    const route = getEntityRoute(suggestion.entity_type, suggestion.entity_id);
    navigate(route);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      setOpen(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: 320 }}>
      <Input
        size="middle"
        placeholder="Search..."
        prefix={<SearchOutlined style={{ color: '#7A7A7A' }} />}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.length >= 2) {
            setOpen(true);
          } else {
            setOpen(false);
          }
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (query.length >= 2) setOpen(true);
        }}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          color: '#F2F2F2',
          borderRadius: 8,
        }}
      />

      {open && suggestions && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: 'rgba(20,20,20,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            zIndex: 1000,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.entity_id}-${index}`}
              onClick={() => handleSelect(suggestion)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                cursor: 'pointer',
                borderBottom:
                  index < suggestions.length - 1
                    ? '1px solid rgba(255,255,255,0.04)'
                    : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: 16 }}>
                {ENTITY_ICONS[suggestion.entity_type] || (
                  <SearchOutlined style={{ color: '#7A7A7A' }} />
                )}
              </span>
              <span
                style={{
                  flex: 1,
                  color: '#F2F2F2',
                  fontSize: 13,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {suggestion.text}
              </span>
              <span
                style={{
                  color: '#7A7A7A',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {ENTITY_LABELS[suggestion.entity_type] || suggestion.entity_type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;