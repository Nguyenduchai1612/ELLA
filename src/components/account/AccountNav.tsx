"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/account", label: "Tổng quan" },
  { href: "/account/orders", label: "Đơn hàng" },
  { href: "/account/addresses", label: "Sổ địa chỉ" },
  { href: "/account/profile", label: "Hồ sơ" },
] as const;

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200 md:flex-col md:border-b-0 md:border-r md:pr-4">
      {LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-full px-3 py-2 text-sm md:rounded-lg ${
              isActive ? "bg-neutral-900 text-white md:bg-neutral-100 md:text-neutral-900" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
