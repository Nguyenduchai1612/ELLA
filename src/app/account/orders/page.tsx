"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/account/RequireAuth";
import { AccountNav } from "@/components/account/AccountNav";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { EmptyState, ErrorState, Skeleton } from "@/components/feedback/States";
import { Button } from "@/components/ui/Button";
import { ordersApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { formatVnd } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import type { OrderListItem } from "@/types";

function OrdersList() {
  usePageTitle("Đơn hàng của tôi");
  const [orders, setOrders] = useState<OrderListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    ordersApi
      .listOrders()
      .then(setOrders)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="container-ella py-10">
      <h1 className="mb-8 font-serif text-2xl text-neutral-900">Đơn hàng của tôi</h1>
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <AccountNav />

        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : orders === null ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="Bạn chưa có đơn hàng nào"
            description="Các đơn hàng bạn đặt sẽ xuất hiện tại đây."
            action={
              <Link href="/shop">
                <Button variant="outline" size="sm">
                  Mua sắm ngay
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
            {orders.map((order) => (
              <Link
                key={order.orderId}
                href={`/account/orders/${order.orderNumber}`}
                className="flex items-center justify-between p-4 text-sm hover:bg-neutral-50"
              >
                <div>
                  <p className="font-medium text-neutral-900">{order.orderNumber}</p>
                  <p className="text-neutral-500">
                    {new Date(order.createdAt).toLocaleDateString("vi-VN")} · {order.itemCount} sản phẩm
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-900">{formatVnd(order.total)}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountOrdersPage() {
  return (
    <RequireAuth>
      <OrdersList />
    </RequireAuth>
  );
}
