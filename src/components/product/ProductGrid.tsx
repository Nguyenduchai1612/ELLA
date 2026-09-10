import type { ReactNode } from "react";
import type { ProductListItem } from "@/types";
import { ProductCard } from "./ProductCard";
import { ProductCardSkeleton, EmptyState, ErrorState } from "@/components/feedback/States";

interface ProductGridProps {
  products: ProductListItem[] | null;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

export function ProductGrid({
  products,
  isLoading,
  error,
  onRetry,
  emptyTitle = "Không có sản phẩm nào",
  emptyDescription = "Vui lòng quay lại sau hoặc khám phá các danh mục khác.",
  emptyAction,
}: ProductGridProps) {
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.productId} product={product} />
      ))}
    </div>
  );
}
