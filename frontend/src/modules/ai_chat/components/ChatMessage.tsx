import React, { useState } from 'react';
import { CaretDownOutlined, CaretRightOutlined, BulbOutlined } from '@ant-design/icons';
import SourceReference from './SourceReference';
import type { SourceRef } from '../hooks/useAIChat';

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
    sources?: SourceRef[] | null;
    created_at?: string;
    think?: string | null;
  };
  isStreaming?: boolean;
  showThink?: boolean;
}

function simpleMarkdownToHtml(text: string): string {
  let html = text;

  // Code blocks (triple backtick)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre style="background:#1A1A1A;border:1px solid #2E2E2E;border-radius:8px;padding:12px;overflow-x:auto;font-family:monospace;font-size:13px;margin:8px 0;color:#E0E0E0"><code>${code
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:#1A1A1A;border:1px solid #2E2E2E;border-radius:4px;padding:2px 6px;font-family:monospace;font-size:13px;color:#E0E0E0">\$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 style="color:#F2F2F2;font-size:16px;margin:12px 0 6px 0">\$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="color:#F2F2F2;font-size:18px;margin:12px 0 6px 0">\$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="color:#F2F2F2;font-size:20px;margin:12px 0 6px 0">\$1</h1>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#F2F2F2">\$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>\$1</em>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li style="margin-left:16px;margin-bottom:4px">\$1</li>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-left:16px;margin-bottom:4px;list-style-type:decimal">\$1</li>');

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '<br/><br/>');

  // Single newlines (not after block elements)
  html = html.replace(/\n/g, '<br/>');

  return html;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function ChatMessage({ message, isStreaming, showThink }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [thinkExpanded, setThinkExpanded] = useState(false);

  const hasThink = showThink && message.think && message.think.trim();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
        padding: '0 16px',
      }}
    >
      <div
        style={{
          maxWidth: isUser ? '70%' : '80%',
          background: isUser
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${isUser ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: '12px 16px',
        }}
      >
        {isUser ? (
          <div style={{ color: '#F2F2F2', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {message.content}
          </div>
        ) : (
          <div
            style={{ color: '#E0E0E0', fontSize: 14, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(message.content) }}
          />
        )}

        {/* Thinking content - collapsible */
        hasThink && (
          <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
            <button
              onClick={() => setThinkExpanded(!thinkExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                color: '#7A7A7A',
                fontSize: 12,
                cursor: 'pointer',
                padding: 0,
                marginBottom: thinkExpanded ? 8 : 0,
              }}
            >
              {thinkExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
              <BulbOutlined style={{ color: '#7A7A7A' }} />
              <span style={{ color: '#7A7A7A' }}>Thinking</span>
            </button>
            {thinkExpanded && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: '#9A9A9A',
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  fontStyle: 'italic',
                }}
              >
                {message.think}
              </div>
            )}
          </div>
        )}

        {isStreaming && (
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            <span style={{ animation: 'pulse 1.4s ease-in-out infinite', width: 6, height: 6, borderRadius: '50%', background: '#C9C9C9' }} />
            <span style={{ animation: 'pulse 1.4s ease-in-out 0.2s infinite', width: 6, height: 6, borderRadius: '50%', background: '#C9C9C9' }} />
            <span style={{ animation: 'pulse 1.4s ease-in-out 0.4s infinite', width: 6, height: 6, borderRadius: '50%', background: '#C9C9C9' }} />
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {message.sources.map((source, idx) => (
              <SourceReference key={idx} source={source} />
            ))}
          </div>
        )}

        {message.created_at && (
          <div style={{ color: '#7A7A7A', fontSize: 11, marginTop: 6 }}>
            {formatRelativeTime(message.created_at)}
          </div>
        )}
      </div>
    </div>
  );
}