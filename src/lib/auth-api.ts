import api from "./api";
import { z } from "zod";
import type { TokenResponse, UserResponse, RegisterRequest } from "@/types";

// Validate responses at the API boundary
const TokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
});

const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  full_name: z.string().nullable(),
  is_active: z.boolean(),
  role: z.enum(["admin", "developer", "user"] as const),
  tenant_id: z.string(),
  created_at: z.string(),
});

export const authApi = {
  login: (username: string, password: string) =>
    api.post<TokenResponse>("/auth/login", { username, password })
      .then((r) => TokenResponseSchema.parse(r.data)),

  register: (data: RegisterRequest) =>
    api.post<UserResponse>("/auth/register", data)
      .then((r) => UserResponseSchema.parse(r.data)),

  refresh: (refreshToken: string) =>
    api.post<TokenResponse>("/auth/refresh", { refresh_token: refreshToken })
      .then((r) => TokenResponseSchema.parse(r.data)),

  getMe: () =>
    api.get<UserResponse>("/auth/me")
      .then((r) => UserResponseSchema.parse(r.data)),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put("/auth/change-password", { current_password: currentPassword, new_password: newPassword })
      .then((r) => r.data),
};
