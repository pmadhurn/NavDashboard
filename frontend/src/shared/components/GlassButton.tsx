import React from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';

type ButtonPassThrough = Omit<
  ButtonProps,
  'variant' | 'size' | 'type' | 'color'
>;

interface GlassButtonProps extends ButtonPassThrough {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
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
  style,
  ...rest
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
        background: 'var(--btn-disabled)',
        color: 'var(--text-muted)',
        border: '1px solid var(--btn-disabled)',
        opacity: 0.6,
        cursor: 'not-allowed',
      };
    }

    switch (variant) {
      case 'primary':
        return {
          ...base,
          background: 'var(--primary)',
          color: 'var(--bg-main)',
          border: '1px solid var(--primary)',
        };
      case 'secondary':
        return {
          ...base,
          background: 'rgba(42, 42, 42, 0.8)',
          color: 'var(--text-primary)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        };
      case 'danger':
        return {
          ...base,
          background: 'rgba(138, 58, 58, 0.8)',
          color: 'var(--text-primary)',
          border: '1px solid rgba(138, 58, 58, 0.5)',
        };
      case 'ghost':
        return {
          ...base,
          background: 'transparent',
          color: 'var(--text-primary)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        };
      default:
        return base;
    }
  };

  return (
    <Button
      {...rest}
      size={sizeMap[size]}
      loading={loading}
      disabled={disabled}
      icon={icon}
      onClick={onClick}
      htmlType={htmlType}
      style={{ ...getStyle(), ...style }}
    >
      {children}
    </Button>
  );
}