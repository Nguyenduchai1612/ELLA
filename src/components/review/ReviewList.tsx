import Image from "next/image";
import { Star } from "lucide-react";
import type { Review } from "@/types";
import { EmptyState } from "@/components/feedback/States";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} trên 5 sao`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "fill-rose-500 text-rose-500" : "text-neutral-200"}`}
        />
      ))}
    </div>
  );
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        title="Chưa có đánh giá nào"
        description="Hãy là người đầu tiên đánh giá sản phẩm này sau khi nhận hàng."
      />
    );
  }

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-medium">{average.toFixed(1)}</span>
        <div>
          <Stars rating={Math.round(average)} />
          <p className="text-xs text-neutral-500">{reviews.length} đánh giá</p>
        </div>
      </div>

      <ul className="flex flex-col gap-6">
        {reviews.map((review) => (
          <li key={review.reviewId} className="border-t border-neutral-200 pt-6">
            <Stars rating={review.rating} />
            <p className="mt-2 text-sm text-neutral-700">{review.text}</p>
            {review.images.length > 0 && (
              <div className="mt-3 flex gap-2">
                {review.images.map((url, i) => (
                  <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg bg-neutral-100">
                    <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-neutral-400">
              {new Date(review.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
