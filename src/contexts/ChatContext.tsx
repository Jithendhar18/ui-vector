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
  sessionsLoaded: boolean;
  sendMessage: (query: string) => Promise<void>;
  cancelRequest: () => void;
  createNewSession: () => void;
  setActiveSession: (id: string) => void;
  deleteSession: (id: string) => Promise<void>;
  activeSession: ChatSession | null;
  reloadSessions: (force?: boolean) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, _setActiveSessionId] = useState<string | null>(null);
  const setActiveSessionId = (id: string | null) => {
    console.log("[DEBUG setActiveSessionId]", { from: activeSessionIdRef.current, to: id });
    activeSessionIdRef.current = id;
    _setActiveSessionId(id);
  };
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const loadingSessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastHistoryFetchRef = useRef<number>(0);
  const loadedSessionIdsRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | undefined>(undefined);
  const activeSessionIdRef = useRef<string | null>(null);
  const HISTORY_THROTTLE_MS = 10_000;

  // Reset + reload when user changes (login/logout/switch)
  useEffect(() => {
    const newUserId = user?.id;
    userIdRef.current = newUserId;

    // Always reset on user change
    abortRef.current?.abort();
    abortRef.current = null;
    setSessions([]);
    setActiveSessionId(null);
    setIsLoading(false);
    setStreamingMessage(null);
    setSessionsLoaded(false);
    loadedSessionIdsRef.current.clear();
    lastHistoryFetchRef.current = 0;

    // If we have a user, fetch their sessions immediately
    if (newUserId) {
      chatService.loadSessions()
        .then((mapped) => {
          // Guard: only apply if user hasn't changed again
          if (userIdRef.current !== newUserId) return;
          setSessions(mapped);
          setSessionsLoaded(true);
          lastHistoryFetchRef.current = Date.now();
        })
        .catch(() => {
          if (userIdRef.current !== newUserId) return;
          setSessions([]);
          setSessionsLoaded(true);
        });
    }
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
      if (loadedSessionIdsRef.current.has(sessionId)) return;
      loadedSessionIdsRef.current.add(sessionId);
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

  const reloadSessions = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastHistoryFetchRef.current < HISTORY_THROTTLE_MS) return;
    lastHistoryFetchRef.current = now;
    const mapped = await chatService.loadSessions();
    loadedSessionIdsRef.current.clear();
    setSessions((prev) => {
      const mappedIds = new Set(mapped.map((s) => s.id));
      const previousById = new Map(prev.map((s) => [s.id, s]));

      // Keep sessions that exist locally but not on the backend yet
      const unsyncedSessions = prev.filter((s) => !mappedIds.has(s.id));

      const merged = mapped.map((s) => {
        const previous = previousById.get(s.id);
        if (!previous || previous.messages.length === 0) return s;
        return { ...s, messages: previous.messages };
      });

      // Dedup by id (in case unsynced + merged overlap after ID replacement)
      const seen = new Set<string>();
      const deduped = [...unsyncedSessions, ...merged].filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
      return sortByDate(deduped);
    });
    setSessionsLoaded(true);
  }, []);

  // Note: We intentionally do NOT check if activeSessionId exists in sessions
  // after every sessions mutation. The sendMessage flow replaces local-* IDs
  // with backend UUIDs in a two-step state update (sessions + activeSessionId),
  // and checking between those updates would incorrectly reset the session.
  // Session validity is ensured by:
  // 1. The initial load (sessionsLoaded effect)
  // 2. The URL sync in ChatPage (checks sessionsLoaded before setting)

  // Load full session history when switching to a non-local session
  useEffect(() => {
    if (!activeSessionId || activeSessionId.startsWith("local-")) return;
    loadSessionById(activeSessionId).catch(() => {});
  }, [activeSessionId, loadSessionById]);

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
      if (activeSessionIdRef.current === id) setActiveSessionId(null);
    },
    []
  );

  const sendMessage = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || isLoading) return;

      // Read latest activeSessionId from ref to avoid stale closure
      const currentSessionId = activeSessionIdRef.current;
      console.log("[DEBUG sendMessage] START", { currentSessionId });

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
        status: "done",
      };

      const ephemeralId = currentSessionId ?? `local-${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      // Use functional update to read latest sessions (avoids stale closure)
      setSessions((prev) => {
        const existing = prev.find((s) => s.id === ephemeralId);
        if (existing) {
          return sortByDate(
            prev.map((s) =>
              s.id === ephemeralId
                ? {
                    ...s,
                    messages: [...s.messages, userMessage],
                    updatedAt: now,
                    messageCount: (s.messageCount ?? s.messages.length) + 1,
                    lastMessageAt: now,
                  }
                : s
            )
          );
        }
        const newSession: ChatSession = {
          id: ephemeralId,
          title: trimmed.slice(0, 60),
          messages: [userMessage],
          createdAt: now,
          updatedAt: now,
          messageCount: 1,
          lastMessageAt: now,
        };
        return sortByDate([newSession, ...prev]);
      });
      if (!currentSessionId) setActiveSessionId(ephemeralId);

      // Greeting detection — strip punctuation/quotes, collapse repeated chars (hiiiii→hi)
      const greetingText = trimmed
        .replace(/["""''`.,!?;:\-_]/g, "")
        .trim()
        .toLowerCase()
        .replace(/(.)\1{2,}/g, "$1$1"); // collapse 3+ repeated chars to 2
      const GREETING_WORDS = new Set([
        "hi", "hii", "hello", "helloo", "hey", "heyy", "howdy", "sup", "yo", "hola", "heya",
        "thanks", "thank", "thankyou", "thx", "ok", "okay", "bye", "goodbye",
      ]);
      const GREETING_PHRASES = ["good morning", "good afternoon", "good evening", "good night", "whats up", "what's up"];
      const isGreeting = GREETING_WORDS.has(greetingText) || GREETING_PHRASES.some((p) => greetingText === p);
      console.log("[DEBUG greeting]", { trimmed, greetingText, isGreeting });
      if (isGreeting) {
        const GREETING_RESPONSES = [
          "Hello! How can I help you with your documentation today?",
          "Hi there! What would you like to know about your docs?",
          "Hey! I'm ready to help. Ask me anything about your documentation.",
        ];
        const greetingReply = GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)];

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

        const latestSessionId = activeSessionIdRef.current;
        const sessionIdToSend = latestSessionId?.startsWith("local-") ? undefined : latestSessionId ?? undefined;
        console.log("[DEBUG sendMessage] SENDING to backend", { sessionIdToSend, latestSessionId });

        for await (const event of chatService.streamMessage(
          trimmed,
          5,
          sessionIdToSend,
          controller.signal
        )) {
          if (controller.signal.aborted) return;

          if (event.error) throw new Error(event.error);
          if (event.session_id) {
            console.log("[DEBUG sendMessage] GOT session_id from backend", { finalSessionId: event.session_id });
            finalSessionId = event.session_id;
          }
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
        console.log("[DEBUG sendMessage] SETTING activeSessionId", { resolvedSessionId, previous: activeSessionIdRef.current });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoading, reloadSessions]
  );

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSessionId,
        isLoading,
        streamingMessage,
        sessionsLoaded,
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
