/**
 * Chat service layer — all API calls + data transformation + validation.
 * ChatContext should call this service, never queryApi directly.
 */
import { z } from "zod";
import { queryApi } from "@/lib/query-api";
import {
  ChatSessionHistorySchema,
  ChatSessionListItemSchema,
  QueryStreamEventSchema,
  FrequentQuestionSchema,
} from "@/features/chat/types";
import type {
  ChatSession,
  Message,
  QueryStreamEvent,
  FrequentQuestion,
} from "@/features/chat/types";

const PAGE_SIZE = 50;

// ── Mappers ─────────────────────────────────────────────────────────

function mapHistoryToSession(
  history: z.infer<typeof ChatSessionHistorySchema>
): ChatSession {
  const messages: Message[] = history.messages.map((msg, i) => ({
    id: `${history.id}-${i}-${msg.role}`,
    role: msg.role,
    content: msg.content,
    sources: msg.sources,
    timestamp: msg.created_at,
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

function mapListItemToSession(
  item: z.infer<typeof ChatSessionListItemSchema>
): ChatSession {
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

// ── Service methods ─────────────────────────────────────────────────

export async function loadSessionById(sessionId: string): Promise<ChatSession> {
  const raw = await queryApi.getSession(sessionId);
  const validated = ChatSessionHistorySchema.parse(raw);
  return mapHistoryToSession(validated);
}

export async function loadSessions(): Promise<ChatSession[]> {
  const raw = await queryApi.listSessions(1, PAGE_SIZE);
  const validated = z.array(ChatSessionListItemSchema).parse(raw);
  return validated.map(mapListItemToSession);
}

export async function deleteSession(id: string): Promise<void> {
  await queryApi.deleteSession(id);
}

export async function* streamMessage(
  query: string,
  topK: number = 5,
  sessionId?: string,
  signal?: AbortSignal
): AsyncGenerator<QueryStreamEvent> {
  for await (const raw of queryApi.streamEvents(query, topK, sessionId, signal)) {
    const parsed = QueryStreamEventSchema.safeParse(raw);
    if (parsed.success) {
      yield parsed.data;
    } else {
      // Still extract session_id to prevent orphaned local sessions
      if (raw && typeof raw === "object" && "session_id" in raw && typeof (raw as Record<string, unknown>).session_id === "string") {
        yield { session_id: (raw as Record<string, unknown>).session_id as string };
      }
    }
  }
}

export async function getPopularQuestions(limit: number = 6): Promise<FrequentQuestion[]> {
  const raw = await queryApi.getPopularQuestions(limit);
  return z.array(FrequentQuestionSchema).parse(raw);
}

/**
 * Non-streaming query fallback — used when the SSE stream fails.
 * Always returns a session_id from the backend.
 */
export async function queryNonStreaming(
  query: string,
  topK: number = 5,
  sessionId?: string
): Promise<{ answer: string; sources: QueryStreamEvent["sources"]; session_id: string; latency_ms?: number }> {
  const raw = await queryApi.query(query, topK, sessionId);
  return {
    answer: raw.answer,
    sources: raw.sources,
    session_id: raw.session_id,
    latency_ms: raw.latency_ms,
  };
}
