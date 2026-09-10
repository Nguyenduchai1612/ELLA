/**
 * Product domain types.
 *
 * IMPORTANT (spec Section 2/3): Product is the parent entity. It is never
 * directly purchasable. ProductVariant (a SKU) is the sellable item.
 * Every cart/order operation must reference `skuId`, never `productId` alone.
 *
 * Field names intentionally mirror the backend API contract (Section 33) —
 * e.g. `skuId`, not a UI-convenient rename like `variantId`.
 */

export type ProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface ProductImage {
  imageId: string;
  url: string;
  alt: string;
  sortOrder: number;
}

/** Section 11: Product Type (e.g. Necklace, Bracelet, Sunglasses) — distinct from Category. */
export interface ProductType {
  productTypeId: string;
  name: string;
  slug: string;
}

/** Section 12: Product Style (e.g. Four Leaf Clover, Cat Eye, Minimal) — used for filter/grouping only. */
export interface ProductStyle {
  productStyleId: string;
  name: string;
  slug: string;
}

/** Section 10: a Product may belong to multiple categories. */
export interface Category {
  categoryId: string;
  name: string;
  slug: string;
}

/**
 * A sellable SKU belonging to a Product.
 * Section 6/7: listPrice/salePrice are backend-authoritative; the frontend
 * never derives or recalculates these values.
 */
export interface ProductVariant {
  skuId: string;
  sku: string; // human-readable SKU code, e.g. "EAC-0510"
  variantName: string; // e.g. "Bạc 4 lá trắng"
  listPrice: number;
  salePrice: number;
  /** Backend-reported stock truth. The frontend never infers availability. */
  available: number;
  /**
   * SKU-specific images. May be empty — in that case the UI falls back to
   * the parent Product's common images (Section 5), and that fallback must
   * be implemented explicitly, never assumed implicitly.
   */
  images: ProductImage[];
}

export interface ProductSeo {
  title?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogImageUrl?: string;
}

export interface Product {
  productId: string;
  slug: string;
  name: string;
  description: string;
  brand: string;
  status: ProductStatus;
  categories: Category[];
  productType: ProductType;
  productStyle?: ProductStyle;
  /** Common images shared across all SKUs. */
  images: ProductImage[];
  /** The sellable SKUs. A Product with >1 variant requires explicit SKU selection (Section 3). */
  variants: ProductVariant[];
  seo?: ProductSeo;
}

/** Lightweight shape used on listing/grid surfaces (Section 8). */
export interface ProductListItem {
  productId: string;
  slug: string;
  name: string;
  productType?: Pick<ProductType, "name" | "slug">;
  productStyle?: Pick<ProductStyle, "name" | "slug">;
  primaryImage: ProductImage;
  /** Present only to support a "from" price / quick-select preview; never implies a default SKU is purchasable. */
  primaryVariant: Pick<ProductVariant, "skuId" | "listPrice" | "salePrice" | "available">;
  variantCount: number;
}
