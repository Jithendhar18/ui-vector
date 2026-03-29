import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AxiosError } from "axios";
import { queryApi } from "@/lib/query-api";
import { mapApiError } from "@/lib/api-error";
import type { ChatSession, ChatSessionHistory, ChatSessionListItem, Message, SourceDocument } from "@/types";

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
    // Don't try to load ephemeral local sessions from backend
    if (activeSessionId.startsWith("local-")) return;
    const current = sessions.find((session) => session.id === activeSessionId);
    if (!current || current.messages.length === 0) {
      loadSessionById(activeSessionId).catch(() => {});
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

      // Update session and active ID together so React renders them in one pass
      const now = new Date().toISOString();
      if (existing) {
        replaceSession({
          ...existing,
          messages: [...existing.messages, userMessage],
          updatedAt: now,
          messageCount: (existing.messageCount ?? existing.messages.length) + 1,
          lastMessageAt: now,
        });
      } else {
        const newSession: ChatSession = {
          id: ephemeralId,
          title: trimmedQuery.slice(0, 60),
          messages: [userMessage],
          createdAt: now,
          updatedAt: now,
          messageCount: 1,
          lastMessageAt: now,
        };
        setSessions((prev) =>
          [newSession, ...prev].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
        );
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
        let finalAnswer = "";
        let finalSources: SourceDocument[] = [];
        let finalSessionId: string | null = null;
        let finalLatency: number | undefined;

        // Use streaming endpoint — shows answer as soon as LLM completes
        for await (const event of queryApi.streamEvents(
          trimmedQuery,
          5,
          activeSessionId ?? undefined,
          controller.signal
        )) {
          if (controller.signal.aborted) return;

          if (event.error) {
            throw new Error(event.error);
          }

          // Capture session_id from any event
          if (event.session_id) {
            finalSessionId = event.session_id;
          }

          if (event.latency_ms) {
            finalLatency = event.latency_ms;
          }

          // Update streaming message as answer arrives
          if (event.answer) {
            finalAnswer = event.answer;
            setStreamingMessage((prev) =>
              prev
                ? { ...prev, content: finalAnswer, statusLabel: "Generating..." }
                : prev
            );
          }

          if (event.sources && event.sources.length > 0) {
            finalSources = event.sources;
          }

          // Update status label based on pipeline node
          if (event.node && !event.answer) {
            const labels: Record<string, string> = {
              input: "Processing...",
              query_rewrite: "Optimizing query...",
              retriever: "Searching documents...",
              reranker: "Ranking results...",
              context_compressor: "Preparing context...",
              llm_reasoning: "Generating answer...",
              response_validator: "Checking answer...",
              response: "Finalizing...",
            };
            const label = labels[event.node] ?? "Processing...";
            setStreamingMessage((prev) =>
              prev ? { ...prev, statusLabel: label } : prev
            );
          }
        }

        if (controller.signal.aborted) return;

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: finalAnswer,
          sources: finalSources,
          latency_ms: finalLatency,
          timestamp: new Date().toISOString(),
          status: "done",
        };

        // Update session with final message and resolve ephemeral → real ID
        const resolvedSessionId = finalSessionId ?? ephemeralId;
        const targetId = ephemeralId; // Always use ephemeralId — it's what we set earlier

        setSessions((prev) =>
          prev
            .map((session) => {
              if (session.id !== targetId) return session;
              return {
                ...session,
                id: resolvedSessionId,
                messages: [...session.messages, assistantMessage],
                updatedAt: new Date().toISOString(),
                messageCount: (session.messageCount ?? session.messages.length) + 1,
                lastMessageAt: new Date().toISOString(),
              };
            })
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
        // Always update activeSessionId to the resolved one
        setActiveSessionId(resolvedSessionId);
      } catch (error) {
        if (controller.signal.aborted) return;

        const apiError =
          error instanceof AxiosError
            ? mapApiError(error)
            : {
                message: error instanceof Error ? error.message : "An unexpected error occurred.",
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
        // Background refresh of session list (non-blocking)
        reloadSessions().catch(() => {});
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
