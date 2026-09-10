import type { CustomersService } from "../serviceTypes";
import type { Address, Customer } from "@/types";
import { ApiError } from "../apiError";
import { MOCK_ADDRESS } from "./fixtures";

// ASSUMPTION: mock auth tracks a simple in-memory "logged in" flag so the
// UI can be exercised through guest -> login -> logout -> guest again
// (Section 34). This is a development simulation only, not real session
// security — the real backend owns actual authentication.
const mockCustomer: Customer = {
  customerId: "cust-mock-1",
  fullName: "Nguyễn Thị A",
  phone: "0900000000",
  email: "customer@example.com",
};

let isLoggedIn = false;
let mockAddresses: Address[] = [MOCK_ADDRESS];

export const mockCustomersService: CustomersService = {
  async login(_phoneOrEmail, _password) {
    // ASSUMPTION: mock mode accepts any non-empty credentials.
    isLoggedIn = true;
    return mockCustomer;
  },

  async register(input) {
    isLoggedIn = true;
    return { customerId: "cust-mock-new", fullName: input.fullName, phone: input.phone, email: input.email };
  },

  async logout() {
    isLoggedIn = false;
  },

  async getProfile() {
    if (!isLoggedIn) {
      throw new ApiError("UNAUTHORIZED", "Not logged in");
    }
    return mockCustomer;
  },

  async listAddresses() {
    if (!isLoggedIn) {
      throw new ApiError("UNAUTHORIZED", "Not logged in");
    }
    return mockAddresses;
  },

  async saveAddress(address) {
    if (!isLoggedIn) {
      throw new ApiError("UNAUTHORIZED", "Not logged in");
    }
    if (address.addressId) {
      mockAddresses = mockAddresses.map((a) => (a.addressId === address.addressId ? address : a));
      return address;
    }
    const saved: Address = { ...address, addressId: `addr-${Date.now()}` };
    mockAddresses = [...mockAddresses, saved];
    return saved;
  },

  async deleteAddress(addressId) {
    if (!isLoggedIn) {
      throw new ApiError("UNAUTHORIZED", "Not logged in");
    }
    mockAddresses = mockAddresses.filter((a) => a.addressId !== addressId);
  },
};
