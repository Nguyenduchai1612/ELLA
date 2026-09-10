import type { CartService } from "../serviceTypes";
import type { Cart, CartItem } from "@/types";
import { ApiError } from "../apiError";
import { MOCK_PRODUCTS, MOCK_EMPTY_CART } from "./fixtures";

// ASSUMPTION: mock mode keeps cart state in an in-memory module singleton.
// This resets on page reload — acceptable for local/dev exploration before
// the real backend-backed cart (Section 34: Cart may use server-backed state)
// is wired up in Phase 16.
let cart: Cart = { ...MOCK_EMPTY_CART, items: [] };

function findSku(skuId: string) {
  for (const product of MOCK_PRODUCTS) {
    const variant = product.variants.find((v) => v.skuId === skuId);
    if (variant) return { product, variant };
  }
  return undefined;
}

function recalculate(): Cart {
  const subtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
  cart = {
    ...cart,
    subtotal,
    shippingFee: 0, // Section 19: V1 is always free shipping.
    total: subtotal - cart.discount + cart.shippingFee,
  };
  return cart;
}

export const mockCartService: CartService = {
  async getCart() {
    return cart;
  },

  async addItem({ skuId, quantity }) {
    if (quantity <= 0) {
      throw new ApiError("UNKNOWN_ERROR", "Quantity must be greater than zero");
    }
    const found = findSku(skuId);
    if (!found) {
      throw new ApiError("SKU_NOT_FOUND", `SKU "${skuId}" not found`);
    }
    const { product, variant } = found;

    const existing = cart.items.find((i) => i.skuId === skuId);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (nextQuantity > variant.available) {
      throw new ApiError("INSUFFICIENT_STOCK", `Only ${variant.available} left in stock`, {
        skuId,
        available: variant.available,
      });
    }

    const unitPrice = variant.salePrice;
    if (existing) {
      existing.quantity = nextQuantity;
      existing.subtotal = existing.quantity * unitPrice;
    } else {
      const newItem: CartItem = {
        cartItemId: `ci-${skuId}`,
        skuId,
        sku: variant.sku,
        productId: product.productId,
        productSlug: product.slug,
        productName: product.name,
        variantName: variant.variantName,
        image: variant.images[0] ?? product.images[0],
        unitPrice,
        listPrice: variant.listPrice,
        quantity,
        subtotal: quantity * unitPrice,
        available: variant.available,
      };
      cart.items.push(newItem);
    }
    return recalculate();
  },

  async updateItem({ cartItemId, quantity }) {
    if (quantity <= 0) {
      throw new ApiError("UNKNOWN_ERROR", "Quantity must be greater than zero");
    }
    const item = cart.items.find((i) => i.cartItemId === cartItemId);
    if (!item) {
      throw new ApiError("UNKNOWN_ERROR", "Cart item not found");
    }
    const found = findSku(item.skuId);
    const available = found?.variant.available ?? item.available;
    if (quantity > available) {
      throw new ApiError("INSUFFICIENT_STOCK", `Only ${available} left in stock`, {
        skuId: item.skuId,
        available,
      });
    }
    item.quantity = quantity;
    item.subtotal = quantity * item.unitPrice;
    return recalculate();
  },

  async removeItem(cartItemId) {
    cart.items = cart.items.filter((i) => i.cartItemId !== cartItemId);
    return recalculate();
  },
};

/**
 * Mock-only helper (NOT part of the public CartService contract — a real
 * backend empties the cart server-side as part of checkout, so the real
 * frontend never needs to call anything like this explicitly). Used by
 * mockCheckoutService right after a successful mock order is placed.
 */
export function resetMockCart(): void {
  cart = { ...MOCK_EMPTY_CART, items: [] };
}
