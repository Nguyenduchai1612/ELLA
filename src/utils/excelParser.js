import * as XLSX from "xlsx";

import {
  ORDER_STATUS,
  PLATFORM,
  createOrder,
  createOrderItem,
  createPlatformFees,
} from "../constants/financialSchema";

import {
  normalizeDate,
  normalizeOrderStatus,
  toNumber,
} from "./financialEngine";

/* =========================================================
 * GENERAL HELPERS
 * ========================================================= */

function isObject(value) {
  return value !== null && typeof value === "object";
}

function cleanString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeText(value) {
  return cleanString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function sum(values) {
  return values.reduce((total, value) => {
    return total + toNumber(value);
  }, 0);
}

/* =========================================================
 * HEADER NORMALIZATION
 * ========================================================= */

function buildNormalizedRow(row) {
  const normalized = {};

  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = normalizeText(key);

    if (!normalizedKey) {
      return;
    }

    normalized[normalizedKey] = value;
  });

  return normalized;
}

function findColumn(row, aliases = []) {
  const normalizedRow = buildNormalizedRow(row);

  for (const alias of aliases) {
    const key = normalizeText(alias);

    if (
      Object.prototype.hasOwnProperty.call(
        normalizedRow,
        key
      )
    ) {
      return normalizedRow[key];
    }
  }

  const availableKeys = Object.keys(normalizedRow);

  for (const alias of aliases) {
    const normalizedAlias = normalizeText(alias);

    const fuzzyKey = availableKeys.find((key) => {
      return (
        key.includes(normalizedAlias) ||
        normalizedAlias.includes(key)
      );
    });

    if (fuzzyKey) {
      return normalizedRow[fuzzyKey];
    }
  }

  return null;
}

/* =========================================================
 * XLSX INPUT
 * ========================================================= */

export async function readExcelFile(file) {
  if (!file) {
    throw new Error("Không tìm thấy file Excel/CSV.");
  }

  let arrayBuffer;

  if (file instanceof ArrayBuffer) {
    arrayBuffer = file;
  } else if (
    typeof ArrayBuffer !== "undefined" &&
    ArrayBuffer.isView(file)
  ) {
    arrayBuffer = file.buffer;
  } else if (
    typeof file.arrayBuffer === "function"
  ) {
    arrayBuffer = await file.arrayBuffer();
  } else {
    throw new Error(
      "File không hỗ trợ đọc bằng SheetJS."
    );
  }

  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: true,
    raw: true,
  });

  return workbook;
}

/* =========================================================
 * SHEET -> ROWS
 * ========================================================= */

export function sheetToRows(
  workbook,
  sheetName = null
) {
  if (
    !workbook ||
    !Array.isArray(workbook.SheetNames) ||
    workbook.SheetNames.length === 0
  ) {
    return [];
  }

  const selectedSheetName =
    sheetName || workbook.SheetNames[0];

  const worksheet =
    workbook.Sheets[selectedSheetName];

  if (!worksheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: true,
  });
}

/* =========================================================
 * READ ALL SHEETS
 * ========================================================= */

export function workbookToRows(workbook) {
  if (
    !workbook ||
    !Array.isArray(workbook.SheetNames)
  ) {
    return [];
  }

  return workbook.SheetNames.flatMap((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return [];
    }

    return XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: true,
    });
  });
}

/* =========================================================
 * ORDER ID
 * ========================================================= */

const ORDER_ID_ALIASES = [
  "Order ID",
  "OrderID",
  "Order Id",
  "Order Number",
  "Order No",
  "Order No.",
  "订单号",
  "Mã đơn hàng",
  "Ma don hang",
  "Mã đơn",
  "Ma don",
  "Shopee Order ID",
  "TikTok Order ID",
  "ID đơn hàng",
];

function getOrderId(row) {
  return cleanString(
    findColumn(row, ORDER_ID_ALIASES)
  );
}

/* =========================================================
 * ORDER STATUS
 * ========================================================= */

const STATUS_ALIASES = [
  "Order Status",
  "Order status",
  "Status",
  "Order State",
  "Order state",
  "Trạng thái đơn hàng",
  "Trang thai don hang",
  "Trạng thái",
  "Trang thai",
  "订单状态",
];

function getOrderStatus(row) {
  const value = findColumn(row, STATUS_ALIASES);

  return normalizeOrderStatus(value);
}

/* =========================================================
 * SKU
 * ========================================================= */

const SKU_ALIASES = [
  "Seller SKU",
  "SKU",
  "Seller SKU ID",
  "Product SKU",
  "Item SKU",
  "Model SKU",
  "Variation SKU",
  "Mã SKU",
  "Ma SKU",
  "Mã sản phẩm",
  "Ma san pham",
];

function getSKU(row) {
  return cleanString(findColumn(row, SKU_ALIASES));
}

/* =========================================================
 * PRODUCT NAME
 * ========================================================= */

const PRODUCT_NAME_ALIASES = [
  "Product Name",
  "Product name",
  "Item Name",
  "Item name",
  "Product",
  "Tên sản phẩm",
  "Ten san pham",
  "Tên hàng",
  "Ten hang",
  "商品名称",
];

function getProductName(row) {
  return cleanString(
    findColumn(row, PRODUCT_NAME_ALIASES)
  );
}

/* =========================================================
 * QUANTITY
 * ========================================================= */

const QUANTITY_ALIASES = [
  "Quantity",
  "Qty",
  "Item Quantity",
  "Order Quantity",
  "Số lượng",
  "So luong",
  "จำนวน",
];

function getQuantity(row) {
  const quantity = toNumber(
    findColumn(row, QUANTITY_ALIASES),
    1
  );

  return quantity > 0 ? quantity : 1;
}

/* =========================================================
 * UNIT PRICE
 * ========================================================= */

const UNIT_PRICE_ALIASES = [
  "Unit Price",
  "Unit price",
  "Price",
  "Item Price",
  "Original Price",
  "Giá bán",
  "Gia ban",
  "Đơn giá",
  "Don gia",
];

function getUnitPrice(row) {
  return toNumber(
    findColumn(row, UNIT_PRICE_ALIASES)
  );
}

/* =========================================================
 * GROSS AMOUNT
 * ========================================================= */

const GROSS_AMOUNT_ALIASES = [
  "Gross Amount",
  "Gross amount",
  "Subtotal",
  "Order Amount",
  "Product Subtotal",
  "Total Amount",
  "Tổng tiền hàng",
  "Tong tien hang",
  "Doanh thu",
  "Doanh thu gộp",
  "Doanh thu gop",
];

function getGrossAmount(row) {
  return toNumber(
    findColumn(row, GROSS_AMOUNT_ALIASES)
  );
}

/* =========================================================
 * DISCOUNT
 * ========================================================= */

const DISCOUNT_ALIASES = [
  "Discount",
  "Discount Amount",
  "Seller Discount",
  "Platform Discount",
  "Promotion Discount",
  "Giảm giá",
  "Giam gia",
  "Chiết khấu",
  "Chiet khau",
];

function getDiscountAmount(row) {
  return Math.abs(
    toNumber(findColumn(row, DISCOUNT_ALIASES))
  );
}

/* =========================================================
 * SETTLEMENT AMOUNT
 * ========================================================= */

const SETTLEMENT_ALIASES = [
  "Settlement Amount",
  "Settlement amount",
  "Settled Amount",
  "Net Settlement",
  "Net Amount",
  "Amount Paid",
  "Seller Settlement",
  "Seller proceeds",
  "Final Settlement",
  "Tiền quyết toán",
  "Tien quyet toan",
  "Tiền thực nhận",
  "Tien thuc nhan",
  "Số tiền quyết toán",
  "So tien quyet toan",
  "Tổng tiền quyết toán",
  "Tong tien quyet toan",
];

/* =========================================================
 * TIKTOK FEE ALIASES
 * ========================================================= */

const TIKTOK_FEE_ALIASES = {
  commissionFee: [
    "TikTok shop commission",
    "TikTok Shop Commission",
    "Commission",
    "Commission Fee",
    "Platform Commission",
  ],

  transactionFee: [
    "Transaction fee",
    "Transaction Fee",
    "TikTok transaction fee",
    "Transaction fees",
  ],

  serviceFee: [
    "Service Fee",
    "TikTok Shop Service Fee",
    "Platform Service Fee",
    "TikTok Shop service fee",
  ],

  paymentFee: [
    "Payment Fee",
    "Payment fee",
    "Payment Processing Fee",
    "Payment Processing",
  ],

  shippingFee: [
    "Shipping Fee",
    "Shipping fee",
    "Shipping Cost",
    "Logistics Fee",
    "TikTok Shipping Fee",
  ],

  returnShippingFee: [
    "Return Shipping Fee",
    "Return shipping fee",
    "Return Logistics Fee",
    "Reverse Shipping Fee",
    "Phí vận chuyển hoàn",
    "Phi van chuyen hoan",
  ],

  affiliateFee: [
    "Affiliate Commission",
    "Affiliate Fee",
    "Creator Commission",
    "Affiliate commission fee",
  ],

  advertisingFee: [
    "Advertising Fee",
    "Ads Fee",
    "TikTok Ads",
    "Marketing Fee",
  ],

  vatWithheld: [
    "VAT withheld by TikTok Shop",
    "VAT Withheld by TikTok Shop",
    "VAT Withheld",
    "VAT withheld",
  ],

  taxWithheld: [
    "Tax withheld by TikTok Shop",
    "Tax Withheld",
    "Income Tax Withheld",
  ],

  otherFee: [
    "Other Fee",
    "Other Fees",
    "Adjustment",
    "Other Adjustment",
  ],
};

/* =========================================================
 * SHOPEE FEE ALIASES
 * ========================================================= */

const SHOPEE_FEE_ALIASES = {
  commissionFee: [
    "Commission Fee",
    "Commission",
    "Phí hoa hồng",
    "Phi hoa hong",
  ],

  transactionFee: [
    "Transaction Fee",
    "Transaction fee",
    "Phí giao dịch",
    "Phi giao dich",
  ],

  serviceFee: [
    "Service Fee",
    "Phí dịch vụ",
    "Phi dich vu",
  ],

  paymentFee: [
    "Payment Fee",
    "Payment Processing Fee",
    "Phí thanh toán",
    "Phi thanh toan",
  ],

  shippingFee: [
    "Shipping Fee",
    "Shipping Cost",
    "Phí vận chuyển",
    "Phi van chuyen",
  ],

  returnShippingFee: [
    "Return Shipping Fee",
    "Return Shipping",
    "Phí vận chuyển hoàn",
    "Phi van chuyen hoan",
  ],

  affiliateFee: [
    "Affiliate Commission",
    "Affiliate Fee",
    "Phí tiếp thị liên kết",
    "Phi tiep thi lien ket",
  ],

  advertisingFee: [
    "Advertising Fee",
    "Ads Fee",
    "Marketing Fee",
    "Phí quảng cáo",
    "Phi quang cao",
  ],

  vatWithheld: [
    "VAT",
    "VAT Withheld",
    "Thuế VAT",
    "Thue VAT",
  ],

  taxWithheld: [
    "Tax",
    "Tax Withheld",
    "Thuế",
    "Thue",
  ],

  otherFee: [
    "Other Fee",
    "Other Fees",
    "Adjustment",
    "Điều chỉnh",
    "Dieu chinh",
  ],
};

/* =========================================================
 * DATE
 * ========================================================= */

const DATE_ALIASES = [
  "Order Date",
  "Order date",
  "Created Time",
  "Create Time",
  "Order Creation Date",
  "Transaction Date",
  "Date",
  "Ngày đặt hàng",
  "Ngay dat hang",
  "Ngày",
  "Ngay",
  "Thời gian",
  "Thoi gian",
];

/* =========================================================
 * ORDER ITEM NORMALIZATION
 * ========================================================= */

function normalizeOrderItem(row, platform) {
  const orderId = getOrderId(row);

  const quantity = getQuantity(row);

  const unitPrice = getUnitPrice(row);

  const grossAmountFromFile = getGrossAmount(row);

  const grossAmount =
    grossAmountFromFile ||
    unitPrice * quantity;

  const discountAmount = getDiscountAmount(row);

  const netItemAmount =
    grossAmount - discountAmount;

  const orderItemId = cleanString(
    findColumn(row, [
      "Order Item ID",
      "Order Item Id",
      "Order Item",
      "Item ID",
      "Item Id",
      "Line Item ID",
      "Mã dòng đơn hàng",
      "Ma dong don hang",
    ])
  );

  return createOrderItem({
    platform,
    orderId,
    orderItemId,
    sku: getSKU(row),
    productName: getProductName(row),
    quantity,
    unitPrice,
    grossAmount,
    discountAmount,
    netItemAmount,
    currency: "VND",
  });
}

/* =========================================================
 * NORMALIZE ORDER ROWS
 * ========================================================= */

export function normalizeOrderRows(
  rows = [],
  platform = PLATFORM.TIKTOK
) {
  if (!Array.isArray(rows)) {
    return [];
  }

  const orderMap = new Map();

  rows.forEach((row) => {
    const orderId = getOrderId(row);

    if (!orderId) {
      return;
    }

    const orderStatus = getOrderStatus(row);

    const dateValue = findColumn(
      row,
      DATE_ALIASES
    );

    const item = normalizeOrderItem(
      row,
      platform
    );

    const settlementAmount = toNumber(
      findColumn(row, SETTLEMENT_ALIASES)
    );

    const key = `${platform}_${orderId}`;

    if (!orderMap.has(key)) {
      orderMap.set(
        key,
        createOrder({
          platform,
          orderId,
          orderStatus,
          orderDate: normalizeDate(dateValue),
          settlementAmount,
          items: [item],
        })
      );

      return;
    }

    const existingOrder = orderMap.get(key);

    const existingItemIndex =
      existingOrder.items.findIndex((existingItem) => {
        if (
          item.orderItemId &&
          existingItem.orderItemId
        ) {
          return (
            item.orderItemId ===
            existingItem.orderItemId
          );
        }

        return (
          item.sku === existingItem.sku &&
          item.productName ===
            existingItem.productName
        );
      });

    if (existingItemIndex === -1) {
      existingOrder.items.push(item);
    } else {
      const existingItem =
        existingOrder.items[existingItemIndex];

      existingItem.quantity += item.quantity;
      existingItem.grossAmount += item.grossAmount;
      existingItem.discountAmount +=
        item.discountAmount;
      existingItem.netItemAmount +=
        item.netItemAmount;
    }

    if (
      settlementAmount !== 0 &&
      existingOrder.settlementAmount === 0
    ) {
      existingOrder.settlementAmount =
        settlementAmount;
    }

    if (
      existingOrder.orderStatus ===
        ORDER_STATUS.DELIVERED &&
      orderStatus !== ORDER_STATUS.DELIVERED
    ) {
      existingOrder.orderStatus = orderStatus;
    }
  });

  return Array.from(orderMap.values());
}

/* =========================================================
 * PLATFORM FEES NORMALIZATION
 * ========================================================= */

function normalizePlatformFees(
  row,
  platform
) {
  const aliases =
    platform === PLATFORM.SHOPEE
      ? SHOPEE_FEE_ALIASES
      : TIKTOK_FEE_ALIASES;

  const fees = {};

  Object.entries(aliases).forEach(
    ([field, fieldAliases]) => {
      fees[field] = Math.abs(
        toNumber(
          findColumn(row, fieldAliases)
        )
      );
    }
  );

  fees.platform = platform;
  fees.currency = "VND";

  const totalFee = sum([
    fees.commissionFee,
    fees.transactionFee,
    fees.serviceFee,
    fees.paymentFee,
    fees.shippingFee,
    fees.returnShippingFee,
    fees.affiliateFee,
    fees.advertisingFee,
    fees.vatWithheld,
    fees.taxWithheld,
    fees.otherFee,
  ]);

  fees.totalFee = totalFee;

  return createPlatformFees(fees);
}

/* =========================================================
 * SETTLEMENT ROW NORMALIZATION
 * ========================================================= */

export function normalizeSettlementRows(
  rows = [],
  platform = PLATFORM.TIKTOK
) {
  if (!Array.isArray(rows)) {
    return [];
  }

  const settlementMap = new Map();

  rows.forEach((row) => {
    const orderId = getOrderId(row);

    if (!orderId) {
      return;
    }

    const key = `${platform}_${orderId}`;

    const settlementAmount = toNumber(
      findColumn(row, SETTLEMENT_ALIASES)
    );

    const rowFees = normalizePlatformFees(
      row,
      platform
    );

    const status = getOrderStatus(row);

    if (!settlementMap.has(key)) {
      settlementMap.set(key, {
        platform,
        orderId,
        status,
        settlementAmount,
        platformFees: rowFees,
        rows: 1,
      });

      return;
    }

    const existing =
      settlementMap.get(key);

    existing.settlementAmount +=
      settlementAmount;

    Object.keys(rowFees).forEach((field) => {
      if (
        typeof rowFees[field] === "number"
      ) {
        existing.platformFees[field] +=
          rowFees[field];
      }
    });

    existing.rows += 1;

    if (
      existing.status ===
        ORDER_STATUS.DELIVERED &&
      status !== ORDER_STATUS.DELIVERED
    ) {
      existing.status = status;
    }
  });

  return Array.from(
    settlementMap.values()
  ).map((settlement) => {
    settlement.platformFees.totalFee =
      sum([
        settlement.platformFees.commissionFee,
        settlement.platformFees.transactionFee,
        settlement.platformFees.serviceFee,
        settlement.platformFees.paymentFee,
        settlement.platformFees.shippingFee,
        settlement.platformFees.returnShippingFee,
        settlement.platformFees.affiliateFee,
        settlement.platformFees.advertisingFee,
        settlement.platformFees.vatWithheld,
        settlement.platformFees.taxWithheld,
        settlement.platformFees.otherFee,
      ]);

    return settlement;
  });
}

/* =========================================================
 * MERGE ORDERS + SETTLEMENTS
 * ========================================================= */

export function mergeOrdersWithSettlements(
  orders = [],
  settlements = []
) {
  const settlementMap = new Map();

  settlements.forEach((settlement) => {
    const key = `${settlement.platform}_${settlement.orderId}`;

    settlementMap.set(key, settlement);
  });

  return orders.map((order) => {
    const key = `${order.platform}_${order.orderId}`;

    const settlement =
      settlementMap.get(key);

    if (!settlement) {
      return {
        ...order,
        platformFees: createPlatformFees({
          platform: order.platform,
        }),
      };
    }

    return {
      ...order,

      orderStatus:
        settlement.status ||
        order.orderStatus,

      settlementAmount:
        settlement.settlementAmount ||
        order.settlementAmount,

      platformFees:
        settlement.platformFees,
    };
  });
}

/* =========================================================
 * GENERIC PLATFORM PARSER
 * ========================================================= */

export async function parseOrderFile(
  file,
  platform,
  options = {}
) {
  const workbook =
    await readExcelFile(file);

  const rows = options.sheetName
    ? sheetToRows(
        workbook,
        options.sheetName
      )
    : workbookToRows(workbook);

  return normalizeOrderRows(
    rows,
    platform
  );
}

export async function parseSettlementFile(
  file,
  platform,
  options = {}
) {
  const workbook =
    await readExcelFile(file);

  const rows = options.sheetName
    ? sheetToRows(
        workbook,
        options.sheetName
      )
    : workbookToRows(workbook);

  return normalizeSettlementRows(
    rows,
    platform
  );
}

/* =========================================================
 * TIKTOK PARSER
 * ========================================================= */

export async function parseTikTokOrders(
  file,
  options = {}
) {
  return parseOrderFile(
    file,
    PLATFORM.TIKTOK,
    options
  );
}

export async function parseTikTokSettlement(
  file,
  options = {}
) {
  return parseSettlementFile(
    file,
    PLATFORM.TIKTOK,
    options
  );
}

/* =========================================================
 * SHOPEE PARSER
 * ========================================================= */

export async function parseShopeeOrders(
  file,
  options = {}
) {
  return parseOrderFile(
    file,
    PLATFORM.SHOPEE,
    options
  );
}

export async function parseShopeeSettlement(
  file,
  options = {}
) {
  return parseSettlementFile(
    file,
    PLATFORM.SHOPEE,
    options
  );
}

/* =========================================================
 * PARSE PLATFORM DATA
 *
 * Input:
 * {
 *   platform: PLATFORM.TIKTOK,
 *   orderFile: File,
 *   settlementFile: File
 * }
 *
 * Output:
 * {
 *   platform,
 *   orders,
 *   settlements,
 *   mergedOrders,
 *   statistics
 * }
 * ========================================================= */

export async function parsePlatformFiles({
  platform,
  orderFile,
  settlementFile,
  orderSheetName = null,
  settlementSheetName = null,
}) {
  if (
    platform !== PLATFORM.TIKTOK &&
    platform !== PLATFORM.SHOPEE
  ) {
    throw new Error(
      `Platform không hợp lệ: ${platform}`
    );
  }

  if (!orderFile && !settlementFile) {
    throw new Error(
      "Cần cung cấp ít nhất một file đơn hàng hoặc quyết toán."
    );
  }

  const [
    orders,
    settlements,
  ] = await Promise.all([
    orderFile
      ? parseOrderFile(
          orderFile,
          platform,
          {
            sheetName: orderSheetName,
          }
        )
      : Promise.resolve([]),

    settlementFile
      ? parseSettlementFile(
          settlementFile,
          platform,
          {
            sheetName:
              settlementSheetName,
          }
        )
      : Promise.resolve([]),
  ]);

  const mergedOrders =
    mergeOrdersWithSettlements(
      orders,
      settlements
    );

  return {
    platform,
    orders,
    settlements,
    mergedOrders,

    statistics: {
      orderCount: orders.length,
      settlementCount:
        settlements.length,
      mergedOrderCount:
        mergedOrders.length,
    },
  };
}

/* =========================================================
 * PARSE MULTIPLE PLATFORM FILES
 * ========================================================= */

export async function parseAllPlatformFiles({
  tiktok = {},
  shopee = {},
} = {}) {
  const results = [];

  if (
    tiktok.orderFile ||
    tiktok.settlementFile
  ) {
    results.push(
      await parsePlatformFiles({
        platform: PLATFORM.TIKTOK,
        orderFile: tiktok.orderFile,
        settlementFile:
          tiktok.settlementFile,
        orderSheetName:
          tiktok.orderSheetName,
        settlementSheetName:
          tiktok.settlementSheetName,
      })
    );
  }

  if (
    shopee.orderFile ||
    shopee.settlementFile
  ) {
    results.push(
      await parsePlatformFiles({
        platform: PLATFORM.SHOPEE,
        orderFile: shopee.orderFile,
        settlementFile:
          shopee.settlementFile,
        orderSheetName:
          shopee.orderSheetName,
        settlementSheetName:
          shopee.settlementSheetName,
      })
    );
  }

  return results;
}

/* =========================================================
 * DEDUPLICATION
 *
 * Primary key:
 * ${Platform}_${OrderID}
 *
 * Với orders:
 * - Giữ một order duy nhất.
 * - Gộp các item thuộc cùng order.
 *
 * Với settlements:
 * - Gộp các dòng settlement cùng order.
 * ========================================================= */

export function deduplicateOrders(
  orders = []
) {
  const map = new Map();

  orders.forEach((order) => {
    if (!order?.platform || !order?.orderId) {
      return;
    }

    const key = `${order.platform}_${order.orderId}`;

    if (!map.has(key)) {
      map.set(key, {
        ...order,
        items: Array.isArray(order.items)
          ? [...order.items]
          : [],
      });

      return;
    }

    const existing = map.get(key);

    const existingItems =
      existing.items || [];

    const incomingItems =
      Array.isArray(order.items)
        ? order.items
        : [];

    incomingItems.forEach((incomingItem) => {
      const duplicateIndex =
        existingItems.findIndex(
          (existingItem) => {
            if (
              incomingItem.orderItemId &&
              existingItem.orderItemId
            ) {
              return (
                incomingItem.orderItemId ===
                existingItem.orderItemId
              );
            }

            return (
              incomingItem.sku ===
                existingItem.sku &&
              incomingItem.productName ===
                existingItem.productName
            );
          }
        );

      if (duplicateIndex === -1) {
        existingItems.push(
          incomingItem
        );
        return;
      }

      const duplicate =
        existingItems[duplicateIndex];

      duplicate.quantity +=
        toNumber(incomingItem.quantity);

      duplicate.grossAmount +=
        toNumber(incomingItem.grossAmount);

      duplicate.discountAmount +=
        toNumber(
          incomingItem.discountAmount
        );

      duplicate.netItemAmount +=
        toNumber(
          incomingItem.netItemAmount
        );
    });

    if (
      !existing.settlementAmount &&
      order.settlementAmount
    ) {
      existing.settlementAmount =
        order.settlementAmount;
    }
  });

  return Array.from(map.values());
}

export function deduplicateSettlements(
  settlements = []
) {
  const map = new Map();

  settlements.forEach((settlement) => {
    if (
      !settlement?.platform ||
      !settlement?.orderId
    ) {
      return;
    }

    const key = `${settlement.platform}_${settlement.orderId}`;

    if (!map.has(key)) {
      map.set(key, {
        ...settlement,
        platformFees: {
          ...settlement.platformFees,
        },
      });

      return;
    }

    const existing = map.get(key);

    existing.settlementAmount +=
      toNumber(
        settlement.settlementAmount
      );

    const incomingFees =
      settlement.platformFees || {};

    const existingFees =
      existing.platformFees || {};

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
      "returnFee",
    ];

    feeFields.forEach((field) => {
      existingFees[field] =
        toNumber(existingFees[field]) +
        toNumber(incomingFees[field]);
    });

    existingFees.totalFee = sum([
      existingFees.commissionFee,
      existingFees.transactionFee,
      existingFees.serviceFee,
      existingFees.paymentFee,
      existingFees.shippingFee,
      existingFees.returnShippingFee,
      existingFees.affiliateFee,
      existingFees.advertisingFee,
      existingFees.vatWithheld,
      existingFees.taxWithheld,
      existingFees.otherFee,
    ]);

    existing.platformFees =
      existingFees;
  });

  return Array.from(map.values());
}

/* =========================================================
 * AUTO PLATFORM DETECTION
 * ========================================================= */

export function detectPlatformFromRows(
  rows = []
) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const sampleRows = rows.slice(0, 20);

  let tiktokScore = 0;
  let shopeeScore = 0;

  sampleRows.forEach((row) => {
    const keys = Object.keys(row)
      .map(normalizeText)
      .join(" ");

    if (
      keys.includes("tiktok") ||
      keys.includes("tiktokshop")
    ) {
      tiktokScore += 3;
    }

    if (
      keys.includes("shopee") ||
      keys.includes("shoppe")
    ) {
      shopeeScore += 3;
    }

    if (
      keys.includes(
        normalizeText(
          "TikTok shop commission"
        )
      )
    ) {
      tiktokScore += 5;
    }

    if (
      keys.includes(
        normalizeText(
          "VAT withheld by TikTok Shop"
        )
      )
    ) {
      tiktokScore += 5;
    }

    if (
      keys.includes(
        normalizeText(
          "Shopee Order ID"
        )
      )
    ) {
      shopeeScore += 5;
    }
  });

  if (
    tiktokScore === 0 &&
    shopeeScore === 0
  ) {
    return null;
  }

  return tiktokScore >= shopeeScore
    ? PLATFORM.TIKTOK
    : PLATFORM.SHOPEE;
}

/* =========================================================
 * RAW ROW PARSER
 *
 * Hữu ích khi muốn kiểm tra Excel trước khi xác định
 * loại file.
 * ========================================================= */

export async function parseRawExcelFile(
  file,
  options = {}
) {
  const workbook =
    await readExcelFile(file);

  if (options.sheetName) {
    return sheetToRows(
      workbook,
      options.sheetName
    );
  }

  return workbookToRows(workbook);
}

/* =========================================================
 * SMART PARSER
 *
 * Tự detect platform nếu không truyền platform.
 *
 * options:
 * {
 *   platform: PLATFORM.TIKTOK | PLATFORM.SHOPEE,
 *   type: "orders" | "settlement",
 *   sheetName: string
 * }
 * ========================================================= */

export async function parseExcelFile(
  file,
  options = {}
) {
  const workbook =
    await readExcelFile(file);

  const rows = options.sheetName
    ? sheetToRows(
        workbook,
        options.sheetName
      )
    : workbookToRows(workbook);

  if (rows.length === 0) {
    return {
      platform: null,
      type: options.type || null,
      rows: [],
      data: [],
    };
  }

  const platform =
    options.platform ||
    detectPlatformFromRows(rows);

  if (!platform) {
    throw new Error(
      "Không thể tự xác định sàn. Vui lòng truyền options.platform."
    );
  }

  const type =
    options.type || "orders";

  if (type === "settlement") {
    const data =
      normalizeSettlementRows(
        rows,
        platform
      );

    return {
      platform,
      type,
      rows,
      data,
    };
  }

  const data =
    normalizeOrderRows(
      rows,
      platform
    );

  return {
    platform,
    type: "orders",
    rows,
    data,
  };
}

/* =========================================================
 * VALIDATION
 * ========================================================= */

export function validateParsedOrders(
  orders = []
) {
  const errors = [];

  if (!Array.isArray(orders)) {
    return [
      "Dữ liệu orders không phải array.",
    ];
  }

  orders.forEach((order, index) => {
    if (!order.platform) {
      errors.push(
        `Order #${index + 1}: thiếu platform.`
      );
    }

    if (!order.orderId) {
      errors.push(
        `Order #${index + 1}: thiếu Order ID.`
      );
    }

    if (!Array.isArray(order.items)) {
      errors.push(
        `Order #${index + 1}: items không phải array.`
      );
    }
  });

  return errors;
}

/* =========================================================
 * PARSER STATISTICS
 * ========================================================= */

export function getParserStatistics(
  orders = [],
  settlements = []
) {
  const orderStatuses = {
    [ORDER_STATUS.DELIVERED]: 0,
    [ORDER_STATUS.CANCELLED]: 0,
    [ORDER_STATUS.RETURNED]: 0,
  };

  orders.forEach((order) => {
    const status =
      normalizeOrderStatus(
        order.orderStatus
      );

    if (
      Object.prototype.hasOwnProperty.call(
        orderStatuses,
        status
      )
    ) {
      orderStatuses[status] += 1;
    }
  });

  const uniqueOrderKeys = new Set(
    orders
      .filter(
        (order) =>
          order.platform &&
          order.orderId
      )
      .map(
        (order) =>
          `${order.platform}_${order.orderId}`
      )
  );

  const uniqueSettlementKeys = new Set(
    settlements
      .filter(
        (settlement) =>
          settlement.platform &&
          settlement.orderId
      )
      .map(
        (settlement) =>
          `${settlement.platform}_${settlement.orderId}`
      )
  );

  return {
    totalOrders: orders.length,
    totalSettlements:
      settlements.length,

    uniqueOrders:
      uniqueOrderKeys.size,

    uniqueSettlements:
      uniqueSettlementKeys.size,

    delivered:
      orderStatuses[
        ORDER_STATUS.DELIVERED
      ],

    cancelled:
      orderStatuses[
        ORDER_STATUS.CANCELLED
      ],

    returned:
      orderStatuses[
        ORDER_STATUS.RETURNED
      ],
  };
}