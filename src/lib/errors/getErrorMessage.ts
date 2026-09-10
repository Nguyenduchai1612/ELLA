import type { ApiErrorCode } from "@/types";
import { isApiError } from "@/lib/api/apiError";

const MESSAGES: Record<ApiErrorCode, string> = {
  INVALID_SKU: "Phân loại sản phẩm không hợp lệ. Vui lòng chọn lại.",
  PRODUCT_NOT_FOUND: "Không tìm thấy sản phẩm này.",
  SKU_NOT_FOUND: "Không tìm thấy phân loại sản phẩm này.",
  INSUFFICIENT_STOCK: "Sản phẩm không đủ số lượng trong kho. Vui lòng giảm số lượng.",
  RESERVATION_EXPIRED: "Giỏ hàng của bạn đã hết thời gian giữ chỗ. Vui lòng thử lại.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng này.",
  ORDER_NOT_CANCELLABLE: "Đơn hàng này không thể hủy ở thời điểm hiện tại.",
  PAYMENT_FAILED: "Thanh toán không thành công. Vui lòng thử lại.",
  INVALID_VOUCHER: "Mã giảm giá không hợp lệ hoặc đã hết hạn.",
  REVIEW_NOT_ALLOWED: "Bạn chưa thể đánh giá sản phẩm này.",
  REVIEW_ALREADY_EXISTS: "Bạn đã đánh giá sản phẩm này rồi.",
  UNAUTHORIZED: "Vui lòng đăng nhập để tiếp tục.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  VALIDATION_ERROR: "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.",
  UNKNOWN_ERROR: "Đã có lỗi xảy ra. Vui lòng thử lại sau.",
};

/**
 * Section 35: the ONLY place raw backend errors are translated for
 * customer display. UI code should never string-match error messages
 * itself — always go through this function.
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return MESSAGES[error.code] ?? MESSAGES.UNKNOWN_ERROR;
  }
  return MESSAGES.UNKNOWN_ERROR;
}
