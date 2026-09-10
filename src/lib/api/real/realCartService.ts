import type { CartService } from "../serviceTypes";
import type { Cart } from "@/types";
import { httpRequest } from "../httpClient";

// ASSUMPTION: cart is server-backed and identified via an httpOnly cookie
// the ASP.NET Core API manages; no cartId is handled client-side. Confirm
// against real backend session/cart strategy in Phase 16.
export const realCartService: CartService = {
  async getCart() {
    return httpRequest<Cart>("/api/cart", { cache: "no-store" });
  },

  async addItem(request) {
    return httpRequest<Cart>("/api/cart/items", { method: "POST", body: request });
  },

  async updateItem(request) {
    return httpRequest<Cart>(`/api/cart/items/${request.cartItemId}`, {
      method: "PATCH",
      body: { quantity: request.quantity },
    });
  },

  async removeItem(cartItemId) {
    return httpRequest<Cart>(`/api/cart/items/${cartItemId}`, { method: "DELETE" });
  },
};
