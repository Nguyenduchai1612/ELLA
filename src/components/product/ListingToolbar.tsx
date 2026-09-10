"use client";

import type { ProductListQuery } from "@/types";
import { Select } from "@/components/forms/FormFields";

interface ListingToolbarProps {
  totalItems: number;
  sort: ProductListQuery["sort"];
  onSortChange: (sort: ProductListQuery["sort"]) => void;
}

const SORT_OPTIONS: { value: NonNullable<ProductListQuery["sort"]>; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá: Thấp đến cao" },
  { value: "price_desc", label: "Giá: Cao đến thấp" },
  { value: "best_selling", label: "Bán chạy" },
];

export function ListingToolbar({ totalItems, sort, onSortChange }: ListingToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-4">
      <p className="text-sm text-neutral-500">{totalItems} sản phẩm</p>
      <Select
        aria-label="Sắp xếp"
        value={sort ?? "newest"}
        onChange={(e) => onSortChange(e.target.value as ProductListQuery["sort"])}
        className="!h-9 w-auto min-w-[160px]"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
