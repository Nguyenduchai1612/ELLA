import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";

import Sidebar from "./components/Sidebar";
import DateRangeFilter from "./components/DateRangeFilter";
import QuickImportBtn from "./components/QuickImportBtn";
import OverviewPage from "./pages/OverviewPage";
import ProductsPage from "./pages/ProductsPage";
import MarketingPage from "./pages/MarketingPage";
import ImportConfigPage from "./pages/ImportConfigPage";

import * as financialEngine from "./utils/financialEngine";
import * as excelParser from "./utils/excelParser";

const STORAGE_KEY = "ella-accents-profit-center-v4";

const DEFAULT_SETTINGS = {
  packagingFee: 6000,
  monthlyFixedCost: 0,
  feeRates: {
    tiktok: {
      transactionRate: 0,
      commissionRate: 0,
      affiliateRate: 0,
      taxRate: 0,
    },
    shopee: {
      transactionRate: 0,
      commissionRate: 0,
      affiliateRate: 0,
      taxRate: 0,
    },
  },
};

const DEFAULT_STATE = {
  orders: {
    tiktok: [],
    shopee: [],
  },
  skuConfig: {
    tiktok: [],
    shopee: [],
  },
  inventory: {
    tiktok: {},
    shopee: {},
  },
  ads: {
    tiktok: 0,
    shopee: 0,
  },
  adsData: [],
  returns: [],
  settings: DEFAULT_SETTINGS,
  dateRange: {
    startDate: "",
    endDate: "",
    filterType: "all",
  },
  activeTab: "overview",
};

function safeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value ?? "").trim();

  if (!raw) {
    return 0;
  }

  const normalized = raw
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePlatform(platform) {
  const value = String(platform ?? "").toLowerCase();

  if (value.includes("shopee")) {
    return "shopee";
  }

  return "tiktok";
}

function normalizeStatus(status) {
  const value = String(status ?? "")
    .trim()
    .toLowerCase();

  if (
    value.includes("cancel") ||
    value.includes("hủy") ||
    value.includes("huỷ")
  ) {
    return "cancelled";
  }

  if (
    value.includes("return") ||
    value.includes("refund") ||
    value.includes("hoàn") ||
    value.includes("tra hang") ||
    value.includes("trả hàng")
  ) {
    return "returned";
  }

  return "success";
}

function getOrderId(record) {
  return String(
    record?.id ??
      record?.orderId ??
      record?.orderID ??
      record?.order_id ??
      record?.["Order ID"] ??
      ""
  ).trim();
}

function getSellerSku(record) {
  return String(
    record?.sellerSku ??
      record?.sku ??
      record?.SellerSKU ??
      record?.["Seller SKU"] ??
      ""
  ).trim();
}

function getRecordDate(record) {
  return String(
    record?.date ??
      record?.orderDate ??
      record?.createdAt ??
      ""
  ).slice(0, 10);
}

function getSkuCostMap(skuConfig) {
  const map = {
    tiktok: {},
    shopee: {},
  };

  ["tiktok", "shopee"].forEach((platform) => {
    const rows = Array.isArray(skuConfig?.[platform])
      ? skuConfig[platform]
      : [];

    rows.forEach((row) => {
      const sku = String(row?.sku ?? row?.sellerSku ?? "").trim();

      if (!sku) {
        return;
      }

      map[platform][sku.toLowerCase()] = safeNumber(
        row?.cogs ?? row?.cost ?? row?.COGS
      );
    });
  });

  return map;
}

function getInventoryMap(skuConfig) {
  const inventory = {
    tiktok: {},
    shopee: {},
  };

  ["tiktok", "shopee"].forEach((platform) => {
    const rows = Array.isArray(skuConfig?.[platform])
      ? skuConfig[platform]
      : [];

    rows.forEach((row) => {
      const sku = String(row?.sku ?? row?.sellerSku ?? "").trim();

      if (!sku) {
        return;
      }

      const quantity =
        row?.availableQty ??
        row?.AvailableQty ??
        row?.quantity ??
        row?.stock;

      if (quantity !== undefined && quantity !== null && quantity !== "") {
        inventory[platform][sku] = safeNumber(quantity);
      }
    });
  });

  return inventory;
}

function normalizeInitialState(value) {
  if (!value || typeof value !== "object") {
    return DEFAULT_STATE;
  }

  return {
    ...DEFAULT_STATE,
    ...value,
    orders: {
      ...DEFAULT_STATE.orders,
      ...(value.orders || {}),
    },
    skuConfig: {
      ...DEFAULT_STATE.skuConfig,
      ...(value.skuConfig || {}),
    },
    inventory: {
      ...DEFAULT_STATE.inventory,
      ...(value.inventory || {}),
    },
    ads: {
      ...DEFAULT_STATE.ads,
      ...(value.ads || {}),
    },
    settings: {
      ...DEFAULT_SETTINGS,
      ...(value.settings || {}),
      feeRates: {
        ...DEFAULT_SETTINGS.feeRates,
        ...(value.settings?.feeRates || {}),
        tiktok: {
          ...DEFAULT_SETTINGS.feeRates.tiktok,
          ...(value.settings?.feeRates?.tiktok || {}),
        },
        shopee: {
          ...DEFAULT_SETTINGS.feeRates.shopee,
          ...(value.settings?.feeRates?.shopee || {}),
        },
      },
    },
    dateRange: {
      ...DEFAULT_STATE.dateRange,
      ...(value.dateRange || {}),
    },
    activeTab: value.activeTab || "overview",
  };
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return DEFAULT_STATE;
    }

    return normalizeInitialState(JSON.parse(raw));
  } catch {
    return DEFAULT_STATE;
  }
}

function createCogsInfo(order, skuCostMap) {
  const platform = normalizePlatform(order?.platform);
  const items = Array.isArray(order?.items) ? order.items : [];

  if (items.length > 0) {
    return items.map((item) => {
      const sku = getSellerSku(item);
      const quantity = Math.max(
        1,
        safeNumber(item?.quantity) || 1
      );

      const costFromMap =
        skuCostMap[platform][sku.toLowerCase()] ?? 0;

      return {
        sku,
        quantity,
        cogs: safeNumber(item?.cogs ?? item?.cost) || costFromMap,
      };
    });
  }

  const sku = getSellerSku(order);

  return [
    {
      sku,
      quantity: Math.max(1, safeNumber(order?.quantity) || 1),
      cogs:
        safeNumber(order?.cogsTotal) ||
        skuCostMap[platform][sku.toLowerCase()] ||
        0,
    },
  ];
}

function getPlatformFees(record) {
  if (record?.platformFees && typeof record.platformFees === "object") {
    return record.platformFees;
  }

  if (record?.fees && typeof record.fees === "object") {
    return record.fees;
  }

  const knownFeeFields = [
    "tiktokShopCommission",
    "tikTokShopCommission",
    "commission",
    "transactionFee",
    "transaction_fee",
    "affiliateCommission",
    "affiliateFee",
    "vat",
    "vatWithheld",
    "tax",
    "shippingFee",
    "platformFee",
    "feesTotal",
  ];

  const result = {};

  knownFeeFields.forEach((field) => {
    if (record?.[field] !== undefined) {
      result[field] = safeNumber(record[field]);
    }
  });

  return result;
}

function fallbackOrderProfit(order, fees, cogsInfo, packingFee) {
  const status = normalizeStatus(order?.status);

  if (status === "cancelled") {
    return {
      gmv: safeNumber(order?.gmv ?? order?.subtotal),
      nettRevenue: 0,
      feesTotal: 0,
      packagingFee: 0,
      cogsTotal: 0,
      profitBeforeAds: 0,
    };
  }

  const feeTotal = Object.values(fees || {}).reduce(
    (sum, value) => sum + Math.abs(safeNumber(value)),
    0
  );

  const cogsTotal = Array.isArray(cogsInfo)
    ? cogsInfo.reduce(
        (sum, item) =>
          sum +
          safeNumber(item?.cogs) *
            Math.max(1, safeNumber(item?.quantity) || 1),
        0
      )
    : safeNumber(cogsInfo);

  const settlement = safeNumber(
    order?.settlementAmount ??
      order?.nettRevenue ??
      order?.settlement ??
      order?.subtotal ??
      order?.gmv
  );

  if (status === "returned") {
    const loss = Math.abs(feeTotal) + safeNumber(packingFee);

    return {
      gmv: safeNumber(order?.gmv ?? order?.subtotal),
      nettRevenue: 0,
      feesTotal: feeTotal,
      packagingFee: safeNumber(packingFee),
      cogsTotal: 0,
      profitBeforeAds: -loss,
    };
  }

  return {
    gmv: safeNumber(order?.gmv ?? order?.subtotal),
    nettRevenue: settlement,
    feesTotal: feeTotal,
    packagingFee: safeNumber(packingFee),
    cogsTotal,
    profitBeforeAds:
      settlement -
      feeTotal -
      safeNumber(packingFee) -
      cogsTotal,
  };
}

function calculateProfitSafely(
  order,
  fees,
  cogsInfo,
  packingFee
) {
  const calculate =
    financialEngine.calculateOrderProfit;

  if (typeof calculate === "function") {
    try {
      return calculate(
        order,
        fees,
        cogsInfo,
        packingFee
      );
    } catch {
      return fallbackOrderProfit(
        order,
        fees,
        cogsInfo,
        packingFee
      );
    }
  }

  return fallbackOrderProfit(
    order,
    fees,
    cogsInfo,
    packingFee
  );
}

function normalizeProfitShape(order, profit) {
  const gmv = safeNumber(
    profit?.gmv ??
      order?.gmv ??
      order?.subtotal
  );

  const nettRevenue = safeNumber(
    profit?.nettRevenue ??
      profit?.netRevenue ??
      profit?.revenue ??
      order?.settlementAmount ??
      order?.nettRevenue
  );

  const feesTotal = safeNumber(
    profit?.feesTotal ??
      profit?.platformFeesTotal ??
      profit?.totalFees
  );

  const packagingFee = safeNumber(
    profit?.packagingFee
  );

  const cogsTotal = safeNumber(
    profit?.cogsTotal ??
      profit?.cogs
  );

  const profitBeforeAds = safeNumber(
    profit?.profitBeforeAds ??
      profit?.profit ??
      nettRevenue -
        feesTotal -
        packagingFee -
        cogsTotal
  );

  return {
    ...profit,
    gmv,
    nettRevenue,
    feesTotal,
    packagingFee,
    cogsTotal,
    profitBeforeAds,
  };
}

function enrichOrder(record, skuCostMap, settings) {
  const platform = normalizePlatform(record?.platform);
  const status = normalizeStatus(record?.status);
  const id = getOrderId(record);

  const order = {
    ...record,
    id,
    platform,
    status,
    date: getRecordDate(record),
    gmv: safeNumber(
      record?.gmv ??
        record?.subtotal ??
        record?.orderAmount
    ),
    settlementAmount: safeNumber(
      record?.settlementAmount ??
        record?.nettRevenue ??
        record?.settlement ??
        record?.subtotal ??
        record?.gmv
    ),
  };

  const fees = getPlatformFees(record);
  const cogsInfo = createCogsInfo(
    order,
    skuCostMap
  );

  const profit = calculateProfitSafely(
    order,
    fees,
    cogsInfo,
    safeNumber(
      settings?.packagingFee ?? 6000
    )
  );

  return {
    ...order,
    ...normalizeProfitShape(order, profit),
    platformFees: fees,
    cogsInfo,
  };
}

function deduplicateOrders(orders) {
  const map = new Map();

  orders.forEach((order) => {
    const platform = normalizePlatform(order?.platform);
    const id = getOrderId(order);

    if (!id) {
      return;
    }

    const key = `${platform}_${id}`;

    if (!map.has(key)) {
      map.set(key, {
        ...order,
        platform,
        id,
      });
    }
  });

  return [...map.values()];
}

function normalizeParserResult(result, fallbackPlatform) {
  if (!result) {
    return {
      platform: normalizePlatform(fallbackPlatform),
      records: [],
    };
  }

  if (Array.isArray(result)) {
    return {
      platform: normalizePlatform(fallbackPlatform),
      records: result,
    };
  }

  return {
    platform: normalizePlatform(
      result.platform || fallbackPlatform
    ),
    records: Array.isArray(result.records)
      ? result.records
      : Array.isArray(result.orders)
        ? result.orders
        : [],
  };
}

function tryExternalParser(file, parserNames) {
  if (!file) {
    return Promise.resolve(null);
  }

  for (const name of parserNames) {
    const parser = excelParser?.[name];

    if (typeof parser === "function") {
      try {
        return Promise.resolve(parser(file));
      } catch {
        return Promise.resolve(null);
      }
    }
  }

  return Promise.resolve(null);
}

function buildSkuRows(result, platform) {
  const records = Array.isArray(result?.records)
    ? result.records
    : [];

  const map = new Map();

  records.forEach((record) => {
    const sku = String(
      record?.sku ??
        record?.sellerSku ??
        record?.SellerSKU ??
        ""
    ).trim();

    if (!sku) {
      return;
    }

    const key = sku.toLowerCase();

    map.set(key, {
      sku,
      name: String(
        record?.name ??
          record?.productName ??
          record?.ProductName ??
          sku
      ),
      cogs: safeNumber(
        record?.cogs ??
          record?.cost ??
          record?.COGS
      ),
      availableQty:
        record?.availableQty ??
        record?.AvailableQty ??
        record?.quantity ??
        null,
      platform,
    });
  });

  return [...map.values()];
}

function buildInventoryFromSkuRows(rows) {
  const result = {};

  rows.forEach((row) => {
    if (
      row?.availableQty !== null &&
      row?.availableQty !== undefined &&
      row?.availableQty !== ""
    ) {
      result[row.sku] = safeNumber(
        row.availableQty
      );
    }
  });

  return result;
}

function aggregateAdsRecords(records) {
  const totals = {
    tiktok: {
      cost: 0,
      revenue: 0,
    },
    shopee: {
      cost: 0,
      revenue: 0,
    },
  };

  records.forEach((record) => {
    const platform = normalizePlatform(
      record?.platform
    );

    totals[platform].cost += Math.abs(
      safeNumber(
        record?.cost ??
          record?.spend ??
          record?.amountSpent
      )
    );

    totals[platform].revenue += Math.abs(
      safeNumber(
        record?.revenue ??
          record?.attributedRevenue ??
          record?.gmvFromAds
      )
    );
  });

  return totals;
}

function AppHeader({
  activeTab,
  dateRange,
  onDateRangeChange,
  onQuickImport,
}) {
  const titles = {
    overview: "Tổng quan",
    products: "Sản phẩm",
    marketing: "Marketing",
    import: "Import & Config",
  };

  const descriptions = {
    overview:
      "Trung tâm kiểm soát doanh thu và lợi nhuận thực tế.",
    products:
      "Quản lý SKU, tồn kho và giá vốn COGS.",
    marketing:
      "Theo dõi chi phí quảng cáo và hiệu quả Ads.",
    import:
      "Nhập dữ liệu sàn, Ads và cấu hình SKU.",
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-950">
            {titles[activeTab]}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            {descriptions[activeTab]}
          </p>
        </div>

        {activeTab !== "import" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <DateRangeFilter
              value={dateRange}
              onChange={onDateRangeChange}
            />
            <QuickImportBtn
              onClick={onQuickImport}
            />
          </div>
        )}
      </div>
    </header>
  );
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
    setIsHydrated(true);
  }, [state]);

  const skuCostMap = useMemo(
    () => getSkuCostMap(state.skuConfig),
    [state.skuConfig]
  );

  const persistSettings = useCallback(
    (nextSettings) => {
      setState((previous) => ({
        ...previous,
        settings: {
          ...previous.settings,
          ...nextSettings,
          feeRates: {
            ...previous.settings.feeRates,
            ...(nextSettings?.feeRates || {}),
          },
        },
      }));
    },
    []
  );

  const handleDateRangeChange = useCallback(
    (value) => {
      if (!value) {
        return;
      }

      setState((previous) => ({
        ...previous,
        dateRange: {
          ...previous.dateRange,
          ...value,
          startDate:
            value.startDate ??
            value.start ??
            previous.dateRange.startDate,
          endDate:
            value.endDate ??
            value.end ??
            previous.dateRange.endDate,
        },
      }));
    },
    []
  );

  const handleImportOrders = useCallback(
    async (result) => {
      try {
        setError("");

        let normalized = normalizeParserResult(
          result,
          result?.platform
        );

        if (
          (!normalized.records.length ||
            result?.file) &&
          result?.file
        ) {
          const parsed = await tryExternalParser(
            result.file,
            [
              "parseOrdersFile",
              "parseOrderFile",
              "parseTikTokOrders",
              "parseShopeeOrders",
            ]
          );

          if (parsed) {
            normalized =
              normalizeParserResult(
                parsed,
                normalized.platform
              );
          }
        }

        const platform =
          normalized.platform;

        const enriched = normalized.records.map(
          (record) =>
            enrichOrder(
              {
                ...record,
                platform,
              },
              skuCostMap,
              state.settings
            )
        );

        setState((previous) => {
          const existing = [
            ...(previous.orders?.tiktok || []),
            ...(previous.orders?.shopee || []),
          ];

          const merged = deduplicateOrders([
            ...existing,
            ...enriched,
          ]);

          return {
            ...previous,
            orders: {
              tiktok: merged.filter(
                (order) =>
                  order.platform === "tiktok"
              ),
              shopee: merged.filter(
                (order) =>
                  order.platform === "shopee"
              ),
            },
          };
        });
      } catch (importError) {
        setError(
          importError?.message ||
            "Không thể import dữ liệu đơn hàng."
        );
      }
    },
    [skuCostMap, state.settings]
  );

  const handleImportReturns = useCallback(
    async (result) => {
      try {
        setError("");

        let normalized =
          normalizeParserResult(
            result,
            result?.platform
          );

        if (result?.file) {
          const parsed = await tryExternalParser(
            result.file,
            [
              "parseReturnsFile",
              "parseReturnFile",
              "parseRefundFile",
            ]
          );

          if (parsed) {
            normalized =
              normalizeParserResult(
                parsed,
                normalized.platform
              );
          }
        }

        const returnedIds = new Set(
          normalized.records
            .map((record) =>
              getOrderId(record)
            )
            .filter(Boolean)
        );

        if (!returnedIds.size) {
          throw new Error(
            "File hoàn tiền không chứa Order ID hợp lệ."
          );
        }

        setState((previous) => {
          const nextOrders = {
            tiktok: [...(previous.orders?.tiktok || [])],
            shopee: [...(previous.orders?.shopee || [])],
          };

          ["tiktok", "shopee"].forEach(
            (platform) => {
              nextOrders[platform] =
                nextOrders[platform].map(
                  (order) => {
                    if (
                      !returnedIds.has(
                        getOrderId(order)
                      )
                    ) {
                      return order;
                    }

                    const returnedOrder =
                      enrichOrder(
                        {
                          ...order,
                          status: "returned",
                          settlementAmount: 0,
                          nettRevenue: 0,
                        },
                        skuCostMap,
                        previous.settings
                      );

                    return {
                      ...returnedOrder,
                      status: "returned",
                    };
                  }
                );
            }
          );

          return {
            ...previous,
            orders: nextOrders,
            returns: [
              ...(previous.returns || []),
              ...normalized.records,
            ],
          };
        });
      } catch (importError) {
        setError(
          importError?.message ||
            "Không thể import dữ liệu hoàn tiền."
        );
      }
    },
    [skuCostMap]
  );

  const handleImportAds = useCallback(
    async (result) => {
      try {
        setError("");

        let normalized =
          normalizeParserResult(
            result,
            result?.platform
          );

        if (result?.file) {
          const parsed = await tryExternalParser(
            result.file,
            [
              "parseAdsFile",
              "parseAdvertisingFile",
              "parseAdsReport",
            ]
          );

          if (parsed) {
            normalized =
              normalizeParserResult(
                parsed,
                normalized.platform
              );
          }
        }

        const incomingRecords =
          normalized.records.map((record) => ({
            ...record,
            platform: normalizePlatform(
              record?.platform ||
                normalized.platform
            ),
          }));

        const totals =
          aggregateAdsRecords(
            incomingRecords
          );

        setState((previous) => ({
          ...previous,
          ads: {
            tiktok:
              previous.ads.tiktok +
              totals.tiktok.cost,
            shopee:
              previous.ads.shopee +
              totals.shopee.cost,
          },
          adsData: [
            ...(previous.adsData || []),
            ...incomingRecords,
          ],
        }));
      } catch (importError) {
        setError(
          importError?.message ||
            "Không thể import dữ liệu Ads."
        );
      }
    },
    []
  );

  const handleImportSkuConfig = useCallback(
    async (result) => {
      try {
        setError("");

        let normalized =
          normalizeParserResult(
            result,
            result?.platform
          );

        if (result?.file) {
          const parsed = await tryExternalParser(
            result.file,
            [
              "parseSkuConfigFile",
              "parseProductSkuFile",
              "parseSKUFile",
            ]
          );

          if (parsed) {
            normalized =
              normalizeParserResult(
                parsed,
                normalized.platform
              );
          }
        }

        const platform =
          normalized.platform;

        const incomingRows =
          buildSkuRows(
            normalized,
            platform
          );

        setState((previous) => {
          const current =
            Array.isArray(
              previous.skuConfig?.[platform]
            )
              ? previous.skuConfig[platform]
              : [];

          const map = new Map(
            current.map((row) => [
              String(
                row?.sku ??
                  row?.sellerSku ??
                  ""
              ).toLowerCase(),
              row,
            ])
          );

          incomingRows.forEach((row) => {
            const key =
              row.sku.toLowerCase();

            map.set(key, {
              ...(map.get(key) || {}),
              ...row,
            });
          });

          const mergedRows =
            [...map.values()];

          const importedInventory =
            buildInventoryFromSkuRows(
              incomingRows
            );

          return {
            ...previous,
            skuConfig: {
              ...previous.skuConfig,
              [platform]: mergedRows,
            },
            inventory: {
              ...previous.inventory,
              [platform]: {
                ...previous.inventory[platform],
                ...importedInventory,
              },
            },
          };
        });
      } catch (importError) {
        setError(
          importError?.message ||
            "Không thể import cấu hình SKU."
        );
      }
    },
    []
  );

  const handleUpdateSkuCogs = useCallback(
    ({ platform, sku, cogs }) => {
      const normalizedPlatform =
        normalizePlatform(platform);

      const normalizedSku =
        String(sku ?? "").trim();

      if (!normalizedSku) {
        return;
      }

      setState((previous) => {
        const rows = Array.isArray(
          previous.skuConfig?.[
            normalizedPlatform
          ]
        )
          ? previous.skuConfig[
              normalizedPlatform
            ]
          : [];

        const exists = rows.some(
          (row) =>
            String(
              row?.sku ??
                row?.sellerSku ??
                ""
            ).toLowerCase() ===
            normalizedSku.toLowerCase()
        );

        const nextRows = exists
          ? rows.map((row) => {
              const rowSku = String(
                row?.sku ??
                  row?.sellerSku ??
                  ""
              );

              if (
                rowSku.toLowerCase() !==
                normalizedSku.toLowerCase()
              ) {
                return row;
              }

              return {
                ...row,
                cogs: safeNumber(cogs),
              };
            })
          : [
              ...rows,
              {
                sku: normalizedSku,
                name: normalizedSku,
                cogs: safeNumber(cogs),
                availableQty: null,
                platform:
                  normalizedPlatform,
              },
            ];

        return {
          ...previous,
          skuConfig: {
            ...previous.skuConfig,
            [normalizedPlatform]:
              nextRows,
          },
        };
      });
    },
    []
  );

  const handleBulkUpdateSkuCogs =
    useCallback(
      ({ platform, skus, cogs }) => {
        const normalizedPlatform =
          normalizePlatform(platform);

        const selected = new Set(
          (Array.isArray(skus)
            ? skus
            : []
          ).map((sku) =>
            String(sku).trim().toLowerCase()
          )
        );

        if (!selected.size) {
          return;
        }

        setState((previous) => {
          const rows = Array.isArray(
            previous.skuConfig?.[
              normalizedPlatform
            ]
          )
            ? previous.skuConfig[
                normalizedPlatform
              ]
            : [];

          return {
            ...previous,
            skuConfig: {
              ...previous.skuConfig,
              [normalizedPlatform]:
                rows.map((row) => {
                  const sku = String(
                    row?.sku ??
                      row?.sellerSku ??
                      ""
                  )
                    .trim()
                    .toLowerCase();

                  return selected.has(sku)
                    ? {
                        ...row,
                        cogs: safeNumber(cogs),
                      }
                    : row;
                }),
            },
          };
        });
      },
      []
    );

  const handleQuickImport = useCallback(() => {
    setState((previous) => ({
      ...previous,
      activeTab: "import",
    }));
  }, []);

  const handleTabChange = useCallback(
    (tab) => {
      setState((previous) => ({
        ...previous,
        activeTab: tab,
      }));
    },
    []
  );

  const page = useMemo(() => {
    if (state.activeTab === "products") {
      return (
        <ProductsPage
          skuConfig={state.skuConfig}
          orders={state.orders}
          inventory={state.inventory}
          onCogsChange={handleUpdateSkuCogs}
          onBulkCogsChange={
            handleBulkUpdateSkuCogs
          }
        />
      );
    }

    if (state.activeTab === "marketing") {
      return (
        <MarketingPage
          ads={state.ads}
          adsData={state.adsData}
        />
      );
    }

    if (state.activeTab === "import") {
      return (
        <ImportConfigPage
          settings={state.settings}
          onSettingsChange={
            persistSettings
          }
          onImportOrders={
            handleImportOrders
          }
          onImportReturns={
            handleImportReturns
          }
          onImportAds={handleImportAds}
          onImportSkuConfig={
            handleImportSkuConfig
          }
        />
      );
    }

    return (
      <OverviewPage
        orders={state.orders}
        ads={state.ads}
        dateRange={{
          start:
            state.dateRange.startDate,
          end:
            state.dateRange.endDate,
        }}
        settings={state.settings}
        onSettingsChange={
          persistSettings
        }
      />
    );
  }, [
    state.activeTab,
    state.skuConfig,
    state.orders,
    state.inventory,
    state.ads,
    state.adsData,
    state.settings,
    state.dateRange,
    handleUpdateSkuCogs,
    handleBulkUpdateSkuCogs,
    persistSettings,
    handleImportOrders,
    handleImportReturns,
    handleImportAds,
    handleImportSkuConfig,
  ]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle
            size={17}
            className="animate-spin"
          />
          Đang khởi tạo ELLA Accents...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        activeTab={state.activeTab}
        onTabChange={handleTabChange}
      />

      <main className="min-h-screen lg:pl-64">
        <AppHeader
          activeTab={state.activeTab}
          dateRange={state.dateRange}
          onDateRangeChange={
            handleDateRangeChange
          }
          onQuickImport={handleQuickImport}
        />

        <div className="mx-auto w-full max-w-[1800px] px-4 py-5 md:px-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-700">
              <AlertCircle
                size={15}
                className="mt-0.5 shrink-0"
              />
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="ml-auto shrink-0 font-semibold underline"
              >
                Đóng
              </button>
            </div>
          )}

          {page}
        </div>
      </main>
    </div>
  );
}
