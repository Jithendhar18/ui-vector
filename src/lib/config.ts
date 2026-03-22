export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  apiPrefix: "/api/v1",
  get apiUrl() {
    return `${this.apiBaseUrl}${this.apiPrefix}`;
  },
  isDev: import.meta.env.DEV,
} as const;
