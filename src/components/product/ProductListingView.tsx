"use client";

import { useMemo } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProductListQuery } from "@/types";
import { useProductListing } from "@/lib/hooks/useProductListing";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ListingToolbar } from "@/components/product/ListingToolbar";
import { Button } from "@/components/ui/Button";

interface ProductListingViewProps {
  title: string;
  description?: string;
  categorySlug?: string;
  searchQuery?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

const PAGE_SIZE = 12;

/**
 * Section 38: sort + page live in the URL so listing pages are shareable
 * links, not hidden client state. Section 11/12/13: this is the single
 * fetch/render implementation shop, category, and search all reuse.
 */
export function ProductListingView({
  title,
  description,
  categorySlug,
  searchQuery,
  emptyTitle,
  emptyDescription,
}: ProductListingViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = (searchParams.get("sort") as ProductListQuery["sort"]) ?? "newest";
  const page = Number(searchParams.get("page") ?? "1") || 1;

  const query: ProductListQuery = useMemo(
    () => ({ search: searchQuery, sort, page, pageSize: PAGE_SIZE }),
    [searchQuery, sort, page],
  );

  const { result, isLoading, error, refetch } = useProductListing({ categorySlug, query });

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    if (key !== "page") {
      params.delete("page");
    }
    // Next.js typedRoutes can only verify route literals it knows about at
    // build time. `pathname` here is genuinely dynamic (this component is
    // shared by /shop, /category/[slug], and /search — see Section 11/12/13
    // no-duplication rule), so it can never be narrowed to the generated
    // `Route` union by TypeScript alone. App Router's router.push() (from
    // next/navigation) only accepts a string — unlike Pages Router's
    // next/router, it has no `{ pathname, query }` object form — so we
    // build the string as before and cast it `as Route`, exactly as
    // documented at https://nextjs.org/docs/app/api-reference/config/typescript
    // for non-literal strings that are still valid routes at runtime.
    router.push(`${pathname}?${params.toString()}` as Route);
  }

  const showResults = searchQuery === undefined || searchQuery.trim().length > 0;

  return (
    <div className="container-ella py-10">
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-neutral-900 md:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm text-neutral-500">{description}</p>}
      </div>

      {!showResults ? (
        <p className="py-16 text-center text-sm text-neutral-500">
          Nhập từ khóa để tìm kiếm sản phẩm.
        </p>
      ) : (
        <>
          <ListingToolbar
            totalItems={result?.totalItems ?? 0}
            sort={sort}
            onSortChange={(next) => updateParam("sort", next ?? null)}
          />

          <div className="mt-6">
            <ProductGrid
              products={result?.items ?? null}
              isLoading={isLoading}
              error={error}
              onRetry={refetch}
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
            />
          </div>

          {result && result.totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParam("page", String(page - 1))}
              >
                Trước
              </Button>
              <span className="text-sm text-neutral-500">
                Trang {page} / {result.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= result.totalPages}
                onClick={() => updateParam("page", String(page + 1))}
              >
                Sau
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
