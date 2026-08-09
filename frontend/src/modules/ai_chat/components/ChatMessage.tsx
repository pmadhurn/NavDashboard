import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

/* Assistant replies are markdown. This used to be a hand-rolled chain of
   string replacements that had no table rules at all — a GFM table fell
   through to the `\n` → `<br/>` step and showed up as bare pipe-delimited
   lines — emitted orphan `<li>` elements with no `<ul>` around them, and
   injected the model's raw output through dangerouslySetInnerHTML without
   escaping it. react-markdown + remark-gfm handles tables and lists properly
   and builds a React tree instead of HTML, so embedded markup in a reply is
   text rather than something the browser executes. Styling lives in
   global.css under `.ai-md` so it follows the light/dark tokens.

   Deliberately no rehype-raw: it would re-open the injection hole. */
const MARKDOWN_COMPONENTS = {
  /* Own scroll container, so a wide table scrolls inside the bubble instead
     of stretching it. */
  table: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div className="ai-md-table-wrap">
      <table {...props}>{children}</table>
    </div>
  ),
  /* Replies routinely cite dashboard URLs; open those away from the chat. */
  a: ({ children, ...props }: { children?: React.ReactNode }) => (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

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
          /* Tokens, not rgba(255,255,255,…) tints: those assume a dark
             backdrop and turned both bubbles into near-invisible white-on-
             white in light mode. */
          background: isUser ? 'var(--chat-user-bubble)' : 'var(--chat-ai-bubble)',
          backdropFilter: 'blur(20px)',
          /* A white bubble on a near-white page needs a real edge. */
          border: '1px solid var(--border)',
          /* Flex items default to min-width:auto, which lets a wide table
             push the bubble past maxWidth instead of scrolling inside it. */
          minWidth: 0,
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: '12px 16px',
        }}
      >
        {isUser ? (
          <div style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {message.content}
          </div>
        ) : (
          <div className="ai-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Thinking content - collapsible */
        hasThink && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <button
              onClick={() => setThinkExpanded(!thinkExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 12,
                cursor: 'pointer',
                padding: 0,
                marginBottom: thinkExpanded ? 8 : 0,
              }}
            >
              {thinkExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
              <BulbOutlined style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Thinking</span>
            </button>
            {thinkExpanded && (
              <div
                style={{
                  background: 'var(--sidebar-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: 'var(--text-muted)',
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
            <span style={{ animation: 'pulse 1.4s ease-in-out infinite', width: 6, height: 6, borderRadius: '50%', background: 'var(--input-focus)' }} />
            <span style={{ animation: 'pulse 1.4s ease-in-out 0.2s infinite', width: 6, height: 6, borderRadius: '50%', background: 'var(--input-focus)' }} />
            <span style={{ animation: 'pulse 1.4s ease-in-out 0.4s infinite', width: 6, height: 6, borderRadius: '50%', background: 'var(--input-focus)' }} />
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
          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6 }}>
            {formatRelativeTime(message.created_at)}
          </div>
        )}
      </div>
    </div>
  );
}