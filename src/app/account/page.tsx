"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/account/RequireAuth";
import { AccountNav } from "@/components/account/AccountNav";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/feedback/States";
import { useAuth } from "@/lib/state";
import { ordersApi } from "@/lib/api";
import { formatVnd } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import type { OrderListItem } from "@/types";

function AccountOverview() {
  usePageTitle("Tài khoản");
  const { customer, logout } = useAuth();
  const [recentOrders, setRecentOrders] = useState<OrderListItem[] | null>(null);

  useEffect(() => {
    void ordersApi.listOrders().then((orders) => setRecentOrders(orders.slice(0, 3)));
  }, []);

  return (
    <div className="container-ella py-10">
      <h1 className="mb-8 font-serif text-2xl text-neutral-900">Tài khoản</h1>
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <AccountNav />

        <div className="flex flex-col gap-8">
          <section className="flex items-center justify-between rounded-2xl border border-neutral-200 p-5">
            <div>
              <p className="font-medium text-neutral-900">{customer?.fullName}</p>
              <p className="text-sm text-neutral-500">{customer?.phone}</p>
              {customer?.email && <p className="text-sm text-neutral-500">{customer.email}</p>}
            </div>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              Đăng xuất
            </Button>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-medium text-neutral-900">Đơn hàng gần đây</h2>
              <Link href="/account/orders" className="text-sm text-neutral-500 underline underline-offset-2">
                Xem tất cả
              </Link>
            </div>
            {recentOrders === null ? (
              <Skeleton className="h-32 w-full" />
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-neutral-500">Bạn chưa có đơn hàng nào.</p>
            ) : (
              <div className="flex flex-col divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
                {recentOrders.map((order) => (
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
          </section>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountOverview />
    </RequireAuth>
  );
}
