"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ordersApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { Order } from "@/types";

interface CancelOrderButtonProps {
  order: Order;
  onCancelled: (order: Order) => void;
}

/**
 * Section 23: cancel is only ever offered while status === PENDING, and
 * the backend re-validates regardless — a rejection here is expected and
 * handled, not assumed impossible.
 */
export function CancelOrderButton({ order, onCancelled }: CancelOrderButtonProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (order.status !== "PENDING") return null;

  async function handleCancel() {
    setIsCancelling(true);
    setError(null);
    try {
      const updated = await ordersApi.cancelOrder(order.orderId);
      onCancelled(updated);
      setConfirming(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">Xác nhận hủy đơn hàng?</span>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={isCancelling}>
            Không
          </Button>
          <Button variant="danger" size="sm" isLoading={isCancelling} onClick={handleCancel}>
            Hủy đơn
          </Button>
        </div>
      ) : (
        <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
          Hủy đơn hàng
        </Button>
      )}
      {error && <p className="text-sm text-error-500">{error}</p>}
    </div>
  );
}
