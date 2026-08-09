import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullPage?: boolean;
}

const sizeMap = {
  sm: 20,
  md: 32,
  lg: 48,
};

export default function LoadingSpinner({
  size = 'md',
  text,
  fullPage = false,
}: LoadingSpinnerProps) {
  const indicator = (
    <LoadingOutlined style={{ fontSize: sizeMap[size], color: 'var(--primary)' }} spin />
  );

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 40,
      }}
    >
      <Spin indicator={indicator} />
      {text && (
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{text}</span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10, 10, 10, 0.9)',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}