import {
  ORDER_STATUS,
  DEFAULT_PACKING_FEE,
  createOrderProfit,
} from "../constants/financialSchema";

/* =========================================================
 * NUMBER NORMALIZATION
 * ========================================================= */

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  let normalized = String(value).trim();

  if (!normalized) {
    return fallback;
  }

  normalized = normalized
    .replace(/\s/g, "")
    .replace(/[₫đ]/gi, "")
    .replace(/VND/gi, "")
    .replace(/VNĐ/gi, "");

  if (normalized.includes(",") && normalized.includes(".")) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");

    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "");
      normalized = normalized.replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (normalized.includes(",")) {
    const parts = normalized.split(",");

    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = normalized.replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (normalized.includes(".")) {
    const parts = normalized.split(".");

    if (parts.length > 2) {
      normalized = normalized.replace(/\./g, "");
    }
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : fallback;
}

/* =========================================================
 * DATE NORMALIZATION
 * ========================================================= */

export function normalizeDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(
      excelEpoch.getTime() + value * 24 * 60 * 60 * 1000
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const stringValue = String(value).trim();

  if (!stringValue) {
    return null;
  }

  const date = new Date(stringValue);

  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  const match = stringValue.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (!match) {
    return null;
  }

  const [, day, month, year, hour = "0", minute = "0", second = "0"] =
    match;

  const parsedDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

/* =========================================================
 * MONEY FORMAT
 * ========================================================= */

export function formatVND(amount) {
  const value = toNumber(amount);

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Math.round(value))}đ`;
}

/* =========================================================
 * PERCENT FORMAT
 *
 * Input:
 *   0.155 => 15.5%
 *   15.5 => 15.5%
 *
 * Mặc định engine coi rate <= 1 là decimal rate.
 * ========================================================= */

export function formatPercent(rate) {
  const value = toNumber(rate);

  const percentage = Math.abs(value) <= 1 ? value * 100 : value;

  return `${percentage.toFixed(1)}%`;
}

/* =========================================================
 * STATUS NORMALIZATION
 * ========================================================= */

export function normalizeOrderStatus(value) {
  if (!value) {
    return ORDER_STATUS.DELIVERED;
  }

  const normalized = String(value)
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    normalized.includes("CANCEL") ||
    normalized.includes("HUY") ||
    normalized.includes("CANCELED")
  ) {
    return ORDER_STATUS.CANCELLED;
  }

  if (
    normalized.includes("RETURN") ||
    normalized.includes("REFUND") ||
    normalized.includes("TRA") ||
    normalized.includes("HOAN")
  ) {
    return ORDER_STATUS.RETURNED;
  }

  if (
    normalized.includes("DELIVER") ||
    normalized.includes("COMPLET") ||
    normalized.includes("GIAO") ||
    normalized.includes("THANH CONG")
  ) {
    return ORDER_STATUS.DELIVERED;
  }

  return ORDER_STATUS.DELIVERED;
}

/* =========================================================
 * PLATFORM FEE CALCULATION
 * ========================================================= */

export function calculatePlatformFeeTotal(platformFees = {}) {
  if (!platformFees || typeof platformFees !== "object") {
    return 0;
  }

  if (
    platformFees.totalFee !== undefined &&
    platformFees.totalFee !== null
  ) {
    return toNumber(platformFees.totalFee);
  }

  const feeFields = [
    "commissionFee",
    "transactionFee",
    "serviceFee",
    "paymentFee",
    "shippingFee",
    "returnShippingFee",
    "affiliateFee",
    "advertisingFee",
    "vatWithheld",
    "taxWithheld",
    "otherFee",
  ];

  return feeFields.reduce((total, field) => {
    return total + toNumber(platformFees[field]);
  }, 0);
}

/* =========================================================
 * COGS CALCULATION
 *
 * Hỗ trợ:
 *
 * 1. cogsInfo = number
 *
 * 2. cogsInfo = {
 *      totalCogs: 100000
 *    }
 *
 * 3. cogsInfo = {
 *      items: [
 *        { quantity: 2, unitCogs: 20000 }
 *      ]
 *    }
 *
 * 4. cogsInfo = {
 *      items: [
 *        { sku: "ABC", quantity: 2, cogsPerUnit: 20000 }
 *      ]
 *    }
 * ========================================================= */

export function calculateTotalCOGS(order, cogsInfo = {}) {
  if (typeof cogsInfo === "number") {
    return Math.max(0, toNumber(cogsInfo));
  }

  if (!cogsInfo || typeof cogsInfo !== "object") {
    return calculateCOGSFromOrderItems(order);
  }

  if (cogsInfo.totalCogs !== undefined) {
    return Math.max(0, toNumber(cogsInfo.totalCogs));
  }

  if (cogsInfo.total !== undefined) {
    return Math.max(0, toNumber(cogsInfo.total));
  }

  if (Array.isArray(cogsInfo.items)) {
    return cogsInfo.items.reduce((total, item) => {
      const quantity = Math.max(0, toNumber(item.quantity, 1));

      const unitCogs = toNumber(
        item.unitCogs ?? item.cogsPerUnit ?? item.cost ?? item.cogs
      );

      const explicitAmount = item.cogsAmount;

      if (explicitAmount !== undefined && explicitAmount !== null) {
        return total + Math.max(0, toNumber(explicitAmount));
      }

      return total + quantity * unitCogs;
    }, 0);
  }

  return calculateCOGSFromOrderItems(order);
}

export function calculateCOGSFromOrderItems(order) {
  if (!order || !Array.isArray(order.items)) {
    return 0;
  }

  return order.items.reduce((total, item) => {
    const explicitAmount = item.cogsAmount;

    if (explicitAmount !== undefined && explicitAmount !== null) {
      return total + Math.max(0, toNumber(explicitAmount));
    }

    const quantity = Math.max(0, toNumber(item.quantity, 1));

    const unitCogs = toNumber(
      item.cogsPerUnit ?? item.unitCogs ?? item.cogs
    );

    return total + quantity * unitCogs;
  }, 0);
}

/* =========================================================
 * RETURN FEE
 *
 * Với đơn RETURNED:
 * - Phí sàn lấy theo dòng quyết toán hoàn.
 * - Nếu có returnFee thì ưu tiên returnFee.
 * - Nếu không có, dùng totalFee.
 * - returnShippingFee được cộng thêm nếu chưa nằm trong returnFee.
 * ========================================================= */

export function calculateReturnedOrderFee(platformFees = {}) {
  if (!platformFees || typeof platformFees !== "object") {
    return 0;
  }

  const explicitReturnFee = toNumber(platformFees.returnFee);

  if (explicitReturnFee !== 0) {
    return Math.abs(explicitReturnFee);
  }

  const returnSettlementFee = toNumber(
    platformFees.returnSettlementFee
  );

  if (returnSettlementFee !== 0) {
    return Math.abs(returnSettlementFee);
  }

  const returnShippingFee = Math.abs(
    toNumber(platformFees.returnShippingFee)
  );

  const totalFee = Math.abs(calculatePlatformFeeTotal(platformFees));

  return totalFee + returnShippingFee;
}

/* =========================================================
 * ORDER PROFIT
 * ========================================================= */

export function calculateOrderProfit(
  order = {},
  platformFees = {},
  cogsInfo = {},
  packingFee = DEFAULT_PACKING_FEE
) {
  const status = normalizeOrderStatus(
    order.orderStatus ?? order.status
  );

  const actualSettlement = toNumber(
    order.settlementAmount ??
      order.actualRevenue ??
      order.actualSettlement ??
      order.revenue
  );

  const normalizedPackingFee = Math.max(0, toNumber(packingFee));

  const baseResult = createOrderProfit({
    platform: order.platform ?? "",
    orderId: order.orderId ?? order.id ?? "",
    status,
  });

  /* =======================================================
   * CANCELLED
   * ======================================================= */

  if (status === ORDER_STATUS.CANCELLED) {
    return {
      ...baseResult,

      actualRevenue: 0,
      platformFees: 0,
      packingFee: 0,
      cogs: 0,

      profitBeforeAds: 0,

      adsCost: 0,
      netProfit: 0,
    };
  }

  /* =======================================================
   * RETURNED
   * ======================================================= */

  if (status === ORDER_STATUS.RETURNED) {
    const returnFee = calculateReturnedOrderFee(platformFees);

    const returnedLoss = normalizedPackingFee + returnFee;

    return {
      ...baseResult,

      actualRevenue: 0,
      platformFees: returnFee,
      packingFee: normalizedPackingFee,
      cogs: 0,

      profitBeforeAds: -returnedLoss,

      adsCost: 0,
      netProfit: -returnedLoss,
    };
  }

  /* =======================================================
   * DELIVERED
   * ======================================================= */

  const platformFeeTotal = calculatePlatformFeeTotal(platformFees);

  const totalCOGS = calculateTotalCOGS(order, cogsInfo);

  const profitBeforeAds =
    actualSettlement -
    platformFeeTotal -
    normalizedPackingFee -
    totalCOGS;

  return {
    ...baseResult,

    actualRevenue: actualSettlement,
    platformFees: platformFeeTotal,
    packingFee: normalizedPackingFee,
    cogs: totalCOGS,

    profitBeforeAds,

    adsCost: 0,
    netProfit: profitBeforeAds,
  };
}

/* =========================================================
 * APPLY ADS COST
 * ========================================================= */

export function applyAdsCost(orderProfit, adsCost = 0) {
  const normalizedAdsCost = Math.max(0, toNumber(adsCost));

  const profitBeforeAds = toNumber(
    orderProfit?.profitBeforeAds
  );

  return {
    ...orderProfit,

    adsCost: normalizedAdsCost,
    netProfit: profitBeforeAds - normalizedAdsCost,
  };
}

/* =========================================================
 * PROFIT MARGIN
 * ========================================================= */

export function calculateProfitMargin(
  profit,
  revenue
) {
  const normalizedRevenue = toNumber(revenue);

  if (normalizedRevenue === 0) {
    return 0;
  }

  return toNumber(profit) / normalizedRevenue;
}

/* =========================================================
 * FEE RATE
 * ========================================================= */

export function calculateFeeRate(
  platformFees,
  revenue
) {
  const normalizedRevenue = toNumber(revenue);

  if (normalizedRevenue === 0) {
    return 0;
  }

  return calculatePlatformFeeTotal(platformFees) / normalizedRevenue;
}

/* =========================================================
 * AGGREGATE ORDER PROFITS
 * ========================================================= */

export function aggregateOrderProfits(orderProfits = []) {
  const safeProfits = Array.isArray(orderProfits)
    ? orderProfits
    : [];

  const result = safeProfits.reduce(
    (accumulator, profit) => {
      accumulator.actualRevenue += toNumber(
        profit.actualRevenue
      );

      accumulator.platformFees += toNumber(
        profit.platformFees
      );

      accumulator.packingFee += toNumber(
        profit.packingFee
      );

      accumulator.cogs += toNumber(profit.cogs);

      accumulator.profitBeforeAds += toNumber(
        profit.profitBeforeAds
      );

      accumulator.adsCost += toNumber(profit.adsCost);

      accumulator.netProfit += toNumber(profit.netProfit);

      accumulator.orderCount += 1;

      return accumulator;
    },
    {
      actualRevenue: 0,
      platformFees: 0,
      packingFee: 0,
      cogs: 0,
      profitBeforeAds: 0,
      adsCost: 0,
      netProfit: 0,
      orderCount: 0,
    }
  );

  result.profitMargin = calculateProfitMargin(
    result.netProfit,
    result.actualRevenue
  );

  result.feeRate = calculateFeeRate(
    {
      totalFee: result.platformFees,
    },
    result.actualRevenue
  );

  return result;
}