import React, { useState, useRef, useEffect } from 'react';
import { SendOutlined, LoadingOutlined } from '@ant-design/icons';
import { isDemo } from '@/shared/demo/demo';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled: disabledProp }: ChatInputProps) {
  // In the demo the assistant can't answer live — the canned sessions are the tour.
  const demo = isDemo();
  const disabled = disabledProp || demo;
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const borderColor = disabled ? 'var(--sidebar-hover)' : isFocused ? 'var(--input-focus)' : 'var(--input-border)';
  const sendButtonBg = disabled || !value.trim() ? 'var(--overlay-subtle)' : 'var(--overlay-medium)';
  const sendButtonColor = disabled || !value.trim() ? 'var(--text-muted)' : 'var(--input-focus)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 12,
        padding: '14px 16px',
        borderTop: '1px solid var(--border)',
        /* The bar itself stays flush with the message list; only the textarea
           inside it gets a tint, or the two merge into one slab. */
        background: 'transparent',
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        placeholder={
          demo
            ? 'Chat is disabled in the demo — these are sample conversations'
            : 'Ask about devices, troubleshooting, configurations...'
        }
        rows={1}
        style={{
          flex: 1,
          resize: 'none',
          background: 'var(--overlay-subtle)',
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: '10px 14px',
          color: 'var(--text-primary)',
          fontSize: 14,
          lineHeight: 1.5,
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'border-color 0.2s ease, background 0.2s ease',
          overflow: 'hidden',
          maxHeight: 120,
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          border: 'none',
          background: sendButtonBg,
          color: sendButtonColor,
          cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!disabled && value.trim()) {
            e.currentTarget.style.background = 'var(--overlay-strong)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && value.trim()) {
            e.currentTarget.style.background = 'var(--overlay-medium)';
          }
        }}
      >
        {disabled ? <LoadingOutlined spin /> : <SendOutlined />}
      </button>
    </div>
  );
}