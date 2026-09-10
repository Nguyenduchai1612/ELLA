import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductListingView } from "@/components/product/ProductListingView";
import { NAV_CATEGORIES } from "@/lib/navigation";

interface CategoryPageProps {
  params: { slug: string };
}

function categoryName(slug: string): string {
  return NAV_CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}

export function generateMetadata({ params }: CategoryPageProps): Metadata {
  const name = categoryName(params.slug);
  return {
    title: name,
    description: `Sản phẩm ${name} tại ELLA.`,
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const name = categoryName(params.slug);
  return (
    <Suspense fallback={null}>
      <ProductListingView
        title={name}
        categorySlug={params.slug}
        emptyTitle={`Chưa có sản phẩm ${name}`}
        emptyDescription="Danh mục này hiện chưa có sản phẩm. Vui lòng quay lại sau."
      />
    </Suspense>
  );
}
