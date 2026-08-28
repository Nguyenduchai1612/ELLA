import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Check,
  X,
} from "lucide-react";

const PRESETS = [
  {
    key: "today",
    label: "Hôm nay",
  },
  {
    key: "yesterday",
    label: "Hôm qua",
  },
  {
    key: "7d",
    label: "7 ngày",
  },
  {
    key: "30d",
    label: "30 ngày",
  },
  {
    key: "all",
    label: "Tất cả",
  },
  {
    key: "custom",
    label: "Tùy chỉnh",
  },
];

function padNumber(number) {
  return String(number).padStart(2, "0");
}

function dateToISO(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
  ].join("-");
}

function isoToDate(value) {
  if (!value) {
    return null;
  }

  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }

  return date;
}

function formatDisplayDate(value) {
  const date = isoToDate(value);

  if (!date) {
    return "";
  }

  return [
    padNumber(date.getDate()),
    padNumber(date.getMonth() + 1),
    date.getFullYear(),
  ].join("/");
}

function parseDisplayDate(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, "");

  const match = normalized.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
  );

  if (!match) {
    return "";
  }

  const [, day, month, year] = match;

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return "";
  }

  return dateToISO(date);
}

function startOfDay(date) {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
}

function subtractDays(date, days) {
  const result = new Date(date);

  result.setDate(result.getDate() - days);

  return result;
}

function createPresetRange(key) {
  const today = startOfDay(new Date());

  if (key === "today") {
    const iso = dateToISO(today);

    return {
      start: iso,
      end: iso,
      preset: key,
    };
  }

  if (key === "yesterday") {
    const yesterday = subtractDays(today, 1);
    const iso = dateToISO(yesterday);

    return {
      start: iso,
      end: iso,
      preset: key,
    };
  }

  if (key === "7d") {
    return {
      start: dateToISO(subtractDays(today, 6)),
      end: dateToISO(today),
      preset: key,
    };
  }

  if (key === "30d") {
    return {
      start: dateToISO(subtractDays(today, 29)),
      end: dateToISO(today),
      preset: key,
    };
  }

  if (key === "all") {
    return {
      start: null,
      end: null,
      preset: key,
    };
  }

  return {
    start: "",
    end: "",
    preset: "custom",
  };
}

function normalizeValue(value) {
  if (!value || typeof value !== "object") {
    return {
      start: null,
      end: null,
      preset: "all",
    };
  }

  return {
    start:
      value.start === undefined
        ? null
        : value.start,
    end:
      value.end === undefined
        ? null
        : value.end,
    preset: value.preset || "all",
  };
}

export default function DateRangeFilter({
  value,
  onChange,
  className = "",
}) {
  const rootRef = useRef(null);

  const controlled = value !== undefined;

  const [internalValue, setInternalValue] = useState(
    normalizeValue(value)
  );

  const currentValue = controlled
    ? normalizeValue(value)
    : internalValue;

  const [customOpen, setCustomOpen] =
    useState(false);

  const [draftStart, setDraftStart] =
    useState("");

  const [draftEnd, setDraftEnd] =
    useState("");

  const [startError, setStartError] =
    useState(false);

  const [endError, setEndError] =
    useState(false);

  useEffect(() => {
    if (controlled) {
      setInternalValue(normalizeValue(value));
    }
  }, [controlled, value]);

  useEffect(() => {
    if (!customOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target)
      ) {
        setCustomOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );
    };
  }, [customOpen]);

  const selectedLabel = useMemo(() => {
    const selectedPreset = PRESETS.find(
      (preset) =>
        preset.key === currentValue.preset
    );

    if (
      currentValue.preset !== "custom" &&
      selectedPreset
    ) {
      return selectedPreset.label;
    }

    if (
      currentValue.start &&
      currentValue.end
    ) {
      return `${formatDisplayDate(
        currentValue.start
      )} - ${formatDisplayDate(
        currentValue.end
      )}`;
    }

    return "Tùy chỉnh";
  }, [currentValue]);

  function emitChange(nextValue) {
    const normalized = normalizeValue(
      nextValue
    );

    if (!controlled) {
      setInternalValue(normalized);
    }

    if (typeof onChange === "function") {
      onChange(normalized);
    }
  }

  function handlePreset(key) {
    if (key === "custom") {
      setDraftStart(
        currentValue.start || ""
      );

      setDraftEnd(
        currentValue.end || ""
      );

      setStartError(false);
      setEndError(false);
      setCustomOpen(true);

      return;
    }

    emitChange(createPresetRange(key));

    setCustomOpen(false);
  }

  function handleApplyCustom() {
    const start =
      parseDisplayDate(draftStart);

    const end =
      parseDisplayDate(draftEnd);

    const nextStartError =
      Boolean(draftStart) && !start;

    const nextEndError =
      Boolean(draftEnd) && !end;

    setStartError(nextStartError);
    setEndError(nextEndError);

    if (
      nextStartError ||
      nextEndError
    ) {
      return;
    }

    if (
      start &&
      end &&
      start > end
    ) {
      setStartError(true);
      setEndError(true);
      return;
    }

    emitChange({
      start: start || null,
      end: end || null,
      preset: "custom",
    });

    setCustomOpen(false);
  }

  function handleClearCustom() {
    setDraftStart("");
    setDraftEnd("");
    setStartError(false);
    setEndError(false);
  }

  return (
    <div
      ref={rootRef}
      className={[
        "relative flex min-w-0 items-center",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "flex min-w-0 items-center gap-1",
          "overflow-x-auto rounded-xl bg-slate-100 p-1",
          "scrollbar-none",
        ].join(" ")}
      >
        {PRESETS.map((preset) => {
          const isSelected =
            currentValue.preset ===
            preset.key;

          if (preset.key === "custom") {
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() =>
                  handlePreset(preset.key)
                }
                aria-expanded={customOpen}
                className={[
                  "flex shrink-0 items-center gap-1.5",
                  "rounded-lg px-3 py-1.5",
                  "text-xs font-medium",
                  "transition-all duration-150",
                  isSelected || customOpen
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white hover:text-slate-900",
                ].join(" ")}
              >
                <CalendarDays
                  size={13}
                  strokeWidth={1.8}
                />

                <span className="whitespace-nowrap">
                  {selectedLabel ===
                    "Tùy chỉnh" ||
                  currentValue.preset !==
                    "custom"
                    ? preset.label
                    : selectedLabel}
                </span>

                <ChevronDown
                  size={13}
                  strokeWidth={1.8}
                  className={[
                    "transition-transform",
                    customOpen
                      ? "rotate-180"
                      : "",
                  ].join(" ")}
                />
              </button>
            );
          }

          return (
            <button
              key={preset.key}
              type="button"
              onClick={() =>
                handlePreset(preset.key)
              }
              className={[
                "shrink-0 rounded-lg px-3 py-1.5",
                "text-xs font-medium",
                "transition-all duration-150",
                isSelected
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-500 hover:bg-white hover:text-slate-900",
              ].join(" ")}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {customOpen && (
        <div
          className={[
            "absolute right-0 top-[calc(100%+10px)] z-50",
            "w-[min(360px,calc(100vw-32px))]",
            "rounded-2xl border border-slate-200",
            "bg-white p-4 shadow-xl shadow-slate-900/10",
          ].join(" ")}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Khoảng thời gian
              </div>

              <div className="mt-0.5 text-[11px] text-slate-400">
                Nhập ngày theo định dạng dd/mm/yyyy
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setCustomOpen(false)
              }
              aria-label="Đóng bộ lọc tùy chỉnh"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X
                size={15}
                strokeWidth={1.8}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-slate-500">
                Từ ngày
              </span>

              <input
                type="text"
                inputMode="numeric"
                value={draftStart}
                onChange={(event) => {
                  setDraftStart(
                    event.target.value
                  );
                  setStartError(false);
                }}
                placeholder="dd/mm/yyyy"
                className={[
                  "w-full rounded-xl border px-3 py-2",
                  "bg-white text-sm text-slate-900",
                  "outline-none transition",
                  startError
                    ? "border-rose-300 ring-2 ring-rose-50"
                    : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100",
                ].join(" ")}
              />

              {startError && (
                <span className="mt-1 block text-[10px] text-rose-500">
                  Ngày không hợp lệ.
                </span>
              )}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-slate-500">
                Đến ngày
              </span>

              <input
                type="text"
                inputMode="numeric"
                value={draftEnd}
                onChange={(event) => {
                  setDraftEnd(
                    event.target.value
                  );
                  setEndError(false);
                }}
                placeholder="dd/mm/yyyy"
                className={[
                  "w-full rounded-xl border px-3 py-2",
                  "bg-white text-sm text-slate-900",
                  "outline-none transition",
                  endError
                    ? "border-rose-300 ring-2 ring-rose-50"
                    : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100",
                ].join(" ")}
              />

              {endError && (
                <span className="mt-1 block text-[10px] text-rose-500">
                  Ngày không hợp lệ.
                </span>
              )}
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={handleClearCustom}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              Xóa
            </button>

            <button
              type="button"
              onClick={handleApplyCustom}
              className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
            >
              <Check
                size={13}
                strokeWidth={2}
              />
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export {
  PRESETS,
  createPresetRange,
  formatDisplayDate,
  parseDisplayDate,
};