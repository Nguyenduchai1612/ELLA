"use client";

import { useState } from "react";
import { Field, Input, Textarea } from "@/components/forms/FormFields";
import { Button } from "@/components/ui/Button";
import { ordersApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { ReturnRequest } from "@/types";

interface ReturnRequestFormProps {
  orderId: string;
  onSubmitted: (request: ReturnRequest) => void;
}

export function ReturnRequestForm({ orderId, onSubmitted }: ReturnRequestFormProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do trả hàng.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await ordersApi.createReturnRequest({ orderId, reason, description });
      onSubmitted(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4">
      <Field label="Lý do trả hàng" htmlFor="returnReason" required>
        <Input id="returnReason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Field label="Mô tả chi tiết" htmlFor="returnDescription" hint="Không bắt buộc">
        <Textarea
          id="returnDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      {error && <p className="text-sm text-error-500">{error}</p>}
      <Button type="submit" size="sm" className="self-start" isLoading={isSubmitting} disabled={isSubmitting}>
        Gửi yêu cầu trả hàng
      </Button>
    </form>
  );
}
