import type { PaymentsService } from "../serviceTypes";
import type { PaymentResult } from "@/types";

export const mockPaymentsService: PaymentsService = {
  async getPaymentResult(orderId): Promise<PaymentResult> {
    // Section 21: even in mock mode this models a backend-verified result,
    // never something derived from a client-side redirect flag.
    return {
      orderId,
      paymentMethod: "ONLINE",
      status: "PAID",
      providerReference: `mock-ref-${orderId}`,
      verifiedAt: new Date().toISOString(),
    };
  },
};
