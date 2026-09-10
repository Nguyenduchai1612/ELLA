import type { ProductImage } from "./product";
import type { Address } from "./customer";
import type { PaymentMethod, PaymentStatus } from "./payment";

/** Section 22 — raw backend enum. Never shown to the customer directly. */
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "REFUNDED"
  | "FAILED";

/**
 * Section 27: Order Detail must show a historical snapshot, never a live
 * lookup against the current Product/SKU. Fields are intentionally
 * duplicated here rather than referencing `Product`/`ProductVariant`.
 *
 * Snapshot pricing model (frozen at order time):
 * - unitListPrice / unitSalePrice: the SKU's prices at the moment of purchase.
 * - discount: total discount allocated to this line (e.g. voucher share), in đ — not per unit.
 * - finalUnitPrice: effective per-unit price after discount (unitSalePrice - discount/quantity).
 * - subtotal: finalUnitPrice * quantity === unitSalePrice * quantity - discount.
 * All five are backend-computed and frozen; the frontend never derives them
 * from current SKU prices.
 */
export interface OrderItem {
  orderItemId: string;
  skuId: string;
  sku: string;
  productName: string;
  variantName: string;
  image?: ProductImage;
  quantity: number;
  unitListPrice: number;
  unitSalePrice: number;
  discount: number;
  finalUnitPrice: number;
  subtotal: number;
}

export interface Order {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  shippingAddress: Address;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  createdAt: string;
}

export interface OrderListItem {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  createdAt: string;
}
