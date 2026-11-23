/**
 * orderMapper.ts - Ánh xạ DTO Đơn thuê, Bàn giao BBBG, Nhận trả PNT, Phụ phí, Thanh toán & Đối soát 7 bước
 */

import type { AssignedEquipment, HandoverRecord, MoneyTransaction, Order, OrderItem, OrderStatus, ReconciliationStatement, ReturnReceipt, Surcharge, TransactionStatus, TransactionType } from "../../types";
import type { DonChiTietBackend, DonTomTatBackend, DonVanHanhChiTietBackend, DonVanHanhTomTatBackend, PhuPhiKhachBackend, ThanhToanDonBackend } from "../api/orderApi";

import { mapOrderStatusFromBackend, mapOrderStatusToBackend, mapTransactionStatus, mapPhuPhiToSurcharge, mapDoiSoatToReconciliationStatement } from "./orderStatusMapper";

export {
  mapOrderStatusFromBackend,
  mapOrderStatusToBackend,
  mapTransactionStatus,
  mapPhuPhiToSurcharge,
  mapDoiSoatToReconciliationStatement,
};

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
  const rental = Number(dto.tongTienThueTruocGiam ?? 0);
  const discount = Number(dto.tongTienGiam ?? 0);
  const depositTotal = Number(dto.tongTienCoc ?? 0);
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
    rental,
    discount,
    depositTotal,
    total: Math.max(0, rental - discount) + depositTotal,
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
 * Map chi tiết đơn đầy đủ từ /api/don-thue/{id} sang Order của UI.
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
    // Fallback sang tenSanPham hoặc "Thiết bị" nếu endpoint tóm tắt chưa trả về tenSanPhamLucDat
    productName: d.tenSanPhamLucDat || (d as { tenSanPham?: string }).tenSanPham || "Thiết bị",
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
