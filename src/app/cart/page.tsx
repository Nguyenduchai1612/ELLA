"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/state";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { CartSummary } from "@/components/cart/CartSummary";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/feedback/States";

export default function CartPage() {
  usePageTitle("Giỏ hàng");
  const { cart, isLoading, error, updateItem, removeItem, refresh } = useCart();
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  async function handleQuantityChange(cartItemId: string, quantity: number) {
    setBusyId(cartItemId);
    try {
      await updateItem(cartItemId, quantity);
    } catch {
      // error surfaced via cart.error below
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(cartItemId: string) {
    setBusyId(cartItemId);
    try {
      await removeItem(cartItemId);
    } catch {
      // error surfaced via cart.error below
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading && !cart) {
    return (
      <div className="container-ella py-10">
        <Skeleton className="h-8 w-40" />
        <div className="mt-8 grid gap-10 md:grid-cols-3">
          <div className="flex flex-col gap-4 md:col-span-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="container-ella py-10">
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-ella py-10">
        <h1 className="mb-6 font-serif text-2xl text-neutral-900">Giỏ hàng</h1>
        <EmptyState
          title="Giỏ hàng của bạn đang trống"
          description="Khám phá các sản phẩm của ELLA và thêm vào giỏ hàng."
          action={
            <Button onClick={() => router.push("/shop")} variant="outline" size="sm">
              Tiếp tục mua sắm
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-ella py-10">
      <h1 className="mb-6 font-serif text-2xl text-neutral-900">
        Giỏ hàng <span className="text-base font-normal text-neutral-400">({cart.items.length})</span>
      </h1>

      {error && (
        <p className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-10 md:grid-cols-3">
        <div className="md:col-span-2">
          {cart.items.map((item) => (
            <CartItemRow
              key={item.cartItemId}
              item={item}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemove}
              isBusy={busyId === item.cartItemId}
            />
          ))}
          <Link href="/shop" className="mt-4 inline-block text-sm text-neutral-600 underline underline-offset-2">
            ← Tiếp tục mua sắm
          </Link>
        </div>

        <div>
          <CartSummary
            subtotal={cart.subtotal}
            discount={cart.discount}
            shippingFee={cart.shippingFee}
            total={cart.total}
          >
            <Button className="mt-2 w-full" size="lg" onClick={() => router.push("/checkout")}>
              Tiến hành thanh toán
            </Button>
          </CartSummary>
        </div>
      </div>
    </div>
  );
}
