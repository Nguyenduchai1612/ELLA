import Link from "next/link";
import { NAV_CATEGORIES } from "@/lib/navigation";

/**
 * Section 9 (continuation): footer must not invent fake company/legal
 * information. Support details below are clearly-editable placeholders
 * ([Điền ...]) rather than fabricated addresses/hotlines/tax codes.
 */
export function Footer() {
  return (
    <footer className="mt-20 border-t border-neutral-200 bg-white">
      <div className="container-ella grid gap-10 py-14 md:grid-cols-4">
        <div>
          <span className="font-serif text-xl tracking-wide">ELLA</span>
          <p className="mt-3 max-w-xs text-sm text-neutral-500">
            Trang sức, mắt kính, đồng hồ &amp; phụ kiện thời trang.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-neutral-900">Mua sắm</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-neutral-500">
            <li>
              <Link href="/shop" className="hover:text-neutral-900">
                Tất cả sản phẩm
              </Link>
            </li>
            {NAV_CATEGORIES.map((cat) => (
              <li key={cat.slug}>
                <Link href={`/category/${cat.slug}`} className="hover:text-neutral-900">
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-medium text-neutral-900">Hỗ trợ khách hàng</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-neutral-500">
            <li>Hotline: [Điền số hotline]</li>
            <li>Email: [Điền email hỗ trợ]</li>
            <li>Giờ làm việc: [Điền giờ làm việc]</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-medium text-neutral-900">Chính sách</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-neutral-500">
            <li>[Điền chính sách đổi trả]</li>
            <li>[Điền chính sách bảo hành]</li>
            <li>[Điền chính sách vận chuyển]</li>
            <li>[Điền chính sách bảo mật]</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-neutral-200 py-6">
        <p className="container-ella text-xs text-neutral-400">
          © {new Date().getFullYear()} ELLA. [Điền tên pháp nhân / mã số đăng ký kinh doanh].
        </p>
      </div>
    </footer>
  );
}
