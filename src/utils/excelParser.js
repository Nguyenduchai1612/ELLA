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
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
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
 * PLATFORM HELPERS
 * ========================================================= */

function getTikTokPlatform() {
  if (PLATFORM?.TIKTOK) {
    return PLATFORM.TIKTOK;
  }

  return "TIKTOK";
}

function getShopeePlatform() {
  if (PLATFORM?.SHOPEE) {
    return PLATFORM.SHOPEE;
  }

  return "SHOPEE";
}

function normalizePlatform(platform) {
  const value = normalizeText(platform);

  if (
    value === "shopee" ||
    value.includes("shopee")
  ) {
    return getShopeePlatform();
  }

  return getTikTokPlatform();
}

/* =========================================================
 * HEADER NORMALIZATION
 * ========================================================= */

function buildNormalizedRow(row) {
  const normalized = {};

  if (!isObject(row)) {
    return normalized;
  }

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

  const availableKeys = Object.keys(
    normalizedRow
  );

  for (const alias of aliases) {
    const normalizedAlias =
      normalizeText(alias);

    if (!normalizedAlias) {
      continue;
    }

    const fuzzyKey = availableKeys.find(
      (key) => {
        return (
          key.includes(normalizedAlias) ||
          normalizedAlias.includes(key)
        );
      }
    );

    if (fuzzyKey) {
      return normalizedRow[fuzzyKey];
    }
  }

  return null;
}

/* =========================================================
 * HEADER ROW DETECTION
 *
 * TikTok Seller Center có thể có:
 *
 * Row 0: product_id
 * Row 1: metric
 * Row 2: hướng dẫn
 * Row 3: hướng dẫn
 * Row 4+: header thật
 *
 * Parser sẽ quét tối đa 10 dòng đầu.
 * ========================================================= */

const HEADER_DETECTION_GROUPS = {
  sku: [
    "seller_sku",
    "sku_id",
    "id sku",
    "mã sku người bán",
    "ma sku nguoi ban",
    "product_name",
    "tên sản phẩm",
    "ten san pham",
    "quantity",
    "số lượng",
    "so luong",
    "tồn kho",
    "ton kho",
  ],

  settlement: [
    "id đơn hàng/điều chỉnh",
    "id đơn hàng",
    "order id",
    "order_id",
    "loại giao dịch",
    "order status",
    "tổng số tiền quyết toán",
    "settlement amount",
    "tổng doanh thu",
    "tổng phụ sau giảm giá của người bán",
  ],

  order: [
    "order id",
    "order_id",
    "id đơn hàng",
    "mã đơn hàng",
    "seller sku",
    "sku",
    "product name",
    "quantity",
    "order status",
  ],
};

function rowContainsHeaderAlias(
  row,
  aliases
) {
  if (!Array.isArray(row)) {
    return false;
  }

  const normalizedCells = row.map(
    normalizeText
  );

  const normalizedAliases = aliases.map(
    normalizeText
  );

  return normalizedAliases.some(
    (alias) =>
      normalizedCells.includes(alias)
  );
}

function scoreHeaderRow(row) {
  if (!Array.isArray(row)) {
    return {
      score: 0,
      type: null,
    };
  }

  const normalizedCells = row.map(
    normalizeText
  );

  const scoreGroup = (aliases) =>
    aliases.reduce((score, alias) => {
      const normalizedAlias =
        normalizeText(alias);

      if (
        normalizedCells.includes(
          normalizedAlias
        )
      ) {
        return score + 1;
      }

      const fuzzyMatch =
        normalizedCells.some((cell) => {
          if (!cell) {
            return false;
          }

          return (
            cell.includes(
              normalizedAlias
            ) ||
            normalizedAlias.includes(cell)
          );
        });

      return fuzzyMatch
        ? score + 0.5
        : score;
    }, 0);

  const skuScore = scoreGroup(
    HEADER_DETECTION_GROUPS.sku
  );

  const settlementScore = scoreGroup(
    HEADER_DETECTION_GROUPS.settlement
  );

  const orderScore = scoreGroup(
    HEADER_DETECTION_GROUPS.order
  );

  if (
    settlementScore >= skuScore &&
    settlementScore >= orderScore &&
    settlementScore >= 1
  ) {
    return {
      score: settlementScore,
      type: "settlement",
    };
  }

  if (
    skuScore >= orderScore &&
    skuScore >= 1
  ) {
    return {
      score: skuScore,
      type: "sku",
    };
  }

  if (orderScore >= 1) {
    return {
      score: orderScore,
      type: "orders",
    };
  }

  return {
    score: 0,
    type: null,
  };
}

function findHeaderRowIndex(
  rawRows,
  maxRows = 10
) {
  if (!Array.isArray(rawRows)) {
    return {
      index: -1,
      type: null,
      score: 0,
    };
  }

  const limit = Math.min(
    maxRows,
    rawRows.length
  );

  let best = {
    index: -1,
    type: null,
    score: 0,
  };

  for (
    let index = 0;
    index < limit;
    index += 1
  ) {
    const result = scoreHeaderRow(
      rawRows[index]
    );

    if (result.score > best.score) {
      best = {
        index,
        ...result,
      };
    }
  }

  return best;
}

function rawRowsToObjects(
  rawRows,
  headerIndex
) {
  if (
    !Array.isArray(rawRows) ||
    headerIndex < 0 ||
    headerIndex >= rawRows.length
  ) {
    return [];
  }

  const headerRow =
    rawRows[headerIndex];

  if (!Array.isArray(headerRow)) {
    return [];
  }

  const headers = headerRow.map(
    (header, index) => {
      const cleaned =
        cleanString(header);

      return (
        cleaned ||
        `__EMPTY_${index}`
      );
    }
  );

  const rows = [];

  for (
    let rowIndex =
      headerIndex + 1;
    rowIndex < rawRows.length;
    rowIndex += 1
  ) {
    const rawRow =
      rawRows[rowIndex];

    if (!Array.isArray(rawRow)) {
      continue;
    }

    const hasValue =
      rawRow.some(
        (value) =>
          cleanString(value) !== ""
      );

    if (!hasValue) {
      continue;
    }

    const object = {};

    headers.forEach(
      (header, columnIndex) => {
        object[header] =
          rawRow[columnIndex] ??
          "";
      }
    );

    rows.push(object);
  }

  return rows;
}

function convertWorksheetToDetectedRows(
  worksheet
) {
  const rawRows =
    XLSX.utils.sheet_to_json(
      worksheet,
      {
        header: 1,
        defval: "",
        raw: true,
      }
    );

  const headerInfo =
    findHeaderRowIndex(
      rawRows,
      10
    );

  if (headerInfo.index === -1) {
    return {
      rows: [],
      rawRows,
      headerIndex: -1,
      headerType: null,
      headerScore: 0,
    };
  }

  const rows =
    rawRowsToObjects(
      rawRows,
      headerInfo.index
    );

  return {
    rows,
    rawRows,
    headerIndex:
      headerInfo.index,
    headerType:
      headerInfo.type,
    headerScore:
      headerInfo.score,
  };
}

/* =========================================================
 * XLSX INPUT
 * ========================================================= */

export async function readExcelFile(file) {
  if (!file) {
    throw new Error(
      "Không tìm thấy file Excel/CSV."
    );
  }

  let arrayBuffer;

  if (file instanceof ArrayBuffer) {
    arrayBuffer = file;
  } else if (
    typeof ArrayBuffer !==
      "undefined" &&
    ArrayBuffer.isView(file)
  ) {
    arrayBuffer = file.buffer;
  } else if (
    typeof file.arrayBuffer ===
    "function"
  ) {
    arrayBuffer =
      await file.arrayBuffer();
  } else {
    throw new Error(
      "File không hỗ trợ đọc bằng SheetJS."
    );
  }

  const workbook = XLSX.read(
    arrayBuffer,
    {
      type: "array",
      cellDates: true,
      raw: true,
    }
  );

  return workbook;
}

/* =========================================================
 * SHEET -> ROWS
 *
 * QUAN TRỌNG:
 * Không còn mặc định row 0 là header.
 *
 * Parser quét 10 dòng đầu để tìm:
 *
 * - seller_sku
 * - sku_id
 * - id đơn hàng/điều chỉnh
 * - loại giao dịch
 * - tổng số tiền quyết toán
 * ========================================================= */

export function sheetToRows(
  workbook,
  sheetName = null
) {
  if (
    !workbook ||
    !Array.isArray(
      workbook.SheetNames
    ) ||
    workbook.SheetNames.length === 0
  ) {
    return [];
  }

  const selectedSheetName =
    sheetName ||
    workbook.SheetNames[0];

  const worksheet =
    workbook.Sheets[
      selectedSheetName
    ];

  if (!worksheet) {
    return [];
  }

  const detected =
    convertWorksheetToDetectedRows(
      worksheet
    );

  return detected.rows;
}

/* =========================================================
 * READ ALL SHEETS
 *
 * Mỗi sheet đều được scan header độc lập.
 * ========================================================= */

export function workbookToRows(
  workbook
) {
  if (
    !workbook ||
    !Array.isArray(
      workbook.SheetNames
    )
  ) {
    return [];
  }

  return workbook.SheetNames.flatMap(
    (sheetName) => {
      const worksheet =
        workbook.Sheets[
          sheetName
        ];

      if (!worksheet) {
        return [];
      }

      const detected =
        convertWorksheetToDetectedRows(
          worksheet
        );

      return detected.rows;
    }
  );
}

/* =========================================================
 * ORDER ID
 * ========================================================= */

const ORDER_ID_ALIASES = [
  "ID đơn hàng/điều chỉnh",
  "ID đơn hàng",
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
];

function getOrderId(row) {
  return cleanString(
    findColumn(
      row,
      ORDER_ID_ALIASES
    )
  );
}

/* =========================================================
 * ORDER STATUS / TRANSACTION TYPE
 * ========================================================= */

const STATUS_ALIASES = [
  "Loại giao dịch",
  "Order Status",
  "Order status",
  "Status",
  "Order State",
  "Order state",
  "Trạng thái đơn hàng",
  "Trang thai don hang",
  "Trạng thái",
  "Trang thai",
  "Transaction Type",
  "Transaction type",
  "交易类型",
];

function getOrderStatus(row) {
  const value = findColumn(
    row,
    STATUS_ALIASES
  );

  return normalizeOrderStatus(
    value
  );
}

/* =========================================================
 * SKU
 * ========================================================= */

const SKU_ALIASES = [
  "seller_sku",
  "seller sku",
  "sku_id",
  "sku id",
  "id sku",
  "mã sku người bán",
  "ma sku nguoi ban",
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
  return cleanString(
    findColumn(
      row,
      SKU_ALIASES
    )
  );
}

/* =========================================================
 * PRODUCT NAME
 * ========================================================= */

const PRODUCT_NAME_ALIASES = [
  "product_name",
  "Product Name",
  "Product name",
  "Item Name",
  "Item name",
  "Product",
  "tên sản phẩm",
  "ten san pham",
  "Tên hàng",
  "Ten hang",
  "商品名称",
];

function getProductName(row) {
  return cleanString(
    findColumn(
      row,
      PRODUCT_NAME_ALIASES
    )
  );
}

/* =========================================================
 * QUANTITY
 * ========================================================= */

const QUANTITY_ALIASES = [
  "quantity",
  "Quantity",
  "Qty",
  "Item Quantity",
  "Order Quantity",
  "số lượng",
  "so luong",
  "tồn kho",
  "ton kho",
  "Available Qty",
  "Available Quantity",
  "库存",
  "จำนวน",
];

function getQuantity(row) {
  const quantity = toNumber(
    findColumn(
      row,
      QUANTITY_ALIASES
    ),
    1
  );

  return quantity > 0
    ? quantity
    : 1;
}

/* =========================================================
 * AVAILABLE INVENTORY
 * ========================================================= */

const AVAILABLE_QTY_ALIASES = [
  "AvailableQty",
  "Available Qty",
  "Available Quantity",
  "quantity",
  "số lượng",
  "so luong",
  "tồn kho",
  "ton kho",
  "Stock",
  "Inventory",
  "库存",
];

function getAvailableQty(row) {
  return Math.max(
    0,
    toNumber(
      findColumn(
        row,
        AVAILABLE_QTY_ALIASES
      )
    )
  );
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
    findColumn(
      row,
      UNIT_PRICE_ALIASES
    )
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
  "Tổng doanh thu",
  "Tong doanh thu",
];

/* =========================================================
 * TIKTOK SETTLEMENT REVENUE
 * ========================================================= */

const TIKTOK_REVENUE_ALIASES = [
  "Tổng doanh thu",
  "Tong doanh thu",
  "Tổng phụ sau giảm giá của người bán",
  "Tong phu sau giam gia cua nguoi ban",
  "Seller Subtotal After Discount",
  "Seller Subtotal after Discount",
];

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
    toNumber(
      findColumn(
        row,
        DISCOUNT_ALIASES
      )
    )
  );
}

function getGrossAmount(row) {
  return toNumber(
    findColumn(
      row,
      GROSS_AMOUNT_ALIASES
    )
  );
}

function getTikTokRevenue(row) {
  return toNumber(
    findColumn(
      row,
      TIKTOK_REVENUE_ALIASES
    )
  );
}

/* =========================================================
 * SETTLEMENT AMOUNT
 * ========================================================= */

const SETTLEMENT_ALIASES = [
  "Tổng số tiền quyết toán",
  "Tong so tien quyet toan",
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
  "Settlement Date",
  "Settlement date",
  "Ngày quyết toán",
  "Ngay quyet toan",
];

/* =========================================================
 * ORDER ITEM NORMALIZATION
 * ========================================================= */

function normalizeOrderItem(
  row,
  platform
) {
  const orderId =
    getOrderId(row);

  const quantity =
    getQuantity(row);

  const unitPrice =
    getUnitPrice(row);

  const grossAmountFromFile =
    getGrossAmount(row);

  const grossAmount =
    grossAmountFromFile ||
    unitPrice * quantity;

  const discountAmount =
    getDiscountAmount(row);

  const netItemAmount =
    grossAmount -
    discountAmount;

  const orderItemId =
    cleanString(
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
    productName:
      getProductName(row),
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
  platform = getTikTokPlatform()
) {
  if (!Array.isArray(rows)) {
    return [];
  }

  const normalizedPlatform =
    normalizePlatform(platform);

  const orderMap = new Map();

  rows.forEach((row) => {
    const orderId =
      getOrderId(row);

    if (!orderId) {
      return;
    }

    const orderStatus =
      getOrderStatus(row);

    const dateValue =
      findColumn(
        row,
        DATE_ALIASES
      );

    const item =
      normalizeOrderItem(
        row,
        normalizedPlatform
      );

    const settlementAmount =
      toNumber(
        findColumn(
          row,
          SETTLEMENT_ALIASES
        )
      );

    const tiktokRevenue =
      getTikTokRevenue(row);

    const key = `${normalizedPlatform}_${orderId}`;

    if (!orderMap.has(key)) {
      orderMap.set(
        key,
        createOrder({
          platform:
            normalizedPlatform,

          orderId,

          orderStatus,

          orderDate:
            normalizeDate(
              dateValue
            ),

          settlementAmount:
            settlementAmount ||
            tiktokRevenue,

          items: [item],
        })
      );

      return;
    }

    const existingOrder =
      orderMap.get(key);

    const existingItemIndex =
      existingOrder.items.findIndex(
        (existingItem) => {
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
            item.sku ===
              existingItem.sku &&
            item.productName ===
              existingItem.productName
          );
        }
      );

    if (
      existingItemIndex === -1
    ) {
      existingOrder.items.push(
        item
      );
    } else {
      const existingItem =
        existingOrder.items[
          existingItemIndex
        ];

      existingItem.quantity +=
        item.quantity;

      existingItem.grossAmount +=
        item.grossAmount;

      existingItem.discountAmount +=
        item.discountAmount;

      existingItem.netItemAmount +=
        item.netItemAmount;
    }

    if (
      settlementAmount !== 0 &&
      existingOrder.settlementAmount ===
        0
    ) {
      existingOrder.settlementAmount =
        settlementAmount;
    }

    if (
      tiktokRevenue !== 0 &&
      existingOrder.settlementAmount ===
        0
    ) {
      existingOrder.settlementAmount =
        tiktokRevenue;
    }

    if (
      existingOrder.orderStatus ===
        ORDER_STATUS.DELIVERED &&
      orderStatus !==
        ORDER_STATUS.DELIVERED
    ) {
      existingOrder.orderStatus =
        orderStatus;
    }
  });

  return Array.from(
    orderMap.values()
  );
}

/* =========================================================
 * PLATFORM FEES NORMALIZATION
 * ========================================================= */

const TIKTOK_FEE_ALIASES = {
  commissionFee: [
    "TikTok shop commission",
    "TikTok Shop Commission",
    "Commission",
    "Commission Fee",
    "Platform Commission",
    "Phí hoa hồng",
    "Phi hoa hong",
  ],

  transactionFee: [
    "Transaction fee",
    "Transaction Fee",
    "TikTok transaction fee",
    "Transaction fees",
    "Phí giao dịch",
    "Phi giao dich",
  ],

  serviceFee: [
    "Service Fee",
    "TikTok Shop Service Fee",
    "Platform Service Fee",
    "TikTok Shop service fee",
    "Phí dịch vụ",
    "Phi dich vu",
  ],

  paymentFee: [
    "Payment Fee",
    "Payment fee",
    "Payment Processing Fee",
    "Payment Processing",
    "Phí thanh toán",
    "Phi thanh toan",
  ],

  shippingFee: [
    "Shipping Fee",
    "Shipping fee",
    "Shipping Cost",
    "Logistics Fee",
    "TikTok Shipping Fee",
    "Phí vận chuyển",
    "Phi van chuyen",
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
    "Phí tiếp thị liên kết",
    "Phi tiep thi lien ket",
  ],

  advertisingFee: [
    "Advertising Fee",
    "Ads Fee",
    "TikTok Ads",
    "Marketing Fee",
    "Phí quảng cáo",
    "Phi quang cao",
  ],

  vatWithheld: [
    "VAT withheld by TikTok Shop",
    "VAT Withheld by TikTok Shop",
    "VAT Withheld",
    "VAT withheld",
    "VAT",
  ],

  taxWithheld: [
    "Tax withheld by TikTok Shop",
    "Tax Withheld",
    "Income Tax Withheld",
    "Thuế",
    "Thue",
  ],

  otherFee: [
    "Other Fee",
    "Other Fees",
    "Adjustment",
    "Other Adjustment",
    "Điều chỉnh",
    "Dieu chinh",
  ],
};

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

function normalizePlatformFees(
  row,
  platform
) {
  const normalizedPlatform =
    normalizePlatform(platform);

  const aliases =
    normalizedPlatform ===
    getShopeePlatform()
      ? SHOPEE_FEE_ALIASES
      : TIKTOK_FEE_ALIASES;

  const fees = {};

  Object.entries(
    aliases
  ).forEach(
    ([field, fieldAliases]) => {
      fees[field] = Math.abs(
        toNumber(
          findColumn(
            row,
            fieldAliases
          )
        )
      );
    }
  );

  fees.platform =
    normalizedPlatform;

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

  fees.totalFee =
    totalFee;

  return createPlatformFees(
    fees
  );
}

/* =========================================================
 * SETTLEMENT ROW NORMALIZATION
 * ========================================================= */

export function normalizeSettlementRows(
  rows = [],
  platform = getTikTokPlatform()
) {
  if (!Array.isArray(rows)) {
    return [];
  }

  const normalizedPlatform =
    normalizePlatform(platform);

  const settlementMap =
    new Map();

  rows.forEach((row) => {
    const orderId =
      getOrderId(row);

    if (!orderId) {
      return;
    }

    const key = `${normalizedPlatform}_${orderId}`;

    const settlementAmount =
      toNumber(
        findColumn(
          row,
          SETTLEMENT_ALIASES
        )
      );

    const tiktokRevenue =
      getTikTokRevenue(row);

    const rowFees =
      normalizePlatformFees(
        row,
        normalizedPlatform
      );

    const status =
      getOrderStatus(row);

    if (
      !settlementMap.has(key)
    ) {
      settlementMap.set(
        key,
        {
          platform:
            normalizedPlatform,

          orderId,

          status,

          settlementAmount:
            settlementAmount ||
            tiktokRevenue,

          platformFees:
            rowFees,

          rows: 1,
        }
      );

      return;
    }

    const existing =
      settlementMap.get(key);

    existing.settlementAmount +=
      settlementAmount;

    if (
      tiktokRevenue !== 0
    ) {
      existing.settlementAmount +=
        settlementAmount === 0
          ? tiktokRevenue
          : 0;
    }

    Object.keys(rowFees).forEach(
      (field) => {
        if (
          typeof rowFees[field] ===
          "number"
        ) {
          existing.platformFees[
            field
          ] =
            toNumber(
              existing
                .platformFees[
                field
              ]
            ) +
            rowFees[field];
        }
      }
    );

    existing.rows += 1;

    if (
      existing.status ===
        ORDER_STATUS.DELIVERED &&
      status !==
        ORDER_STATUS.DELIVERED
    ) {
      existing.status =
        status;
    }
  });

  return Array.from(
    settlementMap.values()
  ).map(
    (settlement) => {
      settlement.platformFees.totalFee =
        sum([
          settlement
            .platformFees
            .commissionFee,

          settlement
            .platformFees
            .transactionFee,

          settlement
            .platformFees
            .serviceFee,

          settlement
            .platformFees
            .paymentFee,

          settlement
            .platformFees
            .shippingFee,

          settlement
            .platformFees
            .returnShippingFee,

          settlement
            .platformFees
            .affiliateFee,

          settlement
            .platformFees
            .advertisingFee,

          settlement
            .platformFees
            .vatWithheld,

          settlement
            .platformFees
            .taxWithheld,

          settlement
            .platformFees
            .otherFee,
        ]);

      return settlement;
    }
  );
}

/* =========================================================
 * MERGE ORDERS + SETTLEMENTS
 * ========================================================= */

export function mergeOrdersWithSettlements(
  orders = [],
  settlements = []
) {
  const settlementMap =
    new Map();

  settlements.forEach(
    (settlement) => {
      const key = `${settlement.platform}_${settlement.orderId}`;

      settlementMap.set(
        key,
        settlement
      );
    }
  );

  return orders.map(
    (order) => {
      const key = `${order.platform}_${order.orderId}`;

      const settlement =
        settlementMap.get(key);

      if (!settlement) {
        return {
          ...order,

          platformFees:
            createPlatformFees({
              platform:
                order.platform,
            }),
        };
      }

      return {
        ...order,

        orderStatus:
          settlement.status ||
          order.orderStatus,

        settlementAmount:
          settlement
            .settlementAmount ||
          order.settlementAmount,

        platformFees:
          settlement.platformFees,
      };
    }
  );
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

  const rows =
    options.sheetName
      ? sheetToRows(
          workbook,
          options.sheetName
        )
      : workbookToRows(
          workbook
        );

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

  const rows =
    options.sheetName
      ? sheetToRows(
          workbook,
          options.sheetName
        )
      : workbookToRows(
          workbook
        );

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
    getTikTokPlatform(),
    options
  );
}

export async function parseTikTokSettlement(
  file,
  options = {}
) {
  return parseSettlementFile(
    file,
    getTikTokPlatform(),
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
    getShopeePlatform(),
    options
  );
}

export async function parseShopeeSettlement(
  file,
  options = {}
) {
  return parseSettlementFile(
    file,
    getShopeePlatform(),
    options
  );
}

/* =========================================================
 * SKU BATCH EDIT PARSER
 *
 * Dùng cho:
 *
 * Tiktoksellercenter_batchedit_...
 *
 * Header có thể là:
 *
 * seller_sku
 * sku_id
 * product_name
 * quantity
 *
 * ========================================================= */

export async function parseSkuConfigFile(
  file,
  platform = getTikTokPlatform(),
  options = {}
) {
  const workbook =
    await readExcelFile(file);

  const rows =
    options.sheetName
      ? sheetToRows(
          workbook,
          options.sheetName
        )
      : workbookToRows(
          workbook
        );

  const normalizedPlatform =
    normalizePlatform(platform);

  const records =
    rows
      .filter((row) => {
        return (
          getSKU(row) ||
          getProductName(row)
        );
      })
      .map((row) => {
        const sku =
          getSKU(row);

        const productName =
          getProductName(row);

        const availableQty =
          getAvailableQty(row);

        const cogs = Math.max(
          0,
          toNumber(
            findColumn(row, [
              "COGS",
              "Cost",
              "Unit Cost",
              "Giá vốn",
              "Gia von",
            ])
          )
        );

        return {
          sku,
          sellerSku: sku,

          name:
            productName ||
            sku,

          productName:
            productName ||
            sku,

          cogs,

          availableQty,

          AvailableQty:
            availableQty,

          platform:
            normalizedPlatform,
        };
      })
      .filter(
        (record) =>
          Boolean(record.sku)
      );

  return {
    platform:
      normalizedPlatform,

    records,

    skuConfig:
      records,

    inventory:
      records.reduce(
        (result, record) => {
          result[
            record.sku
          ] =
            record.availableQty;

          return result;
        },
        {}
      ),
  };
}

export async function parseProductSkuFile(
  file,
  platform = getTikTokPlatform(),
  options = {}
) {
  return parseSkuConfigFile(
    file,
    platform,
    options
  );
}

export async function parseSKUFile(
  file,
  platform = getTikTokPlatform(),
  options = {}
) {
  return parseSkuConfigFile(
    file,
    platform,
    options
  );
}

/* =========================================================
 * SKU TEMPLATE DETECTION
 * ========================================================= */

export async function parseTikTokSkuTemplate(
  file,
  options = {}
) {
  return parseSkuConfigFile(
    file,
    getTikTokPlatform(),
    options
  );
}

/* =========================================================
 * PARSE PLATFORM DATA
 * ========================================================= */

export async function parsePlatformFiles({
  platform,
  orderFile,
  settlementFile,
  orderSheetName = null,
  settlementSheetName = null,
}) {
  const normalizedPlatform =
    normalizePlatform(platform);

  if (
    normalizedPlatform !==
      getTikTokPlatform() &&
    normalizedPlatform !==
      getShopeePlatform()
  ) {
    throw new Error(
      `Platform không hợp lệ: ${platform}`
    );
  }

  if (
    !orderFile &&
    !settlementFile
  ) {
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
          normalizedPlatform,
          {
            sheetName:
              orderSheetName,
          }
        )
      : Promise.resolve([]),

    settlementFile
      ? parseSettlementFile(
          settlementFile,
          normalizedPlatform,
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
    platform:
      normalizedPlatform,

    orders,

    settlements,

    mergedOrders,

    statistics: {
      orderCount:
        orders.length,

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
        platform:
          getTikTokPlatform(),

        orderFile:
          tiktok.orderFile,

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
        platform:
          getShopeePlatform(),

        orderFile:
          shopee.orderFile,

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
 * PRIMARY KEY:
 *
 * ${Platform}_${OrderID}
 * ========================================================= */

export function deduplicateOrders(
  orders = []
) {
  const map = new Map();

  orders.forEach((order) => {
    if (
      !order?.platform ||
      !order?.orderId
    ) {
      return;
    }

    const key = `${order.platform}_${order.orderId}`;

    if (!map.has(key)) {
      map.set(key, {
        ...order,

        items:
          Array.isArray(
            order.items
          )
            ? [
                ...order.items,
              ]
            : [],
      });

      return;
    }

    const existing =
      map.get(key);

    const existingItems =
      existing.items || [];

    const incomingItems =
      Array.isArray(
        order.items
      )
        ? order.items
        : [];

    incomingItems.forEach(
      (incomingItem) => {
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

        if (
          duplicateIndex === -1
        ) {
          existingItems.push(
            incomingItem
          );

          return;
        }

        const duplicate =
          existingItems[
            duplicateIndex
          ];

        duplicate.quantity +=
          toNumber(
            incomingItem.quantity
          );

        duplicate.grossAmount +=
          toNumber(
            incomingItem.grossAmount
          );

        duplicate.discountAmount +=
          toNumber(
            incomingItem.discountAmount
          );

        duplicate.netItemAmount +=
          toNumber(
            incomingItem.netItemAmount
          );
      }
    );

    if (
      !existing.settlementAmount &&
      order.settlementAmount
    ) {
      existing.settlementAmount =
        order.settlementAmount;
    }

    if (
      !existing.orderStatus &&
      order.orderStatus
    ) {
      existing.orderStatus =
        order.orderStatus;
    }
  });

  return Array.from(
    map.values()
  );
}

export function deduplicateSettlements(
  settlements = []
) {
  const map = new Map();

  settlements.forEach(
    (settlement) => {
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

      const existing =
        map.get(key);

      existing.settlementAmount +=
        toNumber(
          settlement.settlementAmount
        );

      const incomingFees =
        settlement.platformFees ||
        {};

      const existingFees =
        existing.platformFees ||
        {};

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

      feeFields.forEach(
        (field) => {
          existingFees[field] =
            toNumber(
              existingFees[field]
            ) +
            toNumber(
              incomingFees[field]
            );
        }
      );

      existingFees.totalFee =
        sum([
          existingFees
            .commissionFee,

          existingFees
            .transactionFee,

          existingFees
            .serviceFee,

          existingFees
            .paymentFee,

          existingFees
            .shippingFee,

          existingFees
            .returnShippingFee,

          existingFees
            .affiliateFee,

          existingFees
            .advertisingFee,

          existingFees
            .vatWithheld,

          existingFees
            .taxWithheld,

          existingFees
            .otherFee,

          existingFees
            .returnFee,
        ]);

      existing.platformFees =
        existingFees;
    }
  );

  return Array.from(
    map.values()
  );
}

/* =========================================================
 * AUTO PLATFORM DETECTION
 * ========================================================= */

export function detectPlatformFromRows(
  rows = []
) {
  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    return null;
  }

  const sampleRows =
    rows.slice(0, 20);

  let tiktokScore = 0;
  let shopeeScore = 0;

  sampleRows.forEach((row) => {
    const keys = Object.keys(
      row
    )
      .map(normalizeText)
      .join(" ");

    const values = Object.values(
      row
    )
      .map(normalizeText)
      .join(" ");

    const content =
      `${keys} ${values}`;

    if (
      content.includes(
        "tiktok"
      ) ||
      content.includes(
        "tiktokshop"
      )
    ) {
      tiktokScore += 3;
    }

    if (
      content.includes(
        "shopee"
      ) ||
      content.includes(
        "shoppe"
      )
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
          "ID đơn hàng/điều chỉnh"
        )
      )
    ) {
      tiktokScore += 3;
    }

    if (
      keys.includes(
        normalizeText(
          "Tổng số tiền quyết toán"
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

  return tiktokScore >=
    shopeeScore
    ? getTikTokPlatform()
    : getShopeePlatform();
}

/* =========================================================
 * HEADER INFORMATION
 *
 * Dùng để debug file thực tế.
 * ========================================================= */

export async function inspectExcelStructure(
  file
) {
  const workbook =
    await readExcelFile(file);

  return workbook.SheetNames.map(
    (sheetName) => {
      const worksheet =
        workbook.Sheets[
          sheetName
        ];

      const detected =
        convertWorksheetToDetectedRows(
          worksheet
        );

      return {
        sheetName,

        headerIndex:
          detected.headerIndex,

        headerType:
          detected.headerType,

        headerScore:
          detected.headerScore,

        rows:
          detected.rows,

        rawRows:
          detected.rawRows,
      };
    }
  );
}

/* =========================================================
 * RAW ROW PARSER
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

  return workbookToRows(
    workbook
  );
}

/* =========================================================
 * SMART PARSER
 *
 * parseExcelFile CONTRACT
 *
 * {
 *   platform,
 *   type:
 *     "orders"
 *     | "settlement"
 *     | "sku",
 *   sheetName
 * }
 * ========================================================= */

export async function parseExcelFile(
  file,
  options = {}
) {
  const workbook =
    await readExcelFile(file);

  const selectedSheets =
    options.sheetName
      ? [
          options.sheetName,
        ]
      : workbook.SheetNames;

  const sheetResults =
    selectedSheets.map(
      (sheetName) => {
        const worksheet =
          workbook.Sheets[
            sheetName
          ];

        if (!worksheet) {
          return {
            rows: [],
            rawRows: [],
            headerIndex: -1,
            headerType: null,
            headerScore: 0,
          };
        }

        return convertWorksheetToDetectedRows(
          worksheet
        );
      }
    );

  const rows =
    sheetResults.flatMap(
      (result) =>
        result.rows
    );

  const detectedType =
    sheetResults.find(
      (result) =>
        result.headerType
    )?.headerType ||
    null;

  const platform =
    options.platform ||
    detectPlatformFromRows(
      rows
    );

  if (
    !platform &&
    detectedType !== "sku"
  ) {
    throw new Error(
      "Không thể tự xác định sàn. Vui lòng truyền options.platform."
    );
  }

  const type =
    options.type ||
    (
      detectedType === "settlement"
        ? "settlement"
        : detectedType === "sku"
          ? "sku"
          : "orders"
    );

  if (type === "settlement") {
    const settlementPlatform =
      platform ||
      getTikTokPlatform();

    const data =
      normalizeSettlementRows(
        rows,
        settlementPlatform
      );

    return {
      platform:
        settlementPlatform,

      type,

      rows,

      data,

      settlements:
        data,
    };
  }

  if (type === "sku") {
    const skuPlatform =
      platform ||
      getTikTokPlatform();

    const records =
      rows
        .filter(
          (row) =>
            getSKU(row)
        )
        .map(
          (row) => ({
            sku: getSKU(row),

            sellerSku:
              getSKU(row),

            name:
              getProductName(
                row
              ) ||
              getSKU(row),

            productName:
              getProductName(
                row
              ) ||
              getSKU(row),

            cogs: Math.max(
              0,
              toNumber(
                findColumn(
                  row,
                  [
                    "COGS",
                    "Cost",
                    "Unit Cost",
                    "Giá vốn",
                    "Gia von",
                  ]
                )
              )
            ),

            availableQty:
              getAvailableQty(
                row
              ),

            AvailableQty:
              getAvailableQty(
                row
              ),

            platform:
              skuPlatform,
          })
        );

    return {
      platform:
        skuPlatform,

      type,

      rows,

      data: records,

      records,

      skuConfig:
        records,

      inventory:
        records.reduce(
          (result, record) => {
            result[
              record.sku
            ] =
              record.availableQty;

            return result;
          },
          {}
        ),
    };
  }

  const orderPlatform =
    platform ||
    getTikTokPlatform();

  const data =
    normalizeOrderRows(
      rows,
      orderPlatform
    );

  return {
    platform:
      orderPlatform,

    type: "orders",

    rows,

    data,

    orders: data,
  };
}

/* =========================================================
 * VALIDATION
 * ========================================================= */

export function validateParsedOrders(
  orders = []
) {
  const errors = [];

  if (
    !Array.isArray(orders)
  ) {
    return [
      "Dữ liệu orders không phải array.",
    ];
  }

  orders.forEach(
    (order, index) => {
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

      if (
        !Array.isArray(
          order.items
        )
      ) {
        errors.push(
          `Order #${index + 1}: items không phải array.`
        );
      }
    }
  );

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

  orders.forEach(
    (order) => {
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
        orderStatuses[
          status
        ] += 1;
      }
    }
  );

  const uniqueOrderKeys =
    new Set(
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

  const uniqueSettlementKeys =
    new Set(
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
    totalOrders:
      orders.length,

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
