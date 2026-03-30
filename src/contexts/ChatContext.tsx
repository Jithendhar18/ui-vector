import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AxiosError } from "axios";
import { mapApiError } from "@/lib/api-error";
import { useAuth } from "@/contexts/AuthContext";
import * as chatService from "@/services/chat-service";
import type { ChatSession, Message, SourceDocument } from "@/features/chat/types";

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
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const loadingSessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset all chat state when user changes (login/logout/switch)
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSessions([]);
    setActiveSessionId(null);
    setIsLoading(false);
    setStreamingMessage(null);
  }, [user?.id]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [activeSessionId, sessions]
  );

  const sortByDate = (list: ChatSession[]) =>
    [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const replaceSession = useCallback((next: ChatSession) => {
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === next.id);
      if (!exists) return sortByDate([next, ...prev]);
      return sortByDate(prev.map((s) => (s.id === next.id ? next : s)));
    });
  }, []);

  const loadSessionById = useCallback(
    async (sessionId: string) => {
      loadingSessionIdRef.current = sessionId;
      try {
        const session = await chatService.loadSessionById(sessionId);
        replaceSession(session);
      } finally {
        if (loadingSessionIdRef.current === sessionId) {
          loadingSessionIdRef.current = null;
        }
      }
    },
    [replaceSession]
  );

  const reloadSessions = useCallback(async () => {
    const mapped = await chatService.loadSessions();
    setSessions((prev) => {
      const previousById = new Map(prev.map((s) => [s.id, s]));
      // Keep local-only sessions (e.g. greeting responses that never hit the backend)
      const localSessions = prev.filter((s) => s.id.startsWith("local-"));
      const merged = mapped.map((s) => {
        const previous = previousById.get(s.id);
        if (!previous || previous.messages.length === 0) return s;
        return { ...s, messages: previous.messages };
      });
      return sortByDate([...localSessions, ...merged]);
    });

    if (activeSessionId && !activeSessionId.startsWith("local-")) {
      const stillExists = mapped.some((s) => s.id === activeSessionId);
      if (!stillExists) setActiveSessionId(null);
    }
  }, [activeSessionId, user?.id]);

  useEffect(() => {
    reloadSessions().catch(() => setSessions([]));
  }, [reloadSessions]);

  useEffect(() => {
    if (!activeSessionId || activeSessionId.startsWith("local-")) return;
    const current = sessions.find((s) => s.id === activeSessionId);
    if (!current || current.messages.length === 0) {
      loadSessionById(activeSessionId).catch(() => {});
    }
  }, [activeSessionId, loadSessionById, sessions]);

  const createNewSession = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setStreamingMessage(null);
    setActiveSessionId(null);
  }, []);

  const setActiveSession = useCallback((id: string) => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setStreamingMessage(null);
    setActiveSessionId(id);
  }, []);

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setStreamingMessage(null);
  }, []);

  const deleteSession = useCallback(
    async (id: string) => {
      await chatService.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) setActiveSessionId(null);
    },
    [activeSessionId]
  );

  const sendMessage = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || isLoading) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
        status: "done",
      };

      const ephemeralId = activeSessionId ?? `local-${crypto.randomUUID()}`;
      const existing = sessions.find((s) => s.id === activeSessionId);
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
          title: trimmed.slice(0, 60),
          messages: [userMessage],
          createdAt: now,
          updatedAt: now,
          messageCount: 1,
          lastMessageAt: now,
        };
        setSessions((prev) => sortByDate([newSession, ...prev]));
        setActiveSessionId(ephemeralId);
      }

      // Greeting detection — skip RAG pipeline for simple greetings
      const GREETING_PATTERN = /^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up|sup|yo)[\s!?.]*$/i;
      if (GREETING_PATTERN.test(trimmed)) {
        const GREETING_RESPONSES = [
          "Hello! How can I help you with your documentation today?",
          "Hi there! What would you like to know about your docs?",
          "Hey! I'm ready to help. Ask me anything about your documentation.",
        ];
        const greetingReply = GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)];

        // Brief typing delay so it feels natural (400–600ms)
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 200));

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: greetingReply,
          timestamp: new Date().toISOString(),
          status: "done",
        };

        setSessions((prev) =>
          sortByDate(
            prev.map((s) => {
              if (s.id !== ephemeralId) return s;
              return {
                ...s,
                messages: [...s.messages, assistantMessage],
                updatedAt: new Date().toISOString(),
                messageCount: (s.messageCount ?? s.messages.length) + 1,
                lastMessageAt: new Date().toISOString(),
              };
            })
          )
        );
        return;
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

        const NODE_LABELS: Record<string, string> = {
          input: "Processing...",
          query_rewrite: "Optimizing query...",
          retriever: "Searching documents...",
          reranker: "Ranking results...",
          context_compressor: "Preparing context...",
          llm_reasoning: "Generating answer...",
          response_validator: "Checking answer...",
          response: "Finalizing...",
        };

        for await (const event of chatService.streamMessage(
          trimmed,
          5,
          activeSessionId?.startsWith("local-") ? undefined : activeSessionId ?? undefined,
          controller.signal
        )) {
          if (controller.signal.aborted) return;

          if (event.error) throw new Error(event.error);
          if (event.session_id) finalSessionId = event.session_id;
          if (event.latency_ms) finalLatency = event.latency_ms;

          if (event.answer) {
            finalAnswer = event.answer;
            setStreamingMessage((prev) =>
              prev ? { ...prev, content: finalAnswer, statusLabel: "Generating..." } : prev
            );
          }

          if (event.sources && event.sources.length > 0) {
            finalSources = event.sources;
          }

          if (event.node && !event.answer) {
            const label = NODE_LABELS[event.node] ?? "Processing...";
            setStreamingMessage((prev) => (prev ? { ...prev, statusLabel: label } : prev));
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

        const resolvedSessionId = finalSessionId ?? ephemeralId;

        setSessions((prev) =>
          sortByDate(
            prev.map((s) => {
              if (s.id !== ephemeralId) return s;
              return {
                ...s,
                id: resolvedSessionId,
                messages: [...s.messages, assistantMessage],
                updatedAt: new Date().toISOString(),
                messageCount: (s.messageCount ?? s.messages.length) + 1,
                lastMessageAt: new Date().toISOString(),
              };
            })
          )
        );
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
          prev.map((s) =>
            s.id === ephemeralId
              ? { ...s, messages: [...s.messages, errorMessage], updatedAt: new Date().toISOString() }
              : s
          )
        );
      } finally {
        setIsLoading(false);
        setStreamingMessage(null);
        abortRef.current = null;
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
