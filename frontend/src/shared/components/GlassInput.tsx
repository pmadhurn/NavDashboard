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
}: GlassInputProps) {
  const wrapperStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${error ? '#A14242' : '#2A2A2A'}`,
    borderRadius: 8,
    transition: 'all 0.3s ease',
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
          <div style={{ color: '#A14242', fontSize: 12, marginTop: 4 }}>
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
          <div style={{ color: '#A14242', fontSize: 12, marginTop: 4 }}>
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
        prefix={prefix}
        suffix={suffix}
        disabled={disabled}
        size={sizeMap[size]}
        style={wrapperStyle}
      />
      {error && (
        <div style={{ color: '#A14242', fontSize: 12, marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}