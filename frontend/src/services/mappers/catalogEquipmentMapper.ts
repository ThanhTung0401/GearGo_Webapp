/**
 * catalogEquipmentMapper.ts - Ánh xạ DTO Catalog (Danh mục, Sản phẩm), Thiết bị, Bảo trì & Điều chỉnh kho
 */

import type {
  Category,
  Equipment,
  EquipmentStatus,
  MaintenanceReceipt,
  Product,
  StockAdjustmentReceipt,
} from "../../types";
import type { DanhMucBackend, SanPhamBackend } from "../api/catalogApi";
import type { BaoTriResponseBackend, ThietBiBackend } from "../api/equipmentApi";
import type { DieuChinhKhoResponseBackend } from "../api/inventoryApi";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80";

/**
 * Chuyển trạng thái sử dụng thiết bị từ backend enum sang nhãn hiển thị frontend.
 */
export function mapEquipmentStatusFromBackend(status?: string | null): EquipmentStatus {
  switch (status) {
    case "DangThue":
      return "Đang thuê";
    case "DangBaoTri":
      return "Đang bảo trì";
    case "ThatLac":
      return "Thất lạc";
    case "NgungSuDung":
      return "Ngừng sử dụng";
    case "SanSang":
    default:
      return "Sẵn sàng";
  }
}

/**
 * Chuyển nhãn trạng thái thiết bị frontend về enum backend.
 */
export function mapEquipmentStatusToBackend(status: EquipmentStatus): string {
  switch (status) {
    case "Đang thuê":
      return "DangThue";
    case "Đang bảo trì":
      return "DangBaoTri";
    case "Thất lạc":
      return "ThatLac";
    case "Ngừng sử dụng":
      return "NgungSuDung";
    case "Sẵn sàng":
    default:
      return "SanSang";
  }
}

export function mapDanhMucToCategory(dm: DanhMucBackend): Category {
  return {
    id: String(dm.maDanhMuc),
    parentId: dm.maDanhMucCha != null ? String(dm.maDanhMucCha) : null,
    name: dm.tenDanhMuc,
    description: dm.moTa ?? "",
    displayOrder: dm.thuTuHienThi ?? 0,
    status: dm.trangThai === "TamAn" ? "inactive" : "active",
  };
}

/**
 * Trải phẳng cây danh mục (cha -> con đệ quy) thành danh sách phẳng để dùng cho selector và bộ lọc.
 */
export function flattenDanhMucTree(tree: DanhMucBackend[]): Category[] {
  const result: Category[] = [];
  const visit = (nodes: DanhMucBackend[]) => {
    for (const node of nodes) {
      result.push(mapDanhMucToCategory(node));
      if (Array.isArray(node.danhMucCon) && node.danhMucCon.length > 0) {
        visit(node.danhMucCon);
      }
    }
  };
  visit(tree);
  return result;
}

/**
 * Parse chuỗi thông số kỹ thuật JSON (hoặc key: value) thành Record<string, string>.
 */
function parseSpecifications(thongSo?: string | null): Record<string, string> | undefined {
  if (!thongSo) return undefined;
  try {
    const parsed = JSON.parse(thongSo);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        out[k] = String(v ?? "");
      }
      return out;
    }
  } catch {
    // Không phải JSON -> giữ thông số thô theo dòng
  }
  return { "Thông số": thongSo };
}

export function mapSanPhamToProduct(sp: SanPhamBackend, categories: Category[] = []): Product & { availableCount?: number } {
  const cat = categories.find((c) => c.id === String(sp.maDanhMuc));
  const images = Array.isArray(sp.hinhAnhs) && sp.hinhAnhs.length > 0
    ? sp.hinhAnhs
    : sp.hinhAnhChinh
      ? [sp.hinhAnhChinh]
      : [FALLBACK_PRODUCT_IMAGE];

  return {
    id: String(sp.maSanPham),
    displayCode: sp.maSanPhamHienThi,
    categoryId: String(sp.maDanhMuc),
    name: sp.tenSanPham,
    category: cat?.name ?? `Danh mục #${sp.maDanhMuc}`,
    brand: sp.thuongHieu ?? "GearGo",
    description: sp.moTa ?? "",
    capacity: sp.sucChua ? `${sp.sucChua} người` : "Tiêu chuẩn",
    dimensions: sp.kichThuoc,
    specifications: parseSpecifications(sp.thongSo),
    pricePerDay: Number(sp.giaThueMoiNgay ?? 0),
    deposit: Number(sp.mucCocMoiThietBi ?? 0),
    compensation: Number(sp.giaTriBoiThuong ?? 0),
    image: sp.hinhAnhChinh || images[0] || FALLBACK_PRODUCT_IMAGE,
    images,
    // Endpoint public /api/san-pham chỉ trả sản phẩm đang kinh doanh và có thể lược bỏ trangThaiKinhDoanh;
    // chỉ đánh dấu inactive khi backend trả rõ trạng thái khác "DangKinhDoanh".
    status: !sp.trangThaiKinhDoanh || sp.trangThaiKinhDoanh === "DangKinhDoanh" ? "active" : "inactive",
    rating: Number(sp.diemTrungBinh ?? 0),
    reviews: Number(sp.soLuongDanhGia ?? 0),
    availableCount: sp.soLuongKhaDung,
  };
}

export function mapThietBiToEquipment(tb: ThietBiBackend): Equipment {
  return {
    id: String(tb.maThietBi),
    displayCode: tb.maThietBiHienThi,
    importReceiptLineId: tb.maChiTietPhieuNhap != null ? String(tb.maChiTietPhieuNhap) : undefined,
    productId: String(tb.maSanPhamHienTai),
    originalProductId: String(tb.maSanPhamNguon ?? tb.maSanPhamHienTai),
    importReceiptId: tb.maChiTietPhieuNhap != null ? String(tb.maChiTietPhieuNhap) : "",
    importDate: tb.ngayNhap ? tb.ngayNhap.slice(0, 10) : "",
    importPrice: Number(tb.giaNhap ?? 0),
    condition: tb.tinhTrang || "Tốt",
    equipmentStatus: mapEquipmentStatusFromBackend(tb.trangThaiSuDung),
    rentCount: Number(tb.soLanThue ?? 0),
  };
}

function mapMaintenanceStatus(trangThai?: string | null, ketQua?: string | null): MaintenanceReceipt["status"] {
  if (ketQua === "KhongTheSua") return "Không thể sửa";
  switch (trangThai) {
    case "ChoXuLy":
    case "Mo":
      return "Chờ xử lý";
    case "DangThucHien":
    case "DangBaoTri":
      return "Đang sửa chữa";
    case "HoanTat":
    case "DaHoanThanh":
      return "Đã nghiệm thu";
    case "KhongTheSua":
      return "Không thể sửa";
    default:
      return "Chờ xử lý";
  }
}

export function mapBaoTriToReceipt(bt: BaoTriResponseBackend): MaintenanceReceipt {
  return {
    id: String(bt.maPhieuBaoTri),
    equipmentId: String(bt.maThietBi),
    orderId: bt.maDonThue != null ? String(bt.maDonThue) : undefined,
    issueDescription: bt.moTaLoi ?? bt.loaiXuLy ?? "Bảo trì thiết bị",
    status: mapMaintenanceStatus(bt.trangThai, bt.ketQua),
    createdAt: bt.ngayBatDau ?? new Date().toISOString(),
    estimatedCost: Number(bt.chiPhi ?? 0),
    actualCost: Number(bt.chiPhi ?? 0),
    completedAt: bt.ngayHoanThanhThucTe ?? undefined,
    note: bt.loaiXuLy ?? undefined,
    outcomeNote: bt.ketQua ?? undefined,
  };
}

export function mapDieuChinhKhoToReceipt(dc: DieuChinhKhoResponseBackend): StockAdjustmentReceipt {
  const statusMap: Record<string, StockAdjustmentReceipt["status"]> = {
    DaDuyet: "Đã duyệt",
    TuChoi: "Từ chối",
    ChoDuyet: "Chờ duyệt",
    Nhap: "Chờ duyệt",
  };
  return {
    id: String(dc.maPhieuDieuChinh),
    createdAt: dc.thoiDiemLap,
    createdBy: dc.tenNguoiLapLucLap ?? `NV#${dc.maNguoiLap}`,
    reason: dc.lyDo ?? dc.loaiDieuChinh ?? "",
    status: statusMap[dc.trangThai] ?? "Chờ duyệt",
    approvedBy: dc.tenNguoiDuyetLucDuyet ?? undefined,
    approvedAt: dc.thoiDiemDuyet ?? undefined,
    note: dc.loaiDieuChinh ?? undefined,
    lines: (dc.chiTiet ?? []).map((ct) => ({
      equipmentId: ct.maThietBiHienThi ?? (ct.maThietBi != null ? String(ct.maThietBi) : "-"),
      previousStatus: "Sẵn sàng",
      newStatus: "Ngừng sử dụng",
      reason: ct.ghiChu ?? dc.lyDo ?? "",
    })),
  };
}
