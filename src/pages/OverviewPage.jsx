import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Check,
  CircleDollarSign,
  Percent,
  Settings2,
  ShoppingBag,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PLATFORM_KEYS = ["tiktok", "shopee"];
const DEFAULT_PACKAGING_FEE = 6000;

const DEFAULT_FEE_RATES = {
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
};

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

function formatPercent(value) {
  return `${toNumber(value).toFixed(1)}%`;
}

function isLossStatus(status) {
  return status === "cancelled" || status === "returned";
}

function isWithinRange(date, start, end) {
  if (!date) return true;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function normalizeOrders(orders) {
  if (Array.isArray(orders)) return orders;
  return [...(orders?.tiktok || []), ...(orders?.shopee || [])];
}

function getOrdersByPlatform(orders, platform) {
  if (Array.isArray(orders)) {
    return orders.filter((order) => order.platform === platform);
  }
  return Array.isArray(orders?.[platform]) ? orders[platform] : [];
}

function computeOrder(order, settings) {
  const status = String(order?.status || "success").toLowerCase();
  const loss = isLossStatus(status);
  const gmv = toNumber(order?.gmv);
  const settlement =
    toNumber(order?.settlementAmount) > 0
      ? toNumber(order.settlementAmount)
      : gmv;

  const feesTotal =
    toNumber(order?.feesTotal) ||
    Object.values(order?.fees || {}).reduce(
      (sum, fee) => sum + Math.abs(toNumber(fee)),
      0
    );

  const cogsTotal =
    toNumber(order?.cogsTotal) ||
    (Array.isArray(order?.items)
      ? order.items.reduce(
          (sum, item) =>
            sum + toNumber(item?.cogs) * Math.max(1, toNumber(item?.quantity) || 1),
          0
        )
      : 0);

  const nettRevenue = loss ? 0 : settlement;
  const packagingFee = toNumber(settings?.packagingFee ?? DEFAULT_PACKAGING_FEE);
  const profitBeforeAds =
    nettRevenue - cogsTotal - feesTotal - packagingFee;

  return {
    ...order,
    platform: order?.platform || "tiktok",
    date: order?.date || "",
    status,
    gmv,
    nettRevenue,
    cogsTotal,
    feesTotal,
    packagingFee,
    profitBeforeAds,
  };
}

function aggregate(orders, adsCost = 0, fixedCost = 0) {
  const result = {
    orderCount: orders.length,
    gmv: 0,
    nettRevenue: 0,
    cogsTotal: 0,
    feesTotal: 0,
    packagingTotal: 0,
    profitBeforeAds: 0,
    adsFee: toNumber(adsCost),
    fixedCost: toNumber(fixedCost),
    successCount: 0,
    cancelledCount: 0,
    returnedCount: 0,
  };

  orders.forEach((order) => {
    result.gmv += order.gmv;
    result.nettRevenue += order.nettRevenue;
    result.cogsTotal += order.cogsTotal;
    result.feesTotal += order.feesTotal;
    result.packagingTotal += order.packagingFee;
    result.profitBeforeAds += order.profitBeforeAds;

    if (order.status === "success") result.successCount += 1;
    else if (order.status === "cancelled") result.cancelledCount += 1;
    else if (order.status === "returned") result.returnedCount += 1;
  });

  result.profitAfterAds =
    result.profitBeforeAds - result.adsFee - result.fixedCost;

  result.margin =
    result.nettRevenue > 0
      ? (result.profitAfterAds / result.nettRevenue) * 100
      : 0;

  result.returnRate =
    result.orderCount > 0
      ? ((result.cancelledCount + result.returnedCount) /
          result.orderCount) *
        100
      : 0;

  return result;
}

function aggregateByDate(orders) {
  const map = new Map();

  orders.forEach((order) => {
    if (!map.has(order.date)) {
      map.set(order.date, {
        date: order.date,
        nettRevenue: 0,
        totalCost: 0,
        profit: 0,
      });
    }

    const day = map.get(order.date);
    day.nettRevenue += order.nettRevenue;
    day.totalCost +=
      order.cogsTotal + order.feesTotal + order.packagingFee;
    day.profit += order.profitBeforeAds;
  });

  return [...map.values()].sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );
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

function SectionTabs({ tabs, active, onChange }) {
  return (
    <div className="flex min-w-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            active === tab.key
              ? "bg-white text-slate-950 shadow-sm"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone = "default" }) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-rose-600"
        : "text-slate-950";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium leading-5 text-slate-500">
            {label}
          </div>
          <div className={`mt-2 text-lg font-bold tracking-tight ${valueClass}`}>
            {value}
          </div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon size={17} strokeWidth={1.8} />
        </div>
      </div>
    </Card>
  );
}

function TrendChart({ data }) {
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            Xu hướng doanh thu & lợi nhuận
          </h3>
          <p className="mt-1 text-[11px] text-slate-400">
            Doanh thu thực, tổng chi phí và lợi nhuận theo ngày
          </p>
        </div>
        <BarChart3 size={17} className="text-slate-400" />
      </div>

      <div className="h-[310px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickFormatter={(value) => String(value).slice(5)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickFormatter={(value) =>
                `${(toNumber(value) / 1000000).toFixed(1)}tr`
              }
            />
            <Tooltip
              formatter={(value) => formatVND(value)}
              labelFormatter={(label) => `Ngày ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="nettRevenue"
              name="Doanh thu thực"
              fill="#172033"
              radius={[4, 4, 0, 0]}
              barSize={18}
            />
            <Bar
              dataKey="totalCost"
              name="Tổng chi phí"
              fill="#cbd5e1"
              radius={[4, 4, 0, 0]}
              barSize={18}
            />
            <Line
              type="monotone"
              dataKey="profit"
              name="Lợi nhuận ròng"
              stroke="#db2777"
              strokeWidth={2.5}
              dot={{ r: 2.5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function CostPieChart({ aggregateData }) {
  const data = [
    { name: "COGS", value: Math.max(0, aggregateData.cogsTotal) },
    { name: "Phí sàn & thuế", value: Math.max(0, aggregateData.feesTotal) },
    {
      name: "Phí đóng gói",
      value: Math.max(0, aggregateData.packagingTotal),
    },
  ].filter((item) => item.value > 0);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const fallback = [
    { name: "COGS", value: 1 },
    { name: "Phí sàn & thuế", value: 1 },
    { name: "Phí đóng gói", value: 1 },
  ];

  const chartData = data.length > 0 ? data : fallback;
  const cells = ["#172033", "#94a3b8", "#f9a8d4"];

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-950">
          Cơ cấu chi phí
        </h3>
        <p className="mt-1 text-[11px] text-slate-400">
          Tỷ trọng COGS, phí sàn & thuế và phí đóng gói
        </p>
      </div>

      <div className="relative h-[310px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="48%"
              innerRadius={72}
              outerRadius={105}
              paddingAngle={2}
            >
              {chartData.map((item, index) => (
                <Cell
                  key={item.name}
                  fill={cells[index % cells.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatVND(value)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
              Tổng chi phí
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {formatVND(total)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function FeeConfig({ settings, onSettingsChange }) {
  const initial = {
    tiktok: {
      ...DEFAULT_FEE_RATES.tiktok,
      ...(settings?.feeRates?.tiktok || {}),
    },
    shopee: {
      ...DEFAULT_FEE_RATES.shopee,
      ...(settings?.feeRates?.shopee || {}),
    },
  };

  const [form, setForm] = useState(initial);

  useEffect(() => {
    setForm(initial);
    // The settings object is the source of truth from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  function update(platform, field, value) {
    const next = {
      ...form,
      [platform]: {
        ...form[platform],
        [field]: value,
      },
    };
    setForm(next);
  }

  function save() {
    if (typeof onSettingsChange !== "function") return;
    onSettingsChange({
      ...(settings || {}),
      feeRates: form,
    });
  }

  const fields = [
    ["transactionRate", "Transaction fee"],
    ["commissionRate", "Commission"],
    ["affiliateRate", "Affiliate"],
    ["taxRate", "Thuế"],
  ];

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
          <Settings2 size={17} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            Config phí sàn mặc định
          </h3>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">
            Chỉ nhập số. Không cần nhập dấu % hoặc đơn vị tiền.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PLATFORM_KEYS.map((platform) => (
          <div
            key={platform}
            className="rounded-xl border border-slate-200 p-3"
          >
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-800">
              {platform === "tiktok" ? (
                <Store size={14} />
              ) : (
                <ShoppingBag size={14} />
              )}
              {platform === "tiktok" ? "TikTok Shop" : "Shopee"}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {fields.map(([field, label]) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-[10px] font-medium text-slate-500">
                    {label}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form[platform][field]}
                    onChange={(event) =>
                      update(
                        platform,
                        field,
                        event.target.value === ""
                          ? ""
                          : Number(event.target.value)
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-50"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={save}
          className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          <Check size={14} />
          Lưu cấu hình
        </button>
      </div>
    </Card>
  );
}

function PlatformDetail({ platform, orders, adsCost, settings }) {
  const aggregateData = aggregate(
    orders,
    adsCost,
    settings?.monthlyFixedCost || 0
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={CircleDollarSign}
          label="Doanh thu thực"
          value={formatVND(aggregateData.nettRevenue)}
        />
        <KpiCard
          icon={TrendingDown}
          label="Tổng chi phí"
          value={formatVND(
            aggregateData.cogsTotal +
              aggregateData.feesTotal +
              aggregateData.packagingTotal
          )}
        />
        <KpiCard
          icon={TrendingUp}
          label="Lợi nhuận trước Ads"
          value={formatVND(aggregateData.profitBeforeAds)}
          tone={aggregateData.profitBeforeAds >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          icon={Percent}
          label="Biên lợi nhuận ròng"
          value={formatPercent(aggregateData.margin)}
          tone={aggregateData.margin >= 0 ? "positive" : "negative"}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            {platform === "tiktok" ? (
              <Store size={16} />
            ) : (
              <ShoppingBag size={16} />
            )}
            Chi tiết {platform === "tiktok" ? "TikTok Shop" : "Shopee"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Ngày</th>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">GMV</th>
                <th className="px-4 py-3 text-right">Doanh thu thực</th>
                <th className="px-4 py-3 text-right">COGS</th>
                <th className="px-4 py-3 text-right">Phí sàn</th>
                <th className="px-4 py-3 text-right">LN trước Ads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.slice(0, 200).map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-slate-500">
                    {order.date || "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {order.id || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                        order.status === "success"
                          ? "bg-emerald-50 text-emerald-600"
                          : order.status === "returned"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {order.status === "success"
                        ? "Thành công"
                        : order.status === "returned"
                          ? "Hoàn trả"
                          : "Hủy"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatVND(order.gmv)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatVND(order.nettRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatVND(order.cogsTotal)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatVND(order.feesTotal)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      order.profitBeforeAds >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {formatVND(order.profitBeforeAds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function OverviewPage({
  orders = [],
  ads = { tiktok: 0, shopee: 0 },
  dateRange = { start: "", end: "" },
  settings = {
    packagingFee: DEFAULT_PACKAGING_FEE,
    monthlyFixedCost: 0,
  },
  onSettingsChange,
}) {
  const [subTab, setSubTab] = useState("overview");

  const computedOrders = useMemo(
    () => normalizeOrders(orders).map((order) => computeOrder(order, settings)),
    [orders, settings]
  );

  const filteredOrders = useMemo(
    () =>
      computedOrders.filter((order) =>
        isWithinRange(order.date, dateRange?.start, dateRange?.end)
      ),
    [computedOrders, dateRange]
  );

  const allAggregate = useMemo(
    () =>
      aggregate(
        filteredOrders,
        toNumber(ads?.tiktok) + toNumber(ads?.shopee),
        settings?.monthlyFixedCost || 0
      ),
    [filteredOrders, ads, settings]
  );

  const platformOrders = useMemo(
    () => ({
      tiktok: filteredOrders.filter((order) => order.platform === "tiktok"),
      shopee: filteredOrders.filter((order) => order.platform === "shopee"),
    }),
    [filteredOrders]
  );

  const trendData = useMemo(
    () => aggregateByDate(filteredOrders),
    [filteredOrders]
  );

  const feesMissing =
    filteredOrders.length > 0 &&
    filteredOrders.every((order) => order.feesTotal === 0);

  return (
    <div className="space-y-5">
      <SectionTabs
        active={subTab}
        onChange={setSubTab}
        tabs={[
          { key: "overview", label: "Tổng quan hợp nhất" },
          { key: "tiktok", label: "TikTok Shop Chi Tiết" },
          { key: "shopee", label: "Shopee Chi Tiết" },
          { key: "config", label: "Config" },
        ]}
      />

      {subTab === "overview" && (
        <>
          {feesMissing && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>
                Chưa phát hiện phí sàn chi tiết trong dữ liệu hiện tại. Các
                trường phí đang được giữ ở 0đ cho tới khi import dữ liệu đối
                soát có phí.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <KpiCard
              icon={CircleDollarSign}
              label="Doanh Thu Gộp (GMV)"
              value={formatVND(allAggregate.gmv)}
            />
            <KpiCard
              icon={TrendingUp}
              label="Doanh Thu Thực"
              value={formatVND(allAggregate.nettRevenue)}
            />
            <KpiCard
              icon={Percent}
              label="Tổng Phí Sàn & Thuế"
              value={formatVND(allAggregate.feesTotal)}
            />
            <KpiCard
              icon={TrendingDown}
              label="Tổng Chi Phí Ads"
              value={formatVND(allAggregate.adsFee)}
            />
            <KpiCard
              icon={ShoppingBag}
              label="Lợi Nhuận Trước Ads"
              value={formatVND(allAggregate.profitBeforeAds)}
              tone={
                allAggregate.profitBeforeAds >= 0
                  ? "positive"
                  : "negative"
              }
            />
            <KpiCard
              icon={
                allAggregate.profitAfterAds >= 0
                  ? TrendingUp
                  : TrendingDown
              }
              label="Lợi Nhuận Thực Sau Ads"
              value={formatVND(allAggregate.profitAfterAds)}
              tone={
                allAggregate.profitAfterAds >= 0
                  ? "positive"
                  : "negative"
              }
            />
            <KpiCard
              icon={Percent}
              label="Biên Lợi Nhuận Ròng"
              value={formatPercent(allAggregate.margin)}
              tone={allAggregate.margin >= 0 ? "positive" : "negative"}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <TrendChart data={trendData} />
            <CostPieChart aggregateData={allAggregate} />
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-950">
                So sánh hiệu quả theo sàn
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Sàn</th>
                    <th className="px-4 py-3 text-right">Đơn</th>
                    <th className="px-4 py-3 text-right">Doanh thu thực</th>
                    <th className="px-4 py-3 text-right">Phí sàn</th>
                    <th className="px-4 py-3 text-right">Lợi nhuận</th>
                    <th className="px-4 py-3 text-right">Biên LN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PLATFORM_KEYS.map((platform) => {
                    const data = aggregate(
                      platformOrders[platform],
                      ads?.[platform] || 0,
                      settings?.monthlyFixedCost || 0
                    );

                    return (
                      <tr key={platform}>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {platform === "tiktok"
                            ? "TikTok Shop"
                            : "Shopee"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {numberFormatter.format(data.orderCount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatVND(data.nettRevenue)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatVND(data.feesTotal)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            data.profitAfterAds >= 0
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {formatVND(data.profitAfterAds)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatPercent(data.margin)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {subTab === "tiktok" && (
        <PlatformDetail
          platform="tiktok"
          orders={platformOrders.tiktok}
          adsCost={ads?.tiktok}
          settings={settings}
        />
      )}

      {subTab === "shopee" && (
        <PlatformDetail
          platform="shopee"
          orders={platformOrders.shopee}
          adsCost={ads?.shopee}
          settings={settings}
        />
      )}

      {subTab === "config" && (
        <FeeConfig
          settings={settings}
          onSettingsChange={onSettingsChange}
        />
      )}
    </div>
  );
}
