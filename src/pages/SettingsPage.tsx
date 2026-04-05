import { useState } from "react";
import { AxiosError } from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { authApi } from "@/lib/auth-api";
import { mapApiError } from "@/lib/api-error";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sun, Moon, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const themes = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
  ];

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (!currentPassword) {
      setPwError("Current password is required.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setPwError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }

    setPwLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPwSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
      setTimeout(() => {
        setShowPwForm(false);
        setPwSuccess("");
      }, 2000);
    } catch (error) {
      const apiErr = error instanceof AxiosError ? mapApiError(error) : null;
      const message = apiErr?.message ?? "Failed to update password.";
      setPwError(message);
      toast.error(message);
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto space-y-4">
      {/* Profile card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-fade-in">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium">{user?.username}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Role</span>
            <Badge variant="secondary">{user?.role}</Badge>
          </div>
        </div>
      </div>

      {/* Change password — collapsible */}
      <div className="rounded-2xl border border-border bg-card shadow-sm animate-fade-in overflow-hidden">
        <button
          onClick={() => { setShowPwForm(!showPwForm); setPwError(""); setPwSuccess(""); }}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium hover:bg-secondary/50 transition-colors"
        >
          Change password
          {showPwForm ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showPwForm && (
          <form onSubmit={handleChangePassword} className="px-5 pb-5 space-y-3">
            <Input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="rounded-xl"
            />
            <Input
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              className="rounded-xl"
            />
            <Input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="rounded-xl"
            />

            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPasswords ? "Hide passwords" : "Show passwords"}
            </button>

            {pwError && (
              <p className="text-xs text-destructive">{pwError}</p>
            )}
            {pwSuccess && (
              <p className="text-xs text-success">{pwSuccess}</p>
            )}

            <Button type="submit" size="sm" className="rounded-xl" disabled={pwLoading}>
              {pwLoading ? "Saving..." : "Update password"}
            </Button>
          </form>
        )}
      </div>

      {/* Theme */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-fade-in">
        <p className="text-sm font-medium mb-3">Theme</p>
        <div className="flex gap-2">
          {themes.map((t) => (
            <Button
              key={t.value}
              variant={theme === t.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme(t.value)}
              className="gap-2 rounded-xl"
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Button>
          ))}
        </div>
      </div>

    </div>
  );
}
