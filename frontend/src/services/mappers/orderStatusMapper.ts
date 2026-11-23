/**
 * orderStatusMapper.ts - Ánh xạ trạng thái Đơn thuê, Giao dịch, Phụ phí & Đối soát
 */

import type {
  OrderStatus,
  ReconciliationStatement,
  Surcharge,
  TransactionStatus,
} from "../../types";
import type { PhuPhiKhachBackend } from "../api/orderApi";
import type { DoiSoatBackend } from "../api/reconciliationApi";
import type { PhuPhiBackend } from "../api/surchargeApi";

/**
 * Chuyển enum trạng thái đơn hàng từ backend sang chuỗi OrderStatus tiếng Việt chuẩn của UI.
 */
export function mapOrderStatusFromBackend(status?: string | null): OrderStatus {
  switch (status) {
    case "ChoThanhToan":
      return "Chờ thanh toán";
    case "DaXacNhan":
      return "Đã xác nhận";
    case "DangChuanBi":
      return "Đang chuẩn bị";
    case "SanSangNhan":
      return "Sẵn sàng nhận";
    case "DangThue":
      return "Đang thuê";
    case "DaNhanTra":
      return "Đã nhận trả";
    case "ChoDoiSoat":
      return "Chờ đối soát";
    case "HoanTat":
      return "Hoàn tất";
    case "HetHan":
      return "Hết hạn";
    case "KhachHuy":
      return "Khách hủy";
    case "CuaHangHuy":
      return "Cửa hàng hủy";
    default:
      return "Chờ thanh toán";
  }
}

export function mapOrderStatusToBackend(status?: OrderStatus | string): string | undefined {
  switch (status) {
    case "Chờ thanh toán":
      return "ChoThanhToan";
    case "Đã xác nhận":
      return "DaXacNhan";
    case "Đang chuẩn bị":
      return "DangChuanBi";
    case "Sẵn sàng nhận":
      return "SanSangNhan";
    case "Đang thuê":
      return "DangThue";
    case "Đã nhận trả":
      return "DaNhanTra";
    case "Chờ đối soát":
      return "ChoDoiSoat";
    case "Hoàn tất":
      return "HoanTat";
    case "Hết hạn":
      return "HetHan";
    case "Khách hủy":
      return "KhachHuy";
    case "Cửa hàng hủy":
      return "CuaHangHuy";
    default:
      return undefined;
  }
}

export function mapTransactionStatus(status?: string | null): TransactionStatus {
  switch (status) {
    case "ThanhCong":
      return "Thành công";
    case "ThatBai":
      return "Thất bại";
    case "HetHan":
      return "Hết hạn";
    default:
      return "Đang xử lý";
  }
}

function mapSurchargeType(loaiPhi?: string | null): string {
  switch (loaiPhi) {
    case "TreHan":
      return "Quá hạn trả";
    case "VeSinhDacBiet":
      return "Vệ sinh đặc biệt";
    case "HuHong":
      return "Hư hỏng nhẹ/nặng";
    case "MatPhuKien":
      return "Mất phụ kiện";
    case "MatThietBi":
      return "Mất thiết bị";
    default:
      return loaiPhi || "Phụ phí khác";
  }
}

function mapSurchargeStatus(trangThaiDuyet?: string | null, trangThaiTranhChap?: string | null): Surcharge["status"] {
  if (trangThaiTranhChap === "DangTranhChap") return "Tranh chấp";
  switch (trangThaiDuyet) {
    case "DaDuyet":
      return "Đã duyệt";
    case "TuChoi":
      return "Từ chối";
    default:
      return "Chờ duyệt";
  }
}

export function mapPhuPhiToSurcharge(p: PhuPhiBackend | PhuPhiKhachBackend): Surcharge {
  const full = p as PhuPhiBackend;
  const trangThaiTranhChap = full.trangThaiTranhChap ?? (p as { trangThaiTranhChap?: string | null }).trangThaiTranhChap;
  // [DB-04] Trích xuất phần khiếu nại của khách từ pattern "[Khách khiếu nại: ...]" trong lyDo.
  const rawReason = p.lyDo ?? "";
  let customerResponse: string | undefined;
  const match = rawReason.match(/\[Khách khiếu nại:\s*([^\]]+)\]/i);
  if (match) {
    customerResponse = match[1].trim();
  }
  return {
    id: String(p.maPhuPhi),
    backendId: p.maPhuPhi,
    handoverItemId: full.maChiTietBanGiao ?? undefined,
    reconciliationId: full.maDoiSoat ?? null,
    type: mapSurchargeType(p.loaiPhi),
    equipmentId: full.maChiTietBanGiao ? `CTBG-${full.maChiTietBanGiao}` : "-",
    amount: Number(p.soTien ?? 0),
    reason: rawReason,
    status: mapSurchargeStatus(p.trangThaiDuyet, trangThaiTranhChap),
    createdBy: full.tenNguoiLap ?? "Nhân viên",
    reviewedBy: full.tenNguoiDuyet ?? undefined,
    reviewedAt: full.thoiDiemDuyet ?? undefined,
    customerResponse,
    resolutionNote: full.ketQuaGiaiQuyet ?? undefined,
    isDisputed: trangThaiTranhChap === "DangTranhChap",
    disputeStatus: trangThaiTranhChap ?? null,
    lockedByReconciliation: Boolean(full.daKhoaDoiSoat),
  };
}

export function mapDoiSoatToReconciliationStatement(ds: DoiSoatBackend): ReconciliationStatement {
  const net = Number(ds.soTienCanHoan ?? 0) > 0
    ? Number(ds.soTienCanHoan)
    : -Number(ds.soTienCanThuThem ?? 0);

  const settlementType: ReconciliationStatement["settlementType"] =
    Number(ds.soTienCanHoan ?? 0) > 0
      ? "refund"
      : Number(ds.soTienCanThuThem ?? 0) > 0
        ? "collect"
        : "balanced";

  // Quy đổi 4 trạng thái backend (ChoChot -> DaXacNhan -> DangXuLyTien -> DaChot) về 3 bước hiển thị UI
  let status: ReconciliationStatement["status"] = "draft";
  if (ds.trangThai === "DaXacNhan" || ds.trangThai === "DangXuLyTien") status = "confirmed";
  if (ds.trangThai === "DaChot") status = "locked";

  return {
    confirmedAt: ds.trangThai !== "ChoChot" ? ds.thoiDiemLap : undefined,
    confirmedBy: ds.nguoiLap ?? undefined,
    depositCollected: Number(ds.tienCocDuocDoiSoat ?? 0),
    totalApprovedSurcharges: Number(ds.tongPhuPhiDuocDuyet ?? 0),
    totalPriorSettlements: 0,
    netDifference: net,
    settlementType,
    status,
    lockedAt: ds.thoiDiemChot ?? undefined,
    lockedBy: ds.nguoiChot ?? undefined,
    note: ds.lyDoDieuChinh ?? undefined,
  };
}
