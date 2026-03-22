import api from "./api";
import { config } from "./config";
import { safeGetItem } from "./storage";
import type { QueryResponse } from "@/types";

export const queryApi = {
  query: (query: string, topK: number = 5, sessionId?: string) =>
    api
      .post<QueryResponse>("/query", {
        query,
        top_k: topK,
        session_id: sessionId ?? null,
      })
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
};
