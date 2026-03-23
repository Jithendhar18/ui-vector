import api from "./api";
import { config } from "./config";
import { safeGetItem } from "./storage";
import type {
  ChatSessionHistory,
  ChatSessionListItem,
  FrequentQuestion,
  QueryResponse,
  QueryStreamEvent,
} from "@/types";

export const queryApi = {
  query: (query: string, topK: number = 5, sessionId?: string) =>
    api
      .post<QueryResponse>("/query", {
        query,
        top_k: topK,
        session_id: sessionId ?? null,
      })
      .then((r) => r.data),

  listSessions: (page: number = 1, pageSize: number = 20) =>
    api
      .get<ChatSessionListItem[]>("/query/history", {
        params: { page, page_size: pageSize },
      })
      .then((r) => r.data),

  getSession: (sessionId: string) =>
    api.get<ChatSessionHistory>(`/query/history/${sessionId}`).then((r) => r.data),

  deleteSession: (sessionId: string) =>
    api.delete(`/query/history/${sessionId}`).then(() => undefined),

  getPopularQuestions: (limit: number = 10) =>
    api
      .get<FrequentQuestion[]>("/query/popular", { params: { limit } })
      .then((r) => r.data),

  stream: (
    query: string,
    topK: number = 5,
    sessionId?: string,
    signal?: AbortSignal
  ) => {
    const token = safeGetItem("access_token");
    return fetch(`${config.apiUrl}/query/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query,
        top_k: topK,
        session_id: sessionId ?? null,
      }),
      signal,
    });
  },

  streamEvents: async function* (
    query: string,
    topK: number = 5,
    sessionId?: string,
    signal?: AbortSignal
  ): AsyncGenerator<QueryStreamEvent> {
    const response = await this.stream(query, topK, sessionId, signal);

    if (!response.ok) {
      throw new Error(`Streaming failed: HTTP ${response.status}`);
    }
    if (!response.body) {
      throw new Error("Streaming failed: response body is empty");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        if (signal?.aborted) return;

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          if (signal?.aborted) return;
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") return;
            try {
              yield JSON.parse(raw) as QueryStreamEvent;
            } catch {
              yield { error: "Failed to parse server response" };
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
