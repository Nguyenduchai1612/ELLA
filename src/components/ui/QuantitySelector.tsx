"use client";

import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  quantity: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

/** Section 13: quantity control, never allows <= 0 client-side. */
export function QuantitySelector({
  quantity,
  onChange,
  min = 1,
  max,
  disabled = false,
}: QuantitySelectorProps) {
  const canDecrement = !disabled && quantity > min;
  const canIncrement = !disabled && (max === undefined || quantity < max);

  return (
    <div className="inline-flex items-center rounded-full border border-neutral-300">
      <button
        type="button"
        aria-label="Giảm số lượng"
        className="flex h-9 w-9 items-center justify-center text-neutral-600 disabled:text-neutral-300"
        disabled={!canDecrement}
        onClick={() => onChange(Math.max(min, quantity - 1))}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-medium tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Tăng số lượng"
        className="flex h-9 w-9 items-center justify-center text-neutral-600 disabled:text-neutral-300"
        disabled={!canIncrement}
        onClick={() => onChange(max !== undefined ? Math.min(max, quantity + 1) : quantity + 1)}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
