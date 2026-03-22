import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md space-y-4 p-6">
        <Skeleton className="h-8 w-48 mx-auto rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex h-full">
      <div className="hidden md:flex w-[280px] flex-col gap-3 border-r border-border p-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>
      <div className="flex-1 flex flex-col p-6 gap-4">
        <Skeleton className="h-16 w-3/4 rounded-2xl self-end" />
        <Skeleton className="h-24 w-3/4 rounded-2xl" />
        <Skeleton className="h-16 w-3/4 rounded-2xl self-end" />
        <div className="mt-auto">
          <Skeleton className="h-12 w-full max-w-3xl mx-auto rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-48 rounded-xl" />
      <div className="rounded-2xl border border-border overflow-hidden">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
