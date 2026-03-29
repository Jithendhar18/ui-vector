import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { mapApiError } from "@/lib/api-error";
import { AxiosError } from "axios";
import type { Role } from "@/types";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ROLE_COLORS } from "@/utils/status-colors";
import { relativeTime } from "@/utils/date";
import { EditUserModal } from "@/pages/components/EditUserModal";

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [editUser, setEditUser] = useState<import("@/types").UserResponse | null>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ["users", page],
    queryFn: () => adminApi.getUsers(page, 20),
    staleTime: 60000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: Role; is_active?: boolean } }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditUser(null);
    },
    onError: (err) => {
      const apiErr = err instanceof AxiosError ? mapApiError(err) : null;
      toast.error(apiErr?.message ?? "Failed to update user");
    },
  });

  return (
    <div className="p-6 overflow-y-auto h-full">
      <h2 className="text-lg font-semibold mb-4">User Management</h2>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[120px]">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[100px]">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[140px]">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {[1, 2, 3, 4, 5].map((c) => (
                        <td key={c} className="px-4 py-3">
                          <Skeleton className="h-4 w-full rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                : users?.map((u) => (
                    <tr key={u.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{u.username}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={ROLE_COLORS[u.role]}>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${u.is_active ? "bg-success" : "bg-destructive"}`} />
                          <span className="text-xs">{u.is_active ? "Active" : "Inactive"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{relativeTime(u.created_at)}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" onClick={() => setEditUser(u)} aria-label="Edit user" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {isError && (
        <div className="text-center mt-4">
          <p className="text-sm text-destructive">Failed to load users</p>
          <button onClick={() => refetch()} className="text-sm text-primary hover:underline mt-1">Retry</button>
        </div>
      )}

      <div className="flex justify-center gap-2 mt-4">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <span className="flex items-center text-sm text-muted-foreground px-3">Page {page}</span>
        <Button variant="outline" size="sm" disabled={!users || users.length < 20} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>

      <EditUserModal
        user={editUser}
        onClose={() => setEditUser(null)}
        onSave={(data) => editUser && updateMutation.mutate({ id: editUser.id, data })}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}
