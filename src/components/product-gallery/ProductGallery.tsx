"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/types";

interface ProductGalleryProps {
  images: ProductImage[];
}

/**
 * Section 5/14 (continuation): receives an already-resolved image list —
 * the SKU-images-or-fallback-to-common-images decision happens one level
 * up (ProductDetailView), explicitly, not implicitly inside this component.
 */
export function ProductGallery({ images }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset to the first image whenever the resolved image set changes
  // (e.g. customer switches SKU).
  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  const active = images[activeIndex] ?? images[0];

  if (!active) {
    return <div className="aspect-square w-full rounded-2xl bg-neutral-100" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-100">
        <Image
          src={active.url}
          alt={active.alt}
          fill
          priority
          sizes="(min-width: 1024px) 44vw, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, index) => (
            <button
              key={img.imageId}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Xem ảnh ${index + 1}`}
              aria-current={index === activeIndex}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${
                index === activeIndex ? "border-neutral-900" : "border-transparent"
              }`}
            >
              <Image src={img.url} alt={img.alt} fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
