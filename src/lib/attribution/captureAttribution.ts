"use client";

import type { MarketingAttribution } from "@/types";

const STORAGE_KEY = "ella_attribution_v1";
const UTM_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "fbclid",
] as const;

function readStoredAttribution(): MarketingAttribution | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MarketingAttribution) : null;
  } catch {
    return null;
  }
}

function writeStoredAttribution(attribution: MarketingAttribution): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // sessionStorage unavailable (private mode, etc.) — attribution is
    // best-effort and must never block the purchase flow.
  }
}

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Call once on app load (root layout). Captures UTM/fbclid params present
 * on the CURRENT landing URL and merges them into the session's stored
 * attribution — first-touch params are kept, not overwritten by later
 * organic navigation within the same session (ASSUMPTION: first-touch
 * attribution model; confirm the desired model with marketing/backend).
 *
 * Section 41: the frontend never fabricates a `meta_event_id` here.
 */
export function captureAttribution(): MarketingAttribution {
  const existing = readStoredAttribution();
  if (existing) {
    return existing;
  }

  const params = new URLSearchParams(window.location.search);
  const attribution: MarketingAttribution = {
    utmSource: params.get(UTM_PARAM_KEYS[0]) ?? undefined,
    utmMedium: params.get(UTM_PARAM_KEYS[1]) ?? undefined,
    utmCampaign: params.get(UTM_PARAM_KEYS[2]) ?? undefined,
    utmContent: params.get(UTM_PARAM_KEYS[3]) ?? undefined,
    fbClickId: params.get(UTM_PARAM_KEYS[4]) ?? undefined,
    sessionId: generateSessionId(),
    landingPage: window.location.pathname + window.location.search,
  };

  writeStoredAttribution(attribution);
  return attribution;
}

export function getAttribution(): MarketingAttribution | null {
  return readStoredAttribution();
}
