import type { OrdersService } from "../serviceTypes";
import type { Order, OrderListItem, CreateReturnRequest, ReturnRequest } from "@/types";
import { ApiError } from "../apiError";
import { mockOrders, findMockOrderByNumber, findMockOrderById } from "./orderStore";

function toListItem(order: Order): OrderListItem {
  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
    itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
    createdAt: order.createdAt,
  };
}

export const mockOrdersService: OrdersService = {
  async listOrders() {
    return [...mockOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(toListItem);
  },

  async getOrder(orderNumber) {
    const order = findMockOrderByNumber(orderNumber);
    if (!order) {
      throw new ApiError("ORDER_NOT_FOUND", `Order "${orderNumber}" not found`);
    }
    return order;
  },

  async cancelOrder(orderId) {
    const order = findMockOrderById(orderId);
    if (!order) {
      throw new ApiError("ORDER_NOT_FOUND", `Order "${orderId}" not found`);
    }
    // Section 23: only a PENDING order may be cancelled customer-side.
    if (order.status !== "PENDING") {
      throw new ApiError("ORDER_NOT_CANCELLABLE", `Order "${orderId}" can no longer be cancelled`);
    }
    order.status = "CANCELLED";
    return order;
  },

  async createReturnRequest(request: CreateReturnRequest): Promise<ReturnRequest> {
    const order = findMockOrderById(request.orderId);
    if (!order) {
      throw new ApiError("ORDER_NOT_FOUND", `Order "${request.orderId}" not found`);
    }
    if (order.status !== "DELIVERED") {
      throw new ApiError("VALIDATION_ERROR", "Only delivered orders are eligible for return");
    }
    order.status = "RETURN_REQUESTED";
    return {
      returnRequestId: `rr-${request.orderId}`,
      orderId: request.orderId,
      reason: request.reason,
      description: request.description,
      images: request.images ?? [],
      createdAt: new Date().toISOString(),
    };
  },
};
