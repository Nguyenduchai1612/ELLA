"use client";

import type { PaymentMethod } from "@/types";

const OPTIONS: { value: PaymentMethod; label: string; description: string }[] = [
  { value: "COD", label: "Thanh toán khi nhận hàng (COD)", description: "Trả tiền mặt khi nhận hàng." },
  {
    value: "BANK_TRANSFER",
    label: "Chuyển khoản / QR",
    description: "Chuyển khoản ngân hàng hoặc quét mã QR.",
  },
  { value: "ONLINE", label: "Thanh toán online", description: "Thanh toán qua cổng thanh toán trực tuyến." },
];

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
}

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Phương thức thanh toán" className="flex flex-col gap-2">
      {OPTIONS.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors ${
              selected ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"
            }`}
          >
            <span className="text-sm font-medium text-neutral-900">{opt.label}</span>
            <span className="text-xs text-neutral-500">{opt.description}</span>
          </button>
        );
      })}
    </div>
  );
}
