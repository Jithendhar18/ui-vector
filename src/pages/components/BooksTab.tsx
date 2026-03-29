import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ingestionApi } from "@/lib/ingestion-api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { STATUS_COLORS } from "@/utils/status-colors";
import { relativeTime } from "@/utils/date";

export default function BooksTab() {
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => ingestionApi.getBooks(),
    staleTime: 30_000,
  });

  const { data: hierarchy, isLoading: hierarchyLoading } = useQuery({
    queryKey: ["book-hierarchy", selectedBookId],
    queryFn: () => ingestionApi.getBook(selectedBookId!),
    enabled: selectedBookId !== null,
    staleTime: 30_000,
  });

  const toggleChapter = (key: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleBookClick = (bookId: number) => {
    if (bookId === selectedBookId) {
      setSelectedBookId(null);
    } else {
      setSelectedBookId(bookId);
      setExpandedChapters(new Set());
    }
  };

  return (
    <div className="space-y-4">
      {/* Book list grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {booksLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-sm">
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            ))
          : books?.length === 0
            ? (
              <p className="col-span-full text-sm text-muted-foreground py-6 text-center">
                No books found. Run an ingestion first.
              </p>
            )
            : books?.map((book) => (
              <button
                key={book.book_id}
                onClick={() => handleBookClick(book.book_id)}
                className={[
                  "rounded-2xl border p-4 text-left transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selectedBookId === book.book_id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:bg-secondary/40 shadow-sm",
                ].join(" ")}
              >
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{book.book_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {book.page_count} pages · {book.chunk_count} chunks
                    </p>
                  </div>
                </div>
              </button>
            ))}
      </div>

      {/* Hierarchy drill-down panel */}
      {selectedBookId !== null && (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden animate-fade-in">
          {hierarchyLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/3 rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              ))}
            </div>
          ) : hierarchy ? (
            <>
              {/* Book header */}
              <div className="px-5 py-4 border-b border-border bg-secondary/30">
                <h3 className="font-semibold">{hierarchy.book_name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hierarchy.total_pages} pages · {hierarchy.total_chunks} chunks total
                </p>
              </div>

              {/* Chapter accordion */}
              <div className="divide-y divide-border">
                {hierarchy.chapters.map((chapter, ci) => {
                  const key =
                    chapter.chapter_id !== null
                      ? String(chapter.chapter_id)
                      : `uncategorized-${ci}`;
                  const isExpanded = expandedChapters.has(key);

                  return (
                    <div key={key}>
                      {/* Chapter row */}
                      <button
                        onClick={() => toggleChapter(key)}
                        className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-secondary/30 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-medium text-sm">
                          {chapter.chapter_name ?? "Pages (no chapter)"}
                        </span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {chapter.page_count} {chapter.page_count === 1 ? "page" : "pages"}
                        </Badge>
                      </button>

                      {/* Pages table */}
                      {isExpanded && (
                        <div className="overflow-x-auto bg-secondary/10">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left px-8 py-2 font-medium text-muted-foreground text-xs">
                                  Title
                                </th>
                                <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs w-[110px]">
                                  Status
                                </th>
                                <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs w-[70px]">
                                  Chunks
                                </th>
                                <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs w-[130px]">
                                  Ingested
                                </th>
                                <th className="px-4 py-2 w-[40px]" />
                              </tr>
                            </thead>
                            <tbody>
                              {chapter.pages.map((page) => (
                                <tr
                                  key={page.id}
                                  className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                                >
                                  <td className="px-8 py-2 font-medium">{page.title}</td>
                                  <td className="px-4 py-2">
                                    <Badge
                                      className={`text-xs ${STATUS_COLORS[page.status] ?? "bg-muted"}`}
                                    >
                                      {page.status}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2 text-muted-foreground">
                                    {page.chunk_count}
                                  </td>
                                  <td className="px-4 py-2 text-muted-foreground text-xs">
                                    {page.ingested_at ? relativeTime(page.ingested_at) : "—"}
                                  </td>
                                  <td className="px-4 py-2">
                                    {page.source_url && (
                                      <a
                                        href={page.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                        aria-label={`Open "${page.title}" in BookStack`}
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
