import { useState, useRef } from 'react';
import { Select, Divider, Input, Button, message } from 'antd';
import type { InputRef } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAuthStore, can } from '@/shared/stores/authStore';

export interface CreatableOption {
  value: string;
  label: string;
}

interface Props {
  value?: string;
  onChange: (value: string | undefined) => void;
  options: CreatableOption[];
  /** What one of these things is called, lowercase: "category", "vendor", "location". */
  noun: string;
  /**
   * Creates the record and resolves to its id. The new option is selected
   * automatically; the options list refreshes via the caller's query cache.
   */
  onCreate: (name: string) => Promise<{ id: string }>;
  /** Permission key required to create; without it the add row is hidden. */
  createPermission?: string;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * A Select over data-backed options with an explicit "+ Add new …" row at the
 * bottom of the dropdown, so nobody has to leave the form (or know that typing
 * a new name would create it) to extend the list. Enums that live in code —
 * device types, severities, outcomes — must NOT use this: those carry behavior.
 */
export default function CreatableSelect({
  value,
  onChange,
  options,
  noun,
  onCreate,
  createPermission,
  placeholder,
  allowClear = true,
  disabled,
  style,
  className,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const mayCreate =
    !createPermission || can(user, createPermission as Parameters<typeof can>[1]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<InputRef>(null);

  const create = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    // Reuse an existing option quietly rather than erroring on a duplicate.
    const existing = options.find((o) => o.label.toLowerCase() === name.toLowerCase());
    if (existing) {
      onChange(existing.value);
      setAdding(false);
      setNewName('');
      setOpen(false);
      return;
    }
    setCreating(true);
    try {
      const created = await onCreate(name);
      onChange(created.id);
      message.success(`Added ${noun} "${name}"`);
      setAdding(false);
      setNewName('');
      setOpen(false);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      message.error(detail || `Could not add the ${noun}. Try again.`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Select
      className={className ?? 'dl-select'}
      style={{ width: '100%', ...style }}
      value={value}
      onChange={(v) => onChange(v)}
      onClear={() => onChange(undefined)}
      placeholder={placeholder ?? `Select a ${noun}`}
      options={options}
      showSearch
      optionFilterProp="label"
      allowClear={allowClear}
      disabled={disabled}
      open={open}
      onDropdownVisibleChange={(o) => {
        setOpen(o);
        if (!o) {
          setAdding(false);
          setNewName('');
        }
      }}
      dropdownRender={(menu) => (
        <>
          {menu}
          {mayCreate && (
            <>
              <Divider style={{ margin: '6px 0' }} />
              {adding ? (
                <div style={{ display: 'flex', gap: 6, padding: '2px 8px 6px' }}>
                  <Input
                    ref={inputRef}
                    size="small"
                    placeholder={`New ${noun} name`}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onPressEnter={create}
                    onKeyDown={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  <Button size="small" type="primary" loading={creating} onClick={create}>
                    Add
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setAdding(true);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '6px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--secondary)',
                    fontSize: 13,
                  }}
                >
                  <PlusOutlined /> Add new {noun}
                </button>
              )}
            </>
          )}
        </>
      )}
    />
  );
}
