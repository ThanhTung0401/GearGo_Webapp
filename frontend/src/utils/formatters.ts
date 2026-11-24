// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * Ghép API_BASE cho đường dẫn ảnh tương đối (/uploads/...) để không bị 404 trên Vite dev server.
 */
export function resolveAssetUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("/uploads/")) {
    const envBase = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "";
    const normalized = envBase.replace(/\/+$/, "");
    return normalized ? `${normalized}${url}` : url;
  }
  return url;
}

/**
 * Chuẩn hóa URL đã ghép API_BASE về dạng tương đối (/uploads/...) trước khi gửi lại Backend.
 */
export function toRelativeAssetUrl(url: string): string {
  const trimmed = url.trim();
  const envBase = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "";
  const normalized = envBase.replace(/\/+$/, "");
  if (normalized && trimmed.startsWith(`${normalized}/uploads/`)) {
    return trimmed.slice(normalized.length);
  }
  return trimmed;
}

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
  // Hỗ trợ chuỗi "YYYY-MM-DD HH:mm" hoặc ISO 8601 từ Backend
  let normalized =
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(trimmed)
      ? trimmed.replace(/\s+/, "T")
      : trimmed;
  // Nếu là ISO có giây từ Backend nhưng thiếu hậu tố múi giờ, mặc định coi là UTC
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) {
    normalized += "Z";
  }
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Định dạng ngày sang chuỗi dd/MM/yyyy theo múi giờ Việt Nam (trả về fallback nếu rỗng hoặc không hợp lệ)
 */
export const formatDateVi = (value?: string | Date | null, fallback = "—"): string => {
  if (!value) return fallback;
  const date = parseDateSafe(value);
  if (!date) return typeof value === "string" ? value : fallback;
  return date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Định dạng ngày giờ sang chuỗi dd/MM/yyyy HH:mm theo múi giờ Việt Nam (trả về fallback nếu rỗng hoặc không hợp lệ)
 */
export const formatDateTimeVi = (value?: string | Date | null, fallback = "—"): string => {
  if (!value) return fallback;
  const date = parseDateSafe(value);
  if (!date) return typeof value === "string" ? value : fallback;
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Thay thế mọi chuỗi ngày giờ ISO 8601 nhúng trong văn bản thành định dạng tiếng Việt
 */
export const formatIsoDatesInText = (text: string): string =>
  text.replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/g, (iso) =>
    formatDateTimeVi(iso, iso)
  );

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
  // Loại phụ phí nhận trả / tranh chấp
  HuHongThietBi: "Hư hỏng thiết bị",
  TreHan: "Trễ hạn",
  CanVeSinh: "Cần vệ sinh",
  // Batch 1 foundation [BACKEND-ENUM]: bổ sung đủ nhãn enum backend gặp trong 23 chức năng.
  KhongDenNhan: "Không đến nhận",
  ChuaThanhToan: "Chưa thanh toán",
  Tren48Gio: "Trên 48 giờ",
  Tu24Den48Gio: "Từ 24 đến 48 giờ",
  Duoi24Gio: "Dưới 24 giờ",
  CuaHangHuy: "Cửa hàng hủy",
  SuaChua: "Sửa chữa",
  VeSinh: "Vệ sinh",
  Dat: "Đạt",
  ThieuPhuKien: "Thiếu phụ kiện",
  // Nhật ký thao tác – các hành động phổ biến
  TAO: "Tạo mới",
  CAP_NHAT: "Cập nhật",
  XOA: "Xóa",
  DUYET: "Duyệt",
  TU_CHOI: "Từ chối",
  BAN_HANH: "Ban hành",
  NGUNG_KHUYEN_MAI: "Ngừng khuyến mãi",
  GUI_THONG_BAO: "Gửi thông báo",
  CAP_QUYEN: "Cập nhật quyền",
  DOI_VAI_TRO: "Đổi vai trò",
  DANG_NHAP: "Đăng nhập",
  DANG_XUAT: "Đăng xuất",
  KHOA_TAI_KHOAN: "Khóa tài khoản",
  MO_KHOA_TAI_KHOAN: "Mở khóa tài khoản",
};

export const formatBackendEnum = (code?: string | null, fallback = "—"): string => {
  if (!code) return fallback;
  return BACKEND_ENUM_LABELS[code] ?? code;
};
