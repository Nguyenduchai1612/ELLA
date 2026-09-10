"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { Address, PaymentMethod } from "@/types";
import { useAuth, useCart } from "@/lib/state";
import { customersApi, checkoutApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { getAttribution } from "@/lib/attribution";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import {
  AddressForm,
  contactStateFromAddress,
  validateContact,
  type CheckoutContactState,
} from "@/components/checkout/AddressForm";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { VoucherInput } from "@/components/checkout/VoucherInput";
import { CartSummary } from "@/components/cart/CartSummary";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/forms/FormFields";
import { EmptyState, ErrorState, Skeleton } from "@/components/feedback/States";

export default function CheckoutPage() {
  usePageTitle("Thanh toán");
  const router = useRouter();
  const { cart, isLoading: cartLoading, error: cartError, refresh: refreshCart } = useCart();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  const [contact, setContact] = useState<CheckoutContactState>(contactStateFromAddress(null));
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutContactState, string>>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Section 17: authenticated customers may select from saved addresses.
  useEffect(() => {
    if (!isAuthenticated) return;
    void customersApi
      .listAddresses()
      .then((list) => {
        setAddresses(list);
        const preferred = list.find((a) => a.isDefault) ?? list[0];
        if (preferred) {
          setSelectedAddressId(preferred.addressId ?? "new");
          setContact(contactStateFromAddress(preferred));
        }
      })
      .catch(() => {
        // No saved addresses is a normal state, not an error worth surfacing here.
      });
  }, [isAuthenticated]);

  function handleSelectAddress(addressId: string) {
    setSelectedAddressId(addressId);
    if (addressId === "new") {
      setContact(contactStateFromAddress(null));
      return;
    }
    const found = addresses.find((a) => a.addressId === addressId);
    setContact(contactStateFromAddress(found ?? null));
  }

  async function handleSubmit() {
    const validation = validateContact(contact);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    if (!cart || cart.items.length === 0) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await checkoutApi.submitCheckout({
        guest: {
          fullName: contact.fullName,
          phone: contact.phone,
          email: contact.email || undefined,
          shippingAddress: {
            fullName: contact.fullName,
            phone: contact.phone,
            province: contact.province,
            district: contact.district,
            ward: contact.ward,
            addressLine: contact.addressLine,
          },
        },
        paymentMethod,
        voucherCode: voucherCode ?? undefined,
        attribution: getAttribution() ?? undefined,
      });

      if (result.paymentRedirectUrl) {
        // Section 21: the redirect itself is never treated as confirmation —
        // the payment provider/backend result is checked on return.
        window.location.href = result.paymentRedirectUrl;
        return;
      }
      // App Router's router.push() only accepts a string (no {pathname,
      // query} object form like Pages Router's next/router). "/order/success"
      // is a known literal, so only the appended query string needs the
      // documented `as Route` cast for typedRoutes.
      router.push(`/order/success?orderNumber=${encodeURIComponent(result.order.orderNumber)}` as Route);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  if (cartLoading || authLoading) {
    return (
      <div className="container-ella py-10">
        <Skeleton className="h-8 w-40" />
        <div className="mt-8 grid gap-10 md:grid-cols-3">
          <Skeleton className="h-96 md:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (cartError && !cart) {
    return (
      <div className="container-ella py-10">
        <ErrorState message={cartError} onRetry={refreshCart} />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-ella py-10">
        <EmptyState
          title="Giỏ hàng trống"
          description="Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán."
          action={
            <Button variant="outline" size="sm" onClick={() => router.push("/shop")}>
              Đến trang mua sắm
            </Button>
          }
        />
      </div>
    );
  }

  const displayTotal = cart.subtotal - voucherDiscount + cart.shippingFee;

  return (
    <div className="container-ella py-10">
      <h1 className="mb-8 font-serif text-2xl text-neutral-900">Thanh toán</h1>

      <div className="grid gap-10 md:grid-cols-3">
        <div className="flex flex-col gap-8 md:col-span-2">
          <section>
            <h2 className="mb-4 text-base font-medium text-neutral-900">Thông tin giao hàng</h2>
            {isAuthenticated && addresses.length > 0 && (
              <div className="mb-4">
                <Select
                  aria-label="Chọn địa chỉ đã lưu"
                  value={selectedAddressId}
                  onChange={(e) => handleSelectAddress(e.target.value)}
                  className="!h-10 w-full sm:w-72"
                >
                  {addresses.map((a) => (
                    <option key={a.addressId} value={a.addressId}>
                      {a.fullName} — {a.addressLine}, {a.ward}
                    </option>
                  ))}
                  <option value="new">+ Nhập địa chỉ mới</option>
                </Select>
              </div>
            )}
            <AddressForm value={contact} onChange={setContact} errors={errors} />
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-neutral-900">Phương thức thanh toán</h2>
            <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
          </section>

          <section>
            <h2 className="mb-4 text-base font-medium text-neutral-900">Mã giảm giá</h2>
            <VoucherInput
              subtotal={cart.subtotal}
              appliedCode={voucherCode}
              onApply={(code, discount) => {
                setVoucherCode(code);
                setVoucherDiscount(discount);
              }}
              onRemove={() => {
                setVoucherCode(null);
                setVoucherDiscount(0);
              }}
            />
          </section>
        </div>

        <div>
          <CartSummary
            subtotal={cart.subtotal}
            discount={voucherDiscount}
            shippingFee={cart.shippingFee}
            total={displayTotal}
          >
            {submitError && (
              <p className="text-sm text-error-500" role="alert">
                {submitError}
              </p>
            )}
            <Button
              className="mt-2 w-full"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              Đặt hàng
            </Button>
          </CartSummary>
        </div>
      </div>
    </div>
  );
}
