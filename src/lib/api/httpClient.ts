import { getApiBaseUrl } from "./config";
import { ApiError } from "./apiError";
import type { ApiErrorCode } from "@/types";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Forwarded to fetch's `cache`/`next.revalidate` for Server Component data fetching. */
  cache?: RequestCache;
  revalidate?: number | false;
  signal?: AbortSignal;
}

interface BackendErrorBody {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}

const KNOWN_CODES: ReadonlySet<ApiErrorCode> = new Set([
  "INVALID_SKU",
  "PRODUCT_NOT_FOUND",
  "SKU_NOT_FOUND",
  "INSUFFICIENT_STOCK",
  "RESERVATION_EXPIRED",
  "ORDER_NOT_FOUND",
  "ORDER_NOT_CANCELLABLE",
  "PAYMENT_FAILED",
  "INVALID_VOUCHER",
  "REVIEW_NOT_ALLOWED",
  "REVIEW_ALREADY_EXISTS",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "VALIDATION_ERROR",
  "UNKNOWN_ERROR",
]);

function normalizeCode(code: string | undefined): ApiErrorCode {
  if (code && KNOWN_CODES.has(code as ApiErrorCode)) {
    return code as ApiErrorCode;
  }
  return "UNKNOWN_ERROR";
}

/**
 * Thin fetch wrapper for the real ASP.NET Core API (Section 31: no raw
 * `fetch` calls scattered in components — everything goes through this
 * layer). Exact request/response contract (auth header shape, envelope
 * format) must be confirmed against the real backend during Phase 16;
 * this is written against a conventional REST + JSON:API-ish error body
 * as a reasonable default (ASSUMPTION).
 */
export async function httpRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const { method = "GET", body, cache, revalidate, signal } = options;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache,
      next: revalidate !== undefined ? { revalidate } : undefined,
      signal,
    });
  } catch {
    throw new ApiError("UNKNOWN_ERROR", "Network request failed");
  }

  if (!response.ok) {
    let parsed: BackendErrorBody | undefined;
    try {
      parsed = (await response.json()) as BackendErrorBody;
    } catch {
      // response had no JSON body
    }
    throw new ApiError(
      normalizeCode(parsed?.code),
      parsed?.message ?? `Request failed with status ${response.status}`,
      parsed?.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
