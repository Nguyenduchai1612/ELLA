// Re-export các file hiện có
export * from "./api";
export * from "./attribution";

// Định nghĩa bổ sung các Type mà các trang UI đang cần
export interface Address {
  id: string;
  fullName: string;
  phone: string;
  addressLine: string; // <-- Bổ sung hoặc đổi tên thuộc tính này thành addressLine
  ward: string;
  district: string;
  province: string;
  isDefault?: boolean;
}

export interface CustomerProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  description?: string;
  images: string[];
  category?: string;
  inStock: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  skuId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variantOptions?: Record<string, string>;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  items: CartItem[];
  shippingAddress: Address;
  paymentMethod: string;
}
