/**
 * supplierImportMapper.ts - Ánh xạ DTO Nhà cung cấp & Phiếu nhập kho (UC64–UC77)
 */

import type { ImportReceipt, Supplier } from "../../types";
import type { PhieuNhapBackend } from "../api/importReceiptApi";
import type { NhaCungCapBackend } from "../api/supplierApi";

export function mapNhaCungCapToSupplier(ncc: NhaCungCapBackend): Supplier {
  return {
    id: String(ncc.maNhaCungCap),
    displayCode: ncc.maNhaCungCapHienThi,
    name: ncc.tenNhaCungCap,
    contactPerson: ncc.nguoiLienHe ?? "",
    phone: ncc.soDienThoai ?? "",
    email: ncc.email ?? "",
    address: ncc.diaChi ?? "",
    taxCode: ncc.maSoThue ?? "",
    note: ncc.ghiChu ?? "",
    cooperationStatus: ncc.trangThaiHopTac === "NgungHopTac" ? "inactive" : "active",
  };
}

/**
 * Chuẩn hóa trạng thái phiếu nhập khi backend có thể serialize enum số (0/1/2) hoặc chuỗi.
 */
function mapImportStatus(trangThai: string | number): ImportReceipt["status"] {
  // Backend enum: Nhap = 1, DaNhapKho = 2, DaHuy = 3 (xem Models/Enums/TrangThaiPhieuNhap.cs)
  // Chấp nhận cả giá trị số (nếu chưa đăng ký JsonStringEnumConverter) lẫn chuỗi.
  if (trangThai === 2 || trangThai === "DaNhapKho") return "Đã nhập kho";
  if (trangThai === 3 || trangThai === "DaHuy") return "Đã hủy";
  return "Nháp";
}

export function mapPhieuNhapToImportReceipt(pn: PhieuNhapBackend): ImportReceipt {
  return {
    id: String(pn.maPhieuNhap),
    displayCode: pn.maPhieuHienThi,
    supplierId: String(pn.maNhaCungCap),
    supplierName: pn.tenNhaCungCap,
    supplierDocumentNumber: pn.soChungTuNhaCungCap ?? undefined,
    expectedAt: pn.ngayNhapDuKien ? pn.ngayNhapDuKien.slice(0, 10) : undefined,
    receivedAt: pn.ngayNhapThucTe ? pn.ngayNhapThucTe.slice(0, 10) : undefined,
    note: pn.ghiChu ?? undefined,
    status: mapImportStatus(pn.trangThai),
    createdAt: pn.ngayLap,
    createdBy: pn.tenNguoiLap ?? `NV#${pn.maNguoiLap}`,
    confirmedAt: pn.ngayXacNhan ?? undefined,
    cancelReason: pn.lyDoHuy ?? undefined,
    inspectedBy: pn.tenNguoiXacNhan ?? undefined,
    inspectedAt: pn.ngayXacNhan ?? undefined,
    lines: (pn.chiTietPhieuNhaps ?? []).map((ct) => ({
      id: String(ct.maChiTietPhieuNhap),
      productId: String(ct.maSanPham),
      productNameSnapshot: ct.tenSanPham,
      quantity: Number(ct.soLuong ?? 0),
      unitPrice: Number(ct.donGiaNhap ?? 0),
      equipmentCodes: [],
      receivingCondition: ct.tinhTrangKhiNhap,
      note: ct.ghiChu ?? undefined,
    })),
  };
}
