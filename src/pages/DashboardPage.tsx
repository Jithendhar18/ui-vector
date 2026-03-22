import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { FileText, Layers, Users, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const KPI_CONFIG = [
  { key: "total_documents" as const, label: "Documents", icon: FileText },
  { key: "total_chunks" as const, label: "Chunks", icon: Layers },
  { key: "total_users" as const, label: "Users", icon: Users },
  { key: "total_queries" as const, label: "Queries", icon: MessageSquare },
];

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-success",
  processing: "bg-primary",
  failed: "bg-destructive",
  pending: "bg-warning",
};

export default function DashboardPage() {
  const { data: metrics, isLoading, isError, refetch } = useQuery({
    queryKey: ["metrics"],
    queryFn: adminApi.getMetrics,
    staleTime: 15000,
    refetchInterval: 30000,
  });

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CONFIG.map((kpi) => (
          <div key={kpi.key} className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-fade-in">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-8 w-24 rounded" />
              </div>
            ) : (
              <>
                <kpi.icon className="h-5 w-5 text-muted-foreground mb-2" />
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  {kpi.label}
                </p>
                <p className="text-3xl font-bold text-card-foreground mt-1">
                  {isError ? "—" : metrics?.[kpi.key]?.toLocaleString() ?? "—"}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Documents by status */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-fade-in">
        <h2 className="text-lg font-semibold mb-4">Documents by Status</h2>
        {isLoading ? (
          <Skeleton className="h-8 w-full rounded-xl" />
        ) : metrics?.documents_by_status ? (
          <>
            <div className="flex h-8 rounded-xl overflow-hidden">
              {Object.entries(metrics.documents_by_status).map(([status, count]) => {
                const total = Object.values(metrics.documents_by_status).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={status}
                    className={`${STATUS_COLORS[status] ?? "bg-muted"} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${status}: ${count}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              {Object.entries(metrics.documents_by_status).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 text-sm">
                  <span className={`h-3 w-3 rounded-full ${STATUS_COLORS[status] ?? "bg-muted"}`} />
                  <span className="capitalize text-muted-foreground">{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No data available</p>
        )}
      </div>

      {/* System overview */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-fade-in">
        <h2 className="text-lg font-semibold mb-4">System Overview</h2>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-48 rounded" />
            <Skeleton className="h-4 w-36 rounded" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-8 text-sm">
            <div>
              <span className="text-muted-foreground">Avg Query Latency</span>
              <p className="text-xl font-semibold">
                {metrics?.avg_query_latency_ms != null
                  ? `${(metrics.avg_query_latency_ms / 1000).toFixed(1)}s`
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Embeddings</span>
              <p className="text-xl font-semibold">
                {metrics?.total_embeddings?.toLocaleString() ?? "—"}
              </p>
            </div>
          </div>
        )}
      </div>

      {isError && (
        <div className="text-center">
          <p className="text-sm text-destructive mb-2">Failed to load metrics</p>
          <button onClick={() => refetch()} className="text-sm text-primary hover:underline">
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
