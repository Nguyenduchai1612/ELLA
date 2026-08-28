import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Package,
  Search,
  ShoppingBag,
  Store,
} from "lucide-react";

const PLATFORMS = ["tiktok", "shopee"];

const numberFormatter = new Intl.NumberFormat("vi-VN");

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const result = Number(cleaned);
  return Number.isFinite(result) ? result : 0;
}

function formatVND(value) {
  return `${numberFormatter.format(Math.round(toNumber(value)))}đ`;
}

function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function Tabs({ active, onChange }) {
  const tabs = [
    ["analysis", "Phân Tích Sản Phẩm"],
    ["tiktok", "SKU TikTok Shop"],
    ["shopee", "SKU Shopee"],
  ];

  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            active === key
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function normalizeSkuEntry(entry, platform, inventory) {
  const sku = String(entry?.sku ?? entry?.sellerSku ?? "").trim();
  if (!sku) return null;

  const inventoryValue =
    inventory?.[platform]?.[sku] ??
    inventory?.[platform]?.[sku.toLowerCase()] ??
    entry?.availableQty ??
    entry?.AvailableQty ??
    entry?.quantity ??
    null;

  return {
    ...entry,
    sku,
    name: String(
      entry?.name ?? entry?.productName ?? entry?.ProductName ?? sku
    ),
    cogs: toNumber(entry?.cogs ?? entry?.cost ?? entry?.COGS),
    availableQty:
      inventoryValue === null || inventoryValue === undefined
        ? null
        : toNumber(inventoryValue),
    platform,
  };
}

function buildSkuList(skuConfig, platform, inventory) {
  const raw =
    Array.isArray(skuConfig)
      ? skuConfig
      : Array.isArray(skuConfig?.[platform])
        ? skuConfig[platform]
        : [];

  return raw
    .map((entry) => normalizeSkuEntry(entry, platform, inventory))
    .filter(Boolean);
}

function deriveSkuListFromOrders(orders, platform) {
  const source = Array.isArray(orders)
    ? orders
    : orders?.[platform] || [];

  const map = new Map();

  source.forEach((order) => {
    (order.items || []).forEach((item) => {
      const sku = String(
        item?.sellerSku ?? item?.sku ?? ""
      ).trim();

      if (!sku) return;

      if (!map.has(sku.toLowerCase())) {
        map.set(sku.toLowerCase(), {
          sku,
          name: item?.productName || sku,
          cogs: toNumber(item?.cogs),
          availableQty: null,
        });
      }
    });
  });

  return [...map.values()].map((entry) => ({
    ...entry,
    platform,
  }));
}

function EmptyInventoryNotice() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <span>
        Dữ liệu hiện tại chưa chứa trường <b>AvailableQty</b>. Bảng vẫn cho
        phép nhập giá vốn, nhưng cảnh báo tồn kho chỉ kích hoạt khi dữ liệu
        tồn kho thực được truyền vào component.
      </span>
    </div>
  );
}

function BulkCogsTool({
  selectedSkus,
  onSelectAll,
  allSelected,
  bulkValue,
  setBulkValue,
  onApply,
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-950">
            Công cụ nhập giá vốn đồng loạt
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Đã chọn {selectedSkus.length} SKU
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={onSelectAll}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                allSelected
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {allSelected ? "Bỏ chọn tất cả" : "Chọn Tất Cả"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="number"
                min="0"
                value={bulkValue}
                onChange={(event) =>
                  setBulkValue(event.target.value)
                }
                placeholder="Giá vốn VNĐ"
                className="w-40 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-50"
              />
            </div>

            <button
              type="button"
              onClick={onApply}
              disabled={!selectedSkus.length || bulkValue === ""}
              className="flex items-center gap-1.5 rounded-xl bg-pink-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={14} />
              Nhập Nhanh
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SkuTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  allSelected,
  onCostChange,
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  aria-label="Chọn tất cả SKU"
                  className="h-4 w-4 rounded border-slate-300 accent-pink-600"
                />
              </th>
              <th className="px-4 py-3">Mã SKU Người Bán</th>
              <th className="px-4 py-3">Tên Sản Phẩm</th>
              <th className="px-4 py-3 text-right">Số Lượng Tồn Kho</th>
              <th className="px-4 py-3 text-right">Input Nhập Giá Vốn (Cost)</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const isSelected = selected.has(row.sku);

              return (
                <tr
                  key={row.sku}
                  className={`transition ${
                    isSelected ? "bg-pink-50/40" : "hover:bg-slate-50/70"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(row.sku)}
                      className="h-4 w-4 rounded border-slate-300 accent-pink-600"
                    />
                  </td>

                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {row.sku}
                  </td>

                  <td
                    className="max-w-[360px] px-4 py-3 text-slate-500"
                    title={row.name}
                  >
                    <span className="block truncate">{row.name}</span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    {row.availableQty === null
                      ? "—"
                      : row.availableQty.toLocaleString("vi-VN")}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min="0"
                      value={row.cogs}
                      onChange={(event) =>
                        onCostChange(
                          row.sku,
                          event.target.value
                        )
                      }
                      className="w-32 rounded-lg border border-slate-200 px-2.5 py-2 text-right text-xs font-medium outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-50"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!rows.length && (
          <div className="px-6 py-12 text-center text-xs text-slate-400">
            Chưa có SKU phù hợp.
          </div>
        )}
      </div>
    </Card>
  );
}

function Analysis({ rows }) {
  const total = rows.length;
  const missingCost = rows.filter((row) => row.cogs <= 0).length;
  const lowStock = rows.filter(
    (row) => row.availableQty !== null && row.availableQty < 50
  ).length;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="p-4">
        <div className="text-[11px] text-slate-400">Tổng SKU</div>
        <div className="mt-2 text-2xl font-bold text-slate-950">
          {total.toLocaleString("vi-VN")}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-[11px] text-slate-400">
          SKU chưa có giá vốn
        </div>
        <div className="mt-2 text-2xl font-bold text-rose-600">
          {missingCost.toLocaleString("vi-VN")}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-[11px] text-slate-400">
          SKU tồn kho dưới 50
        </div>
        <div className="mt-2 text-2xl font-bold text-amber-600">
          {lowStock.toLocaleString("vi-VN")}
        </div>
      </Card>
    </div>
  );
}

export default function ProductsPage({
  skuConfig = { tiktok: [], shopee: [] },
  orders = { tiktok: [], shopee: [] },
  inventory = {},
  onCogsChange,
  onBulkCogsChange,
}) {
  const [subTab, setSubTab] = useState("analysis");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [bulkValue, setBulkValue] = useState("");

  const currentPlatform =
    subTab === "shopee" ? "shopee" : "tiktok";

  const rows = useMemo(() => {
    const configured = buildSkuList(
      skuConfig,
      currentPlatform,
      inventory
    );

    const fallback =
      configured.length > 0
        ? configured
        : deriveSkuListFromOrders(
            orders,
            currentPlatform
          );

    const query = search.trim().toLowerCase();

    return fallback.filter((row) => {
      if (!query) return true;
      return `${row.sku} ${row.name}`
        .toLowerCase()
        .includes(query);
    });
  }, [skuConfig, orders, inventory, currentPlatform, search]);

  const lowStockRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.availableQty !== null &&
          row.availableQty < 50
      ),
    [rows]
  );

  const allSelected =
    rows.length > 0 &&
    rows.every((row) => selected.has(row.sku));

  function toggleSku(sku) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }

  function toggleAll() {
    setSelected((previous) => {
      const next = new Set(previous);

      if (allSelected) {
        rows.forEach((row) => next.delete(row.sku));
      } else {
        rows.forEach((row) => next.add(row.sku));
      }

      return next;
    });
  }

  function handleCostChange(sku, value) {
    const cost = value === "" ? 0 : toNumber(value);

    if (typeof onCogsChange === "function") {
      onCogsChange({
        platform: currentPlatform,
        sku,
        cogs: cost,
      });
    }
  }

  function handleBulkApply() {
    if (!selected.size || bulkValue === "") return;

    const cogs = toNumber(bulkValue);
    const skus = [...selected];

    if (typeof onBulkCogsChange === "function") {
      onBulkCogsChange({
        platform: currentPlatform,
        skus,
        cogs,
      });
    } else if (typeof onCogsChange === "function") {
      skus.forEach((sku) => {
        onCogsChange({
          platform: currentPlatform,
          sku,
          cogs,
        });
      });
    }

    setBulkValue("");
  }

  return (
    <div className="space-y-5">
      <Tabs active={subTab} onChange={setSubTab} />

      {lowStockRows.length > 0 && (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-rose-700">
                CẢNH BÁO TỒN KHO THẤP
              </div>
              <div className="mt-1 text-xs leading-5 text-rose-600">
                Có{" "}
                <b>{lowStockRows.length}</b>{" "}
                SKU có AvailableQty dưới 50. Hãy kiểm tra kế hoạch nhập hàng.
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lowStockRows.slice(0, 12).map((row) => (
                  <span
                    key={row.sku}
                    className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-rose-700"
                  >
                    {row.sku}: {row.availableQty}
                  </span>
                ))}
                {lowStockRows.length > 12 && (
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] text-rose-500">
                    +{lowStockRows.length - 12} SKU khác
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab !== "analysis" && (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                {currentPlatform === "tiktok" ? (
                  <Store size={16} />
                ) : (
                  <ShoppingBag size={16} />
                )}
                SKU {currentPlatform === "tiktok" ? "TikTok Shop" : "Shopee"}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {rows.length.toLocaleString("vi-VN")} SKU đang hiển thị
              </div>
            </div>

            <div className="relative w-full lg:w-72">
              <Search
                size={14}
                className="absolute left-3 top-3 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm SKU hoặc tên sản phẩm..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-50"
              />
            </div>
          </div>

          {rows.some((row) => row.availableQty === null) && (
            <EmptyInventoryNotice />
          )}

          <BulkCogsTool
            selectedSkus={[...selected]}
            onSelectAll={toggleAll}
            allSelected={allSelected}
            bulkValue={bulkValue}
            setBulkValue={setBulkValue}
            onApply={handleBulkApply}
          />

          <SkuTable
            rows={rows}
            selected={selected}
            onToggle={toggleSku}
            onToggleAll={toggleAll}
            allSelected={allSelected}
            onCostChange={handleCostChange}
          />
        </>
      )}

      {subTab === "analysis" && (
        <>
          <Analysis
            rows={[
              ...buildSkuList(
                skuConfig,
                "tiktok",
                inventory
              ),
              ...buildSkuList(
                skuConfig,
                "shopee",
                inventory
              ),
            ]}
          />

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Package size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Trung tâm quản trị giá vốn
                </h3>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                  Chọn TikTok Shop hoặc Shopee ở hai tab SKU để nhập Cost trực
                  tiếp hoặc áp dụng một mức giá vốn cho nhiều SKU cùng lúc.
                  Cột “Loại” đã được loại bỏ hoàn toàn khỏi bảng theo thiết kế
                  BƯỚC 3.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
