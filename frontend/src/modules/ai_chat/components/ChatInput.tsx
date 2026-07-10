import React, { useState, useRef, useEffect } from 'react';
import { SendOutlined, LoadingOutlined } from '@ant-design/icons';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
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

  const borderColor = disabled ? '#1A1A1A' : isFocused ? '#4A4A4A' : '#2A2A2A';
  const sendButtonBg = disabled || !value.trim() ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)';
  const sendButtonColor = disabled || !value.trim() ? '#4A4A4A' : '#C9C9C9';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 12,
        padding: '14px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.01)',
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
        placeholder="Ask about devices, troubleshooting, configurations..."
        rows={1}
        style={{
          flex: 1,
          resize: 'none',
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: '10px 14px',
          color: '#F2F2F2',
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
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && value.trim()) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }
        }}
      >
        {disabled ? <LoadingOutlined spin /> : <SendOutlined />}
      </button>
    </div>
  );
}