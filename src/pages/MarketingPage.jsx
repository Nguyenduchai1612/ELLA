import React, { useMemo, useState } from "react";
import {
  BarChart3,
  Megaphone,
  MousePointerClick,
  Percent,
  ShoppingBag,
  Store,
  TrendingUp,
} from "lucide-react";

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

function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function getAdCost(ads, platform) {
  if (typeof ads?.[platform] === "number") {
    return ads[platform];
  }

  return toNumber(
    ads?.[platform]?.cost ??
      ads?.[platform]?.spend ??
      ads?.[platform]?.amountSpent
  );
}

function getAdRevenue(ads, platform) {
  if (typeof ads?.[platform]?.revenue === "number") {
    return ads[platform].revenue;
  }

  return toNumber(
    ads?.[platform]?.revenue ??
      ads?.[platform]?.attributedRevenue ??
      ads?.[platform]?.gmvFromAds
  );
}

function normalizeAdsRows(adsData) {
  if (Array.isArray(adsData)) return adsData;

  const result = [];

  ["tiktok", "shopee"].forEach((platform) => {
    const value = adsData?.[platform];

    if (Array.isArray(value)) {
      value.forEach((row) =>
        result.push({
          ...row,
          platform,
        })
      );
    }
  });

  return result;
}

function evaluateCir(cir) {
  if (cir < 15) {
    return {
      title: "Hiệu quả tốt",
      description:
        "CIR đang dưới 15%. Chi phí Ads chiếm tỷ trọng thấp so với doanh thu từ Ads.",
      tone: "positive",
    };
  }

  if (cir <= 25) {
    return {
      title: "Cần theo dõi",
      description:
        "CIR đang ở vùng trung bình. Nên theo dõi từng chiến dịch và nhóm sản phẩm để tối ưu thêm.",
      tone: "warning",
    };
  }

  return {
    title: "Chi phí Ads cao, cần tối ưu",
    description:
      "CIR vượt 25%. Nên rà soát ngân sách, mẫu quảng cáo, tệp khách hàng và các SKU có hiệu quả thấp.",
    tone: "negative",
  };
}

function KpiCard({ icon: Icon, label, value, sub }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium text-slate-500">
            {label}
          </div>
          <div className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            {value}
          </div>
          {sub && (
            <div className="mt-1 text-[10px] text-slate-400">
              {sub}
            </div>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon size={17} strokeWidth={1.8} />
        </div>
      </div>
    </Card>
  );
}

function StatusCard({ cir }) {
  const status = evaluateCir(cir);

  const classes =
    status.tone === "positive"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-rose-200 bg-rose-50 text-rose-800";

  return (
    <Card className={`p-5 ${classes}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-60">
        Đánh Giá Tình Trạng
      </div>

      <div className="mt-2 text-lg font-bold">
        {status.title}
      </div>

      <div className="mt-2 text-xs leading-5 opacity-80">
        {status.description}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-current/10 pt-3">
        <span className="text-xs font-medium">
          CIR hiện tại
        </span>
        <span className="text-xl font-bold">
          {formatPercent(cir)}
        </span>
      </div>
    </Card>
  );
}

function PlatformTable({ rows }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-950">
          Hiệu quả theo sàn
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Sàn</th>
              <th className="px-4 py-3 text-right">Chi phí Ads</th>
              <th className="px-4 py-3 text-right">Doanh thu từ Ads</th>
              <th className="px-4 py-3 text-right">ROAS</th>
              <th className="px-4 py-3 text-right">CIR</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.platform}>
                <td className="px-4 py-3 font-semibold text-slate-800">
                  <span className="inline-flex items-center gap-2">
                    {row.platform === "tiktok" ? (
                      <Store size={14} />
                    ) : (
                      <ShoppingBag size={14} />
                    )}
                    {row.platform === "tiktok"
                      ? "TikTok Shop"
                      : "Shopee"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {formatVND(row.cost)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatVND(row.revenue)}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {row.cost > 0
                    ? `${(row.revenue / row.cost).toFixed(2)}x`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatPercent(row.cir)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AdsDataTable({ rows }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <BarChart3 size={15} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-950">
          Dữ liệu Ads đã import
        </h3>
      </div>

      <div className="max-h-[360px] overflow-auto">
        <table className="w-full min-w-[700px] text-xs">
          <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Ngày</th>
              <th className="px-4 py-3 text-left">Chiến dịch</th>
              <th className="px-4 py-3 text-left">Sàn</th>
              <th className="px-4 py-3 text-right">Chi phí</th>
              <th className="px-4 py-3 text-right">Doanh thu</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={`${row.date}-${row.campaign}-${index}`}>
                <td className="px-4 py-3 text-slate-500">
                  {row.date || "—"}
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">
                  {row.campaign || row.campaignName || "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {row.platform || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatVND(
                    row.cost ??
                      row.spend ??
                      row.amountSpent
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatVND(
                    row.revenue ??
                      row.attributedRevenue
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!rows.length && (
        <div className="px-6 py-10 text-center text-xs text-slate-400">
          Chưa có dòng dữ liệu Ads chi tiết. Hãy import báo cáo quảng cáo ở
          Import & Config.
        </div>
      )}
    </Card>
  );
}

export default function MarketingPage({
  ads = { tiktok: 0, shopee: 0 },
  adsData = [],
}) {
  const [platform, setPlatform] = useState("all");

  const platformRows = useMemo(
    () =>
      ["tiktok", "shopee"].map((key) => {
        const cost = getAdCost(ads, key);
        const revenue = getAdRevenue(ads, key);
        const roas = cost > 0 ? revenue / cost : 0;
        const cir = revenue > 0 ? (cost / revenue) * 100 : 0;

        return {
          platform: key,
          cost,
          revenue,
          roas,
          cir,
        };
      }),
    [ads]
  );

  const filteredRows =
    platform === "all"
      ? platformRows
      : platformRows.filter(
          (row) => row.platform === platform
        );

  const totals = filteredRows.reduce(
    (result, row) => {
      result.cost += row.cost;
      result.revenue += row.revenue;
      return result;
    },
    { cost: 0, revenue: 0 }
  );

  const roas =
    totals.cost > 0
      ? totals.revenue / totals.cost
      : 0;

  const cir =
    totals.revenue > 0
      ? (totals.cost / totals.revenue) * 100
      : 0;

  const normalizedRows = normalizeAdsRows(
    adsData
  ).filter((row) =>
    platform === "all"
      ? true
      : row.platform === platform
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">
            Hiệu quả Marketing
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Dữ liệu được lấy từ báo cáo Ads đã import.
          </div>
        </div>

        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {[
            ["all", "Tất cả"],
            ["tiktok", "TikTok"],
            ["shopee", "Shopee"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPlatform(key)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                platform === key
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={Megaphone}
          label="Chi Phí Ads"
          value={formatVND(totals.cost)}
        />
        <KpiCard
          icon={TrendingUp}
          label="Doanh Thu Từ Ads"
          value={formatVND(totals.revenue)}
        />
        <KpiCard
          icon={MousePointerClick}
          label="ROAS"
          value={totals.cost > 0 ? `${roas.toFixed(2)}x` : "—"}
          sub="Doanh thu Ads / Chi phí Ads"
        />
        <KpiCard
          icon={Percent}
          label="CIR"
          value={totals.revenue > 0 ? formatPercent(cir) : "—"}
          sub="Chi phí Ads / Doanh thu Ads"
        />
      </div>

      {totals.revenue <= 0 && totals.cost > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          Đã có chi phí Ads nhưng chưa có doanh thu được quy cho Ads. ROAS và
          CIR chưa thể đánh giá chính xác cho tới khi nguồn dữ liệu Ads có
          trường doanh thu/attributed revenue.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <PlatformTable rows={filteredRows} />
        <StatusCard cir={cir} />
      </div>

      <AdsDataTable rows={normalizedRows} />
    </div>
  );
}
