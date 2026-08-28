import React, { useRef, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  Package,
  Settings2,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";

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

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

function findHeader(headers, aliases) {
  const normalized = headers.map(normalizeHeader);

  for (const alias of aliases) {
    const index = normalized.indexOf(
      normalizeHeader(alias)
    );

    if (index >= 0) return index;
  }

  return -1;
}

function readSpreadsheet(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(
          event.target.result,
          {
            type: "array",
            cellDates: true,
          }
        );

        const firstSheet =
          workbook.Sheets[
            workbook.SheetNames[0]
          ];

        const rows = XLSX.utils.sheet_to_json(
          firstSheet,
          {
            header: 1,
            defval: "",
            raw: true,
          }
        );

        const headerIndex = rows.findIndex(
          (row) =>
            Array.isArray(row) &&
            row.some(
              (cell) =>
                String(cell).trim().length > 0
            )
        );

        if (headerIndex < 0) {
          resolve({
            headers: [],
            rows: [],
          });
          return;
        }

        resolve({
          headers: rows[headerIndex],
          rows: rows.slice(headerIndex + 1),
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () =>
      reject(
        new Error("Không thể đọc file.")
      );

    reader.readAsArrayBuffer(file);
  });
}

function parseDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed =
      XLSX.SSF.parse_date_code(value);

    if (parsed) {
      return [
        parsed.y,
        String(parsed.m).padStart(2, "0"),
        String(parsed.d).padStart(2, "0"),
      ].join("-");
    }
  }

  const raw = String(value ?? "").trim();

  if (!raw) return "";

  const isoMatch =
    raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);

  if (isoMatch) {
    return [
      isoMatch[1],
      String(isoMatch[2]).padStart(2, "0"),
      String(isoMatch[3]).padStart(2, "0"),
    ].join("-");
  }

  const vnMatch =
    raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);

  if (vnMatch) {
    return [
      vnMatch[3],
      String(vnMatch[2]).padStart(2, "0"),
      String(vnMatch[1]).padStart(2, "0"),
    ].join("-");
  }

  return raw;
}

function classifyFile(headers, fileType) {
  const has = (aliases) =>
    findHeader(headers, aliases) >= 0;

  if (fileType === "orders") {
    const hasOrderId = has([
      "Order ID",
      "OrderID",
      "Mã đơn hàng",
      "Order No",
    ]);

    const hasMoney = has([
      "Subtotal",
      "Order Amount",
      "Settlement Amount",
      "GMV",
      "Doanh thu",
    ]);

    return hasOrderId && hasMoney;
  }

  if (fileType === "returns") {
    return has([
      "Order ID",
      "OrderID",
      "Mã đơn hàng",
      "Return Order ID",
    ]);
  }

  if (fileType === "ads") {
    return has([
      "Cost",
      "Amount Spent",
      "Spend",
      "Chi phí quảng cáo",
      "Ad Spend",
    ]);
  }

  if (fileType === "sku") {
    return has([
      "Seller SKU",
      "SellerSKU",
      "SKU",
      "Mã SKU",
    ]);
  }

  return false;
}

function parseImportedFile(headers, rows, fileType, platform) {
  if (!classifyFile(headers, fileType)) {
    throw new Error(
      "Không nhận diện được cấu trúc cột phù hợp với loại file đã chọn."
    );
  }

  if (fileType === "ads") {
    const costIndex = findHeader(headers, [
      "Cost",
      "Amount Spent",
      "Spend",
      "Chi phí quảng cáo",
      "Ad Spend",
    ]);

    const revenueIndex = findHeader(headers, [
      "Revenue",
      "Attributed Revenue",
      "GMV From Ads",
      "Doanh thu từ quảng cáo",
    ]);

    const dateIndex = findHeader(headers, [
      "Date",
      "Ngày",
      "Report Date",
    ]);

    const campaignIndex = findHeader(headers, [
      "Campaign",
      "Campaign Name",
      "Tên chiến dịch",
    ]);

    const records = rows
      .filter((row) =>
        Array.isArray(row) &&
        row.some(
          (cell) =>
            String(cell).trim().length > 0
        )
      )
      .map((row) => ({
        platform,
        date:
          dateIndex >= 0
            ? parseDateValue(row[dateIndex])
            : "",
        campaign:
          campaignIndex >= 0
            ? String(row[campaignIndex] ?? "")
            : "",
        cost:
          costIndex >= 0
            ? Math.abs(toNumber(row[costIndex]))
            : 0,
        revenue:
          revenueIndex >= 0
            ? Math.abs(toNumber(row[revenueIndex]))
            : 0,
      }));

    return {
      type: fileType,
      platform,
      records,
      totalCost: records.reduce(
        (sum, row) => sum + row.cost,
        0
      ),
      totalRevenue: records.reduce(
        (sum, row) => sum + row.revenue,
        0
      ),
    };
  }

  if (fileType === "sku") {
    const skuIndex = findHeader(headers, [
      "Seller SKU",
      "SellerSKU",
      "SKU",
      "Mã SKU",
    ]);

    const nameIndex = findHeader(headers, [
      "Product Name",
      "Tên sản phẩm",
      "Product",
    ]);

    const cogsIndex = findHeader(headers, [
      "COGS",
      "Cost",
      "Giá vốn",
      "Unit Cost",
    ]);

    const qtyIndex = findHeader(headers, [
      "AvailableQty",
      "Available Qty",
      "Quantity",
      "Tồn kho",
      "Stock",
    ]);

    const records = rows
      .filter((row) =>
        String(row[skuIndex] ?? "").trim()
      )
      .map((row) => ({
        platform,
        sku: String(row[skuIndex]).trim(),
        name:
          nameIndex >= 0
            ? String(row[nameIndex] ?? "").trim()
            : String(row[skuIndex]).trim(),
        cogs:
          cogsIndex >= 0
            ? toNumber(row[cogsIndex])
            : 0,
        availableQty:
          qtyIndex >= 0
            ? toNumber(row[qtyIndex])
            : null,
      }));

    return {
      type: fileType,
      platform,
      records,
    };
  }

  const orderIndex = findHeader(headers, [
    "Order ID",
    "OrderID",
    "Mã đơn hàng",
    "Order No",
  ]);

  const dateIndex = findHeader(headers, [
    "Order Date",
    "Date",
    "Ngày đặt hàng",
    "Ngày",
  ]);

  const skuIndex = findHeader(headers, [
    "Seller SKU",
    "SellerSKU",
    "SKU",
    "Mã SKU",
  ]);

  const subtotalIndex = findHeader(headers, [
    "Subtotal",
    "Item Subtotal",
    "GMV",
    "Doanh thu",
  ]);

  const settlementIndex = findHeader(headers, [
    "Settlement Amount",
    "Order Amount",
    "Net Revenue",
    "Doanh thu thực",
  ]);

  const statusIndex = findHeader(headers, [
    "Order Status",
    "Status",
    "Trạng thái",
  ]);

  const records = rows
    .filter((row) =>
      String(row[orderIndex] ?? "").trim()
    )
    .map((row) => ({
      platform,
      id: String(row[orderIndex]).trim(),
      date:
        dateIndex >= 0
          ? parseDateValue(row[dateIndex])
          : "",
      sellerSku:
        skuIndex >= 0
          ? String(row[skuIndex] ?? "").trim()
          : "",
      subtotal:
        subtotalIndex >= 0
          ? toNumber(row[subtotalIndex])
          : 0,
      settlementAmount:
        settlementIndex >= 0
          ? toNumber(row[settlementIndex])
          : 0,
      status:
        statusIndex >= 0
          ? String(row[statusIndex] ?? "")
          : "success",
    }));

  return {
    type: fileType,
    platform,
    records,
  };
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

function PlatformSelector({ value, onChange }) {
  return (
    <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1">
      {[
        ["tiktok", "TikTok Shop"],
        ["shopee", "Shopee"],
      ].map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${
            value === key
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-500"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function UploadCard({
  title,
  description,
  icon: Icon,
  fileType,
  platform,
  onPlatformChange,
  onImported,
  accent = "slate",
}) {
  const inputRef = useRef(null);
  const [selectedPlatform, setSelectedPlatform] = useState(platform);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function processFile(file) {
    if (!file) return;

    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setStatus({
        type: "error",
        message:
          "Chỉ hỗ trợ file XLSX, XLS hoặc CSV.",
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const { headers, rows } =
        await readSpreadsheet(file);

      const result = parseImportedFile(
        headers,
        rows,
        fileType,
        selectedPlatform
      );

      if (typeof onImported === "function") {
        await onImported({
          file,
          ...result,
        });
      }

      const detail =
        fileType === "ads"
          ? `Đã đọc ${result.records.length} dòng Ads, chi phí ${formatVND(result.totalCost)}.`
          : `Đã đọc ${result.records.length} dòng dữ liệu.`;

      setStatus({
        type: "success",
        message: `${file.name}: ${detail}`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.message ||
          "Không thể xử lý file.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleInput(event) {
    processFile(event.target.files?.[0]);
    event.target.value = "";
  }

  const accentClass =
    accent === "pink"
      ? dragOver
        ? "border-pink-500 bg-pink-50"
        : "hover:border-pink-300"
      : dragOver
        ? "border-slate-900 bg-slate-50"
        : "hover:border-slate-400";

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            accent === "pink"
              ? "bg-pink-50 text-pink-600"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">
            {title}
          </h3>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <PlatformSelector
          value={selectedPlatform}
          onChange={(nextPlatform) => {
            setSelectedPlatform(nextPlatform);
            if (typeof onPlatformChange === "function") {
              onPlatformChange(nextPlatform);
            }
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          processFile(event.dataTransfer.files?.[0]);
        }}
        disabled={loading}
        className={`mt-3 flex min-h-[150px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 text-center transition ${accentClass} disabled:cursor-wait disabled:opacity-60`}
      >
        <Upload
          size={22}
          className="mb-2 text-slate-400"
        />

        <div className="text-xs font-medium text-slate-600">
          {loading
            ? "Đang đọc dữ liệu..."
            : "Kéo thả file vào đây hoặc chọn file"}
        </div>

        <div className="mt-1 text-[10px] text-slate-400">
          Hỗ trợ .xlsx · .xls · .csv
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleInput}
      />

      {status && (
        <div
          className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs leading-5 ${
            status.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2
              size={14}
              className="mt-0.5 shrink-0"
            />
          ) : (
            <AlertCircle
              size={14}
              className="mt-0.5 shrink-0"
            />
          )}
          <span>{status.message}</span>
        </div>
      )}
    </Card>
  );
}

function FixedConfig({
  settings,
  onSettingsChange,
}) {
  const packagingFee =
    settings?.packagingFee ?? 6000;

  const monthlyFixedCost =
    settings?.monthlyFixedCost ?? 0;

  function update(field, value) {
    if (typeof onSettingsChange !== "function") {
      return;
    }

    onSettingsChange({
      ...(settings || {}),
      [field]: value === "" ? 0 : toNumber(value),
    });
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Settings2 size={17} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            Config Cố Định
          </h3>
          <p className="mt-1 text-[11px] text-slate-400">
            Các khoản chi phí nền được sử dụng trong Financial Engine.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">
            Phí đóng gói
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={packagingFee}
              onChange={(event) =>
                update(
                  "packagingFee",
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-50"
            />
            <span className="shrink-0 text-[11px] text-slate-400">
              đ / đơn
            </span>
          </div>
          <span className="mt-1.5 block text-[10px] text-slate-400">
            Mặc định: 6.000đ/đơn
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500">
            Chi phí vận hành cố định hàng tháng
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={monthlyFixedCost}
              onChange={(event) =>
                update(
                  "monthlyFixedCost",
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-50"
            />
            <span className="shrink-0 text-[11px] text-slate-400">
              đ / tháng
            </span>
          </div>
          <span className="mt-1.5 block text-[10px] text-slate-400">
            Mặc định: 0đ
          </span>
        </label>
      </div>
    </Card>
  );
}

function ImportSummary({ imports }) {
  if (!imports.length) return null;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-950">
          Lịch sử import trong phiên
        </h3>
      </div>

      <div className="divide-y divide-slate-100">
        {imports.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 px-4 py-3"
          >
            <CheckCircle2
              size={15}
              className="mt-0.5 shrink-0 text-emerald-500"
            />
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-700">
                {item.fileName}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-400">
                {item.typeLabel} · {item.platform}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ImportConfigPage({
  settings = {
    packagingFee: 6000,
    monthlyFixedCost: 0,
  },
  onSettingsChange,
  onImportOrders,
  onImportReturns,
  onImportAds,
  onImportSkuConfig,
}) {
  const [imports, setImports] = useState([]);

  function registerImport(type, result) {
    setImports((previous) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        fileName: result.file.name,
        typeLabel: type,
        platform:
          result.platform === "tiktok"
            ? "TikTok Shop"
            : "Shopee",
      },
      ...previous,
    ].slice(0, 20));
  }

  async function handleOrders(result) {
    registerImport(
      "Đơn hàng & Quyết toán",
      result
    );

    if (typeof onImportOrders === "function") {
      await onImportOrders(result);
    }
  }

  async function handleReturns(result) {
    registerImport(
      "Đơn trả hàng / Hoàn tiền",
      result
    );

    if (typeof onImportReturns === "function") {
      await onImportReturns(result);
    }
  }

  async function handleAds(result) {
    registerImport(
      "Báo cáo Quảng cáo",
      result
    );

    if (typeof onImportAds === "function") {
      await onImportAds(result);
    }
  }

  async function handleSku(result) {
    registerImport(
      "Config SKU & Giá vốn",
      result
    );

    if (
      typeof onImportSkuConfig ===
      "function"
    ) {
      await onImportSkuConfig(result);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-semibold text-slate-950">
          Import & Config
        </div>
        <div className="mt-1 text-[11px] text-slate-400">
          Nhập dữ liệu XLSX/CSV và quản lý các cấu hình nền của hệ thống.
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <UploadCard
          title="Đơn hàng & Quyết toán"
          description="File đơn hàng, settlement hoặc statement của TikTok/Shopee."
          icon={FileSpreadsheet}
          fileType="orders"
          platform="tiktok"
          onPlatformChange={() => {}}
          onImported={handleOrders}
          accent="slate"
        />

        <UploadCard
          title="Đơn Trả hàng / Hoàn tiền"
          description="Dùng Order ID để đối chiếu và cập nhật trạng thái hoàn/trả."
          icon={Package}
          fileType="returns"
          platform="tiktok"
          onPlatformChange={() => {}}
          onImported={handleReturns}
          accent="slate"
        />

        <UploadCard
          title="Báo cáo Quảng cáo (Ads)"
          description="Đọc Cost/Spend và doanh thu được quy cho quảng cáo nếu file có trường tương ứng."
          icon={BarChart3}
          fileType="ads"
          platform="tiktok"
          onPlatformChange={() => {}}
          onImported={handleAds}
          accent="pink"
        />

        <UploadCard
          title="Config SKU & Giá vốn"
          description="Import Seller SKU, tên sản phẩm, COGS và AvailableQty nếu file có."
          icon={Package}
          fileType="sku"
          platform="tiktok"
          onPlatformChange={() => {}}
          onImported={handleSku}
          accent="slate"
        />
      </div>

      <FixedConfig
        settings={settings}
        onSettingsChange={onSettingsChange}
      />

      <ImportSummary imports={imports} />
    </div>
  );
}

