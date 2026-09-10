import Image from "next/image";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { CartSummary } from "@/components/cart/CartSummary";
import { formatVnd } from "@/lib/utils";
import type { Order } from "@/types";

const PAYMENT_METHOD_LABELS: Record<Order["paymentMethod"], string> = {
  COD: "Thanh toán khi nhận hàng (COD)",
  BANK_TRANSFER: "Chuyển khoản / QR",
  ONLINE: "Thanh toán online",
};

const PAYMENT_STATUS_LABELS: Record<Order["paymentStatus"], string> = {
  UNPAID: "Chưa thanh toán",
  PENDING: "Đang xử lý thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán thất bại",
  REFUNDED: "Đã hoàn tiền",
};

/**
 * Section 19/27: renders only the order's frozen snapshot fields — never
 * looks up the current SKU/product to "refresh" a price or image.
 */
export function OrderDetailCard({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500">Mã đơn hàng</p>
          <p className="font-serif text-xl text-neutral-900">{order.orderNumber}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-neutral-900">Sản phẩm</h2>
        <div className="flex flex-col divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
          {order.items.map((item) => (
            <div key={item.orderItemId} className="flex gap-4 p-4">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                {item.image && (
                  <Image src={item.image.url} alt={item.image.alt} fill sizes="64px" className="object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 text-sm">
                <p className="font-medium text-neutral-900">{item.productName}</p>
                <p className="text-neutral-500">{item.variantName}</p>
                <p className="text-xs text-neutral-400">SKU: {item.sku}</p>
                <div className="mt-1 flex items-center justify-between text-neutral-600">
                  <span>SL: {item.quantity}</span>
                  <span>{formatVnd(item.finalUnitPrice)} / sản phẩm</span>
                </div>
                {item.discount > 0 && (
                  <p className="text-xs text-rose-600">Giảm {formatVnd(item.discount)} cho sản phẩm này</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-medium text-neutral-900">Địa chỉ giao hàng</h2>
          <div className="rounded-2xl border border-neutral-200 p-4 text-sm text-neutral-700">
            <p className="font-medium text-neutral-900">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.phone}</p>
            <p>
              {order.shippingAddress.addressLine}, {order.shippingAddress.ward},{" "}
              {order.shippingAddress.district}, {order.shippingAddress.province}
            </p>
          </div>

          <h2 className="mb-3 mt-6 text-sm font-medium text-neutral-900">Thanh toán</h2>
          <div className="rounded-2xl border border-neutral-200 p-4 text-sm text-neutral-700">
            <p>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
            <p className="text-neutral-500">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</p>
          </div>
        </div>

        <CartSummary
          subtotal={order.subtotal}
          discount={order.discount}
          shippingFee={order.shippingFee}
          total={order.total}
        />
      </div>
    </div>
  );
}
