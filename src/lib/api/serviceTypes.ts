import type {
  Product,
  ProductListItem,
  ProductListQuery,
  PaginatedResult,
  Cart,
  AddCartItemRequest,
  UpdateCartItemRequest,
  Order,
  OrderListItem,
  GuestCheckoutInfo,
  Address,
  Customer,
  PaymentMethod,
  PaymentResult,
  Review,
  CreateReviewRequest,
  CreateReturnRequest,
  ReturnRequest,
  MarketingAttribution,
} from "@/types";

/**
 * Section 43: every backing implementation (Mock*, Real*) must satisfy
 * these interfaces so swapping one for the other never touches UI code.
 */

export interface ProductService {
  listProducts(query: ProductListQuery): Promise<PaginatedResult<ProductListItem>>;
  getProductBySlug(slug: string): Promise<Product>;
  listProductsByCategory(
    categorySlug: string,
    query?: ProductListQuery,
  ): Promise<PaginatedResult<ProductListItem>>;
}

export interface CartService {
  getCart(): Promise<Cart>;
  addItem(request: AddCartItemRequest): Promise<Cart>;
  updateItem(request: UpdateCartItemRequest): Promise<Cart>;
  removeItem(cartItemId: string): Promise<Cart>;
}

export interface CheckoutRequest {
  guest: GuestCheckoutInfo;
  paymentMethod: PaymentMethod;
  voucherCode?: string;
  attribution?: MarketingAttribution;
}

export interface CheckoutResult {
  order: Order;
  /** Present for ONLINE payment; the frontend redirects here and never
   * treats the redirect return itself as confirmation (Section 21). */
  paymentRedirectUrl?: string;
}

export interface VoucherPreview {
  code: string;
  discountAmount: number;
}

export interface CheckoutService {
  submitCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  /**
   * Section 17: voucher validity/discount is always backend-authoritative.
   * This lets the checkout page show the discount before final submission
   * without ever computing it client-side.
   */
  previewVoucher(code: string, subtotal: number): Promise<VoucherPreview>;
}

export interface OrdersService {
  listOrders(): Promise<OrderListItem[]>;
  getOrder(orderNumber: string): Promise<Order>;
  cancelOrder(orderId: string): Promise<Order>;
  createReturnRequest(request: CreateReturnRequest): Promise<ReturnRequest>;
}

export interface CustomersService {
  login(phoneOrEmail: string, password: string): Promise<Customer>;
  register(input: { fullName: string; phone: string; email?: string; password: string }): Promise<Customer>;
  logout(): Promise<void>;
  getProfile(): Promise<Customer>;
  listAddresses(): Promise<Address[]>;
  saveAddress(address: Address): Promise<Address>;
  deleteAddress(addressId: string): Promise<void>;
}

export interface ReviewsService {
  createReview(request: CreateReviewRequest): Promise<Review>;
  listReviewsForProduct(productId: string): Promise<Review[]>;
}

export interface PaymentsService {
  getPaymentResult(orderId: string): Promise<PaymentResult>;
}
