"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Textarea } from "@/components/forms/FormFields";
import { Button } from "@/components/ui/Button";
import { reviewsApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { OrderItem } from "@/types";

interface ReviewFormProps {
  orderItem: OrderItem;
  onSubmitted: () => void;
}

/**
 * Section 23: only ever rendered by the caller for a DELIVERED order's own
 * item, one review per item, no editing afterwards. The backend (or, here,
 * mockReviewsService) re-checks eligibility regardless — this form doesn't
 * attempt to bypass that.
 */
export function ReviewForm({ orderItem, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await reviewsApi.createReview({ orderItemId: orderItem.orderItemId, rating: rating as 1 | 2 | 3 | 4 | 5, text });
      onSubmitted();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4">
      <p className="text-sm font-medium text-neutral-900">
        Đánh giá {orderItem.productName} — {orderItem.variantName}
      </p>
      <div className="flex gap-1" role="radiogroup" aria-label="Chọn số sao">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} sao`}
            aria-pressed={rating === star}
            onClick={() => setRating(star)}
          >
            <Star className={`h-6 w-6 ${star <= rating ? "fill-rose-500 text-rose-500" : "text-neutral-200"}`} />
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
      />
      {error && <p className="text-sm text-error-500">{error}</p>}
      <Button type="submit" size="sm" className="self-start" isLoading={isSubmitting} disabled={isSubmitting}>
        Gửi đánh giá
      </Button>
    </form>
  );
}
