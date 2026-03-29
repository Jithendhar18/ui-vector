import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ingestionApi } from "@/lib/ingestion-api";
import { mapApiError } from "@/lib/api-error";
import { AxiosError } from "axios";
import { Database, Loader2, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { STATUS_COLORS } from "@/utils/status-colors";
import { relativeTime } from "@/utils/date";
import BooksTab from "@/pages/components/BooksTab";

type TabId = "documents" | "books";

export default function IngestionPage() {
  const [activeTab, setActiveTab] = useState<TabId>("documents");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [taskId, setTaskId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: docs, isLoading: docsLoading } = useQuery({
    queryKey: ["documents", page, statusFilter],
    queryFn: () =>
      ingestionApi.getDocuments(page, 20, statusFilter === "all" ? undefined : statusFilter),
    staleTime: 5000,
  });

  const { data: taskStatus } = useQuery({
    queryKey: ["ingestion-status", taskId],
    queryFn: () => ingestionApi.getStatus(taskId!),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "SUCCESS" || status === "FAILURE") return false;
      return 5000;
    },
  });

  // Invalidate docs when task completes
  useEffect(() => {
    if (taskStatus?.status === "SUCCESS" || taskStatus?.status === "FAILURE") {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    }
  }, [taskStatus?.status, queryClient]);

  const ingestMutation = useMutation({
    mutationFn: () => ingestionApi.ingest("pages", undefined, false),
    onSuccess: (data) => {
      setTaskId(data.task_id);
      toast.success(`Ingestion started (task: ${data.task_id.slice(0, 8)}...)`);
      // Refresh document list
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err) => {
      const apiErr = err instanceof AxiosError ? mapApiError(err) : null;
      toast.error(apiErr?.message ?? "Ingestion failed to start");
    },
  });

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Trigger card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-fade-in">
        <h2 className="text-lg font-semibold mb-1">Ingest Documents</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Pull pages from BookStack and process them into the vector store.
        </p>
        <Button
          onClick={() => ingestMutation.mutate()}
          disabled={ingestMutation.isPending}
          className="gap-2 rounded-xl"
          aria-label="Start document ingestion"
        >
          {ingestMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          Start Ingestion
        </Button>
      </div>

      {/* Task status */}
      {taskId && taskStatus && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-fade-in">
          <h3 className="text-sm font-medium mb-3">Ingestion Status</h3>
          <div className="flex items-center gap-3">
            <Badge className={STATUS_COLORS[taskStatus.status] ?? "bg-muted"}>
              {taskStatus.status}
            </Badge>
            {taskStatus.progress && (
              <span className="text-sm text-muted-foreground">{taskStatus.progress}</span>
            )}
          </div>
          {taskStatus.result && (
            <pre className="mt-2 text-xs bg-secondary rounded-xl p-3 overflow-x-auto">
              {JSON.stringify(taskStatus.result, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 w-fit">
        <button
          onClick={() => setActiveTab("documents")}
          className={[
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
            activeTab === "documents"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
          aria-selected={activeTab === "documents"}
          role="tab"
        >
          <FileText className="h-3.5 w-3.5" />
          Documents
        </button>
        <button
          onClick={() => setActiveTab("books")}
          className={[
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
            activeTab === "books"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
          aria-selected={activeTab === "books"}
          role="tab"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Books
        </button>
      </div>

      {/* Documents tab */}
      {activeTab === "documents" && (
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold">Documents</h2>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] rounded-xl" aria-label="Filter by status">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[100px]">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[120px]">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[80px]">Chunks</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[140px]">Ingested</th>
                </tr>
              </thead>
              <tbody>
                {docsLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {[1, 2, 3, 4, 5].map((c) => (
                          <td key={c} className="px-4 py-3">
                            <Skeleton className="h-4 w-full rounded" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : docs?.map((doc) => (
                      <tr key={doc.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{doc.title}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{doc.bookstack_type}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={STATUS_COLORS[doc.status] ?? "bg-muted"}>{doc.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{doc.chunk_count}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {relativeTime(doc.ingested_at)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="flex items-center text-sm text-muted-foreground px-3">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!docs || docs.length < 20}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
      )}

      {/* Books tab */}
      {activeTab === "books" && <BooksTab />}
    </div>
  );
}
