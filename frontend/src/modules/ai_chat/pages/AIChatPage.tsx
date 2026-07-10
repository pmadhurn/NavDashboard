import React, { useState, useCallback } from 'react';
import {
  RobotOutlined,
  PlusOutlined,
  DeleteOutlined,
  SyncOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { Switch, Select, Tooltip } from 'antd';
import GlassButton from '@/shared/components/GlassButton';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import ChatWindow from '../components/ChatWindow';
import ChatInput from '../components/ChatInput';
import SuggestedQueries from '../components/SuggestedQueries';
import {
  useChatSessions,
  useDeleteSession,
  useAutoSync,
  useSendMessageStream,
  type ChatSession,
} from '../hooks/useAIChat';

function formatRelativeTime(dateStr?: string | null): string {
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

export default function AIChatPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showThink, setShowThink] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);

  const { data: sessions = [] } = useChatSessions();
  const deleteSession = useDeleteSession();

  // Auto-sync on page open — also gives us ingestStatus & triggerIngest
  const { ingestStatus, triggerIngest } = useAutoSync();

  const { sendStream, streamingContent, isStreaming, streamSessionId } = useSendMessageStream();

  const handleNewChat = () => {
    setActiveSessionId(null);
  };

  const handleSessionCreated = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteSession.mutateAsync(deleteTarget);
      if (activeSessionId === deleteTarget) {
        setActiveSessionId(null);
      }
      setDeleteTarget(null);
    }
  };

  // Send from landing view (suggested query or typed message)
  const handleLandingSend = async (query: string) => {
    await sendStream(query, undefined, showThink);
  };

  // When stream creates a new session, set it as active
  React.useEffect(() => {
    if (streamSessionId && !activeSessionId) {
      setActiveSessionId(streamSessionId);
    }
  }, [streamSessionId, activeSessionId]);

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #242424', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RobotOutlined style={{ fontSize: 20, color: '#C9C9C9' }} />
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#F2F2F2', margin: 0 }}>AI Assistant</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Model selector */}
            {ingestStatus?.ollama_models && ingestStatus.ollama_models.length > 0 && (
              <Select
                value={selectedModel || ingestStatus.ollama_models[0]}
                onChange={setSelectedModel}
                style={{ width: 140, minWidth: 100 }}
                size="small"
                options={ingestStatus.ollama_models.map((m) => ({ label: m.split('/').pop() || m, value: m }))}
                dropdownStyle={{ background: '#1E1E1E' }}
              />
            )}
            {/* Thinking toggle */}
            <Tooltip title={showThink ? 'Hide thinking' : 'Show thinking'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BulbOutlined style={{ color: showThink ? '#C9C9C9' : '#5A5A5A', fontSize: 14 }} />
                <Switch
                  size="small"
                  checked={showThink}
                  onChange={setShowThink}
                />
              </div>
            </Tooltip>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* ── Left sidebar ── */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            background: 'rgba(11,11,11,0.8)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* New Chat button */}
          <div style={{ padding: 12 }}>
            <GlassButton
              onClick={handleNewChat}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <PlusOutlined /> New Chat
            </GlassButton>
          </div>

          {/* Sessions list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
            {sessions.map((session: ChatSession) => (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                style={{
                  padding: '10px 12px',
                  marginBottom: 4,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background:
                    activeSessionId === session.id
                      ? '#1E1E1E'
                      : 'transparent',
                  borderLeft:
                    activeSessionId === session.id
                      ? '3px solid #C9C9C9'
                      : '3px solid transparent',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
                onMouseEnter={(e) => {
                  if (activeSessionId !== session.id) {
                    e.currentTarget.style.background = '#1A1A1A';
                  }
                  const del = e.currentTarget.querySelector('[data-delete]') as HTMLElement;
                  if (del) del.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  if (activeSessionId !== session.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                  const del = e.currentTarget.querySelector('[data-delete]') as HTMLElement;
                  if (del) del.style.opacity = '0';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      color: '#E0E0E0',
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {session.title}
                  </span>
                  <button
                    data-delete
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(session.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#7A7A7A',
                      cursor: 'pointer',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      padding: 2,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    <DeleteOutlined />
                  </button>
                </div>
                {session.last_message_preview && (
                  <span
                    style={{
                      color: '#7A7A7A',
                      fontSize: 11,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {session.last_message_preview}
                  </span>
                )}
                <span style={{ color: '#5A5A5A', fontSize: 10 }}>
                  {formatRelativeTime(session.created_at)} · {session.message_count} msgs
                </span>
              </div>
            ))}
          </div>

          {/* Ingest status at bottom */}
          <div
            style={{
              padding: 12,
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: ingestStatus?.ollama_available ? '#4CAF50' : '#F44336',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: '#C9C9C9', fontSize: 11 }}>
                {ingestStatus?.ollama_available ? 'AI Ready' : 'AI Offline'}
              </span>
            </div>
            {ingestStatus?.total_documents !== undefined && (
              <div style={{ color: '#7A7A7A', fontSize: 10, marginBottom: 4 }}>
                {ingestStatus.total_documents} docs indexed
              </div>
            )}
            {ingestStatus?.last_sync && (
              <div style={{ color: '#7A7A7A', fontSize: 10, marginBottom: 6 }}>
                Last sync: {formatRelativeTime(ingestStatus.last_sync)}
              </div>
            )}
            <GlassButton
              onClick={() => triggerIngest.mutate()}
              disabled={triggerIngest.isPending || !ingestStatus?.ollama_available}
              style={{
                width: '100%',
                fontSize: 11,
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <SyncOutlined spin={triggerIngest.isPending} />
              {triggerIngest.isPending ? 'Syncing...' : 'Sync'}
            </GlassButton>
          </div>
        </div>

        {/* ── Right main area ── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {activeSessionId ? (
            <ChatWindow
              sessionId={activeSessionId}
              onSessionCreated={handleSessionCreated}
              showThink={showThink}
              selectedModel={selectedModel}
            />
          ) : (
            /* ── Landing view: suggestions + chat input ── */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* Scrollable centre area with suggestions */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: 0,
                }}
              >
                <SuggestedQueries onSelect={handleLandingSend} />

                {/* Show streaming content while waiting for session to be created */}
                {isStreaming && (
                  <div
                    style={{
                      padding: '0 40px 24px',
                      maxWidth: 800,
                      width: '100%',
                      margin: '0 auto',
                    }}
                  >
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 16,
                        padding: '16px 20px',
                        color: '#E0E0E0',
                        fontSize: 14,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {streamingContent || 'Thinking...'}
                      <span
                        style={{
                          display: 'inline-block',
                          animation: 'pulse 1.4s ease-in-out infinite',
                        }}
                      >
                        ▌
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Always-visible chat input at the bottom */}
              <ChatInput onSend={handleLandingSend} disabled={isStreaming} />

              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 0.3; }
                  50% { opacity: 1; }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Chat Session"
        message="Are you sure you want to delete this chat session? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}