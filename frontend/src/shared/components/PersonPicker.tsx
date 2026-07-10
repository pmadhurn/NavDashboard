import { useMemo, useState } from 'react';
import { Select, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { PaginatedResponse } from '@/shared/types/common';
import type { Person } from '@/shared/types/personnel';

interface Props {
  value?: string | string[];
  onChange: (value: any) => void;
  multiple?: boolean;
  placeholder?: string;
  /** Restrict to people who have a linked login account. */
  loginOnly?: boolean;
  style?: React.CSSProperties;
}

/**
 * Unified people picker — one list of humans (field staff + login users share
 * one identity via personnel.user_id). Shows a "login" tag for people who can
 * sign in. Used by project teams, equipment custody, and expense members.
 */
export default function PersonPicker({
  value,
  onChange,
  multiple,
  placeholder = 'Select a person',
  loginOnly,
  style,
}: Props) {
  const [search, setSearch] = useState('');

  const { data } = useQuery<PaginatedResponse<Person>>({
    queryKey: ['personnel', 'picker', search],
    queryFn: () =>
      api.get<PaginatedResponse<Person>>('/personnel/', {
        size: 200,
        full_name__contains: search || undefined,
      }),
  });

  const options = useMemo(() => {
    let people = data?.items ?? [];
    if (loginOnly) people = people.filter((p) => p.user_id);
    return people.map((p) => ({
      value: p.id,
      label: p.full_name,
      hasLogin: Boolean(p.user_id),
      role: p.role,
    }));
  }, [data, loginOnly]);

  return (
    <Select
      className="dl-select"
      style={{ width: '100%', ...style }}
      mode={multiple ? 'multiple' : undefined}
      showSearch
      allowClear
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onSearch={setSearch}
      filterOption={false}
      optionLabelProp="label"
      options={options.map((o) => ({
        value: o.value,
        label: o.label,
        // richer dropdown row
        children: undefined,
      }))}
      optionRender={(opt) => {
        const meta = options.find((o) => o.value === opt.value);
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>
              {opt.label}
              {meta?.role && (
                <span style={{ color: '#7A7A7A', fontSize: 11, marginLeft: 6 }}>{meta.role}</span>
              )}
            </span>
            {meta?.hasLogin && (
              <Tag color="green" style={{ marginInlineEnd: 0, fontSize: 10 }}>
                login
              </Tag>
            )}
          </div>
        );
      }}
    />
  );
}
