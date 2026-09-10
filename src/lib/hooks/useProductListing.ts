"use client";

import { useCallback, useEffect, useState } from "react";
import { productsApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { ProductListItem, ProductListQuery, PaginatedResult } from "@/types";

interface UseProductListingOptions {
  categorySlug?: string;
  query: ProductListQuery;
}

interface UseProductListingResult {
  result: PaginatedResult<ProductListItem> | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Section 11/12/13 (continuation spec): the ONE place shop/category/search
 * pages fetch products from, so the fetching architecture is never
 * duplicated across routes. Always goes through `productsApi` — never
 * touches mock fixtures directly.
 */
export function useProductListing({
  categorySlug,
  query,
}: UseProductListingOptions): UseProductListingResult {
  const [result, setResult] = useState<PaginatedResult<ProductListItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const queryKey = JSON.stringify({ categorySlug, query });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = categorySlug
        ? await productsApi.listProductsByCategory(categorySlug, query)
        : await productsApi.listProducts(query);
      setResult(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, reloadToken]);

  return { result, isLoading, error, refetch: () => setReloadToken((t) => t + 1) };
}
