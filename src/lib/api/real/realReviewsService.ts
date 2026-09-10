import type { ReviewsService } from "../serviceTypes";
import type { Review, CreateReviewRequest } from "@/types";
import { httpRequest } from "../httpClient";

export const realReviewsService: ReviewsService = {
  async createReview(request: CreateReviewRequest) {
    return httpRequest<Review>("/api/reviews", { method: "POST", body: request });
  },

  async listReviewsForProduct(productId) {
    return httpRequest<Review[]>(`/api/products/${productId}/reviews`, { revalidate: 60 });
  },
};
