"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, Review } from "@/types";
import { ProductGallery } from "@/components/product-gallery/ProductGallery";
import { SkuSelector } from "@/components/product-variant/SkuSelector";
import { PriceDisplay } from "@/components/price/PriceDisplay";
import { QuantitySelector } from "@/components/ui/QuantitySelector";
import { Button } from "@/components/ui/Button";
import { ReviewList } from "@/components/review/ReviewList";
import { useCart } from "@/lib/state";
import { getErrorMessage } from "@/lib/errors";

interface ProductDetailViewProps {
  product: Product;
  reviews: Review[];
}

export function ProductDetailView({ product, reviews }: ProductDetailViewProps) {
  const router = useRouter();
  const { addItem } = useCart();

  // Section 3/14: only auto-select when there is exactly one SKU. With
  // multiple SKUs the customer must make an explicit choice.
  const [selectedSkuId, setSelectedSkuId] = useState<string | undefined>(
    product.variants.length === 1 ? product.variants[0]!.skuId : undefined,
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(
    null,
  );

  const selectedVariant = useMemo(
    () => product.variants.find((v) => v.skuId === selectedSkuId),
    [product.variants, selectedSkuId],
  );

  // Section 5: SKU-specific images take priority; explicit fallback to the
  // product's common images when the selected SKU has none of its own.
  const galleryImages =
    selectedVariant && selectedVariant.images.length > 0
      ? selectedVariant.images
      : product.images;

  const outOfStock = selectedVariant ? selectedVariant.available <= 0 : false;
  const canAddToCart = Boolean(selectedVariant) && !outOfStock && !isAdding;

  async function handleAddToCart() {
    if (!selectedVariant) return;
    setIsAdding(true);
    setFeedback(null);
    try {
      await addItem(selectedVariant.skuId, quantity);
      setFeedback({ type: "success", message: "Đã thêm vào giỏ hàng." });
    } catch (err) {
      setFeedback({ type: "error", message: getErrorMessage(err) });
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="container-ella py-8 md:py-12">
      <div className="grid gap-10 md:grid-cols-2 md:gap-14">
        <ProductGallery images={galleryImages} />

        <div className="flex flex-col gap-6">
          <div>
            {product.productType && (
              <span className="text-xs uppercase tracking-widest text-neutral-400">
                {product.productType.name}
                {product.productStyle ? ` · ${product.productStyle.name}` : ""}
              </span>
            )}
            <h1 className="mt-1 font-serif text-2xl text-neutral-900 md:text-3xl">
              {product.name}
            </h1>
          </div>

          <div className="text-lg">
            {selectedVariant ? (
              <PriceDisplay
                listPrice={selectedVariant.listPrice}
                salePrice={selectedVariant.salePrice}
              />
            ) : (
              <PriceDisplay
                listPrice={product.variants[0]?.listPrice ?? 0}
                salePrice={product.variants[0]?.salePrice ?? 0}
              />
            )}
          </div>

          <SkuSelector
            variants={product.variants}
            selectedSkuId={selectedSkuId}
            onSelect={(skuId) => {
              setSelectedSkuId(skuId);
              setFeedback(null);
            }}
          />

          {selectedVariant && (
            <p className="text-sm text-neutral-500">
              {outOfStock
                ? "Hiện đang hết hàng."
                : selectedVariant.available <= 5
                  ? `Chỉ còn ${selectedVariant.available} sản phẩm.`
                  : "Còn hàng."}
            </p>
          )}

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-neutral-800">Số lượng</span>
            <QuantitySelector
              quantity={quantity}
              onChange={setQuantity}
              max={selectedVariant?.available}
              disabled={!selectedVariant || outOfStock}
            />
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!canAddToCart}
            isLoading={isAdding}
            onClick={handleAddToCart}
          >
            {!selectedVariant
              ? "Chọn phân loại"
              : outOfStock
                ? "Hết hàng"
                : "Thêm vào giỏ hàng"}
          </Button>

          {feedback && (
            <p
              className={`text-sm ${feedback.type === "error" ? "text-error-500" : "text-success-500"}`}
              role="status"
            >
              {feedback.message}
              {feedback.type === "success" && (
                <button
                  type="button"
                  onClick={() => router.push("/cart")}
                  className="ml-2 font-medium underline underline-offset-2"
                >
                  Xem giỏ hàng
                </button>
              )}
            </p>
          )}

          <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-600">
            {product.description}
          </p>
        </div>
      </div>

      <div className="mt-16 max-w-2xl md:mt-24">
        <h2 className="font-serif text-xl text-neutral-900">Đánh giá sản phẩm</h2>
        <div className="mt-6">
          <ReviewList reviews={reviews} />
        </div>
      </div>
    </div>
  );
}
