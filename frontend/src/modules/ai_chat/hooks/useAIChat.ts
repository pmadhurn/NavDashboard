import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string | null;
  message_count: number;
  last_message_preview: string | null;
}

export interface ChatMessageItem {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: SourceRef[] | null;
  token_count: number | null;
  created_at: string;
}

export interface SourceRef {
  entity_type: string;
  entity_id: string;
  name: string;
  snippet: string;
}

export interface IngestStatus {
  total_documents: number;
  last_sync: string | null;
  ollama_available: boolean;
  ollama_models: string[];
  embedding_model_available: boolean;
  chat_model_available: boolean;
}

interface SessionDetail {
  session: ChatSession;
  messages: ChatMessageItem[];
}

export function useChatSessions() {
  return useQuery<ChatSession[]>({
    queryKey: ['chat-sessions'],
    queryFn: () => api.get<ChatSession[]>('/ai/sessions'),
  });
}

export function useChatMessages(sessionId: string | null) {
  return useQuery<SessionDetail>({
    queryKey: ['chat-messages', sessionId],
    queryFn: () => api.get<SessionDetail>(`/ai/sessions/${sessionId}`),
    enabled: !!sessionId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { content: string; session_id?: string }) =>
      api.post<{ message: ChatMessageItem; session_id: string }>('/ai/chat', {
        content: params.content,
        ...(params.session_id ? {} : {}),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['chat-sessions'] });
      if (variables.session_id) {
        qc.invalidateQueries({ queryKey: ['chat-messages', variables.session_id] });
      }
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.del(`/ai/sessions/${sessionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
  });
}

export function useIngestStatus() {
  return useQuery<IngestStatus>({
    queryKey: ['ingest-status'],
    queryFn: () => api.get<IngestStatus>('/ai/ingest/status'),
    refetchInterval: 30000,
  });
}

export function useTriggerIngest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/ai/ingest'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingest-status'] });
    },
  });
}

export function useSendMessageStream() {
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sources, setSources] = useState<SourceRef[]>([]);
  const [streamSessionId, setStreamSessionId] = useState<string | null>(null);
  const qc = useQueryClient();

  const sendStream = async (content: string, sessionId?: string) => {
    setStreamingContent('');
    setIsStreaming(true);
    setSources([]);
    setStreamSessionId(null);

    const token = localStorage.getItem('access_token');
    let url = '/api/v1/ai/chat/stream';
    if (sessionId) {
      url += `?session_id=${sessionId}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        setStreamingContent('Error: Failed to connect to AI assistant.');
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.session_id && !streamSessionId) {
                setStreamSessionId(data.session_id);
              }
              if (data.token) {
                accumulated += data.token;
                setStreamingContent(accumulated);
              }
              if (data.done && data.sources) {
                setSources(data.sources || []);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setStreamingContent('Error: Failed to connect to AI assistant.');
    }

    setIsStreaming(false);
    qc.invalidateQueries({ queryKey: ['chat-sessions'] });
    qc.invalidateQueries({ queryKey: ['chat-messages'] });
  };

  return { sendStream, streamingContent, isStreaming, sources, streamSessionId };
}