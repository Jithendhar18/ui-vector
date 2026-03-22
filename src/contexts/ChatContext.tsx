import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AxiosError } from "axios";
import { queryApi } from "@/lib/query-api";
import { mapApiError } from "@/lib/api-error";
import type { ChatSession, ChatSessionHistory, ChatSessionListItem, Message } from "@/types";

const PAGE_SIZE = 50;

function mapHistoryToSession(history: ChatSessionHistory): ChatSession {
  const messages: Message[] = history.messages.map((message, index) => ({
    id: `${history.id}-${index}-${message.role}`,
    role: message.role,
    content: message.content,
    sources: message.sources,
    timestamp: message.created_at,
    status: "done",
  }));

  const lastTimestamp =
    messages[messages.length - 1]?.timestamp ?? history.updated_at ?? history.created_at;

  return {
    id: history.id,
    title: history.title ?? "Untitled conversation",
    messages,
    createdAt: history.created_at,
    updatedAt: lastTimestamp,
    messageCount: history.messages.length,
    lastMessageAt: lastTimestamp,
  };
}

function mapListItemToSession(item: ChatSessionListItem): ChatSession {
  return {
    id: item.id,
    title: item.title ?? "Untitled conversation",
    messages: [],
    createdAt: item.created_at,
    updatedAt: item.last_message_at ?? item.created_at,
    messageCount: item.message_count,
    lastMessageAt: item.last_message_at,
  };
}

interface ChatContextValue {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isLoading: boolean;
  streamingMessage: Message | null;
  sendMessage: (query: string) => Promise<void>;
  cancelRequest: () => void;
  createNewSession: () => void;
  setActiveSession: (id: string) => void;
  deleteSession: (id: string) => Promise<void>;
  activeSession: ChatSession | null;
  reloadSessions: () => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const loadingSessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions]
  );

  const replaceSession = useCallback((next: ChatSession) => {
    setSessions((prev) => {
      const exists = prev.some((session) => session.id === next.id);
      if (!exists) {
        return [next, ...prev].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }

      return prev
        .map((session) => (session.id === next.id ? next : session))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });
  }, []);

  const loadSessionById = useCallback(
    async (sessionId: string) => {
      loadingSessionIdRef.current = sessionId;
      try {
        const history = await queryApi.getSession(sessionId);
        replaceSession(mapHistoryToSession(history));
      } finally {
        if (loadingSessionIdRef.current === sessionId) {
          loadingSessionIdRef.current = null;
        }
      }
    },
    [replaceSession]
  );

  const reloadSessions = useCallback(async () => {
    const list = await queryApi.listSessions(1, PAGE_SIZE);
    const mapped = list.map(mapListItemToSession);
    setSessions((prev) => {
      const previousById = new Map(prev.map((session) => [session.id, session]));
      return mapped.map((session) => {
        const previous = previousById.get(session.id);
        if (!previous || previous.messages.length === 0) return session;
        return {
          ...session,
          messages: previous.messages,
        };
      });
    });

    if (activeSessionId) {
      const stillExists = mapped.some((session) => session.id === activeSessionId);
      if (!stillExists) {
        setActiveSessionId(null);
      }
    }
  }, [activeSessionId]);

  useEffect(() => {
    reloadSessions().catch(() => {
      setSessions([]);
    });
  }, [reloadSessions]);

  useEffect(() => {
    if (!activeSessionId) return;
    const current = sessions.find((session) => session.id === activeSessionId);
    if (!current || current.messages.length === 0) {
      loadSessionById(activeSessionId).catch(() => {
        // Keep sidebar list even if the detailed fetch fails.
      });
    }
  }, [activeSessionId, loadSessionById, sessions]);

  const createNewSession = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    setStreamingMessage(null);
    setActiveSessionId(null);
  }, []);

  const setActiveSession = useCallback((id: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    setStreamingMessage(null);
    setActiveSessionId(id);
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    setStreamingMessage(null);
  }, []);

  const deleteSession = useCallback(
    async (id: string) => {
      await queryApi.deleteSession(id);
      setSessions((prev) => prev.filter((session) => session.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    },
    [activeSessionId]
  );

  const sendMessage = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery || isLoading) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmedQuery,
        timestamp: new Date().toISOString(),
        status: "done",
      };

      const ephemeralId = activeSessionId ?? `local-${crypto.randomUUID()}`;
      const existing = sessions.find((session) => session.id === activeSessionId);

      if (existing) {
        replaceSession({
          ...existing,
          messages: [...existing.messages, userMessage],
          updatedAt: new Date().toISOString(),
          messageCount: (existing.messageCount ?? existing.messages.length) + 1,
          lastMessageAt: new Date().toISOString(),
        });
      } else {
        replaceSession({
          id: ephemeralId,
          title: trimmedQuery.slice(0, 60),
          messages: [userMessage],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: 1,
          lastMessageAt: new Date().toISOString(),
        });
        setActiveSessionId(ephemeralId);
      }

      setStreamingMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        status: "streaming",
        statusLabel: "Thinking...",
      });

      setIsLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await queryApi.query(trimmedQuery, 5, activeSessionId ?? undefined);
        if (controller.signal.aborted) return;

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          sources: response.sources,
          latency_ms: response.latency_ms,
          timestamp: new Date().toISOString(),
          status: "done",
        };

        const persistedSession = await queryApi.getSession(response.session_id);
        const mapped = mapHistoryToSession(persistedSession);

        const hasAssistant = mapped.messages.some(
          (message) => message.role === "assistant" && message.content === assistantMessage.content
        );

        replaceSession(
          hasAssistant
            ? mapped
            : {
                ...mapped,
                messages: [...mapped.messages, assistantMessage],
                updatedAt: new Date().toISOString(),
              }
        );

        if (activeSessionId !== response.session_id) {
          setSessions((prev) => prev.filter((session) => session.id !== ephemeralId));
          setActiveSessionId(response.session_id);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        const apiError =
          error instanceof AxiosError
            ? mapApiError(error)
            : {
                message: "An unexpected error occurred.",
                detail: "Unexpected error",
                retryable: true,
                status: 0,
              };

        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "error",
          content: apiError.message,
          timestamp: new Date().toISOString(),
          status: "error",
        };

        setSessions((prev) =>
          prev.map((session) =>
            session.id === ephemeralId
              ? {
                  ...session,
                  messages: [...session.messages, errorMessage],
                  updatedAt: new Date().toISOString(),
                }
              : session
          )
        );
      } finally {
        setIsLoading(false);
        setStreamingMessage(null);
        abortRef.current = null;
        reloadSessions().catch(() => {
          // Keep current state when refresh fails.
        });
      }
    },
    [activeSessionId, isLoading, reloadSessions, replaceSession, sessions]
  );

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSessionId,
        isLoading,
        streamingMessage,
        sendMessage,
        cancelRequest,
        createNewSession,
        setActiveSession,
        deleteSession,
        activeSession,
        reloadSessions,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
}
