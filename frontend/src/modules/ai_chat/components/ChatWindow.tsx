import React, { useRef, useEffect, useState } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { useChatMessages, useSendMessageStream } from '../hooks/useAIChat';
import type { ChatMessageItem, SourceRef } from '../hooks/useAIChat';
import LoadingSpinner from '@/shared/components/LoadingSpinner';

interface ChatWindowProps {
  sessionId: string | null;
  onSessionCreated: (id: string) => void;
  showThink?: boolean;
  selectedModel?: string;
}

export default function ChatWindow({ sessionId, onSessionCreated, showThink = false }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useChatMessages(sessionId);
  const { sendStream, streamingContent, isStreaming, sources, streamSessionId } = useSendMessageStream();
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);

  const messages: ChatMessageItem[] = data?.messages || [];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Handle session creation from stream
  useEffect(() => {
    if (streamSessionId && !sessionId) {
      onSessionCreated(streamSessionId);
    }
  }, [streamSessionId, sessionId, onSessionCreated]);

  const handleSend = async (content: string) => {
    setPendingUserMessage(content);
    await sendStream(content, sessionId || undefined, showThink);
    setPendingUserMessage(null);
  };

  if (isLoading && sessionId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 0',
          minHeight: 0,
        }}
      >
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={{
              role: msg.role,
              content: msg.content,
              sources: msg.sources,
              created_at: msg.created_at,
            }}
          />
        ))}

        {/* Pending user message (shown during streaming, before API refresh) */}
        {pendingUserMessage && (
          <ChatMessage
            message={{
              role: 'user',
              content: pendingUserMessage,
            }}
          />
        )}

        {/* Streaming assistant response */}
        {isStreaming && streamingContent && (
          <ChatMessage
            message={{
              role: 'assistant',
              content: streamingContent,
              sources: sources.length > 0 ? sources : null,
            }}
            isStreaming
            showThink={showThink}
          />
        )}

        {/* Streaming but no content yet — show typing indicator */}
        {isStreaming && !streamingContent && (
          <ChatMessage
            message={{
              role: 'assistant',
              content: '',
            }}
            isStreaming
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}