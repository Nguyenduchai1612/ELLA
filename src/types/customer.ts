/** Section 18: only the minimum required checkout fields are collected. */
export interface Address {
  addressId?: string;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  isDefault?: boolean;
}

export interface Customer {
  customerId: string;
  fullName: string;
  phone: string;
  email?: string;
}

/** Section 15: guest checkout requires no account. */
export interface GuestCheckoutInfo {
  fullName: string;
  phone: string;
  email?: string;
  shippingAddress: Address;
}
