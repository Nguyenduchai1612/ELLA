"use client";

import { useEffect } from "react";

/**
 * Server Components can export `metadata` for real <title>/OG tags (used
 * on the product detail page). Purely interactive routes below (cart,
 * checkout, auth, account) are client components, which Next.js does not
 * allow to export `metadata` — this is the pragmatic fallback so they
 * still get a meaningful document title instead of inheriting the root
 * layout's generic "ELLA" default.
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | ELLA`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
