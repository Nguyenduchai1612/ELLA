/**
 * Section 24: the frontend only collects and submits the request.
 * Approve/reject is an admin-side concern out of scope for this storefront.
 */
export interface CreateReturnRequest {
  orderId: string;
  reason: string;
  description: string;
  images?: string[];
}

export interface ReturnRequest {
  returnRequestId: string;
  orderId: string;
  reason: string;
  description: string;
  images: string[];
  createdAt: string;
}
