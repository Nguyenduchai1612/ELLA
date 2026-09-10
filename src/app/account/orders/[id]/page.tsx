"use client";

import { useCallback, useEffect, useState } from "react";
import { RequireAuth } from "@/components/account/RequireAuth";
import { AccountNav } from "@/components/account/AccountNav";
import { OrderDetailCard } from "@/components/order/OrderDetailCard";
import { CancelOrderButton } from "@/components/order/CancelOrderButton";
import { ReviewForm } from "@/components/review/ReviewForm";
import { ReturnRequestForm } from "@/components/order/ReturnRequestForm";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/feedback/States";
import { ordersApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import type { Order } from "@/types";

function OrderDetail({ orderNumber }: { orderNumber: string }) {
  usePageTitle(`Đơn hàng ${orderNumber}`);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewedItemIds, setReviewedItemIds] = useState<Set<string>>(new Set());
  const [reviewingItemId, setReviewingItemId] = useState<string | null>(null);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnSubmitted, setReturnSubmitted] = useState(false);

  const load = useCallback(() => {
    setError(null);
    ordersApi
      .getOrder(orderNumber)
      .then(setOrder)
      .catch((err) => setError(getErrorMessage(err)));
  }, [orderNumber]);

  useEffect(load, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!order) return <Skeleton className="h-64 w-full" />;

  const canReturn = order.status === "DELIVERED" && !returnSubmitted;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <CancelOrderButton order={order} onCancelled={setOrder} />
      </div>

      <OrderDetailCard order={order} />

      {order.status === "DELIVERED" && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-neutral-900">Đánh giá sản phẩm</h2>
          <div className="flex flex-col gap-3">
            {order.items.map((item) =>
              reviewedItemIds.has(item.orderItemId) ? (
                <p key={item.orderItemId} className="text-sm text-neutral-500">
                  Đã gửi đánh giá cho {item.productName} — {item.variantName}.
                </p>
              ) : reviewingItemId === item.orderItemId ? (
                <ReviewForm
                  key={item.orderItemId}
                  orderItem={item}
                  onSubmitted={() => {
                    setReviewedItemIds((prev) => new Set(prev).add(item.orderItemId));
                    setReviewingItemId(null);
                  }}
                />
              ) : (
                <Button
                  key={item.orderItemId}
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => setReviewingItemId(item.orderItemId)}
                >
                  Đánh giá {item.productName}
                </Button>
              ),
            )}
          </div>
        </section>
      )}

      {canReturn && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-neutral-900">Yêu cầu trả hàng</h2>
          {showReturnForm ? (
            <ReturnRequestForm
              orderId={order.orderId}
              onSubmitted={() => {
                setReturnSubmitted(true);
                setShowReturnForm(false);
                load();
              }}
            />
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowReturnForm(true)}>
              Yêu cầu trả hàng
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

export default function AccountOrderDetailPage({ params }: { params: { id: string } }) {
  return (
    <RequireAuth>
      <div className="container-ella py-10">
        <h1 className="mb-8 font-serif text-2xl text-neutral-900">Chi tiết đơn hàng</h1>
        <div className="grid gap-8 md:grid-cols-[200px_1fr]">
          <AccountNav />
          <OrderDetail orderNumber={params.id} />
        </div>
      </div>
    </RequireAuth>
  );
}
