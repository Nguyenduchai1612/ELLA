/**
 * Section 25: a review may only be created for a DELIVERED order's
 * purchased SKU, cannot be edited, and eligibility is always
 * re-validated by the backend regardless of what the UI allows.
 */
export interface Review {
  reviewId: string;
  orderId: string;
  orderItemId: string;
  skuId: string;
  productId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  images: string[];
  createdAt: string;
}

export interface CreateReviewRequest {
  orderItemId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  images?: string[];
}
