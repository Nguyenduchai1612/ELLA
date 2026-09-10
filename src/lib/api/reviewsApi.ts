import { getApiMode } from "./config";
import { mockReviewsService } from "./mock/mockReviewsService";
import { realReviewsService } from "./real/realReviewsService";
import type { ReviewsService } from "./serviceTypes";

export const reviewsApi: ReviewsService =
  getApiMode() === "real" ? realReviewsService : mockReviewsService;
