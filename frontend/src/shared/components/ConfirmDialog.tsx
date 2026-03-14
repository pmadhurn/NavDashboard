import React from 'react';
import GlassModal from './GlassModal';
import GlassButton from './GlassButton';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <GlassModal
      open={open}
      onClose={onCancel}
      title={title}
      width={420}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <GlassButton variant="ghost" onClick={onCancel}>
            {cancelText}
          </GlassButton>
          <GlassButton
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </GlassButton>
        </div>
      }
    >
      <p style={{ color: '#B8B8B8', fontSize: 14, margin: 0 }}>{message}</p>
    </GlassModal>
  );
}
