"use client";

import { useState } from "react";
import { Input } from "@/components/forms/FormFields";
import { Button } from "@/components/ui/Button";
import { checkoutApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

interface VoucherInputProps {
  subtotal: number;
  appliedCode: string | null;
  onApply: (code: string, discountAmount: number) => void;
  onRemove: () => void;
}

/**
 * Section 17: discount amount is always whatever the backend returns from
 * `previewVoucher` — this component never computes a discount itself.
 * Maximum one voucher per order is enforced by only ever holding one
 * applied code at a time.
 */
export function VoucherInput({ subtotal, appliedCode, onApply, onRemove }: VoucherInputProps) {
  const [code, setCode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    if (!code.trim()) return;
    setIsChecking(true);
    setError(null);
    try {
      const preview = await checkoutApi.previewVoucher(code.trim(), subtotal);
      onApply(preview.code, preview.discountAmount);
      setCode("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsChecking(false);
    }
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-rose-50 px-4 py-2.5 text-sm">
        <span className="font-medium text-rose-700">Đã áp dụng: {appliedCode}</span>
        <button type="button" onClick={onRemove} className="text-rose-700 underline underline-offset-2">
          Xóa
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          placeholder="Mã giảm giá"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="!h-10"
        />
        <Button variant="outline" size="sm" isLoading={isChecking} onClick={handleApply}>
          Áp dụng
        </Button>
      </div>
      {error && <p className="mt-1.5 text-sm text-error-500">{error}</p>}
    </div>
  );
}
