import type { CheckoutService, CheckoutRequest, CheckoutResult } from "../serviceTypes";
import type { Order, OrderItem } from "@/types";
import { ApiError } from "../apiError";
import { mockCartService, resetMockCart } from "./mockCartService";
import { addMockOrder } from "./orderStore";

let mockOrderSequence = 1000;

// ASSUMPTION: two illustrative mock vouchers so the checkout flow's voucher
// input is genuinely exercisable in mock mode. Real voucher rules live
// entirely in the backend (Section 17) — this is a stand-in only.
interface MockVoucher {
  code: string;
  minSubtotal: number;
  discount: (subtotal: number) => number;
}

const MOCK_VOUCHERS: MockVoucher[] = [
  {
    code: "ELLA10",
    minSubtotal: 100_000,
    discount: (subtotal) => Math.min(Math.round(subtotal * 0.1), 50_000),
  },
  {
    code: "WELCOME20",
    minSubtotal: 150_000,
    discount: () => 20_000,
  },
];

function resolveVoucher(code: string, subtotal: number): number {
  const voucher = MOCK_VOUCHERS.find((v) => v.code === code.trim().toUpperCase());
  if (!voucher) {
    throw new ApiError("INVALID_VOUCHER", `Voucher "${code}" does not exist`, {
      reason: "NOT_FOUND",
    });
  }
  if (subtotal < voucher.minSubtotal) {
    throw new ApiError(
      "INVALID_VOUCHER",
      `Order subtotal must be at least ${voucher.minSubtotal} to use "${code}"`,
      { reason: "MIN_ORDER", minSubtotal: voucher.minSubtotal },
    );
  }
  return voucher.discount(subtotal);
}

/** Allocate a total discount across order lines proportionally to each line's value. */
function allocateDiscount(
  lines: { subtotal: number }[],
  totalDiscount: number,
): number[] {
  if (totalDiscount <= 0 || lines.length === 0) {
    return lines.map(() => 0);
  }
  const total = lines.reduce((sum, l) => sum + l.subtotal, 0);
  if (total <= 0) return lines.map(() => 0);

  const allocations = lines.map((l) => Math.floor((l.subtotal / total) * totalDiscount));
  // Give any rounding remainder to the last line so allocations sum exactly.
  const allocated = allocations.reduce((a, b) => a + b, 0);
  const remainder = totalDiscount - allocated;
  if (allocations.length > 0) {
    allocations[allocations.length - 1] = (allocations[allocations.length - 1] ?? 0) + remainder;
  }
  return allocations;
}

export const mockCheckoutService: CheckoutService = {
  async previewVoucher(code, subtotal) {
    const discountAmount = resolveVoucher(code, subtotal);
    return { code: code.trim().toUpperCase(), discountAmount };
  },

  async submitCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const cart = await mockCartService.getCart();
    if (cart.items.length === 0) {
      throw new ApiError("VALIDATION_ERROR", "Cart is empty");
    }

    let totalDiscount = 0;
    if (request.voucherCode) {
      totalDiscount = resolveVoucher(request.voucherCode, cart.subtotal);
    }
    const lineDiscounts = allocateDiscount(cart.items, totalDiscount);

    const items: OrderItem[] = cart.items.map((ci, index) => {
      const discount = lineDiscounts[index] ?? 0;
      const finalUnitPrice = (ci.unitPrice * ci.quantity - discount) / ci.quantity;
      return {
        orderItemId: `oi-${ci.cartItemId}`,
        skuId: ci.skuId,
        sku: ci.sku,
        productName: ci.productName,
        variantName: ci.variantName,
        image: ci.image,
        quantity: ci.quantity,
        unitListPrice: ci.listPrice,
        unitSalePrice: ci.unitPrice,
        discount,
        finalUnitPrice,
        subtotal: ci.unitPrice * ci.quantity - discount,
      };
    });

    const subtotal = cart.subtotal;
    const shippingFee = 0; // Section 19: V1 is always free shipping.
    const total = subtotal - totalDiscount + shippingFee;

    mockOrderSequence += 1;
    const orderNumber = `ELLA${mockOrderSequence}`;

    const order: Order = {
      orderId: `order-${orderNumber}`,
      orderNumber,
      status: "PENDING",
      paymentMethod: request.paymentMethod,
      paymentStatus: request.paymentMethod === "COD" ? "UNPAID" : "PENDING",
      items,
      shippingAddress: request.guest.shippingAddress,
      subtotal,
      discount: totalDiscount,
      shippingFee,
      total,
      createdAt: new Date().toISOString(),
    };

    addMockOrder(order);
    resetMockCart();

    return {
      order,
      paymentRedirectUrl:
        request.paymentMethod === "ONLINE"
          ? `https://payment.example.com/pay/${order.orderId}`
          : undefined,
    };
  },
};
