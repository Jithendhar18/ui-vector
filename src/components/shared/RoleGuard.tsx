import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types";

interface Props {
  roles: Role[];
}

export default function RoleGuard({ roles }: Props) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/chat" replace />;
  }
  return <Outlet />;
}
