import api from "./api";
import type { FrequentQuestion, SystemMetrics, UserResponse, UserUpdateRequest } from "@/types";

export const adminApi = {
  getMetrics: () =>
    api.get<SystemMetrics>("/admin/metrics").then((r) => r.data),

  getUsers: (page: number = 1, pageSize: number = 20) =>
    api
      .get<UserResponse[]>("/admin/users", { params: { page, page_size: pageSize } })
      .then((r) => r.data),

  updateUser: (userId: string, data: UserUpdateRequest) =>
    api.patch<UserResponse>(`/admin/users/${userId}`, data).then((r) => r.data),

  getPopularQuestions: (limit: number = 10) =>
    api.get<FrequentQuestion[]>("/query/popular", { params: { limit } }).then((r) => r.data),
};
