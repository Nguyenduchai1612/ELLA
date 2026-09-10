import type { PaymentsService } from "../serviceTypes";
import type { PaymentResult } from "@/types";
import { httpRequest } from "../httpClient";

export const realPaymentsService: PaymentsService = {
  async getPaymentResult(orderId) {
    // Section 21: this is the backend/provider-verified result — the only
    // source of truth for payment confirmation.
    return httpRequest<PaymentResult>(`/api/payments/${orderId}/result`, { cache: "no-store" });
  },
};
