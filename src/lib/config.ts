export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  apiPrefix: "/api/v1",
  get apiUrl() {
    const base = this.apiBaseUrl.replace(/\/+$/, "");
    return base.endsWith(this.apiPrefix) ? base : `${base}${this.apiPrefix}`;
  },
  isDev: import.meta.env.DEV,
} as const;
