/** Section 20: payment UI must be abstracted, not hard-coded to one provider. */
export type PaymentMethod = "COD" | "BANK_TRANSFER" | "ONLINE";

export type PaymentStatus = "UNPAID" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";

/**
 * Section 21: a redirect back to the storefront is never treated as
 * authoritative confirmation. This shape represents the backend's
 * verified payment result, which the frontend only displays.
 */
export interface PaymentResult {
  orderId: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  providerReference?: string;
  verifiedAt?: string;
}

export interface Shipment {
  shipmentId: string;
  orderId: string;
  trackingNumber?: string;
  carrier?: string;
  status: "PENDING" | "IN_TRANSIT" | "DELIVERED" | "FAILED";
}
