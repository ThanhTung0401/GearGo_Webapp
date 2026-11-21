/**
 * reviewNotifAuditMapper.ts - Ánh xạ DTO Đánh giá, Thông báo & Nhật ký thao tác (M9–M10)
 */

import type { AppNotification, AuditLogEntry, Review } from "../../types";
import type { NhatKyThaoTacBackend } from "../api/auditApi";
import type { ThongBaoBackend } from "../api/notificationApi";
import type { DanhGiaBackend } from "../api/reviewApi";

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

export function mapThongBaoToNotification(
  tb: ThongBaoBackend,
  targetRole: AppNotification["targetRole"] = "all"
): AppNotification {
  return {
    id: String(tb.maThongBao),
    title: tb.tieuDe,
    message: tb.noiDung,
    type: inferNotifType(tb.loaiSuKien),
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
  const summaryParts = [
    nk.lyDo ? `Lý do: ${nk.lyDo}` : "",
    nk.duLieuTruoc ? `Trước: ${nk.duLieuTruoc}` : "",
    nk.duLieuSau ? `Sau: ${nk.duLieuSau}` : "",
  ].filter(Boolean);

  return {
    id: String(nk.maNhatKy),
    timestamp: nk.thoiDiem,
    actor: nk.emailNguoiThucHien ?? nk.nguoiThucHien ?? (nk.maTaiKhoan ? `TK#${nk.maTaiKhoan}` : "Hệ thống"),
    role: nk.vaiTroNguoiThucHien ?? nk.vaiTro ?? "Hệ thống",
    action: nk.hanhDong,
    targetEntity: nk.loaiDoiTuong,
    targetId: nk.maDoiTuong ?? "-",
    detail: summaryParts.join(" | ") || nk.hanhDong,
    thamChieuUrl: nk.thamChieuUrl,
    duLieuTruoc: nk.duLieuTruoc,
    duLieuSau: nk.duLieuSau,
    lyDo: nk.lyDo,
  };
}
