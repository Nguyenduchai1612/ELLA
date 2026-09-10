"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import type { Order } from "@/types";
import { ordersApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { OrderDetailCard } from "@/components/order/OrderDetailCard";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/feedback/States";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

function OrderSuccessContent() {
  usePageTitle("Đặt hàng thành công");
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(orderNumber));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber) return;
    setIsLoading(true);
    ordersApi
      .getOrder(orderNumber)
      .then(setOrder)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [orderNumber]);

  if (!orderNumber) {
    return (
      <div className="container-ella max-w-xl py-16 text-center">
        <p className="text-neutral-600">Không tìm thấy thông tin đơn hàng.</p>
        <Link href="/shop" className="mt-4 inline-block">
          <Button variant="outline">Đến trang mua sắm</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-ella max-w-3xl py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <CheckCircle2 className="h-12 w-12 text-success-500" />
        <h1 className="mt-4 font-serif text-2xl text-neutral-900">Đặt hàng thành công!</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Cảm ơn bạn đã mua sắm cùng ELLA. Mã đơn hàng của bạn là{" "}
          <span className="font-medium text-neutral-900">{orderNumber}</span>.
        </p>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <ErrorState message={error} />}
      {order && <OrderDetailCard order={order} />}

      <div className="mt-10 flex justify-center gap-3">
        <Link href="/shop">
          <Button variant="outline">Tiếp tục mua sắm</Button>
        </Link>
        <Link href={`/order/${orderNumber}`}>
          <Button>Xem đơn hàng</Button>
        </Link>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={null}>
      <OrderSuccessContent />
    </Suspense>
  );
}
