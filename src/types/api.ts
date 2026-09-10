/**
 * Section 35: known backend error codes. The frontend maps each to a
 * user-friendly Vietnamese message (see src/lib/errors) and never shows
 * a raw exception/message to the customer.
 */
export type ApiErrorCode =
  | "INVALID_SKU"
  | "PRODUCT_NOT_FOUND"
  | "SKU_NOT_FOUND"
  | "INSUFFICIENT_STOCK"
  | "RESERVATION_EXPIRED"
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_CANCELLABLE"
  | "PAYMENT_FAILED"
  | "INVALID_VOUCHER"
  | "REVIEW_NOT_ALLOWED"
  | "REVIEW_ALREADY_EXISTS"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ProductListQuery {
  categorySlug?: string;
  productTypeSlug?: string;
  productStyleSlug?: string;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "best_selling";
  page?: number;
  pageSize?: number;
}
