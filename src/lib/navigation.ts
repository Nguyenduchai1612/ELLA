/**
 * Static nav taxonomy per the business model (spec Section 1: Jewelry,
 * Eyewear, Watches, Accessories). Slugs beyond what mock fixtures cover
 * intentionally exist to exercise the category page's empty state.
 */
export const NAV_CATEGORIES = [
  { name: "Trang sức", slug: "jewelry" },
  { name: "Mắt kính", slug: "eyewear" },
  { name: "Đồng hồ", slug: "watches" },
  { name: "Phụ kiện", slug: "accessories" },
] as const;
