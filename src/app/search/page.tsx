import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductListingView } from "@/components/product/ProductListingView";

interface SearchPageProps {
  searchParams: { q?: string };
}

export const metadata: Metadata = {
  title: "Tìm kiếm",
};

export default function SearchPage({ searchParams }: SearchPageProps) {
  const q = searchParams.q ?? "";
  return (
    <Suspense fallback={null}>
      <ProductListingView
        title={q ? `Kết quả cho "${q}"` : "Tìm kiếm"}
        searchQuery={q}
        emptyTitle="Không tìm thấy sản phẩm"
        emptyDescription="Thử một từ khóa khác hoặc khám phá các danh mục của ELLA."
      />
    </Suspense>
  );
}
