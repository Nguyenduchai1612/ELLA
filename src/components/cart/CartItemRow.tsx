"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import type { CartItem } from "@/types";
import { QuantitySelector } from "@/components/ui/QuantitySelector";
import { PriceDisplay } from "@/components/price/PriceDisplay";
import { formatVnd } from "@/lib/utils";

interface CartItemRowProps {
  item: CartItem;
  onQuantityChange: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
  isBusy: boolean;
}

export function CartItemRow({ item, onQuantityChange, onRemove, isBusy }: CartItemRowProps) {
  return (
    <div className="flex gap-4 border-b border-neutral-200 py-5">
      <Link
        href={`/products/${item.productSlug}`}
        className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100"
      >
        {item.image && (
          <Image src={item.image.url} alt={item.image.alt} fill sizes="80px" className="object-cover" />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/products/${item.productSlug}`} className="text-sm font-medium text-neutral-900">
              {item.productName}
            </Link>
            <p className="text-xs text-neutral-500">{item.variantName}</p>
            <p className="text-xs text-neutral-400">SKU: {item.sku}</p>
          </div>
          <button
            type="button"
            aria-label="Xóa sản phẩm"
            disabled={isBusy}
            onClick={() => onRemove(item.cartItemId)}
            className="p-1 text-neutral-400 hover:text-neutral-900 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <QuantitySelector
            quantity={item.quantity}
            onChange={(next) => onQuantityChange(item.cartItemId, next)}
            max={item.available}
            disabled={isBusy}
          />
          <div className="text-right">
            <PriceDisplay listPrice={item.listPrice} salePrice={item.unitPrice} />
            <p className="text-xs text-neutral-400">Tạm tính: {formatVnd(item.subtotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
