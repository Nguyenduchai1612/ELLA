import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Package,
  TrendingUp,
  Upload,
} from "lucide-react";

const NAV_ITEMS = [
  {
    id: "overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    id: "products",
    label: "Sản phẩm",
    icon: Package,
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: TrendingUp,
  },
  {
    id: "import",
    label: "Import & Config",
    icon: Upload,
  },
];

export default function Sidebar({
  activeTab = "overview",
  onTabChange,
  collapsed: controlledCollapsed,
  onCollapsedChange,
}) {
  const [internalCollapsed, setInternalCollapsed] =
    React.useState(false);

  const isControlled =
    typeof controlledCollapsed === "boolean";

  const collapsed = isControlled
    ? controlledCollapsed
    : internalCollapsed;

  const setCollapsed = (next) => {
    if (!isControlled) {
      setInternalCollapsed(next);
    }

    if (typeof onCollapsedChange === "function") {
      onCollapsedChange(next);
    }
  };

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 hidden border-r border-slate-800 bg-slate-950 text-white transition-[width] duration-200 lg:flex lg:flex-col",
        collapsed ? "w-20" : "w-64",
      ].join(" ")}
    >
      <div className="relative flex h-20 items-center border-b border-slate-800 px-5">
        <div
          className={[
            "min-w-0 overflow-hidden transition-all",
            collapsed
              ? "w-0 opacity-0"
              : "w-auto opacity-100",
          ].join(" ")}
        >
          <div className="whitespace-nowrap text-lg font-light tracking-[0.18em] text-white">
            ELLA
          </div>
          <div className="mt-0.5 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.32em] text-slate-500">
            Accents
          </div>
        </div>

        {collapsed && (
          <div className="mx-auto text-sm font-light tracking-[0.18em]">
            EA
          </div>
        )}

        <button
          type="button"
          aria-label={
            collapsed
              ? "Mở rộng sidebar"
              : "Thu gọn sidebar"
          }
          onClick={() =>
            setCollapsed(!collapsed)
          }
          className="absolute -right-3 top-7 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 shadow-lg transition hover:bg-slate-800 hover:text-white"
        >
          {collapsed ? (
            <ChevronRight size={13} />
          ) : (
            <ChevronLeft size={13} />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-2 px-3 py-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              title={
                collapsed
                  ? item.label
                  : undefined
              }
              onClick={() => {
                if (
                  typeof onTabChange ===
                  "function"
                ) {
                  onTabChange(item.id);
                }
              }}
              className={[
                "flex w-full items-center rounded-xl px-3 py-3 text-left text-sm transition",
                collapsed
                  ? "justify-center"
                  : "gap-3",
                active
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white",
              ].join(" ")}
            >
              <Icon
                size={18}
                strokeWidth={1.8}
                className="shrink-0"
              />
              {!collapsed && (
                <span className="whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-slate-800 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600">
            ELLA Accents
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Profit Center
          </p>
        </div>
      )}
    </aside>
  );
}
