import { z } from "zod";

// ── Internal (UI-side) schemas ──────────────────────────────────────

export const SourceDocumentSchema = z.object({
  chunk_id: z.string(),
  document_title: z.string(),
  content: z.string(),
  score: z.number(),
  source_url: z.string().nullable(),
  metadata: z.record(z.unknown()),
});

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "error"]),
  content: z.string(),
  sources: z.array(SourceDocumentSchema).optional(),
  latency_ms: z.number().optional(),
  timestamp: z.string(),
  status: z.enum(["sending", "streaming", "done", "error", "cancelled"]).optional(),
  statusLabel: z.string().optional(),
});

export const ChatSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(MessageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number().optional(),
  lastMessageAt: z.string().nullable().optional(),
});

// ── API response schemas (validated at service boundary) ────────────

export const ChatHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  sources: z.array(SourceDocumentSchema),
  created_at: z.string(),
});

export const ChatSessionHistorySchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
  messages: z.array(ChatHistoryMessageSchema),
});

export const ChatSessionListItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  message_count: z.number(),
  last_message_at: z.string().nullable(),
  created_at: z.string(),
});

export const QueryStreamEventSchema = z.object({
  node: z.string().optional(),
  answer: z.string().optional(),
  sources: z.array(SourceDocumentSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
  session_id: z.string().optional(),
  latency_ms: z.number().optional(),
  error: z.string().optional(),
});

export const FrequentQuestionSchema = z.object({
  query: z.string(),
  count: z.number(),
  last_asked_at: z.string(),
});

// ── Inferred types ──────────────────────────────────────────────────

export type SourceDocument = z.infer<typeof SourceDocumentSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type ChatSession = z.infer<typeof ChatSessionSchema>;
export type ChatSessionHistory = z.infer<typeof ChatSessionHistorySchema>;
export type ChatSessionListItem = z.infer<typeof ChatSessionListItemSchema>;
export type QueryStreamEvent = z.infer<typeof QueryStreamEventSchema>;
export type FrequentQuestion = z.infer<typeof FrequentQuestionSchema>;
