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

/** Order ID / SKU ID thật của TikTok luôn là chuỗi số thuần, độ dài lớn.
 * Dùng để loại các dòng "rác" (nhãn hướng dẫn, dòng "Bắt buộc"/"V4"...)
 * nằm xen giữa header và dữ liệu thật trong các file Seller Center. */
function looksLikeNumericId(value) {
  const s = cleanString(value);
  return /^\d{4,}$/.test(s);
}

/** Các nhãn "rác" thường gặp trong file Batch Edit Template của TikTok Seller
 * Center (dòng phiên bản, dòng bắt buộc/không bắt buộc, dòng không thể chỉnh
 * sửa...). Dùng làm lưới an toàn phụ, bên cạnh kiểm tra ID số ở trên. */
const METADATA_MARKER_VALUES = new Set(
  [
    "v4",
    "metric",
    "bat buoc",
    "khong bat buoc",
    "khong the chinh sua",
    "required",
    "not required",
    "cannot be edited",
  ].map(normalizeText)
);

function isMetadataRow(rowObject) {
  const values = Object.values(rowObject || {}).map(cleanString);
  const nonEmpty = values.filter((v) => v !== "");

  if (!nonEmpty.length) {
    return true;
  }

  const markerHits = nonEmpty.filter((v) =>
    METADATA_MARKER_VALUES.has(normalizeText(v))
  ).length;

  return markerHits > 0 && markerHits >= nonEmpty.length / 2;
}

/**
 * Nhiều giao dịch trong file Quyết toán/Income của TikTok KHÔNG PHẢI là đơn
 * hàng bán (vd: "GMV thanh toán cho Quảng cáo TikTok" — tiền quảng cáo bị trừ,
 * "Rút tiền"...). Nếu để lọt các dòng này vào doanh thu/đơn hàng sẽ làm sai
 * lệch nghiêm trọng số liệu tài chính. Cần loại trừ tường minh.
 */
const NON_ORDER_TRANSACTION_SUBSTRINGS = [
  "quangcao", // "Quảng cáo"
  "advertising",
  "ruttien", // "Rút tiền"
  "withdrawal",
  "adjustment".replace(/[^a-z]/g, ""),
];

function isNonOrderTransactionValue(rawValue) {
  const normalized = normalizeText(rawValue);

  if (!normalized) {
    return false;
  }

  return NON_ORDER_TRANSACTION_SUBSTRINGS.some((needle) =>
    normalized.includes(needle)
  );
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

/** Giống findColumn nhưng phân biệt được "không tìm thấy cột" (null) với
 * "cột có tồn tại nhưng giá trị rỗng" (""), dùng để kiểm tra sự tồn tại của
 * một cột (vd: kiểm tra file Ads có cột Doanh thu hay không). */
function hasColumn(row, aliases = []) {
  return findColumn(row, aliases) !== null;
}

/* =========================================================
 * SHEET RANGE FIX
 *
 * QUAN TRỌNG: nhiều file xuất từ TikTok Seller Center (đặc biệt là Batch Edit
 * Template) khai báo sai vùng dữ liệu "!ref" trong XML — ví dụ khai "A1:AL5"
 * trong khi dữ liệu sản phẩm thật nằm tới hàng thứ hàng trăm. Nếu dùng thẳng
 * XLSX.utils.sheet_to_json, SheetJS sẽ CẮT MẤT toàn bộ dữ liệu thật một cách
 * âm thầm (không báo lỗi). Phải quét lại toàn bộ ô thực tế có trong sheet để
 * tính đúng phạm vi trước khi chuyển sang JSON.
 * ========================================================= */

function fixSheetRange(worksheet) {
  if (!worksheet) {
    return;
  }

  let maxRow = -1;
  let maxCol = -1;

  Object.keys(worksheet).forEach((key) => {
    if (key[0] === "!") {
      return;
    }

    const match = key.match(/^([A-Z]+)(\d+)$/);

    if (!match) {
      return;
    }

    const col = XLSX.utils.decode_col(match[1]);
    const row = parseInt(match[2], 10) - 1;

    if (row > maxRow) maxRow = row;
    if (col > maxCol) maxCol = col;
  });

  if (maxRow < 0) {
    return;
  }

  const declared = worksheet["!ref"]
    ? XLSX.utils.decode_range(worksheet["!ref"])
    : null;

  const endRow = declared ? Math.max(declared.e.r, maxRow) : maxRow;
  const endCol = declared ? Math.max(declared.e.c, maxCol) : maxCol;

  if (!declared || declared.e.r < maxRow || declared.e.c < maxCol) {
    worksheet["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: endRow, c: endCol },
    });
  }
}

/* =========================================================
 * HEADER ROW DETECTION
 *
 * TikTok Seller Center có thể có:
 *
 * Row 0: product_id (header máy đọc thật)
 * Row 1: V4 / metric (dòng phiên bản)
 * Row 2: hướng dẫn tiếng Việt
 * Row 3: Bắt buộc / Không bắt buộc
 * Row 4: mô tả chi tiết từng cột
 * Row 5+: dữ liệu thật
 *
 * Parser sẽ quét tối đa 10 dòng đầu để tìm đúng dòng header, SAU ĐÓ còn phải
 * lọc tiếp các dòng "rác" nằm xen giữa header và dữ liệu thật (xem
 * isMetadataRow / looksLikeNumericId ở trên) vì chúng vẫn có nội dung nên
 * không tự động bị loại chỉ bằng việc tìm đúng header.
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
  // FIX QUAN TRỌNG: vá lại vùng dữ liệu bị khai sai TRƯỚC khi đọc, nếu không
  // các dòng ở cuối sheet (thường là toàn bộ sản phẩm thật) sẽ bị cắt mất.
  fixSheetRange(worksheet);

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

  const rawObjectRows =
    rawRowsToObjects(
      rawRows,
      headerInfo.index
    );

  // Lọc tiếp các dòng "rác" (hướng dẫn, dòng Bắt buộc/Không bắt buộc, dòng
  // phiên bản V4/metric...) nằm xen giữa header và dữ liệu thật — các dòng
  // này có nội dung nên không bị loại chỉ nhờ tìm đúng header ở bước trên.
  const rows = rawObjectRows.filter(
    (row) => !isMetadataRow(row)
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

/**
 * Giống workbookToRows nhưng trả thêm loại header đã nhận diện được
 * ("settlement" | "orders" | "sku" | null) — dùng để tự động phân luồng 1 file
 * "Đơn hàng & Quyết toán" duy nhất tới đúng bộ xử lý (vì trên thực tế, file
 * "Tất cả đơn hàng" (per-SKU) và file "Income/Quyết toán" (per-order, có phí
 * chi tiết) có cấu trúc khác hẳn nhau nhưng cùng được thả vào 1 ô upload).
 */
export function detectWorkbookRows(
  workbook,
  options = {}
) {
  if (
    !workbook ||
    !Array.isArray(workbook.SheetNames)
  ) {
    return { rows: [], headerType: null, headerScore: 0 };
  }

  const selectedSheets = options.sheetName
    ? [options.sheetName]
    : workbook.SheetNames;

  const sheetResults = selectedSheets.map(
    (sheetName) => {
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        return {
          rows: [],
          rawRows: [],
          headerIndex: -1,
          headerType: null,
          headerScore: 0,
        };
      }

      return convertWorksheetToDetectedRows(worksheet);
    }
  );

  const rows = sheetResults.flatMap((result) => result.rows);

  const best = sheetResults.reduce((acc, result) => {
    if (!acc || result.headerScore > acc.headerScore) {
      return result;
    }
    return acc;
  }, null);

  return {
    rows,
    headerType: best?.headerType ?? null,
    headerScore: best?.headerScore ?? 0,
  };
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

/**
 * "Loại giao dịch" trong file Quyết toán/Income của TikTok chỉ phân biệt
 * LOẠI giao dịch (vd: "Đơn hàng", "GMV thanh toán cho Quảng cáo TikTok"),
 * KHÔNG PHẢI trạng thái giao hàng/hủy/hoàn thật. Nếu giá trị chỉ là nhãn loại
 * giao dịch chung chung "Đơn hàng" thì KHÔNG dùng nó để suy ra trạng thái —
 * trả về null để nơi gọi ưu tiên dùng trạng thái thật từ file Đơn hàng gốc
 * (Order Status / Cancelation Type) nếu có, tránh ghi đè sai.
 */
function getSettlementStatus(row) {
  const raw = findColumn(row, STATUS_ALIASES);
  const normalized = normalizeText(raw);

  if (!normalized) {
    return null;
  }

  if (normalized === normalizeText("Đơn hàng")) {
    return null;
  }

  return normalizeOrderStatus(raw);
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

/** Cột ID nội bộ (product_id/sku_id) — CHỈ dùng để kiểm tra 1 dòng có phải là
 * dữ liệu thật hay không (ID nội bộ của TikTok luôn là chuỗi số dài), tách
 * biệt với getSKU() (lấy mã SKU người bán để hiển thị/đối chiếu giá vốn). */
const INTERNAL_ID_ALIASES = [
  "sku_id",
  "sku id",
  "id sku",
  "product_id",
  "id sản phẩm",
  "id san pham",
];

function getInternalId(row) {
  return cleanString(
    findColumn(row, INTERNAL_ID_ALIASES)
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
  "Thời gian tạo đơn hàng",
  "Settlement Date",
  "Settlement date",
  "Ngày quyết toán",
  "Ngay quyet toan",
  "Thời gian quyết toán đơn hàng",
];

/* =========================================================
 * RETURN / REFUND
 * ========================================================= */

const RETURN_STATUS_ALIASES = [
  "Return Status",
  "Return status",
  "Trạng thái hoàn tiền",
  "Trang thai hoan tien",
  "Trạng thái trả hàng",
  "Trang thai tra hang",
  "Trạng thái hoàn hàng",
];

const RETURN_REASON_ALIASES = [
  "Return Reason",
  "Return reason",
  "Lý do hoàn",
  "Ly do hoan",
  "Lý do trả hàng",
  "Ly do tra hang",
];

/* =========================================================
 * ADS
 * ========================================================= */

const ADS_COST_ALIASES = [
  "Cost",
  "Amount Spent",
  "Spend",
  "Total Cost",
  "Chi phí",
  "Chi phí quảng cáo",
  "Ad Spend",
];

const ADS_REVENUE_ALIASES = [
  "Revenue",
  "Attributed Revenue",
  "GMV From Ads",
  "Gross Revenue",
  "Doanh thu từ quảng cáo",
  "Doanh thu",
];

const ADS_CAMPAIGN_ALIASES = [
  "Campaign",
  "Campaign Name",
  "Tên chiến dịch",
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
  platform = getTikTokPlatform(),
  stats = null
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

    const rawStatusValue = findColumn(row, STATUS_ALIASES);

    if (isNonOrderTransactionValue(rawStatusValue)) {
      if (stats) {
        stats.skippedNonOrder = (stats.skippedNonOrder || 0) + 1;
      }
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
    "Phí hoa hồng của TikTok Shop",
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
    "Phí dịch vụ SFP",
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
    "Phí vận chuyển của người bán",
  ],

  returnShippingFee: [
    "Return Shipping Fee",
    "Return shipping fee",
    "Return Logistics Fee",
    "Reverse Shipping Fee",
    "Phí vận chuyển hoàn",
    "Phi van chuyen hoan",
    "Phí vận chuyển trả hàng thực tế",
  ],

  affiliateFee: [
    "Affiliate Commission",
    "Affiliate Fee",
    "Creator Commission",
    "Affiliate commission fee",
    "Phí tiếp thị liên kết",
    "Phi tiep thi lien ket",
    "Hoa hồng liên kết",
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
    "Thuế GTGT do TikTok Shop khấu trừ",
  ],

  taxWithheld: [
    "Tax withheld by TikTok Shop",
    "Tax Withheld",
    "Income Tax Withheld",
    "Thuế",
    "Thue",
    "Thuế TNCN do TikTok Shop khấu trừ",
  ],

  orderProcessingFee: [
    "Order Processing Fee",
    "Order processing fee",
    "Phí xử lý đơn hàng",
    "Phi xu ly don hang",
  ],

  voucherXtraFee: [
    "Voucher Xtra",
    "Voucher Xtra Fee",
    "Phí dịch vụ Voucher Xtra",
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

  orderProcessingFee: [
    "Order Processing Fee",
    "Phí xử lý đơn hàng",
  ],

  voucherXtraFee: [
    "Voucher Xtra",
    "Phí Voucher Xtra",
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

  const totalFee = sum(
    Object.keys(aliases).map((field) => fees[field])
  );

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
  platform = getTikTokPlatform(),
  stats = null
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

    const rawStatusValue = findColumn(row, STATUS_ALIASES);

    if (isNonOrderTransactionValue(rawStatusValue)) {
      if (stats) {
        stats.skippedNonOrder = (stats.skippedNonOrder || 0) + 1;
        stats.nonOrderAmount =
          (stats.nonOrderAmount || 0) +
          toNumber(findColumn(row, SETTLEMENT_ALIASES));
      }
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

    // Chỉ dùng "Loại giao dịch" làm trạng thái khi nó thực sự mang ý nghĩa
    // trạng thái (hủy/hoàn); nhãn chung "Đơn hàng" không được coi là trạng
    // thái để tránh ghi đè nhầm trạng thái thật lấy từ file Đơn hàng gốc.
    const status =
      getSettlementStatus(row);

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

    if (!existing.status && status) {
      existing.status = status;
    }
  });

  return Array.from(
    settlementMap.values()
  ).map(
    (settlement) => {
      const feeFieldNames = Object.keys(
        settlement.platformFees || {}
      ).filter(
        (field) =>
          typeof settlement.platformFees[field] === "number" &&
          field !== "totalFee"
      );

      settlement.platformFees.totalFee =
        sum(
          feeFieldNames.map(
            (field) => settlement.platformFees[field]
          )
        );

      return settlement;
    }
  );
}

/* =========================================================
 * MERGE ORDERS + SETTLEMENTS
 *
 * Trên thực tế, file "Đơn hàng" (per-SKU, có COGS) và file "Quyết toán/Income"
 * (per-order, có phí sàn thật) thường KHÔNG cùng phạm vi thời gian/số lượng
 * đơn — nên hàm này phải xử lý cả 2 chiều:
 *  - Đơn có trong file Đơn hàng nhưng CHƯA có Quyết toán -> giữ nguyên, phí
 *    sàn = 0 (đúng bản chất: chưa có dữ liệu phí thật).
 *  - Đơn CHỈ có trong file Quyết toán (chưa có SKU chi tiết) -> vẫn phải giữ
 *    lại (không được bỏ sót doanh thu/phí thật đã ghi nhận), items để trống
 *    và COGS sẽ = 0 cho tới khi có file Đơn hàng khớp Order ID bổ sung.
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

  const usedSettlementKeys = new Set();

  const mergedFromOrders = orders.map(
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

      usedSettlementKeys.add(key);

      return {
        ...order,

        // Ưu tiên trạng thái THẬT lấy từ file Đơn hàng gốc (Order Status /
        // Cancelation Type) — chỉ dùng trạng thái suy ra từ Quyết toán khi
        // file Đơn hàng không xác định được (xem getSettlementStatus()).
        orderStatus:
          order.orderStatus ||
          settlement.status,

        settlementAmount:
          settlement
            .settlementAmount ||
          order.settlementAmount,

        platformFees:
          settlement.platformFees,
      };
    }
  );

  // Đơn chỉ tồn tại trong file Quyết toán (chưa có dữ liệu SKU tương ứng) —
  // vẫn giữ lại để không mất doanh thu/phí thật đã ghi nhận.
  const settlementOnlyOrders = settlements
    .filter((settlement) => {
      const key = `${settlement.platform}_${settlement.orderId}`;
      return !usedSettlementKeys.has(key);
    })
    .map((settlement) =>
      createOrder({
        platform: settlement.platform,
        orderId: settlement.orderId,
        orderStatus: settlement.status,
        orderDate: "",
        settlementAmount: settlement.settlementAmount,
        items: [],
        platformFees: settlement.platformFees,
        missingSkuData: true,
      })
    );

  return [...mergedFromOrders, ...settlementOnlyOrders];
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
 * RETURNS / REFUND PARSER
 *
 * CHỈ đánh dấu 1 đơn là "Hoàn trả" khi Return Status đã thực sự hoàn tất —
 * các yêu cầu bị từ chối/hủy (Refund rejected, Request Canceled...) KHÔNG
 * được tính là mất doanh thu vì đơn hàng vẫn giữ nguyên trạng thái bán thành
 * công trên thực tế.
 * ========================================================= */

export async function parseReturnsFile(
  file,
  platform = getTikTokPlatform(),
  options = {}
) {
  const workbook = await readExcelFile(file);
  const detected = options.sheetName
    ? { rows: sheetToRows(workbook, options.sheetName) }
    : detectWorkbookRows(workbook);

  const normalizedPlatform = normalizePlatform(platform);
  const rows = detected.rows || [];

  let skippedNotCompleted = 0;
  const records = [];
  const seen = new Set();

  rows.forEach((row) => {
    const orderId = getOrderId(row);

    if (!orderId) {
      return;
    }

    const rawStatus = findColumn(row, RETURN_STATUS_ALIASES);
    const normalizedStatus = normalizeText(rawStatus);

    const isRejectedOrCancelled =
      normalizedStatus.includes("reject") ||
      normalizedStatus.includes("tuchoi") ||
      normalizedStatus.includes("huy") ||
      (normalizedStatus.includes("cancel") &&
        !normalizedStatus.includes("complet"));

    if (isRejectedOrCancelled) {
      skippedNotCompleted += 1;
      return;
    }

    const key = `${normalizedPlatform}_${orderId}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);

    records.push({
      platform: normalizedPlatform,
      orderId,
      reason: cleanString(findColumn(row, RETURN_REASON_ALIASES)),
      rawStatus: cleanString(rawStatus),
    });
  });

  return {
    platform: normalizedPlatform,
    records,
    totalRows: rows.length,
    skippedNotCompleted,
  };
}

/* =========================================================
 * ADS REPORT PARSER
 *
 * File Ads hiện tại (theo cấu trúc phổ biến) thường chỉ có cột Chi phí
 * (Cost/Spend), KHÔNG có cột Doanh thu do quảng cáo mang lại. Hàm này đọc cả
 * hai nếu có, và báo rõ ràng "hasRevenueColumn: false" khi thiếu — để nơi gọi
 * KHÔNG tự bịa số ROAS/CIR khi không có dữ liệu doanh thu thật.
 * ========================================================= */

export async function parseAdsFile(
  file,
  platform = getTikTokPlatform(),
  options = {}
) {
  const workbook = await readExcelFile(file);
  const detected = options.sheetName
    ? { rows: sheetToRows(workbook, options.sheetName) }
    : detectWorkbookRows(workbook);

  const normalizedPlatform = normalizePlatform(platform);
  const rows = detected.rows || [];

  if (!rows.length) {
    return {
      platform: normalizedPlatform,
      records: [],
      totalCost: 0,
      totalRevenue: 0,
      hasRevenueColumn: false,
      warning:
        "Không đọc được dòng dữ liệu nào từ file (không tìm thấy header phù hợp).",
    };
  }

  const hasCostColumn = rows.some((row) =>
    hasColumn(row, ADS_COST_ALIASES)
  );

  if (!hasCostColumn) {
    return {
      platform: normalizedPlatform,
      records: [],
      totalCost: 0,
      totalRevenue: 0,
      hasRevenueColumn: false,
      warning:
        "Không tìm thấy cột Chi phí (Cost/Spend/Chi phí quảng cáo) trong file.",
    };
  }

  const hasRevenueColumn = rows.some((row) =>
    hasColumn(row, ADS_REVENUE_ALIASES)
  );

  const records = rows
    .map((row) => ({
      platform: normalizedPlatform,
      date: normalizeDate(findColumn(row, DATE_ALIASES)),
      campaign: cleanString(findColumn(row, ADS_CAMPAIGN_ALIASES)),
      cost: Math.abs(toNumber(findColumn(row, ADS_COST_ALIASES))),
      revenue: Math.abs(toNumber(findColumn(row, ADS_REVENUE_ALIASES))),
    }))
    .filter((record) => record.cost > 0 || record.revenue > 0);

  return {
    platform: normalizedPlatform,
    records,
    totalCost: records.reduce((total, record) => total + record.cost, 0),
    totalRevenue: records.reduce((total, record) => total + record.revenue, 0),
    hasRevenueColumn,
  };
}

/* =========================================================
 * SKU BATCH EDIT PARSER
 * ========================================================= */

function extractSkuRecords(rows, normalizedPlatform) {
  return rows
    .filter((row) => {
      // Lọc dòng "rác" còn sót lại (hướng dẫn, dòng Bắt buộc/Không bắt buộc)
      // bằng ID nội bộ dạng số — nếu cột ID nội bộ tồn tại mà giá trị không
      // phải chuỗi số thì chắc chắn không phải dữ liệu sản phẩm thật.
      const internalId = getInternalId(row);

      if (internalId) {
        return looksLikeNumericId(internalId);
      }

      return Boolean(getSKU(row) || getProductName(row));
    })
    .map((row) => {
      const sku = getSKU(row);
      const productName = getProductName(row);
      const availableQty = getAvailableQty(row);

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
        name: productName || sku,
        productName: productName || sku,
        cogs,
        availableQty,
        AvailableQty: availableQty,
        platform: normalizedPlatform,
      };
    })
    .filter((record) => Boolean(record.sku));
}

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

  const records = extractSkuRecords(rows, normalizedPlatform);

  return {
    platform:
      normalizedPlatform,

    records,

    skuConfig:
      records,

    totalRowsScanned: rows.length,

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
        "orderProcessingFee",
        "voucherXtraFee",
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
        sum(
          feeFields.map(
            (field) => existingFees[field]
          )
        );

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
 * HEADER INFORMATION (debug)
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
 * ========================================================= */

export async function parseExcelFile(
  file,
  options = {}
) {
  const workbook =
    await readExcelFile(file);

  const detected = detectWorkbookRows(workbook, options);
  const rows = detected.rows;
  const detectedType = detected.headerType;

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

    const stats = { skippedNonOrder: 0, nonOrderAmount: 0 };

    const data =
      normalizeSettlementRows(
        rows,
        settlementPlatform,
        stats
      );

    return {
      platform:
        settlementPlatform,

      type,

      rows,

      data,

      settlements:
        data,

      stats,
    };
  }

  if (type === "sku") {
    const skuPlatform =
      platform ||
      getTikTokPlatform();

    const records = extractSkuRecords(rows, skuPlatform);

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

  const stats = { skippedNonOrder: 0 };

  const data =
    normalizeOrderRows(
      rows,
      orderPlatform,
      stats
    );

  return {
    platform:
      orderPlatform,

    type: "orders",

    rows,

    data,

    orders: data,

    stats,
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
