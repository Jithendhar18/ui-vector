import { z } from "zod";

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

export type SourceDocument = z.infer<typeof SourceDocumentSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type ChatSession = z.infer<typeof ChatSessionSchema>;
