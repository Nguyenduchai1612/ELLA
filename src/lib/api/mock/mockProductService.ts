import type { ProductService } from "../serviceTypes";
import type { Product, ProductListItem, ProductListQuery, PaginatedResult } from "@/types";
import { ApiError } from "../apiError";
import { MOCK_PRODUCTS } from "./fixtures";

function toListItem(product: Product): ProductListItem {
  const firstVariant = product.variants[0];
  if (!firstVariant) {
    throw new ApiError("UNKNOWN_ERROR", `Product ${product.productId} has no SKUs`);
  }
  // Section 5: prefer the Product's common image, explicitly falling back
  // to the first SKU's image. If a product genuinely has neither, that's a
  // data-quality problem the backend should prevent — surface it loudly
  // rather than passing `undefined` into a component that expects an image.
  const primaryImage = product.images[0] ?? firstVariant.images[0];
  if (!primaryImage) {
    throw new ApiError(
      "UNKNOWN_ERROR",
      `Product ${product.productId} has no common images and its first SKU has no images either`,
    );
  }
  return {
    productId: product.productId,
    slug: product.slug,
    name: product.name,
    productType: { name: product.productType.name, slug: product.productType.slug },
    productStyle: product.productStyle
      ? { name: product.productStyle.name, slug: product.productStyle.slug }
      : undefined,
    primaryImage,
    primaryVariant: {
      skuId: firstVariant.skuId,
      listPrice: firstVariant.listPrice,
      salePrice: firstVariant.salePrice,
      available: firstVariant.available,
    },
    variantCount: product.variants.length,
  };
}

function paginate<T>(items: T[], page = 1, pageSize = 12): PaginatedResult<T> {
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  return {
    items: pageItems,
    page,
    pageSize,
    totalItems: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
  };
}

function activeProducts(): Product[] {
  // Section 9: only ACTIVE products ever reach the storefront.
  return MOCK_PRODUCTS.filter((p) => p.status === "ACTIVE");
}

function applyQuery(products: Product[], query: ProductListQuery): Product[] {
  let result = products;
  if (query.categorySlug) {
    result = result.filter((p) => p.categories.some((c) => c.slug === query.categorySlug));
  }
  if (query.productTypeSlug) {
    result = result.filter((p) => p.productType.slug === query.productTypeSlug);
  }
  if (query.productStyleSlug) {
    result = result.filter((p) => p.productStyle?.slug === query.productStyleSlug);
  }
  if (query.search) {
    const q = query.search.toLowerCase();
    result = result.filter((p) => p.name.toLowerCase().includes(q));
  }
  if (query.sort === "price_asc") {
    result = [...result].sort((a, b) => a.variants[0]!.salePrice - b.variants[0]!.salePrice);
  } else if (query.sort === "price_desc") {
    result = [...result].sort((a, b) => b.variants[0]!.salePrice - a.variants[0]!.salePrice);
  }
  return result;
}

export const mockProductService: ProductService = {
  async listProducts(query) {
    const filtered = applyQuery(activeProducts(), query);
    const paged = paginate(filtered, query.page, query.pageSize);
    return { ...paged, items: paged.items.map(toListItem) };
  },

  async getProductBySlug(slug) {
    const product = activeProducts().find((p) => p.slug === slug);
    if (!product) {
      throw new ApiError("PRODUCT_NOT_FOUND", `Product "${slug}" not found`);
    }
    return product;
  },

  async listProductsByCategory(categorySlug, query = {}) {
    return mockProductService.listProducts({ ...query, categorySlug });
  },
};
