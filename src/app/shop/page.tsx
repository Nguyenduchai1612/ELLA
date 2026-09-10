import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductListingView } from "@/components/product/ProductListingView";

export const metadata: Metadata = {
  title: "Tất cả sản phẩm",
  description: "Khám phá bộ sưu tập trang sức, mắt kính, đồng hồ và phụ kiện của ELLA.",
};

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ProductListingView
        title="Tất cả sản phẩm"
        description="Trang sức, mắt kính, đồng hồ và phụ kiện."
      />
    </Suspense>
  );
}
