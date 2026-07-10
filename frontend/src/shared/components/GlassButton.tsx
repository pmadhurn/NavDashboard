import React from 'react';
import { Button } from 'antd';

interface GlassButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
  htmlType?: 'button' | 'submit';
}

const sizeMap = {
  sm: 'small' as const,
  md: 'middle' as const,
  lg: 'large' as const,
};

export default function GlassButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  onClick,
  fullWidth = false,
  htmlType = 'button',
}: GlassButtonProps) {
  const getStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: 8,
      fontWeight: 500,
      width: fullWidth ? '100%' : undefined,
      transition: 'all 0.3s ease',
    };

    if (disabled) {
      return {
        ...base,
        background: '#3A3A3A',
        color: '#7A7A7A',
        border: '1px solid #3A3A3A',
        opacity: 0.6,
        cursor: 'not-allowed',
      };
    }

    switch (variant) {
      case 'primary':
        return {
          ...base,
          background: '#E6E6E6',
          color: '#0A0A0A',
          border: '1px solid #E6E6E6',
        };
      case 'secondary':
        return {
          ...base,
          background: 'rgba(42, 42, 42, 0.8)',
          color: '#F2F2F2',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        };
      case 'danger':
        return {
          ...base,
          background: 'rgba(138, 58, 58, 0.8)',
          color: '#F2F2F2',
          border: '1px solid rgba(138, 58, 58, 0.5)',
        };
      case 'ghost':
        return {
          ...base,
          background: 'transparent',
          color: '#F2F2F2',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        };
      default:
        return base;
    }
  };

  return (
    <Button
      size={sizeMap[size]}
      loading={loading}
      disabled={disabled}
      icon={icon}
      onClick={onClick}
      htmlType={htmlType}
      style={getStyle()}
    >
      {children}
    </Button>
  );
}