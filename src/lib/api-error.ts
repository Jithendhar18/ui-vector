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

export function mapApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const detail =
    (error.response?.data as Record<string, string>)?.detail ?? error.message;
  const mapped = ERROR_MAP[status] ?? {
    message: "An unexpected error occurred.",
    retryable: true,
  };
  if (config.isDev) {
    console.error("[API Error]", { status, detail });
  }
  return { status, detail, ...mapped };
}
