import Link from "next/link";
import Image from "next/image";
import { productsApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { ProductCard } from "@/components/product/ProductCard";
import { EmptyState, ErrorState } from "@/components/feedback/States";
import { Button } from "@/components/ui/Button";
import { NAV_CATEGORIES } from "@/lib/navigation";
import type { ProductListItem } from "@/types";

async function getFeaturedProducts(): Promise<{ items: ProductListItem[]; error: string | null }> {
  try {
    const result = await productsApi.listProducts({ sort: "newest", pageSize: 8 });
    return { items: result.items, error: null };
  } catch (err) {
    return { items: [], error: getErrorMessage(err) };
  }
}

export default async function HomePage() {
  const { items: featuredProducts, error } = await getFeaturedProducts();

  return (
    <div>
      {/* Hero */}
      <section className="container-ella grid items-center gap-10 py-14 md:grid-cols-2 md:py-24">
        <div className="order-2 flex flex-col items-start gap-5 md:order-1">
          <span className="text-xs uppercase tracking-widest text-rose-500">
            Bộ sưu tập mới
          </span>
          <h1 className="font-serif text-3xl leading-tight text-neutral-900 md:text-5xl">
            Tôn vinh vẻ đẹp
            <br />
            trong từng chi tiết
          </h1>
          <p className="max-w-md text-sm text-neutral-600 md:text-base">
            Trang sức, mắt kính, đồng hồ và phụ kiện được chọn lọc dành cho phái đẹp hiện đại.
          </p>
          <Link href="/shop">
            <Button size="lg">Khám phá ngay</Button>
          </Link>
        </div>
        <div className="relative order-1 aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-100 md:order-2">
          {featuredProducts[0] && (
            <Image
              src={featuredProducts[0].primaryImage.url}
              alt={featuredProducts[0].primaryImage.alt}
              fill
              priority
              sizes="(min-width: 768px) 46vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
      </section>

      {/* Featured categories */}
      <section className="container-ella py-10">
        <h2 className="mb-6 font-serif text-xl text-neutral-900 md:text-2xl">Danh mục nổi bật</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {NAV_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-neutral-100 text-center transition-colors hover:bg-neutral-200"
            >
              <span className="font-serif text-lg text-neutral-900">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured / new arrivals */}
      <section className="container-ella py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-xl text-neutral-900 md:text-2xl">Sản phẩm mới</h2>
          <Link href="/shop" className="text-sm text-neutral-500 underline underline-offset-2">
            Xem tất cả
          </Link>
        </div>

        {error ? (
          <ErrorState message={error} />
        ) : featuredProducts.length === 0 ? (
          <EmptyState
            title="Chưa có sản phẩm"
            description="ELLA sẽ sớm cập nhật những sản phẩm mới nhất tại đây."
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Brand / value section */}
      <section className="bg-white py-16">
        <div className="container-ella grid gap-10 text-center md:grid-cols-3">
          <div>
            <h3 className="font-serif text-lg text-neutral-900">Thiết kế tinh tế</h3>
            <p className="mt-2 text-sm text-neutral-500">
              Từng sản phẩm được chọn lọc kỹ lưỡng, tôn lên vẻ đẹp riêng của bạn.
            </p>
          </div>
          <div>
            <h3 className="font-serif text-lg text-neutral-900">Miễn phí vận chuyển</h3>
            <p className="mt-2 text-sm text-neutral-500">
              Freeship là quà tặng dành cho mọi đơn hàng của ELLA.
            </p>
          </div>
          <div>
            <h3 className="font-serif text-lg text-neutral-900">Hỗ trợ tận tâm</h3>
            <p className="mt-2 text-sm text-neutral-500">
              Đội ngũ ELLA luôn sẵn sàng hỗ trợ bạn trong suốt quá trình mua sắm.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-ella py-16 text-center">
        <h2 className="font-serif text-2xl text-neutral-900 md:text-3xl">
          Sẵn sàng làm mới phong cách?
        </h2>
        <Link href="/shop" className="mt-6 inline-block">
          <Button size="lg">Mua sắm ngay</Button>
        </Link>
      </section>
    </div>
  );
}
