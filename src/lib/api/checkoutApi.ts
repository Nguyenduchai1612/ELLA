import { getApiMode } from "./config";
import { mockCheckoutService } from "./mock/mockCheckoutService";
import { realCheckoutService } from "./real/realCheckoutService";
import type { CheckoutService } from "./serviceTypes";

export const checkoutApi: CheckoutService =
  getApiMode() === "real" ? realCheckoutService : mockCheckoutService;

export type { CheckoutRequest, CheckoutResult, VoucherPreview } from "./serviceTypes";
