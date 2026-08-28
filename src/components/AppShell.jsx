import React, { useMemo, useState } from "react";
import {
  Upload,
  Menu,
  X,
} from "lucide-react";

import Sidebar, {
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_COLLAPSED,
} from "./Sidebar";

import DateRangeFilter from "./DateRangeFilter";

/* =========================================================
 * PAGE META
 * ========================================================= */

const PAGE_META = {
  overview: {
    title: "Tổng quan",
    description:
      "Theo dõi doanh thu, chi phí và lợi nhuận toàn hệ thống.",
    showDateFilter: true,
  },

  products: {
    title: "Sản phẩm",
    description:
      "Quản lý SKU, giá vốn và hiệu quả kinh doanh sản phẩm.",
    showDateFilter: true,
  },

  marketing: {
    title: "Marketing",
    description:
      "Theo dõi chi phí quảng cáo và hiệu quả đầu tư.",
    showDateFilter: true,
  },

  import: {
    title: "Import & Config",
    description:
      "Nhập dữ liệu sàn và cấu hình hệ thống tài chính.",
    showDateFilter: false,
  },
};

/* =========================================================
 * DEFAULT PAGE
 *
 * Chỉ dùng khi AppShell chưa được truyền page tương ứng.
 * ========================================================= */

function EmptyPage({ tab }) {
  const meta =
    PAGE_META[tab] || PAGE_META.overview;

  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
      <div className="max-w-md px-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <span className="text-lg">EA</span>
        </div>

        <h2 className="text-base font-semibold text-slate-900">
          {meta.title}
        </h2>

        <p className="mt-1.5 text-sm leading-6 text-slate-400">
          {meta.description}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
 * QUICK IMPORT BUTTON
 *
 * Được giữ nội bộ trong AppShell để BƯỚC 2 chỉ cần 3 file.
 * ========================================================= */

function QuickImportButton({
  onNavigate,
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof onNavigate === "function") {
          onNavigate("import");
        }
      }}
      className={[
        "flex shrink-0 items-center gap-2",
        "rounded-xl bg-pink-600 px-3.5 py-2",
        "text-xs font-semibold text-white",
        "shadow-sm shadow-pink-600/20",
        "transition-all duration-150",
        "hover:bg-pink-700 hover:shadow-md",
        "active:scale-[0.98]",
      ].join(" ")}
    >
      <Upload
        size={14}
        strokeWidth={1.9}
      />

      <span>Import dữ liệu</span>
    </button>
  );
}

/* =========================================================
 * MOBILE OVERLAY
 * ========================================================= */

function MobileSidebarOverlay({
  open,
  onClose,
  activeTab,
  onNavigate,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        aria-label="Đóng menu"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]"
      />

      <div className="relative h-full w-[280px]">
        <Sidebar
          activeTab={activeTab}
          onNavigate={(tab) => {
            onNavigate(tab);
            onClose();
          }}
          collapsed={false}
          onToggleCollapse={onClose}
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng sidebar"
          className="absolute right-3 top-5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15"
        >
          <X
            size={16}
            strokeWidth={1.8}
          />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
 * APP SHELL
 * ========================================================= */

export default function AppShell({
  children,
  pages = {},
  initialTab = "overview",
  initialDateRange = {
    start: null,
    end: null,
    preset: "all",
  },
  onTabChange,
  onDateRangeChange,
  className = "",
}) {
  const [activeTab, setActiveTab] =
    useState(initialTab);

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  const [dateRange, setDateRange] =
    useState(initialDateRange);

  const pageMeta =
    PAGE_META[activeTab] ||
    PAGE_META.overview;

  const desktopSidebarWidth =
    sidebarCollapsed
      ? SIDEBAR_WIDTH_COLLAPSED
      : SIDEBAR_WIDTH_EXPANDED;

  const currentPage = useMemo(() => {
    if (pages && pages[activeTab]) {
      return pages[activeTab];
    }

    if (children) {
      return children;
    }

    return <EmptyPage tab={activeTab} />;
  }, [pages, activeTab, children]);

  function navigateTo(tab) {
    if (!PAGE_META[tab]) {
      return;
    }

    setActiveTab(tab);

    if (
      typeof onTabChange === "function"
    ) {
      onTabChange(tab);
    }
  }

  function updateDateRange(nextRange) {
    setDateRange(nextRange);

    if (
      typeof onDateRangeChange ===
      "function"
    ) {
      onDateRangeChange(nextRange);
    }
  }

  return (
    <div
      className={[
        "min-h-screen bg-slate-50 text-slate-900",
        className,
      ].join(" ")}
    >
      {/* =====================================================
          DESKTOP SIDEBAR
      ====================================================== */}
      <div className="hidden lg:block">
        <Sidebar
          activeTab={activeTab}
          onNavigate={navigateTo}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() =>
            setSidebarCollapsed(
              (previous) => !previous
            )
          }
        />
      </div>

      {/* =====================================================
          MOBILE SIDEBAR
      ====================================================== */}
      <MobileSidebarOverlay
        open={mobileSidebarOpen}
        onClose={() =>
          setMobileSidebarOpen(false)
        }
        activeTab={activeTab}
        onNavigate={navigateTo}
      />

      {/* =====================================================
          MAIN AREA
      ====================================================== */}
      <div
        className="min-h-screen transition-[margin-left] duration-300 ease-in-out"
        style={{
          marginLeft:
            typeof window !== "undefined" &&
            window.innerWidth >= 1024
              ? desktopSidebarWidth
              : 0,
        }}
      >
        {/* ===================================================
            TOP HEADER
        ================================================== */}
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            {/* -----------------------------------------------
                LEFT
            ------------------------------------------------ */}
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setMobileSidebarOpen(true)
                }
                aria-label="Mở menu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
              >
                <Menu
                  size={17}
                  strokeWidth={1.8}
                />
              </button>

              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
                  {pageMeta.title}
                </div>

                <div className="mt-0.5 hidden truncate text-[11px] text-slate-400 sm:block">
                  {pageMeta.description}
                </div>
              </div>
            </div>

            {/* -----------------------------------------------
                RIGHT
            ------------------------------------------------ */}
            <div className="flex min-w-0 items-center gap-2">
              {pageMeta.showDateFilter && (
                <DateRangeFilter
                  value={dateRange}
                  onChange={updateDateRange}
                  className="hidden md:flex"
                />
              )}

              <QuickImportButton
                onNavigate={navigateTo}
              />
            </div>
          </div>

          {/* =================================================
              MOBILE DATE FILTER
          ================================================== */}
          {pageMeta.showDateFilter && (
            <div className="border-t border-slate-100 px-4 py-2.5 md:hidden">
              <DateRangeFilter
                value={dateRange}
                onChange={updateDateRange}
                className="w-full"
              />
            </div>
          )}
        </header>

        {/* ===================================================
            CONTENT
        ================================================== */}
        <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <div className="mx-auto w-full max-w-[1600px]">
            {currentPage}
          </div>
        </main>
      </div>
    </div>
  );
}