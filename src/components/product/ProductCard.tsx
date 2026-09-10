import Image from "next/image";
import Link from "next/link";
import type { ProductListItem } from "@/types";
import { PriceDisplay } from "@/components/price/PriceDisplay";

export function ProductCard({ product }: { product: ProductListItem }) {
  const outOfStock = product.primaryVariant.available <= 0;

  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col gap-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-neutral-100">
        <Image
          src={product.primaryImage.url}
          alt={product.primaryImage.alt}
          fill
          sizes="(min-width: 1024px) 23vw, (min-width: 768px) 31vw, 46vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {outOfStock && (
          <span className="absolute left-3 top-3 rounded-full bg-neutral-900/85 px-2.5 py-1 text-[11px] font-medium text-white">
            Hết hàng
          </span>
        )}
        {!outOfStock && product.primaryVariant.salePrice < product.primaryVariant.listPrice && (
          <span className="absolute left-3 top-3 rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-medium text-white">
            Sale
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {product.productType && (
          <span className="text-[11px] uppercase tracking-widest text-neutral-400">
            {product.productType.name}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm text-neutral-900">{product.name}</h3>
        <PriceDisplay
          listPrice={product.primaryVariant.listPrice}
          salePrice={product.primaryVariant.salePrice}
        />
        {product.variantCount > 1 && (
          <span className="text-xs text-neutral-400">{product.variantCount} lựa chọn</span>
        )}
      </div>
    </Link>
  );
}
