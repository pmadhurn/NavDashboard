import React from 'react';
import { Modal } from 'antd';

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number | string;
  closable?: boolean;
}

export default function GlassModal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
  closable = true,
}: GlassModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      footer={footer}
      width={width}
      closable={closable}
      centered
      destroyOnClose
      styles={{
        content: {
          background: 'rgba(20, 20, 20, 0.95)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 20,
          padding: 0,
        },
        header: {
          background: 'transparent',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '20px 24px',
        },
        body: {
          padding: 24,
        },
        footer: {
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '16px 24px',
        },
      }}
    >
      {children}
    </Modal>
  );
}