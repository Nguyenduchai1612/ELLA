"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/state";
import { Skeleton } from "@/components/feedback/States";

/**
 * Section 16/21: authentication is never required to purchase, but the
 * /account/* surface itself is authenticated-only. Guests are redirected
 * to /login rather than shown an empty/broken account page.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="container-ella py-10">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
