import { formatVnd } from "@/lib/utils";

interface CartSummaryProps {
  subtotal: number;
  discount?: number;
  shippingFee: number;
  total: number;
  children?: React.ReactNode;
}

/** Section 19/17: shipping fee and totals are always the backend-supplied values. */
export function CartSummary({ subtotal, discount = 0, shippingFee, total, children }: CartSummaryProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-5">
      <div className="flex justify-between text-sm text-neutral-600">
        <span>Tạm tính</span>
        <span>{formatVnd(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-sm text-rose-600">
          <span>Giảm giá</span>
          <span>-{formatVnd(discount)}</span>
        </div>
      )}
      <div className="flex justify-between text-sm text-neutral-600">
        <span>Phí vận chuyển</span>
        <span>{shippingFee === 0 ? "Miễn phí" : formatVnd(shippingFee)}</span>
      </div>
      {shippingFee === 0 && (
        <p className="text-xs text-neutral-400">Freeship là quà tặng dành cho khách hàng ELLA.</p>
      )}
      <div className="flex justify-between border-t border-neutral-200 pt-3 text-base font-medium text-neutral-900">
        <span>Tổng cộng</span>
        <span>{formatVnd(total)}</span>
      </div>
      {children}
    </div>
  );
}
