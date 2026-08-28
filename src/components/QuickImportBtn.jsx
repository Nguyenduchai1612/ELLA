import React from "react";
import { Upload } from "lucide-react";

export default function QuickImportBtn({
  onClick,
  label = "Import dữ liệu",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.98]"
    >
      <Upload size={15} strokeWidth={2} />
      {label}
    </button>
  );
}
