import type { CustomersService } from "../serviceTypes";
import type { Address, Customer } from "@/types";
import { httpRequest } from "../httpClient";

export const realCustomersService: CustomersService = {
  async login(phoneOrEmail, password) {
    return httpRequest<Customer>("/api/auth/login", {
      method: "POST",
      body: { phoneOrEmail, password },
    });
  },

  async register(input) {
    return httpRequest<Customer>("/api/auth/register", { method: "POST", body: input });
  },

  async logout() {
    await httpRequest<void>("/api/auth/logout", { method: "POST" });
  },

  async getProfile() {
    return httpRequest<Customer>("/api/customers/me", { cache: "no-store" });
  },

  async listAddresses() {
    return httpRequest<Address[]>("/api/customers/me/addresses", { cache: "no-store" });
  },

  async saveAddress(address) {
    if (address.addressId) {
      return httpRequest<Address>(`/api/customers/me/addresses/${address.addressId}`, {
        method: "PUT",
        body: address,
      });
    }
    return httpRequest<Address>("/api/customers/me/addresses", { method: "POST", body: address });
  },

  async deleteAddress(addressId) {
    await httpRequest<void>(`/api/customers/me/addresses/${addressId}`, { method: "DELETE" });
  },
};
