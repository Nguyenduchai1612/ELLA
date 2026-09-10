import type { CheckoutService, CheckoutRequest, CheckoutResult, VoucherPreview } from "../serviceTypes";
import { httpRequest } from "../httpClient";

export const realCheckoutService: CheckoutService = {
  async submitCheckout(request: CheckoutRequest) {
    return httpRequest<CheckoutResult>("/api/checkout", { method: "POST", body: request });
  },

  async previewVoucher(code, subtotal) {
    return httpRequest<VoucherPreview>("/api/checkout/voucher-preview", {
      method: "POST",
      body: { code, subtotal },
    });
  },
};
