import type { OrderStatus } from "@/types";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  PACKED: "Đã đóng gói",
  SHIPPED: "Đang giao hàng",
  DELIVERED: "Đã giao hàng",
  CANCELLED: "Đã hủy",
  RETURN_REQUESTED: "Đang yêu cầu trả hàng",
  RETURNED: "Đã trả hàng",
  REFUNDED: "Đã hoàn tiền",
  FAILED: "Thất bại",
};

export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}
