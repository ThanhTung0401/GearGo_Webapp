/**
 * reviewNotifAuditMapper.ts - Ánh xạ DTO Đánh giá, Thông báo & Nhật ký thao tác (M9–M10)
 */

import type { AppNotification, AuditLogEntry, Review } from "../../types";
import type { NhatKyThaoTacBackend } from "../api/auditApi";
import type { ThongBaoBackend } from "../api/notificationApi";
import type { DanhGiaBackend } from "../api/reviewApi";
import { formatBackendEnum, formatIsoDatesInText } from "../../utils/formatters";

export function mapDanhGiaToReview(dg: DanhGiaBackend): Review {
  const hasReply = Boolean(dg.phanHoiCuaHang);
  const createdAt = dg.thoiDiemTao ?? dg.ngayTao ?? new Date().toISOString();
  return {
    id: String(dg.maDanhGia),
    orderId: String(dg.maDonThue ?? dg.maChiTietDon ?? ""),
    productId: String(dg.maSanPham),
    productName: dg.tenSanPham ?? "",
    customerId: String(dg.maKhachHang ?? ""),
    customerName: dg.tenKhachHang ?? dg.tenNguoiDung ?? "Khách hàng",
    rating: dg.soSao,
    comment: dg.noiDung ?? "",
    images: Array.isArray(dg.danhSachAnh) ? dg.danhSachAnh : [],
    createdAt,
    status: dg.trangThaiHienThi === "BiAn" ? "hidden" : "active",
    hiddenReason: dg.lyDoAn ?? undefined,
    hiddenBy: dg.nguoiAn ?? undefined,
    response: dg.phanHoiCuaHang ?? undefined,
    storeResponse: hasReply
      ? {
          response: dg.phanHoiCuaHang!,
          respondedAt: dg.thoiDiemPhanHoi ?? createdAt,
          respondedBy: dg.nguoiPhanHoi ?? "Cửa hàng",
        }
      : undefined,
    verifiedRental: true,
  };
}

function inferNotifType(loaiSuKien?: string | null): AppNotification["type"] {
  const s = (loaiSuKien || "").toLowerCase();
  if (s.includes("huy") || s.includes("quahan") || s.includes("loi")) return "warning";
  if (s.includes("thanhcong") || s.includes("hoantat") || s.includes("duyet")) return "success";
  if (s.includes("don") || s.includes("thanhtoan") || s.includes("doisoat")) return "order";
  return "info";
}

function inferNotifCategory(loaiSuKien?: string | null): AppNotification["category"] {
  const s = (loaiSuKien || "").toLowerCase();
  if (s.includes("khuyenmai") || s.includes("promo") || s.includes("uudai")) return "promo";
  if (s.includes("thanhtoan") || s.includes("hoantien") || s.includes("doisoat") || s.includes("phuphi")) return "finance";
  if (s.includes("nhac") || s.includes("quahan") || s.includes("bangiao") || s.includes("nhantra")) return "rental";
  if (s.includes("don")) return "order";
  return "system";
}

export function mapThongBaoToNotification(
  tb: ThongBaoBackend,
  targetRole: AppNotification["targetRole"] = "all"
): AppNotification {
  return {
    id: String(tb.maThongBao),
    title: tb.tieuDe,
    message: tb.noiDung,
    type: inferNotifType(tb.loaiSuKien),
    category: inferNotifCategory(tb.loaiSuKien),
    targetRole,
    createdAt: tb.thoiDiemTao,
    isRead: tb.daDoc ?? Boolean(tb.thoiDiemDoc),
    actionLink: tb.maDonThue
      ? {
          type: "order",
          targetId: String(tb.maDonThue),
          label: `Xem đơn #${tb.maDonThue}`,
        }
      : undefined,
  };
}

export interface AuditLogEntryWithRef extends AuditLogEntry {
  thamChieuUrl?: string | null;
  duLieuTruoc?: string | null;
  duLieuSau?: string | null;
  lyDo?: string | null;
}

export function mapNhatKyToAuditLog(nk: NhatKyThaoTacBackend): AuditLogEntryWithRef {
  // [AUDIT-01]: nếu duLieuTruoc/duLieuSau là chuỗi JSON thô (bắt đầu bằng { hoặc [),
  // không ghép nguyên JSON vào cột "Chi tiết nội dung" trên bảng — chỉ hiển thị lý do
  // và ghi chú có snapshot để người dùng bấm "Chi tiết" xem bản format đẹp trong Modal.
  const laJsonRaw = (s?: string | null) => {
    if (!s) return false;
    const trim = s.trim();
    return trim.startsWith("{") || trim.startsWith("[");
  };
  const coSnapshot = laJsonRaw(nk.duLieuTruoc) || laJsonRaw(nk.duLieuSau);
  const summaryParts = [
    nk.lyDo ? `Lý do: ${nk.lyDo}` : "",
    coSnapshot
      ? "Có ghi nhận snapshot dữ liệu trước/sau — nhấn Chi tiết để xem"
      : [
          nk.duLieuTruoc ? `Trước: ${nk.duLieuTruoc}` : "",
          nk.duLieuSau ? `Sau: ${nk.duLieuSau}` : "",
        ].filter(Boolean).join(" | "),
  ].filter(Boolean);

  // FN6-09: map enum thô (vai trò / loại đối tượng / hành động) sang nhãn tiếng Việt qua BACKEND_ENUM_LABELS
  const actionLabel = formatBackendEnum(nk.hanhDong, nk.hanhDong);
  const roleLabel = formatBackendEnum(
    nk.vaiTroNguoiThucHien ?? nk.vaiTro ?? "Hệ thống",
    nk.vaiTroNguoiThucHien ?? nk.vaiTro ?? "Hệ thống"
  );
  const entityLabel = formatBackendEnum(nk.loaiDoiTuong, nk.loaiDoiTuong);

  return {
    id: String(nk.maNhatKy),
    timestamp: nk.thoiDiem,
    actor: nk.emailNguoiThucHien ?? nk.nguoiThucHien ?? (nk.maTaiKhoan ? `TK#${nk.maTaiKhoan}` : "Hệ thống"),
    role: roleLabel,
    action: actionLabel,
    targetEntity: entityLabel,
    targetId: nk.maDoiTuong ?? "-",
    detail: formatIsoDatesInText(summaryParts.join(" | ") || actionLabel),
    thamChieuUrl: nk.thamChieuUrl,
    duLieuTruoc: nk.duLieuTruoc,
    duLieuSau: nk.duLieuSau,
    lyDo: nk.lyDo,
  };
}
