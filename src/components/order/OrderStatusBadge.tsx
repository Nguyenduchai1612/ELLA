import type { OrderStatus } from "@/types";
import { getOrderStatusLabel } from "@/lib/errors";

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-neutral-100 text-neutral-700",
  CONFIRMED: "bg-rose-50 text-rose-700",
  PROCESSING: "bg-rose-50 text-rose-700",
  PACKED: "bg-rose-50 text-rose-700",
  SHIPPED: "bg-rose-100 text-rose-700",
  DELIVERED: "bg-success-50 text-success-700",
  CANCELLED: "bg-neutral-200 text-neutral-600",
  RETURN_REQUESTED: "bg-error-50 text-error-700",
  RETURNED: "bg-neutral-200 text-neutral-600",
  REFUNDED: "bg-neutral-200 text-neutral-600",
  FAILED: "bg-error-50 text-error-700",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {getOrderStatusLabel(status)}
    </span>
  );
}
