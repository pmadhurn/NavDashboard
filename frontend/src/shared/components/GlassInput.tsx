import React from 'react';
import { Input } from 'antd';

interface GlassInputProps {
  type?: 'text' | 'password' | 'email' | 'number' | 'textarea';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onPressEnter?: () => void;
  style?: React.CSSProperties;
  allowClear?: boolean;
}

const sizeMap = {
  sm: 'small' as const,
  md: 'middle' as const,
  lg: 'large' as const,
};

export default function GlassInput({
  type = 'text',
  placeholder,
  value,
  onChange,
  prefix,
  suffix,
  error,
  disabled = false,
  size = 'md',
  onPressEnter,
  style,
  allowClear = false,
}: GlassInputProps) {
  const wrapperStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${error ? 'var(--input-error)' : 'var(--input-border)'}`,
    borderRadius: 8,
    transition: 'all 0.3s ease',
    ...style,
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange?.(e.target.value);
  };

  if (type === 'textarea') {
    return (
      <div>
        <Input.TextArea
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          rows={4}
          style={wrapperStyle}
        />
        {error && (
          <div style={{ color: 'var(--input-error)', fontSize: 12, marginTop: 4 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  if (type === 'password') {
    return (
      <div>
        <Input.Password
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          prefix={prefix}
          disabled={disabled}
          size={sizeMap[size]}
          style={wrapperStyle}
        />
        {error && (
          <div style={{ color: 'var(--input-error)', fontSize: 12, marginTop: 4 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onPressEnter={onPressEnter}
        prefix={prefix}
        suffix={suffix}
        allowClear={allowClear}
        disabled={disabled}
        size={sizeMap[size]}
        style={wrapperStyle}
      />
      {error && (
        <div style={{ color: 'var(--input-error)', fontSize: 12, marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}