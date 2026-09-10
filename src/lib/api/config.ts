/**
 * Section 43 (MOCK MODE): a single switch decides whether the API layer
 * talks to MockService implementations or RealService implementations.
 * No UI component ever branches on this directly.
 */
export type ApiMode = "mock" | "real";

export function getApiMode(): ApiMode {
  const raw = process.env.NEXT_PUBLIC_API_MODE;
  return raw === "real" ? "real" : "mock";
}

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) {
    // In mock mode this is never used, so we don't throw — only warn.
    if (getApiMode() === "real") {
      throw new Error(
        "NEXT_PUBLIC_API_BASE_URL is required when NEXT_PUBLIC_API_MODE=real",
      );
    }
    return "";
  }
  return url;
}
