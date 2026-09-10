/**
 * Section 41: captured client-side, stored in session/client context,
 * and sent to the backend at checkout time. The frontend never
 * fabricates a `meta_event_id` — that is only set when backend/Meta
 * integration explicitly requires it.
 */
export interface MarketingAttribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  fbClickId?: string;
  sessionId: string;
  landingPage: string;
}
