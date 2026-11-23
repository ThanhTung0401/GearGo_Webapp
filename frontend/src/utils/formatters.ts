// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * Định dạng số tiền sang chuẩn VNĐ (Ví dụ: 150000 -> "150.000đ")
 */
export const fmt = (n?: number | null): string =>
  (Number.isFinite(Number(n)) ? Number(n) : 0).toLocaleString("vi-VN") + "đ";

/**
 * Định dạng số nguyên theo chuẩn Việt Nam (Ví dụ: 1500 -> "1.500")
 */
export const formatNumberVi = (n?: number | null): string =>
  (Number.isFinite(Number(n)) ? Number(n) : 0).toLocaleString("vi-VN");

/**
 * Parse an toàn chuỗi thời gian từ Backend/Mock (ISO UTC, YYYY-MM-DD HH:mm, hoặc Date)
 */
function parseDateSafe(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  // Hỗ trợ chuỗi "YYYY-MM-DD HH:mm" hoặc "YYYY-MM-DD"
  const normalized =
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(trimmed)
      ? trimmed.replace(/\s+/, "T")
      : trimmed;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Định dạng ngày sang chuỗi dd/MM/yyyy (trả về fallback nếu rỗng hoặc không hợp lệ)
 */
export const formatDateVi = (value?: string | Date | null, fallback = "—"): string => {
  if (!value) return fallback;
  const date = parseDateSafe(value);
  if (!date) return typeof value === "string" ? value : fallback;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Định dạng ngày giờ sang chuỗi dd/MM/yyyy HH:mm (trả về fallback nếu rỗng hoặc không hợp lệ)
 */
export const formatDateTimeVi = (value?: string | Date | null, fallback = "—"): string => {
  if (!value) return fallback;
  const date = parseDateSafe(value);
  if (!date) return typeof value === "string" ? value : fallback;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Ánh xạ nhãn tiếng Việt cho các mã enum backend tránh hiển thị chuỗi thô lên UI
 */
const BACKEND_ENUM_LABELS: Record<string, string> = {
  // Biên bản nhận trả / điều chỉnh / lịch thiết bị
  Nhap: "Nháp",
  DaChot: "Đã chốt",
  DaDuyet: "Đã duyệt",
  DaApDung: "Đã áp dụng",
  ChoDuyet: "Chờ duyệt",
  TuChoi: "Từ chối",
  DaHuy: "Đã hủy",
  // Trạng thái thiết bị / phân công
  SanSang: "Sẵn sàng",
  DangGiuCho: "Đang giữ chỗ",
  DangThue: "Đang thuê",
  DaPhanCong: "Đã phân công",
  DaBanGiao: "Đã bàn giao",
  DaGiao: "Đã bàn giao",
  DaNhanTra: "Đã nhận trả",
  DangBaoTri: "Đang bảo trì",
  ChoBaoTri: "Chờ bảo trì",
  MatThietBi: "Mất thiết bị",
  NgungSuDung: "Ngừng sử dụng",
  // Kết quả liên hệ quá hạn
  HenTraMoi: "Hẹn trả mới",
  KhongNgheMay: "Không nghe máy",
  DaXacNhanTra: "Đã xác nhận trả",
  DaLienHe: "Đã liên hệ",
  KhongLienLacDuoc: "Không liên lạc được",
  // Loại điều chỉnh kho / phiếu nhập
  SaiGiaNhap: "Sai giá nhập",
  SaiSoLuong: "Sai số lượng",
  KiemKeThieu: "Kiểm kê thiếu",
  KiemKeThua: "Kiểm kê thừa",
  GiangCap: "Giáng cấp",
  NangCap: "Chuyển loại / Nâng cấp",
  ThayDoiTrangThai: "Thay đổi trạng thái",
  // Trạng thái hoàn tiền & chính sách No-Show
  ChoXuLy: "Chờ xử lý",
  DangXuLy: "Đang xử lý",
  DaHoanTien: "Đã hoàn tiền",
  HoanThanh: "Hoàn thành",
  ThatBai: "Thất bại",
  NoShowHoanCoc: "Không đến nhận — Hoàn cọc theo chính sách",
  NoShowGiuCoc: "Không đến nhận — Giữ cọc theo chính sách",
  NoShowHuyDon: "Không đến nhận — Hủy đơn giữ chỗ",
};

export const formatBackendEnum = (code?: string | null, fallback = "—"): string => {
  if (!code) return fallback;
  return BACKEND_ENUM_LABELS[code] ?? code;
};
