import type { ProductService } from "../serviceTypes";
import type { Product, ProductListItem, PaginatedResult } from "@/types";
import { httpRequest } from "../httpClient";

/**
 * ASSUMPTION (Phase 16 will confirm against the real backend contract):
 * conventional REST endpoints under /api/products. Query params mirror
 * ProductListQuery field names.
 */
export const realProductService: ProductService = {
  async listProducts(query) {
    const params = new URLSearchParams();
    if (query.categorySlug) params.set("categorySlug", query.categorySlug);
    if (query.productTypeSlug) params.set("productTypeSlug", query.productTypeSlug);
    if (query.productStyleSlug) params.set("productStyleSlug", query.productStyleSlug);
    if (query.search) params.set("search", query.search);
    if (query.sort) params.set("sort", query.sort);
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    return httpRequest<PaginatedResult<ProductListItem>>(`/api/products?${params.toString()}`, {
      revalidate: 60,
    });
  },

  async getProductBySlug(slug) {
    return httpRequest<Product>(`/api/products/${encodeURIComponent(slug)}`, {
      revalidate: 60,
    });
  },

  async listProductsByCategory(categorySlug, query = {}) {
    return realProductService.listProducts({ ...query, categorySlug });
  },
};
