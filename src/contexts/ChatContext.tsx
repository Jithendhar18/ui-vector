import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { queryApi } from "@/lib/query-api";
import { safeGetJSON, safeSetJSON, safeGetItem } from "@/lib/storage";
import { mapApiError } from "@/lib/api-error";
import type { ChatSession, Message, SourceDocument } from "@/types";
import { AxiosError } from "axios";

const SESSIONS_KEY = "rag_chat_sessions";
const VERSION_KEY = "rag_sessions_version";
const MAX_SESSIONS = 50;

const NODE_LABELS: Record<string, string> = {
  query_rewrite: "Refining your question...",
  hybrid_retriever: "Searching documents...",
  reranker: "Ranking results...",
  context_compressor: "Preparing context...",
  llm_reasoning: "Generating answer...",
  response_validator: "Checking accuracy...",
};

function generateId() {
  return crypto.randomUUID();
}

function truncateTitle(text: string, max = 60): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 5) return text.trim();
  let result = "";
  for (const w of words) {
    if ((result + " " + w).trim().length > max) break;
    result = (result + " " + w).trim();
  }
  return result + "...";
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
  deleteSession: (id: string) => void;
  activeSession: ChatSession | null;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const version = safeGetItem(VERSION_KEY);
    if (version !== "1") {
      safeSetJSON(VERSION_KEY, "1");
      return [];
    }
    return safeGetJSON<ChatSession[]>(SESSIONS_KEY) ?? [];
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamingSupportedRef = useRef(true);
  const sseFailCountRef = useRef(0);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist sessions debounced
  const persistSessions = useCallback((s: ChatSession[]) => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      safeSetJSON(SESSIONS_KEY, s);
      safeSetJSON(VERSION_KEY, "1");
    }, 300);
  }, []);

  useEffect(() => {
    persistSessions(sessions);
  }, [sessions, persistSessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const createNewSession = useCallback(() => {
    cancelRequestInternal();
    setActiveSessionId(null);
    setStreamingMessage(null);
  }, []);

  const setActiveSession = useCallback((id: string) => {
    cancelRequestInternal();
    setActiveSessionId(id);
    setStreamingMessage(null);
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    },
    [activeSessionId]
  );

  function cancelRequestInternal() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
  }

  const cancelRequest = useCallback(() => {
    cancelRequestInternal();
    setStreamingMessage(null);
  }, []);

  const sendMessage = useCallback(
    async (query: string) => {
      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: query,
        timestamp: new Date().toISOString(),
        status: "done",
      };

      let currentSessionId = activeSessionId;
      let currentSession = sessions.find((s) => s.id === currentSessionId);

      if (!currentSession) {
        const newSession: ChatSession = {
          id: generateId(),
          title: truncateTitle(query),
          messages: [userMsg],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        currentSessionId = newSession.id;
        currentSession = newSession;
        setSessions((prev) => [newSession, ...prev].slice(0, MAX_SESSIONS));
        setActiveSessionId(newSession.id);
      } else {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSessionId
              ? { ...s, messages: [...s.messages, userMsg], updatedAt: new Date().toISOString() }
              : s
          )
        );
      }

      setIsLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;

      const aiMsgId = generateId();
      setStreamingMessage({
        id: aiMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        status: "streaming",
        statusLabel: "Thinking...",
      });

      const backendSessionId = currentSession?.backendSessionId;
      const startTime = Date.now();

      try {
        let answer = "";
        let sources: SourceDocument[] = [];
        let sessionIdFromBackend: string | undefined;
        let latency_ms = 0;
        let success = false;

        // Try SSE first
        if (streamingSupportedRef.current && sseFailCountRef.current < 2) {
          try {
            const response = await Promise.race([
              queryApi.stream(query, 5, backendSessionId ?? undefined, controller.signal),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("SSE_TIMEOUT")), 15000)
              ),
            ]);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            if (!response.body) throw new Error("No body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const events = buffer.split("\n\n");
              buffer = events.pop() ?? "";

              for (const event of events) {
                for (const line of event.split("\n")) {
                  if (!line.startsWith("data: ")) continue;
                  const data = line.slice(6).trim();
                  if (data === "[DONE]") {
                    success = true;
                    break;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                      throw new Error(parsed.error);
                    }
                    if (parsed.node && NODE_LABELS[parsed.node]) {
                      setStreamingMessage((prev) =>
                        prev ? { ...prev, statusLabel: NODE_LABELS[parsed.node] } : prev
                      );
                    }
                    // Extract answer from llm_reasoning as fallback
                    if (parsed.node === "llm_reasoning" && parsed.answer && !answer) {
                      answer = parsed.answer;
                      sources = parsed.sources ?? [];
                    }
                    if (parsed.node === "response" && parsed.answer) {
                      answer = parsed.answer;
                      sources = parsed.sources ?? [];
                      sessionIdFromBackend = parsed.session_id;
                      latency_ms = parsed.latency_ms ?? Date.now() - startTime;
                      success = true;
                    }
                    // Handle response node even if answer is empty (fallback)
                    if (parsed.node === "response" && !answer) {
                      sessionIdFromBackend = parsed.session_id;
                      latency_ms = parsed.latency_ms ?? Date.now() - startTime;
                      success = true;
                    }
                  } catch {
                    // skip malformed
                  }
                }
                if (success) break;
              }
              if (success) break;
            }
            sseFailCountRef.current = 0;
          } catch (sseErr) {
            if (controller.signal.aborted) throw sseErr;
            sseFailCountRef.current++;
            if (sseFailCountRef.current >= 2) streamingSupportedRef.current = false;
          }
        }

        // Fallback to standard POST
        if (!success && !controller.signal.aborted) {
          setStreamingMessage((prev) =>
            prev ? { ...prev, statusLabel: "Thinking..." } : prev
          );
          const result = await queryApi.query(query, 5, backendSessionId ?? undefined);
          answer = result.answer;
          sources = result.sources;
          sessionIdFromBackend = result.session_id;
          latency_ms = result.latency_ms;
          success = true;
        }

        if (success) {
          const aiMsg: Message = {
            id: aiMsgId,
            role: "assistant",
            content: answer,
            sources,
            latency_ms,
            timestamp: new Date().toISOString(),
            status: "done",
          };

          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? {
                    ...s,
                    messages: [...s.messages, aiMsg],
                    updatedAt: new Date().toISOString(),
                    backendSessionId: sessionIdFromBackend ?? s.backendSessionId,
                  }
                : s
            )
          );
          setStreamingMessage(null);
        }
      } catch (err) {
        if (controller.signal.aborted) {
          setStreamingMessage(null);
          // Add cancelled message
          const cancelledMsg: Message = {
            id: aiMsgId,
            role: "assistant",
            content: "Request cancelled",
            timestamp: new Date().toISOString(),
            status: "cancelled",
          };
          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? { ...s, messages: [...s.messages, cancelledMsg], updatedAt: new Date().toISOString() }
                : s
            )
          );
        } else {
          const apiErr =
            err instanceof AxiosError
              ? mapApiError(err)
              : { message: "An unexpected error occurred.", retryable: true };
          const errMsg: Message = {
            id: aiMsgId,
            role: "error",
            content: apiErr.message,
            timestamp: new Date().toISOString(),
            status: "error",
          };
          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? { ...s, messages: [...s.messages, errMsg], updatedAt: new Date().toISOString() }
                : s
            )
          );
          setStreamingMessage(null);
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [activeSessionId, sessions]
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
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
