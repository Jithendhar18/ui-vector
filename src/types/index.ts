export type Role = "admin" | "developer" | "user";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  role: Role;
  tenant_id: string;
  created_at: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  tenant_id?: string;
}

export interface UserUpdateRequest {
  full_name?: string;
  is_active?: boolean;
  role?: Role;
}

export interface QueryRequest {
  query: string;
  session_id?: string | null;
  top_k?: number;
  filters?: Record<string, unknown>;
}

export interface SourceDocument {
  chunk_id: string;
  document_title: string;
  content: string;
  score: number;
  source_url?: string;
  metadata: Record<string, unknown>;
}

export interface QueryResponse {
  answer: string;
  sources: SourceDocument[];
  session_id: string;
  trace_id: string | null;
  latency_ms: number;
}

export interface IngestRequest {
  bookstack_type?: string;
  bookstack_ids?: number[] | null;
  force_reindex?: boolean;
}

export interface IngestResponse {
  task_id: string;
  status: string;
  documents_queued: number;
  message: string;
}

export interface IngestionStatusResponse {
  task_id: string;
  status: string;
  progress: string | null;
  result: Record<string, unknown> | null;
}

export interface DocumentResponse {
  id: string;
  bookstack_id: number;
  bookstack_type: string;
  title: string;
  status: string;
  chunk_count: number;
  book_id: number | null;
  book_name: string | null;
  chapter_id: number | null;
  chapter_name: string | null;
  ingested_at: string | null;
  created_at: string;
}

export interface BookSummary {
  book_id: number;
  book_name: string;
  page_count: number;
  chunk_count: number;
}

export interface PageInChapter {
  id: string;
  bookstack_id: number;
  title: string;
  slug: string;
  chapter_id: number | null;
  chapter_name: string | null;
  status: string;
  chunk_count: number;
  source_url: string;
  ingested_at: string | null;
  created_at: string;
}

export interface ChapterHierarchy {
  chapter_id: number | null;
  chapter_name: string | null;
  page_count: number;
  pages: PageInChapter[];
}

export interface BookHierarchy {
  book_id: number;
  book_name: string;
  total_pages: number;
  total_chunks: number;
  chapters: ChapterHierarchy[];
}

export interface SystemMetrics {
  total_documents: number;
  total_chunks: number;
  total_embeddings: number;
  total_users: number;
  total_queries: number;
  total_books: number;
  documents_by_status: Record<string, number>;
  documents_by_book: Record<string, number>;
  avg_query_latency_ms: number | null;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  sources?: SourceDocument[];
  latency_ms?: number;
  timestamp: string;
  status?: "sending" | "streaming" | "done" | "error" | "cancelled";
  statusLabel?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  backendSessionId?: string | null;
}

export interface ApiError {
  status: number;
  message: string;
  detail: string;
  retryable: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
