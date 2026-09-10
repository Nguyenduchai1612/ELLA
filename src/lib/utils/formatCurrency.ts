/**
 * Formats a numeric price into Vietnamese currency display, e.g. 89000 -> "89.000đ".
 * Section 6: the frontend only ever formats a value the backend supplied —
 * it never computes the value itself.
 */
export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(amount))}đ`;
}
