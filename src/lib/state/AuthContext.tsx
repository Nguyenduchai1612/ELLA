"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Customer } from "@/types";
import { customersApi } from "@/lib/api";

interface AuthContextValue {
  customer: Customer | null;
  isLoading: boolean;
  /** Section 16: authentication is never a purchase prerequisite — this
   * flag only gates account-only UI (order history, addresses, etc.). */
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  login: (phoneOrEmail: string, password: string) => Promise<void>;
  register: (input: { fullName: string; phone: string; email?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const profile = await customersApi.getProfile();
      setCustomer(profile);
    } catch {
      // Not logged in — this is an expected, non-error state (Section 16).
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await customersApi.logout();
    setCustomer(null);
  }, []);

  const login = useCallback(async (phoneOrEmail: string, password: string) => {
    const result = await customersApi.login(phoneOrEmail, password);
    setCustomer(result);
  }, []);

  const register = useCallback(
    async (input: { fullName: string; phone: string; email?: string; password: string }) => {
      const result = await customersApi.register(input);
      setCustomer(result);
    },
    [],
  );

  const value = useMemo(
    () => ({ customer, isLoading, isAuthenticated: customer !== null, refresh, login, register, logout }),
    [customer, isLoading, refresh, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
