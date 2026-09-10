"use client";

import { useCallback, useEffect, useState } from "react";
import { RequireAuth } from "@/components/account/RequireAuth";
import { AccountNav } from "@/components/account/AccountNav";
import { AddressForm, contactStateFromAddress, validateContact } from "@/components/checkout/AddressForm";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/feedback/States";
import { customersApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import type { Address } from "@/types";

function AddressCard({
  address,
  onEdit,
  onDelete,
  isDeleting,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 p-4">
      <div className="text-sm">
        <p className="font-medium text-neutral-900">
          {address.fullName}
          {address.isDefault && (
            <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700">
              Mặc định
            </span>
          )}
        </p>
        <p className="text-neutral-500">{address.phone}</p>
        <p className="text-neutral-500">
          {address.addressLine}, {address.ward}, {address.district}, {address.province}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Sửa
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} isLoading={isDeleting}>
          Xóa
        </Button>
      </div>
    </div>
  );
}

function AddressesManager() {
  usePageTitle("Sổ địa chỉ");
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [formState, setFormState] = useState(contactStateFromAddress(null));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    customersApi
      .listAddresses()
      .then(setAddresses)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(load, [load]);

  function startEdit(address: Address | "new") {
    setEditing(address);
    setFormState(contactStateFromAddress(address === "new" ? null : address));
    setFormErrors({});
  }

  async function handleSave() {
    const validation = validateContact(formState);
    setFormErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setIsSaving(true);
    try {
      await customersApi.saveAddress({
        addressId: editing !== "new" && editing ? editing.addressId : undefined,
        fullName: formState.fullName,
        phone: formState.phone,
        province: formState.province,
        district: formState.district,
        ward: formState.ward,
        addressLine: formState.addressLine,
      });
      setEditing(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(addressId: string | undefined) {
    if (!addressId) return;
    setDeletingId(addressId);
    try {
      await customersApi.deleteAddress(addressId);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  if (error && !addresses) return <ErrorState message={error} onRetry={load} />;
  if (!addresses) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-error-500">{error}</p>}

      {editing ? (
        <div className="rounded-xl border border-neutral-200 p-4">
          <AddressForm value={formState} onChange={setFormState} errors={formErrors} emailOptional />
          <div className="mt-4 flex gap-2">
            <Button size="sm" isLoading={isSaving} onClick={handleSave}>
              Lưu địa chỉ
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
              Hủy
            </Button>
          </div>
        </div>
      ) : addresses.length === 0 ? (
        <EmptyState
          title="Chưa có địa chỉ nào"
          description="Thêm địa chỉ để thanh toán nhanh hơn ở lần mua tiếp theo."
          action={
            <Button size="sm" onClick={() => startEdit("new")}>
              Thêm địa chỉ
            </Button>
          }
        />
      ) : (
        <>
          {addresses.map((address) => (
            <AddressCard
              key={address.addressId}
              address={address}
              onEdit={() => startEdit(address)}
              onDelete={() => handleDelete(address.addressId)}
              isDeleting={deletingId === address.addressId}
            />
          ))}
          <Button variant="outline" size="sm" className="self-start" onClick={() => startEdit("new")}>
            + Thêm địa chỉ mới
          </Button>
        </>
      )}
    </div>
  );
}

export default function AddressesPage() {
  return (
    <RequireAuth>
      <div className="container-ella py-10">
        <h1 className="mb-8 font-serif text-2xl text-neutral-900">Sổ địa chỉ</h1>
        <div className="grid gap-8 md:grid-cols-[200px_1fr]">
          <AccountNav />
          <AddressesManager />
        </div>
      </div>
    </RequireAuth>
  );
}
