/**
 * ELLA Accents
 * Financial Data Schema
 *
 * Mục đích:
 * - Chuẩn hóa cấu trúc dữ liệu tài chính.
 * - Dùng làm contract chung giữa Excel Parser, Financial Engine và UI.
 * - Không chứa logic tính toán.
 */

/* =========================================================
 * ORDER STATUS
 * ========================================================= */

export const ORDER_STATUS = Object.freeze({
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  RETURNED: "RETURNED",
});

/* =========================================================
 * PLATFORM
 * ========================================================= */

export const PLATFORM = Object.freeze({
  TIKTOK: "TIKTOK",
  SHOPEE: "SHOPEE",
});

/* =========================================================
 * COMMON CONSTANTS
 * ========================================================= */

export const DEFAULT_PACKING_FEE = 6000;

export const CURRENCY = "VND";

export const DEFAULT_PERCENT_DIGITS = 1;

export const ORDER_STATUS_VALUES = Object.freeze(
  Object.values(ORDER_STATUS)
);

export const PLATFORM_VALUES = Object.freeze(
  Object.values(PLATFORM)
);

/* =========================================================
 * DEFAULT ORDER ITEM
 * ========================================================= */

export const DEFAULT_ORDER_ITEM = Object.freeze({
  platform: "",
  orderId: "",
  orderItemId: "",
  sku: "",
  productName: "",
  quantity: 1,

  unitPrice: 0,
  grossAmount: 0,
  discountAmount: 0,
  netItemAmount: 0,

  cogsPerUnit: 0,
  cogsAmount: 0,

  currency: CURRENCY,
});

/* =========================================================
 * DEFAULT PLATFORM FEES
 * ========================================================= */

export const DEFAULT_PLATFORM_FEES = Object.freeze({
  platform: "",

  commissionFee: 0,
  transactionFee: 0,
  serviceFee: 0,
  paymentFee: 0,
  shippingFee: 0,
  returnShippingFee: 0,
  affiliateFee: 0,
  advertisingFee: 0,
  vatWithheld: 0,
  taxWithheld: 0,

  otherFee: 0,

  totalFee: 0,
  returnFee: 0,
  returnSettlementAmount: 0,

  currency: CURRENCY,
});

/* =========================================================
 * DEFAULT ORDER PROFIT
 * ========================================================= */

export const DEFAULT_ORDER_PROFIT = Object.freeze({
  platform: "",
  orderId: "",
  status: "",

  actualRevenue: 0,

  platformFees: 0,
  packingFee: 0,
  cogs: 0,

  profitBeforeAds: 0,

  adsCost: 0,
  netProfit: 0,

  currency: CURRENCY,
});

/* =========================================================
 * DEFAULT PRODUCT SKU
 * ========================================================= */

export const DEFAULT_PRODUCT_SKU = Object.freeze({
  sku: "",
  productId: "",
  productName: "",

  platform: "",

  unitCogs: 0,
  currency: CURRENCY,

  active: true,

  createdAt: null,
  updatedAt: null,
});

/* =========================================================
 * FACTORY HELPERS
 *
 * Dùng factory thay vì mutate trực tiếp DEFAULT_*.
 * Điều này tránh việc các order/product dùng chung object reference.
 * ========================================================= */

export function createOrderItem(overrides = {}) {
  return {
    ...DEFAULT_ORDER_ITEM,
    ...overrides,
  };
}

export function createPlatformFees(overrides = {}) {
  return {
    ...DEFAULT_PLATFORM_FEES,
    ...overrides,
  };
}

export function createOrderProfit(overrides = {}) {
  return {
    ...DEFAULT_ORDER_PROFIT,
    ...overrides,
  };
}

export function createProductSKU(overrides = {}) {
  return {
    ...DEFAULT_PRODUCT_SKU,
    ...overrides,
  };
}

/* =========================================================
 * DEFAULT ORDER
 *
 * Đây là structure trung tâm được Financial Engine sử dụng.
 * ========================================================= */

export const DEFAULT_ORDER = Object.freeze({
  platform: "",
  orderId: "",
  orderStatus: "",

  orderDate: null,
  currency: CURRENCY,

  settlementAmount: 0,

  items: [],
});

/* =========================================================
 * ORDER FACTORY
 * ========================================================= */

export function createOrder(overrides = {}) {
  return {
    ...DEFAULT_ORDER,
    ...overrides,

    items: Array.isArray(overrides.items)
      ? overrides.items.map((item) => createOrderItem(item))
      : [],
  };
}
