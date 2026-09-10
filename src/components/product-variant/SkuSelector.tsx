"use client";

import type { ProductVariant } from "@/types";

interface SkuSelectorProps {
  variants: ProductVariant[];
  selectedSkuId: string | undefined;
  onSelect: (skuId: string) => void;
}

/**
 * Section 3: the customer must explicitly choose a SKU before purchase.
 * This component never pre-selects a variant on the caller's behalf when
 * there's more than one option — that decision belongs to ProductDetailView,
 * and only for the single-SKU case (Section 14: "if there is only one SKU,
 * it may be selected automatically").
 */
export function SkuSelector({ variants, selectedSkuId, onSelect }: SkuSelectorProps) {
  if (variants.length <= 1) return null;

  return (
    <div>
      <span className="text-sm font-medium text-neutral-800">Phân loại</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {variants.map((variant) => {
          const isSelected = variant.skuId === selectedSkuId;
          const outOfStock = variant.available <= 0;
          return (
            <button
              key={variant.skuId}
              type="button"
              disabled={outOfStock}
              aria-pressed={isSelected}
              onClick={() => onSelect(variant.skuId)}
              className={`relative rounded-full border px-4 py-2 text-sm transition-colors ${
                isSelected
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-800 hover:border-neutral-900"
              } ${outOfStock ? "cursor-not-allowed !border-neutral-200 !bg-transparent !text-neutral-300" : ""}`}
            >
              {variant.variantName}
              {outOfStock && <span className="ml-1.5 text-[11px]">(Hết hàng)</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
