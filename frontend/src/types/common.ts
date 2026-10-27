// ─── Common Types ─────────────────────────────────────────────────────────────

export type Role = "customer" | "staff" | "admin";

export type OrderStatus =
  | "Chờ thanh toán"
  | "Đã xác nhận"
  | "Đang chuẩn bị"
  | "Sẵn sàng nhận"
  | "Đang thuê"
  | "Đã nhận trả"
  | "Chờ đối soát"
  | "Hoàn tất"
  | "Hết hạn"
  | "Khách hủy"
  | "Cửa hàng hủy";

export type EquipmentStatus =
  | "Sẵn sàng"
  | "Đang thuê"
  | "Đang bảo trì"
  | "Thất lạc"
  | "Ngừng sử dụng";

export type ActionResult<T = void> =
  | ([T] extends [void] ? { ok: true; data?: undefined } : { ok: true; data: T })
  | { ok: false; message: string; fieldErrors?: Record<string, string>; data?: undefined };

export type TransactionStatus = "Đang xử lý" | "Thành công" | "Thất bại" | "Hết hạn";
export type TransactionType = "Thanh toán ban đầu" | "Hoàn cọc" | "Thu thêm" | "Hoàn tiền hủy";

export interface MoneyTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  createdAt: string;
  completedAt?: string;
  note?: string;
  referenceCode?: string; // Mã tham chiếu / mã đối soát ngân hàng (FT... hoặc POS-...)
  method?: string; // VietQR / Tiền mặt / Máy POS / Chuyển khoản
}
