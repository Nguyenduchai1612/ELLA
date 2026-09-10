import type { ApiErrorCode } from "@/types";

/**
 * Thrown by every API layer implementation (mock and real alike) so
 * components can catch a single, predictable error shape and hand it
 * to the error-code → Vietnamese-message mapper (Section 35).
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: ApiErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
