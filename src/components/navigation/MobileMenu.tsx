"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { NAV_CATEGORIES } from "@/lib/navigation";
import { useAuth } from "@/lib/state";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const { isAuthenticated } = useAuth();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        aria-label="Đóng menu"
        className="absolute inset-0 bg-neutral-900/40"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-sm flex-col bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="font-serif text-xl tracking-wide">ELLA</span>
          <button aria-label="Đóng menu" onClick={onClose} className="p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          <Link href="/shop" onClick={onClose} className="rounded-lg px-2 py-3 text-base font-medium hover:bg-neutral-100">
            Tất cả sản phẩm
          </Link>
          {NAV_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              onClick={onClose}
              className="rounded-lg px-2 py-3 text-base text-neutral-700 hover:bg-neutral-100"
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-neutral-200 pt-4">
          {isAuthenticated ? (
            <Link href="/account" onClick={onClose} className="rounded-lg px-2 py-3 text-sm text-neutral-700 hover:bg-neutral-100">
              Tài khoản của tôi
            </Link>
          ) : (
            <>
              <Link href="/login" onClick={onClose} className="rounded-lg px-2 py-3 text-sm text-neutral-700 hover:bg-neutral-100">
                Đăng nhập
              </Link>
              <Link href="/register" onClick={onClose} className="rounded-lg px-2 py-3 text-sm text-neutral-700 hover:bg-neutral-100">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
