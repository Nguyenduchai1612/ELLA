"use client";

import { RequireAuth } from "@/components/account/RequireAuth";
import { AccountNav } from "@/components/account/AccountNav";
import { Field, Input } from "@/components/forms/FormFields";
import { useAuth } from "@/lib/state";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

/**
 * Section 21: only fields the API actually supports editing are shown as
 * editable. Phase 1's CustomersService doesn't expose an "update profile"
 * method yet, so fields are read-only here rather than faking a save that
 * silently does nothing — a real update flow is a Phase 16 addition once
 * the backend contract defines what's editable.
 */
function ProfileView() {
  usePageTitle("Hồ sơ");
  const { customer } = useAuth();

  return (
    <div className="max-w-md">
      <div className="flex flex-col gap-4">
        <Field label="Họ và tên" htmlFor="profileName">
          <Input id="profileName" value={customer?.fullName ?? ""} disabled />
        </Field>
        <Field label="Số điện thoại" htmlFor="profilePhone">
          <Input id="profilePhone" value={customer?.phone ?? ""} disabled />
        </Field>
        <Field label="Email" htmlFor="profileEmail">
          <Input id="profileEmail" value={customer?.email ?? ""} disabled />
        </Field>
        <p className="text-xs text-neutral-400">
          Chỉnh sửa hồ sơ sẽ khả dụng khi tính năng này được hỗ trợ từ hệ thống.
        </p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <div className="container-ella py-10">
        <h1 className="mb-8 font-serif text-2xl text-neutral-900">Hồ sơ</h1>
        <div className="grid gap-8 md:grid-cols-[200px_1fr]">
          <AccountNav />
          <ProfileView />
        </div>
      </div>
    </RequireAuth>
  );
}
