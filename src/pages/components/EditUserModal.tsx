import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { UserResponse, Role } from "@/types";

interface EditUserModalProps {
  user: UserResponse | null;
  onClose: () => void;
  onSave: (data: { role?: Role; is_active?: boolean }) => void;
  isSaving: boolean;
}

export function EditUserModal({ user, onClose, onSave, isSaving }: EditUserModalProps) {
  const [role, setRole] = useState<Role>(user?.role ?? "user");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setIsActive(user.is_active);
    }
  }, [user]);

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
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
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
                checked={isActive}
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
