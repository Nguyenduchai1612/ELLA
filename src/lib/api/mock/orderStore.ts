import type { Order } from "@/types";
import { MOCK_ADDRESS } from "./fixtures";

/**
 * Single source of truth for mock orders. Previously mockOrdersService held
 * its own fixture array and mockCheckoutService built orders that were
 * never stored anywhere — meaning a freshly placed order couldn't be found
 * by order/success or order/[orderNumber]. This module fixes that without
 * introducing a second mock system: both services now read/write here.
 */
export const mockOrders: Order[] = [
  {
    orderId: "order-ELLA1001",
    orderNumber: "ELLA1001",
    status: "DELIVERED",
    paymentMethod: "COD",
    paymentStatus: "PAID",
    items: [
      {
        orderItemId: "oi-1",
        skuId: "sku-eac-0510",
        sku: "EAC-0510",
        productName: "Vòng cổ cỏ 4 lá",
        variantName: "Bạc 4 lá trắng",
        image: {
          imageId: "img-eac-0510-1",
          url: "https://images.example.com/ella/eac-0510/1.jpg",
          alt: "Vòng cổ cỏ 4 lá - Bạc 4 lá trắng",
          sortOrder: 0,
        },
        quantity: 1,
        unitListPrice: 199000,
        unitSalePrice: 89000,
        discount: 0,
        finalUnitPrice: 89000,
        subtotal: 89000,
      },
    ],
    shippingAddress: MOCK_ADDRESS,
    subtotal: 89000,
    discount: 0,
    shippingFee: 0,
    total: 89000,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
  {
    orderId: "order-ELLA1002",
    orderNumber: "ELLA1002",
    status: "PENDING",
    paymentMethod: "BANK_TRANSFER",
    paymentStatus: "UNPAID",
    items: [
      {
        orderItemId: "oi-2",
        skuId: "sku-eyw-0101",
        sku: "EYW-0101",
        productName: "Kính mát Cat Eye Vintage",
        variantName: "Đen bóng",
        quantity: 1,
        unitListPrice: 349000,
        unitSalePrice: 249000,
        discount: 0,
        finalUnitPrice: 249000,
        subtotal: 249000,
      },
    ],
    shippingAddress: MOCK_ADDRESS,
    subtotal: 249000,
    discount: 0,
    shippingFee: 0,
    total: 249000,
    createdAt: new Date().toISOString(),
  },
];

export function addMockOrder(order: Order): void {
  mockOrders.unshift(order);
}

export function findMockOrderByNumber(orderNumber: string): Order | undefined {
  return mockOrders.find((o) => o.orderNumber === orderNumber);
}

export function findMockOrderById(orderId: string): Order | undefined {
  return mockOrders.find((o) => o.orderId === orderId);
}
