import { getApiMode } from "./config";
import { mockPaymentsService } from "./mock/mockPaymentsService";
import { realPaymentsService } from "./real/realPaymentsService";
import type { PaymentsService } from "./serviceTypes";

export const paymentsApi: PaymentsService =
  getApiMode() === "real" ? realPaymentsService : mockPaymentsService;
