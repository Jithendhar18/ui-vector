import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { mapApiError } from "@/lib/api-error";
import { AxiosError } from "axios";
import type { UserResponse, Role } from "@/types";
import { Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-accent text-accent-foreground",
  developer: "bg-primary text-primary-foreground",
  user: "bg-secondary text-secondary-foreground",
};

function relativeTime(date: string): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditUser(u)}
                          aria-label="Edit user"
                          className="h-8 w-8"
                        >
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

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-4">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <span className="flex items-center text-sm text-muted-foreground px-3">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={!users || users.length < 20}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      {/* Edit modal */}
      <EditUserModal
        user={editUser}
        onClose={() => setEditUser(null)}
        onSave={(data) => editUser && updateMutation.mutate({ id: editUser.id, data })}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSave,
  isSaving,
}: {
  user: UserResponse | null;
  onClose: () => void;
  onSave: (data: { role?: Role; is_active?: boolean }) => void;
  isSaving: boolean;
}) {
  const [role, setRole] = useState<Role>(user?.role ?? "user");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);

  // Reset when user changes
  if (user && role !== user.role && !isSaving) {
    // Only on initial open
  }

  return (
    <Dialog open={!!user} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        {user && (
          <div className="space-y-4">
            <div>
              <p className="font-medium">{user.username}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" aria-label="User role">Role</Label>
              <Select defaultValue={user.role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger aria-label="User role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active" aria-label="Account active">Active</Label>
              <Switch
                id="active"
                defaultChecked={user.is_active}
                onCheckedChange={setIsActive}
                aria-label="Account active"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => onSave({ role, is_active: isActive })} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
