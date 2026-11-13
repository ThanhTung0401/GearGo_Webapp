/**
 * orderMapper.ts - Ánh xạ DTO Đơn thuê, Bàn giao BBBG, Nhận trả PNT, Phụ phí, Thanh toán & Đối soát 7 bước
 */

import type {
  AssignedEquipment,
  HandoverRecord,
  MoneyTransaction,
  Order,
  OrderItem,
  OrderStatus,
  ReconciliationStatement,
  ReturnReceipt,
  Surcharge,
  TransactionStatus,
  TransactionType,
} from "../../types";
import type {
  DonChiTietBackend,
  DonTomTatBackend,
  DonVanHanhChiTietBackend,
  DonVanHanhTomTatBackend,
  PhuPhiKhachBackend,
  ThanhToanDonBackend,
} from "../api/orderApi";
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

function mapTransactionStatus(status?: string | null): TransactionStatus {
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
  return {
    id: String(p.maPhuPhi),
    backendId: p.maPhuPhi,
    handoverItemId: full.maChiTietBanGiao ?? undefined,
    reconciliationId: full.maDoiSoat ?? null,
    type: mapSurchargeType(p.loaiPhi),
    equipmentId: full.maChiTietBanGiao ? `CTBG-${full.maChiTietBanGiao}` : "-",
    amount: Number(p.soTien ?? 0),
    reason: p.lyDo ?? "",
    status: mapSurchargeStatus(p.trangThaiDuyet, trangThaiTranhChap),
    createdBy: full.tenNguoiLap ?? "Nhân viên",
    reviewedBy: full.tenNguoiDuyet ?? undefined,
    reviewedAt: full.thoiDiemDuyet ?? undefined,
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

/**
 * Map đơn tóm tắt ở màn hình danh sách (khi chưa tải full chi tiết).
 */
export function mapDonTomTatToOrder(dto: DonTomTatBackend, customerName = "Khách hàng", customerId = ""): Order {
  return {
    id: String(dto.maDonThue),
    backendId: dto.maDonThue,
    displayCode: dto.maDonHienThi,
    customerId,
    customerName,
    customerPhone: "",
    items: [],
    pickupTime: dto.gioNhanDuKien,
    returnTime: dto.gioTraDuKien,
    rentalStartDate: dto.gioNhanDuKien,
    rentalEndDate: dto.gioTraDuKien,
    rental: Number(dto.tongTienThue ?? 0),
    discount: 0,
    depositTotal: Number(dto.tongTienCoc ?? 0),
    total: Number(dto.tongTienThue ?? 0) + Number(dto.tongTienCoc ?? 0),
    status: mapOrderStatusFromBackend(dto.trangThai),
    createdAt: dto.ngayDat,
    assignedEquipment: [],
    surcharges: [],
    transactions: [],
    statusHistory: [],
  };
}

/**
 * Map đơn tóm tắt cho hàng đợi vận hành Staff.
 */
export function mapDonVanHanhTomTatToOrder(dto: DonVanHanhTomTatBackend): Order {
  return {
    id: String(dto.maDonThue),
    backendId: dto.maDonThue,
    displayCode: dto.maDonHienThi,
    customerId: String(dto.maKhachHang),
    customerName: dto.tenNguoiNhan || dto.tenKhachHang,
    customerPhone: dto.soDienThoaiNguoiNhan ?? "",
    items: [],
    pickupTime: dto.gioNhanDuKien,
    returnTime: dto.gioTraDuKien,
    rentalStartDate: dto.gioNhanDuKien,
    rentalEndDate: dto.gioTraDuKien,
    rental: 0,
    discount: 0,
    depositTotal: 0,
    status: mapOrderStatusFromBackend(dto.trangThai),
    createdAt: dto.ngayDat,
    assignedEquipment: Array.from({ length: dto.tongThietBiDaGan }, (_, idx) => ({
      equipmentId: `ASSIGNED-${idx}`,
      productId: "",
    })),
    surcharges: [],
    transactions: [],
    statusHistory: [],
  };
}

/**
 * Map chi tiết đơn đầy đủ từ /api/v1/don-thue/{id} sang Order của UI.
 */
export function mapDonChiTietToOrder(
  dto: DonChiTietBackend,
  extra?: {
    customerId?: string;
    customerName?: string;
    ghiChu?: string | null;
    phanCong?: DonVanHanhChiTietBackend["phanCong"];
  }
): Order {
  const items: OrderItem[] = (dto.dong ?? []).map((d) => ({
    productId: String(d.maSanPham),
    productName: d.tenSanPhamLucDat,
    qty: d.soLuong,
    days: d.soNgayTinhTien,
    pricePerDay: Number(d.donGiaThueMoiNgay),
    depositPerUnit: Number(d.mucCocMoiThietBi),
    compensation: 0,
    price: Number(d.thanhTienSauGiam),
  }));

  const rentalAfterDiscount = Math.max(
    0,
    Number(dto.tongTienThueTruocGiam ?? 0) - Number(dto.tongTienGiam ?? 0)
  );

  // Gom các giao dịch thu + hoàn thành MoneyTransaction thống nhất
  const thuTx: MoneyTransaction[] = (dto.thanhToan ?? []).map((t: ThanhToanDonBackend) => ({
    id: `TT-${t.maThanhToan}`,
    type: "Thanh toán ban đầu" as TransactionType,
    amount: Number(t.tongSoTien ?? 0),
    status: mapTransactionStatus(t.trangThai),
    createdAt: t.thoiDiemThanhCong ?? dto.ngayDat,
    completedAt: t.thoiDiemThanhCong ?? undefined,
    method: t.phuongThuc,
  }));

  const hoanTx: MoneyTransaction[] = (dto.hoanTien ?? []).map((h) => ({
    id: `HT-${h.maHoanTien}`,
    type: (h.loaiHoan?.includes("Huy") ? "Hoàn tiền hủy" : "Hoàn cọc") as TransactionType,
    amount: Number(h.soTien ?? 0),
    status: mapTransactionStatus(h.trangThai),
    createdAt: h.thoiDiemThanhCong ?? dto.ngayDat,
    completedAt: h.thoiDiemThanhCong ?? undefined,
    note: h.nhanHienThi,
  }));

  // Map biên bản bàn giao đầu tiên (nếu có)
  const firstBg = (dto.banGiao ?? [])[0];
  const handoverRecord: HandoverRecord | undefined = firstBg
    ? {
        id: `BBBG-${firstBg.maPhieuBanGiao}`,
        orderId: String(dto.maDonThue),
        handedOverAt: firstBg.thoiDiemGiaoThucTe ?? undefined,
        handoverAt: firstBg.thoiDiemGiaoThucTe ?? undefined,
        staffName: firstBg.tenNhanVienLucGiao ?? "Nhân viên kho",
        receiverName: firstBg.tenNguoiNhanThucTe ?? dto.tenNguoiNhan ?? undefined,
        customerName: dto.tenNguoiNhan ?? extra?.customerName ?? undefined,
        items: (firstBg.chiTiet ?? []).map((ct) => ({
          equipmentId: ct.maThietBiHienThi,
          productId: "",
          condition: ct.tinhTrangTruocThue ?? "Tốt",
          note: ct.phuKienThucGiao ?? undefined,
        })),
        signatureConfirmed: firstBg.trangThai === "DaGiao",
      }
    : undefined;

  // Map tóm tắt nhận trả các đợt từ taiChinh.nhanTra.cacDot hoặc dto.nhanTra
  const returnReceipts: ReturnReceipt[] = (dto.nhanTra ?? []).map((nt) => ({
    id: nt.maPhieuHienThi || `PNT-${nt.maPhieuNhanTra}`,
    orderId: String(dto.maDonThue),
    returnRound: nt.lanTra,
    returnedAt: nt.thoiDiemChot ?? dto.ngayDat,
    staffName: "Nhân viên kho",
    items: [],
    isFinalReturn: false,
  }));

  // Map đối soát mới nhất từ taiChinh.doiSoat
  const latestDoiSoat = dto.taiChinh?.doiSoat?.[0];
  let reconciliation: ReconciliationStatement | undefined;
  if (latestDoiSoat) {
    const net =
      Number(latestDoiSoat.soTienCanHoan ?? 0) > 0
        ? Number(latestDoiSoat.soTienCanHoan)
        : -Number(latestDoiSoat.soTienCanThuThem ?? 0);
    const settlementType: ReconciliationStatement["settlementType"] =
      Number(latestDoiSoat.soTienCanHoan ?? 0) > 0
        ? "refund"
        : Number(latestDoiSoat.soTienCanThuThem ?? 0) > 0
          ? "collect"
          : "balanced";
    reconciliation = {
      depositCollected: Number(latestDoiSoat.tienCocDuocDoiSoat ?? 0),
      totalApprovedSurcharges: Number(latestDoiSoat.tongPhuPhiDuocDuyet ?? 0),
      totalPriorSettlements: 0,
      netDifference: net,
      settlementType,
      status:
        latestDoiSoat.trangThai === "DaChot"
          ? "locked"
          : latestDoiSoat.trangThai === "ChoChot"
            ? "draft"
            : "confirmed",
      confirmedAt: latestDoiSoat.thoiDiemLap,
      lockedAt: latestDoiSoat.thoiDiemChot ?? undefined,
      note: latestDoiSoat.lyDoDieuChinh ?? undefined,
    };
  }

  const assignedEquipment: AssignedEquipment[] = (extra?.phanCong ?? []).map((pc) => {
    const matchingLine = (dto.dong ?? []).find((d) => d.maChiTietDon === pc.maChiTietDon);
    return {
      equipmentId: String(pc.maThietBi),
      equipmentDisplayCode: pc.maThietBiHienThi,
      allocationId: pc.maPhanCong,
      orderItemId: pc.maChiTietDon,
      productId: matchingLine ? String(matchingLine.maSanPham) : "",
    };
  });

  return {
    id: String(dto.maDonThue),
    backendId: dto.maDonThue,
    displayCode: dto.maDonHienThi,
    customerId: extra?.customerId ?? "",
    customerName: extra?.customerName || dto.tenNguoiNhan || "Khách hàng",
    customerPhone: dto.soDienThoaiNguoiNhan ?? "",
    email: dto.emailLienHe ?? undefined,
    notes: extra?.ghiChu ?? undefined,
    allowedActions: dto.thaoTacHopLe ?? [],
    reconciliationId: latestDoiSoat?.maDoiSoat,
    items,
    pickupTime: dto.gioNhanDuKien,
    returnTime: dto.gioTraDuKien,
    rentalStartDate: dto.gioNhanDuKien,
    rentalEndDate: dto.gioTraDuKien,
    rental: Number(dto.tongTienThueTruocGiam ?? 0),
    discount: Number(dto.tongTienGiam ?? 0),
    depositTotal: Number(dto.tongTienCoc ?? 0),
    total: rentalAfterDiscount + Number(dto.tongTienCoc ?? 0),
    status: mapOrderStatusFromBackend(dto.trangThai),
    createdAt: dto.ngayDat,
    expiresAt: dto.hanThanhToan ?? undefined,
    assignedEquipment,
    handoverRecord,
    returnReceipts,
    surcharges: (dto.phuPhi ?? []).map(mapPhuPhiToSurcharge),
    transactions: [...thuTx, ...hoanTx],
    cancellationFee: dto.taiChinh?.huy?.tienThueGiuLai,
    cancellationReason: dto.taiChinh?.huy?.lyDoHuy ?? undefined,
    handedOverAt: firstBg?.thoiDiemGiaoThucTe ?? undefined,
    reconciledAt: dto.taiChinh?.thoiDiemHoanTat ?? latestDoiSoat?.thoiDiemChot ?? undefined,
    reconciliation,
    statusHistory: (dto.lichSu ?? []).map((ls) => ({
      status: mapOrderStatusFromBackend(ls.trangThaiSau),
      at: ls.thoiDiem,
      by: ls.lyDo || "Hệ thống",
    })),
  };
}

export function mapDonVanHanhChiTietToOrder(dto: DonVanHanhChiTietBackend): Order {
  return mapDonChiTietToOrder(dto.don, {
    customerId: String(dto.maKhachHang),
    customerName: dto.tenKhachHang,
    ghiChu: dto.ghiChu,
    phanCong: dto.phanCong,
  });
}
