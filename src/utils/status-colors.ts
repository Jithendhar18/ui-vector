/**
 * Shared status/role color mappings used across admin pages.
 */

export const STATUS_COLORS: Record<string, string> = {
  completed: "bg-success text-success-foreground",
  processing: "bg-primary text-primary-foreground animate-pulse",
  failed: "bg-destructive text-destructive-foreground",
  pending: "bg-warning text-warning-foreground",
  // Uppercase variants (returned by some backend tasks)
  SUCCESS: "bg-success text-success-foreground",
  STARTED: "bg-primary text-primary-foreground animate-pulse",
  FAILURE: "bg-destructive text-destructive-foreground",
  PENDING: "bg-warning text-warning-foreground",
};

export const ROLE_COLORS: Record<string, string> = {
  admin: "bg-accent text-accent-foreground",
  developer: "bg-primary text-primary-foreground",
  user: "bg-secondary text-secondary-foreground",
};
