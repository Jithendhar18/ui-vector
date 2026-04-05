import type { AxiosError } from "axios";
import type { ApiError } from "@/types";
import { config } from "./config";

const ERROR_MAP: Record<number, { message: string; retryable: boolean }> = {
  400: { message: "Invalid request. Please check your input.", retryable: false },
  401: { message: "Session expired. Please log in again.", retryable: false },
  403: { message: "You don't have permission for this action.", retryable: false },
  404: { message: "The requested resource was not found.", retryable: false },
  409: { message: "This resource already exists.", retryable: false },
  422: { message: "Validation error. Please check your input.", retryable: false },
  429: { message: "Too many requests. Please wait a moment.", retryable: true },
  500: { message: "Server error. Please try again later.", retryable: true },
  502: { message: "Server is temporarily unavailable.", retryable: true },
  503: { message: "Service unavailable. Please try again.", retryable: true },
  0: { message: "Network error. Check your connection.", retryable: true },
};

function parseDetail(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (!detail) return fallback;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first?.msg) return first.msg;
    return fallback;
  }

  if (typeof detail === "object") {
    const msg = (detail as { msg?: string }).msg;
    if (msg) return msg;
  }

  return fallback;
}

export function mapApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  // Parse detail from response, with empty string fallback (not error.message)
  // This way we can distinguish between "no detail provided" and "has detail"
  const detail = parseDetail(error.response?.data, "");
  const mapped = ERROR_MAP[status] ?? {
    message: "An unexpected error occurred.",
    retryable: true,
  };
  if (config.isDev) {
    console.error("[API Error]", { status, detail, statusText: error.response?.statusText });
  }
  // Prefer API's detail message over generic status-code mapping
  // Only use mapped message if detail is not provided by server
  return {
    status,
    detail,
    message: detail || mapped.message,
    retryable: mapped.retryable,
  };
}
