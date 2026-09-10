"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Order } from "@/types";
import { ordersApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { OrderDetailCard } from "@/components/order/OrderDetailCard";
import { CancelOrderButton } from "@/components/order/CancelOrderButton";
import { ErrorState, Skeleton } from "@/components/feedback/States";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

export default function OrderDetailPage({ params }: { params: { orderNumber: string } }) {
  usePageTitle(`Đơn hàng ${params.orderNumber}`);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await ordersApi.getOrder(params.orderNumber);
      setOrder(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [params.orderNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="container-ella max-w-3xl py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-ella max-w-3xl py-10">
        <ErrorState message={error ?? "Không tìm thấy đơn hàng."} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="container-ella max-w-3xl py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-500 underline underline-offset-2">
          ← Về trang chủ
        </Link>
        <CancelOrderButton order={order} onCancelled={setOrder} />
      </div>
      <OrderDetailCard order={order} />
    </div>
  );
}
