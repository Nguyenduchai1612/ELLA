import type { ProductImage } from "./product";

/**
 * Cart items reference a SKU, never a bare Product (Section 13).
 * All monetary fields are backend-computed; the frontend may render a
 * client-side subtotal for UX purposes only (Section 7) — it is never
 * trusted at checkout time.
 */
export interface CartItem {
  cartItemId: string;
  skuId: string;
  sku: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  image?: ProductImage;
  unitPrice: number;
  /** SKU list price at the time it was added — carried through to the order snapshot. */
  listPrice: number;
  quantity: number;
  /** Backend-computed line subtotal. */
  subtotal: number;
  /** Backend-reported availability for this SKU, used for UX validation only. */
  available: number;
}

export interface Cart {
  cartId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
}

export interface AddCartItemRequest {
  skuId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  cartItemId: string;
  quantity: number;
}
