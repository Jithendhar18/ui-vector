import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatRelative(date: string): string {
  const timestamp = new Date(date).getTime();
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function PopularQuestionsPage() {
  const [limit, setLimit] = useState(10);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["popular-questions", limit],
    queryFn: () => adminApi.getPopularQuestions(limit),
    staleTime: 60000,
    refetchInterval: 180000,
  });

  return (
    <div className="p-6 overflow-y-auto h-full space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Trending Searches</h2>
          <p className="text-sm text-muted-foreground">
            Most frequent user queries from /query/popular.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {[10, 20, 50].map((value) => (
            <Button
              key={value}
              variant={limit === value ? "default" : "outline"}
              size="sm"
              onClick={() => setLimit(value)}
              disabled={isFetching}
            >
              Top {value}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Query</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[120px]">Count</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[160px]">Last Asked</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-[80%] rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-16 rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-24 rounded" />
                      </td>
                    </tr>
                  ))
                : data?.map((item) => (
                    <tr
                      key={`${item.query}-${item.last_asked_at}`}
                      className="border-b border-border hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{item.query}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatRelative(item.last_asked_at)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && !isError && data?.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No popular questions available yet.
          </div>
        )}
      </div>

      {isError && (
        <div className="text-center">
          <p className="text-sm text-destructive mb-2">Failed to load popular questions</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground flex items-start gap-2">
        <TrendingUp className="h-4 w-4 mt-0.5" />
        This view is available to admin and developer roles and refreshes every 3 minutes.
      </div>
    </div>
  );
}
