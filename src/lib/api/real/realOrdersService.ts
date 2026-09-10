import type { OrdersService } from "../serviceTypes";
import type { Order, OrderListItem, CreateReturnRequest, ReturnRequest } from "@/types";
import { httpRequest } from "../httpClient";

export const realOrdersService: OrdersService = {
  async listOrders() {
    return httpRequest<OrderListItem[]>("/api/orders", { cache: "no-store" });
  },

  async getOrder(orderNumber) {
    return httpRequest<Order>(`/api/orders/${encodeURIComponent(orderNumber)}`, {
      cache: "no-store",
    });
  },

  async cancelOrder(orderId) {
    return httpRequest<Order>(`/api/orders/${orderId}/cancel`, { method: "POST" });
  },

  async createReturnRequest(request: CreateReturnRequest) {
    return httpRequest<ReturnRequest>(`/api/orders/${request.orderId}/return-request`, {
      method: "POST",
      body: request,
    });
  },
};
