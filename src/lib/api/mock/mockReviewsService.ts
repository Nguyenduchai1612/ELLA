import type { ReviewsService } from "../serviceTypes";
import type { Review, CreateReviewRequest } from "@/types";
import { ApiError } from "../apiError";
import { mockOrdersService } from "./mockOrdersService";

let mockReviews: Review[] = [];

export const mockReviewsService: ReviewsService = {
  async createReview(request: CreateReviewRequest): Promise<Review> {
    // Section 25: eligibility (DELIVERED + purchased SKU, no duplicate/edit)
    // is ultimately backend-enforced; the mock re-derives it from order data
    // so the UI can be exercised honestly even before the real API exists.
    const orders = await mockOrdersService.listOrders();
    const deliveredOrderIds = new Set(
      orders.filter((o) => o.status === "DELIVERED").map((o) => o.orderId),
    );

    let matchedOrderId: string | undefined;
    let matchedSkuId: string | undefined;
    for (const orderId of deliveredOrderIds) {
      const order = await mockOrdersService.getOrder(
        orders.find((o) => o.orderId === orderId)!.orderNumber,
      );
      const item = order.items.find((i) => i.orderItemId === request.orderItemId);
      if (item) {
        matchedOrderId = order.orderId;
        matchedSkuId = item.skuId;
        break;
      }
    }

    if (!matchedOrderId || !matchedSkuId) {
      throw new ApiError(
        "REVIEW_NOT_ALLOWED",
        "This item is not eligible for review (not delivered or not purchased)",
      );
    }

    if (mockReviews.some((r) => r.orderItemId === request.orderItemId)) {
      throw new ApiError("REVIEW_ALREADY_EXISTS", "This item has already been reviewed");
    }

    const review: Review = {
      reviewId: `review-${request.orderItemId}`,
      orderId: matchedOrderId,
      orderItemId: request.orderItemId,
      skuId: matchedSkuId,
      productId: matchedSkuId, // ASSUMPTION: mock fixtures 1:1 map sku->product for simplicity
      rating: request.rating,
      text: request.text,
      images: request.images ?? [],
      createdAt: new Date().toISOString(),
    };
    mockReviews = [...mockReviews, review];
    return review;
  },

  async listReviewsForProduct(productId) {
    return mockReviews.filter((r) => r.productId === productId);
  },
};
