import api from "./api";
import type { TokenResponse, UserResponse, RegisterRequest } from "@/types";

export const authApi = {
  login: (username: string, password: string) =>
    api.post<TokenResponse>("/auth/login", { username, password }).then((r) => r.data),

  register: (data: RegisterRequest) =>
    api.post<UserResponse>("/auth/register", data).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post<TokenResponse>("/auth/refresh", { refresh_token: refreshToken }).then((r) => r.data),

  getMe: () =>
    api.get<UserResponse>("/auth/me").then((r) => r.data),
};
