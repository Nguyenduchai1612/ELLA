"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Cart } from "@/types";
import { cartApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

interface CartContextValue {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  addItem: (skuId: string, quantity: number) => Promise<void>;
  updateItem: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

/**
 * Section 34: cart is server state (source of truth lives behind cartApi /
 * the backend), fetched and cached here rather than duplicated into a
 * global client store. This context is a thin cache + mutation layer —
 * it can be swapped for React Query/SWR later without touching consumers.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await cartApi.getCart();
      setCart(next);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback(async (skuId: string, quantity: number) => {
    setError(null);
    try {
      const next = await cartApi.addItem({ skuId, quantity });
      setCart(next);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  }, []);

  const updateItem = useCallback(async (cartItemId: string, quantity: number) => {
    setError(null);
    try {
      const next = await cartApi.updateItem({ cartItemId, quantity });
      setCart(next);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  }, []);

  const removeItem = useCallback(async (cartItemId: string) => {
    setError(null);
    try {
      const next = await cartApi.removeItem(cartItemId);
      setCart(next);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({ cart, isLoading, error, addItem, updateItem, removeItem, refresh }),
    [cart, isLoading, error, addItem, updateItem, removeItem, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
