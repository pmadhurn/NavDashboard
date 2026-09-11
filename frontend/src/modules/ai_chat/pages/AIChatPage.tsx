import React, { useState, useCallback } from 'react';
import {
  RobotOutlined,
  PlusOutlined,
  DeleteOutlined,
  SyncOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { Drawer, Switch, Tooltip } from 'antd';
import GlassButton from '@/shared/components/GlassButton';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { TOPNAV_HEIGHT } from '@/shared/components/TopNav';
import { TABBAR_HEIGHT } from '@/shared/components/MobileTabBar';
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

/* The preview is a one-line, nowrap snippet, so markdown syntax cannot render
   there the way it does in the message itself. A reply that opens with a table
   used to fill the whole line with `| Severity | Device | ---` — the same
   pipes-as-text look the message pane had before the renderer was replaced. */
function plainPreview(text: string): string {
  return text
    .replace(/^\s*\|?[\s:|-]*\|[\s:|-]*$/gm, '')  // separator rows
    .replace(/\|/g, ' ')                          // cell delimiters
    .replace(/[*_`#>]/g, '')                      // emphasis, code, headings
    .replace(/\s+/g, ' ')
    .trim();
}

export default function AIChatPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showThink, setShowThink] = useState(false);
  const isMobile = useIsMobile();
  // Mobile: the sessions panel lives in a drawer instead of a fixed 220px column
  const [sessionsOpen, setSessionsOpen] = useState(false);

  const { data: sessions = [] } = useChatSessions();
  const deleteSession = useDeleteSession();

  // Auto-sync on page open — also gives us ingestStatus & triggerIngest
  const { ingestStatus, triggerIngest } = useAutoSync();

  const { sendStream, streamingContent, isStreaming, streamSessionId } = useSendMessageStream();

  const handleNewChat = () => {
    setActiveSessionId(null);
    setSessionsOpen(false);
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

  const sessionsPanel = (
        <div
          style={{
            width: isMobile ? '100%' : 220,
            height: isMobile ? '100%' : 'auto',
            flexShrink: 0,
            /* Was a literal rgba(11,11,11,0.8), which stayed near-black in
               light mode and hid the session titles against it. */
            background: 'var(--chat-bg)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid var(--border)',
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
                onClick={() => {
                  setActiveSessionId(session.id);
                  setSessionsOpen(false);
                }}
                style={{
                  padding: '10px 12px',
                  marginBottom: 4,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background:
                    activeSessionId === session.id
                      ? 'var(--sidebar-active)'
                      : 'transparent',
                  borderLeft:
                    activeSessionId === session.id
                      ? '3px solid var(--input-focus)'
                      : '3px solid transparent',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
                onMouseEnter={(e) => {
                  if (activeSessionId !== session.id) {
                    e.currentTarget.style.background = 'var(--sidebar-hover)';
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
                      color: 'var(--text-secondary)',
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
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      opacity: isMobile ? 1 : 0, // no hover on touch
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
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {plainPreview(session.last_message_preview)}
                  </span>
                )}
                <span style={{ color: 'var(--chart4)', fontSize: 10 }}>
                  {formatRelativeTime(session.created_at)} · {session.message_count} msgs
                </span>
              </div>
            ))}
          </div>

          {/* Ingest status at bottom */}
          <div
            style={{
              padding: 12,
              borderTop: '1px solid var(--border)',
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
              <span style={{ color: 'var(--input-focus)', fontSize: 11 }}>
                {ingestStatus?.ollama_available ? 'AI Ready' : 'AI Offline'}
              </span>
            </div>
            {ingestStatus?.total_documents !== undefined && (
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 4 }}>
                {ingestStatus.total_documents} docs indexed
              </div>
            )}
            {ingestStatus?.last_sync && (
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 6 }}>
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
  );

  return (
    // Mobile: dvh tracks the collapsing browser chrome; subtract top nav +
    // content padding + bottom tab bar so the composer is never covered.
    <div
      style={{
        height: isMobile
          ? `calc(100dvh - ${TOPNAV_HEIGHT + 12 + TABBAR_HEIGHT + 16}px)`
          : 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isMobile && (
              <GlassButton onClick={() => setSessionsOpen(true)} style={{ padding: '4px 10px', fontSize: 12 }}>
                Chats
              </GlassButton>
            )}
            <RobotOutlined style={{ fontSize: 20, color: 'var(--input-focus)' }} />
            <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>AI Assistant</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Which model is answering. This used to be a <Select>, but the
                chat endpoint takes no model argument and ChatWindow never read
                the prop, so picking an entry did nothing — and it defaulted to
                ollama_models[0], which is the *embedding* model, so it named
                the wrong one. The backend reads system_settings.ollama_model,
                so this reports that instead of pretending to set it. */}
            {ingestStatus?.chat_model && (
              <Tooltip title={`Answers are generated by ${ingestStatus.chat_model}. Change it in Settings.`}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    maxWidth: 200,
                    padding: '3px 10px',
                    borderRadius: 20,
                    border: '1px solid var(--border)',
                    background: 'var(--overlay-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <RobotOutlined style={{ color: 'var(--text-muted)' }} />
                  {ingestStatus.chat_model}
                </span>
              </Tooltip>
            )}
            {/* Thinking toggle */}
            <Tooltip title={showThink ? 'Hide thinking' : 'Show thinking'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BulbOutlined style={{ color: showThink ? 'var(--input-focus)' : 'var(--chart4)', fontSize: 14 }} />
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
        {isMobile ? (
          <Drawer
            placement="left"
            open={sessionsOpen}
            onClose={() => setSessionsOpen(false)}
            width={280}
            closable={false}
            styles={{ body: { padding: 0, background: 'var(--chat-bg)' } }}
          >
            {sessionsPanel}
          </Drawer>
        ) : (
          sessionsPanel
        )}

        {/* ── Right main area ── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {activeSessionId ? (
            <ChatWindow
              sessionId={activeSessionId}
              onSessionCreated={handleSessionCreated}
              showThink={showThink}
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
                        background: 'var(--overlay-subtle)',
                        border: '1px solid var(--border)',
                        borderRadius: 16,
                        padding: '16px 20px',
                        color: 'var(--text-secondary)',
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