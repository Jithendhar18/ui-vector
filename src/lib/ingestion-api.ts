import api from "./api";
import type {
  IngestResponse,
  IngestionStatusResponse,
  DocumentResponse,
  BookSummary,
  BookHierarchy,
} from "@/types";

export const ingestionApi = {
  ingest: (
    type: string = "pages",
    ids?: number[],
    force: boolean = false
  ) =>
    api
      .post<IngestResponse>("/ingestion/ingest", {
        bookstack_type: type,
        bookstack_ids: ids ?? null,
        force_reindex: force,
      })
      .then((r) => r.data),

  getStatus: (taskId: string) =>
    api
      .get<IngestionStatusResponse>(`/ingestion/status/${taskId}`)
      .then((r) => r.data),

  getDocuments: (
    page: number = 1,
    pageSize: number = 20,
    status?: string,
    bookId?: number
  ) =>
    api
      .get<DocumentResponse[]>("/ingestion/documents", {
        params: {
          page,
          page_size: pageSize,
          ...(status ? { status } : {}),
          ...(bookId !== undefined ? { book_id: bookId } : {}),
        },
      })
      .then((r) => r.data),

  getBooks: () =>
    api.get<BookSummary[]>("/ingestion/books").then((r) => r.data),

  getBook: (bookId: number) =>
    api.get<BookHierarchy>(`/ingestion/books/${bookId}`).then((r) => r.data),
};
