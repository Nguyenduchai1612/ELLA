"use client";

import type { Address } from "@/types";
import { Field, Input } from "@/components/forms/FormFields";

export interface CheckoutContactState {
  fullName: string;
  phone: string;
  email: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
}

export function contactStateFromAddress(address: Address | null): CheckoutContactState {
  return {
    fullName: address?.fullName ?? "",
    phone: address?.phone ?? "",
    email: "",
    province: address?.province ?? "",
    district: address?.district ?? "",
    ward: address?.ward ?? "",
    addressLine: address?.addressLine ?? "",
  };
}

interface AddressFormProps {
  value: CheckoutContactState;
  onChange: (next: CheckoutContactState) => void;
  errors: Partial<Record<keyof CheckoutContactState, string>>;
  emailOptional?: boolean;
}

/** Section 18: only the minimum required checkout fields are collected. */
export function AddressForm({ value, onChange, errors, emailOptional = true }: AddressFormProps) {
  function set<K extends keyof CheckoutContactState>(key: K, v: CheckoutContactState[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Họ và tên" htmlFor="fullName" required error={errors.fullName}>
        <Input
          id="fullName"
          value={value.fullName}
          hasError={Boolean(errors.fullName)}
          onChange={(e) => set("fullName", e.target.value)}
          autoComplete="name"
        />
      </Field>
      <Field label="Số điện thoại" htmlFor="phone" required error={errors.phone}>
        <Input
          id="phone"
          value={value.phone}
          hasError={Boolean(errors.phone)}
          onChange={(e) => set("phone", e.target.value)}
          autoComplete="tel"
          inputMode="tel"
        />
      </Field>
      <Field
        label="Email"
        htmlFor="email"
        required={!emailOptional}
        error={errors.email}
        hint={emailOptional ? "Không bắt buộc" : undefined}
      >
        <Input
          id="email"
          type="email"
          value={value.email}
          hasError={Boolean(errors.email)}
          onChange={(e) => set("email", e.target.value)}
          autoComplete="email"
        />
      </Field>
      <Field label="Tỉnh/Thành phố" htmlFor="province" required error={errors.province}>
        <Input
          id="province"
          value={value.province}
          hasError={Boolean(errors.province)}
          onChange={(e) => set("province", e.target.value)}
        />
      </Field>
      <Field label="Quận/Huyện" htmlFor="district" required error={errors.district}>
        <Input
          id="district"
          value={value.district}
          hasError={Boolean(errors.district)}
          onChange={(e) => set("district", e.target.value)}
        />
      </Field>
      <Field label="Phường/Xã" htmlFor="ward" required error={errors.ward}>
        <Input
          id="ward"
          value={value.ward}
          hasError={Boolean(errors.ward)}
          onChange={(e) => set("ward", e.target.value)}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Địa chỉ cụ thể" htmlFor="addressLine" required error={errors.addressLine}>
          <Input
            id="addressLine"
            value={value.addressLine}
            hasError={Boolean(errors.addressLine)}
            onChange={(e) => set("addressLine", e.target.value)}
            placeholder="Số nhà, tên đường..."
          />
        </Field>
      </div>
    </div>
  );
}

export function validateContact(
  value: CheckoutContactState,
  emailOptional = true,
): Partial<Record<keyof CheckoutContactState, string>> {
  const errors: Partial<Record<keyof CheckoutContactState, string>> = {};
  if (!value.fullName.trim()) errors.fullName = "Vui lòng nhập họ tên.";
  if (!/^0\d{9,10}$/.test(value.phone.trim())) errors.phone = "Số điện thoại không hợp lệ.";
  if (!emailOptional && !value.email.trim()) errors.email = "Vui lòng nhập email.";
  if (value.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim())) {
    errors.email = "Email không hợp lệ.";
  }
  if (!value.province.trim()) errors.province = "Vui lòng nhập tỉnh/thành phố.";
  if (!value.district.trim()) errors.district = "Vui lòng nhập quận/huyện.";
  if (!value.ward.trim()) errors.ward = "Vui lòng nhập phường/xã.";
  if (!value.addressLine.trim()) errors.addressLine = "Vui lòng nhập địa chỉ cụ thể.";
  return errors;
}
