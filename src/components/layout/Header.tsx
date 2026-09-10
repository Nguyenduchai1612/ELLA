"use client";

import { useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, ShoppingBag, User } from "lucide-react";
import { NAV_CATEGORIES } from "@/lib/navigation";
import { useCart } from "@/lib/state";
import { MobileMenu } from "@/components/navigation/MobileMenu";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { cart } = useCart();
  const router = useRouter();

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    // App Router's push() only accepts a string; cast the dynamic result
    // `as Route` per Next.js's documented typedRoutes pattern.
    router.push((q ? `/search?q=${encodeURIComponent(q)}` : "/search") as Route);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-neutral-50/95 backdrop-blur">
      <div className="container-ella flex h-16 items-center justify-between gap-4">
        <button
          type="button"
          aria-label="Mở menu"
          className="p-1 md:hidden"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link
          href="/"
          className="font-serif text-2xl tracking-wide text-neutral-900 md:flex-1"
        >
          ELLA
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link href="/shop" className="text-sm text-neutral-700 hover:text-neutral-900">
            Tất cả
          </Link>
          {NAV_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="text-sm text-neutral-700 hover:text-neutral-900"
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-1">
          <button
            type="button"
            aria-label="Tìm kiếm"
            className="p-2 text-neutral-700 hover:text-neutral-900"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search className="h-5 w-5" />
          </button>
          <Link
            href="/account"
            aria-label="Tài khoản"
            className="hidden p-2 text-neutral-700 hover:text-neutral-900 md:inline-flex"
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            aria-label={`Giỏ hàng, ${itemCount} sản phẩm`}
            className="relative p-2 text-neutral-700 hover:text-neutral-900"
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-neutral-200 bg-white">
          <form onSubmit={submitSearch} className="container-ella flex items-center gap-2 py-3">
            <Search className="h-4 w-4 shrink-0 text-neutral-400" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
          </form>
        </div>
      )}

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
