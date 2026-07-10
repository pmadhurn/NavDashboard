import React, { useState } from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  accentColor?: string;
  fullHeight?: boolean;
  style?: React.CSSProperties;
}

const paddingMap = {
  sm: 16,
  md: 24,
  lg: 32,
};

export default function GlassCard({
  children,
  className = '',
  hoverable = false,
  padding = 'md',
  onClick,
  accentColor,
  fullHeight = false,
  style,
}: GlassCardProps) {
  const [hovered, setHovered] = useState(false);

  const baseStyle: React.CSSProperties = {
    background: hovered && hoverable
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${
      hovered && hoverable
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(255, 255, 255, 0.06)'
    }`,
    borderRadius: 16,
    padding: paddingMap[padding],
    transition: 'all 0.3s ease',
    cursor: hoverable || onClick ? 'pointer' : 'default',
    boxShadow: hovered && hoverable ? '0 8px 32px rgba(0, 0, 0, 0.3)' : 'none',
    height: fullHeight ? '100%' : undefined,
    ...(accentColor ? { borderLeft: `3px solid ${accentColor}` } : {}),
    ...style,
  };

  return (
    <div
      className={`glass-card ${className}`.trim()}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  );
}