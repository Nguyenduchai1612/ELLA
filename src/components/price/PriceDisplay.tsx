import { formatVnd } from "@/lib/utils";

interface PriceDisplayProps {
  listPrice: number;
  salePrice: number;
}

/**
 * Section 6/7: purely presentational. Values always come from the backend;
 * this component performs no calculation of its own beyond formatting.
 */
export function PriceDisplay({ listPrice, salePrice }: PriceDisplayProps) {
  const isOnSale = salePrice < listPrice;

  if (!isOnSale) {
    return <span className="font-medium">{formatVnd(salePrice)}</span>;
  }

  return (
    <span className="flex items-baseline gap-2">
      <span className="text-neutral-400 line-through">{formatVnd(listPrice)}</span>
      <span className="font-medium text-neutral-900">{formatVnd(salePrice)}</span>
    </span>
  );
}
