/**
 * catalogEquipmentMapper.ts - Ánh xạ DTO Catalog (Danh mục, Sản phẩm), Thiết bị, Bảo trì & Điều chỉnh kho
 */

import { resolveAssetUrl } from "../../utils/formatters";

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
import { formatBackendEnum } from "../../utils/formatters";

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
  // [DM-01] Khử trùng lặp theo maDanhMuc: EF Core Relationship Fix-up có thể lồng con vào cha
  // và cũng xuất hiện ở mảng ngoài cùng, khiến mỗi danh mục con/cháu bị đẩy nhiều lần.
  const seen = new Set<number>();
  const result: Category[] = [];
  const visit = (nodes: DanhMucBackend[]) => {
    for (const node of nodes) {
      if (seen.has(node.maDanhMuc)) continue;
      seen.add(node.maDanhMuc);
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

// [SP-02] Chuẩn hóa trangThaiKinhDoanh chấp nhận cả số (0 DangKinhDoanh, 1 TamNgung, 2 NgungKinhDoanh) lẫn chuỗi.
function normalizeTrangThaiKinhDoanh(raw: unknown): "DangKinhDoanh" | "TamNgung" | "NgungKinhDoanh" {
  if (typeof raw === "number") {
    if (raw === 1) return "TamNgung";
    if (raw === 2) return "NgungKinhDoanh";
    return "DangKinhDoanh";
  }
  if (typeof raw === "string") {
    if (raw === "TamNgung" || raw === "NgungKinhDoanh" || raw === "DangKinhDoanh") return raw;
    // Backend đôi lúc serialize số dưới dạng string ("1", "2").
    if (raw === "1") return "TamNgung";
    if (raw === "2") return "NgungKinhDoanh";
    if (raw === "0") return "DangKinhDoanh";
  }
  return "DangKinhDoanh";
}

export function mapSanPhamToProduct(sp: SanPhamBackend, categories: Category[] = []): Product & { availableCount?: number } {
  const cat = categories.find((c) => c.id === String(sp.maDanhMuc));
  const rawImages = Array.isArray(sp.hinhAnhs) && sp.hinhAnhs.length > 0
    ? sp.hinhAnhs
    : sp.hinhAnhChinh
      ? [sp.hinhAnhChinh]
      : [FALLBACK_PRODUCT_IMAGE];
  const images = rawImages.map((u) => resolveAssetUrl(u) || u);
  const normalizedStatus = normalizeTrangThaiKinhDoanh(sp.trangThaiKinhDoanh);

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
    image: resolveAssetUrl(sp.hinhAnhChinh) || images[0] || FALLBACK_PRODUCT_IMAGE,
    images,
    status: normalizedStatus === "DangKinhDoanh" ? "active" : "inactive",
    rawStatus: normalizedStatus,
    rating: Number(sp.diemTrungBinh ?? 0),
    reviews: Number(sp.soLuongDanhGia ?? 0),
    availableCount: sp.soLuongKhaDung,
  };
}

export function mapThietBiToEquipment(tb: ThietBiBackend): Equipment {
  return {
    id: String(tb.maThietBi),
    displayCode: tb.maThietBiHienThi,
    // [VD-01] Backend chỉ trả maChiTietPhieuNhap (ID dòng chi tiết), không trả maPhieuNhap.
    // Lưu đúng vào importReceiptLineId để useEquipmentLifecycle tra ngược qua ImportReceipt.lines.
    // importReceiptId để rỗng — chỉ gán khi thực sự biết maPhieuNhap hiển thị (hiện backend chưa expose).
    importReceiptLineId: tb.maChiTietPhieuNhap != null ? String(tb.maChiTietPhieuNhap) : undefined,
    productId: String(tb.maSanPhamHienTai),
    originalProductId: String(tb.maSanPhamNguon ?? tb.maSanPhamHienTai),
    importReceiptId: "",
    importDate: tb.ngayNhap ? tb.ngayNhap.slice(0, 10) : "",
    importPrice: Number(tb.giaNhap ?? 0),
    condition: tb.tinhTrang || "Tốt",
    equipmentStatus: mapEquipmentStatusFromBackend(tb.trangThaiSuDung),
    rentCount: Number(tb.soLanThue ?? 0),
  };
}

function mapMaintenanceStatus(trangThai?: string | null, ketQua?: string | null): MaintenanceReceipt["status"] {
  if (ketQua === "KhongTheSua" || ketQua === "KhongDat") return "Không thể sửa";
  switch (trangThai) {
    case "ChoXuLy":
    case "Mo":
      return "Chờ xử lý";
    case "DangXuLy":
    case "ChoKiemTra":
    case "DangThucHien":
    case "DangBaoTri":
      return "Đang sửa chữa";
    case "HoanThanh":
    case "HoanTat":
    case "DaHoanThanh":
      return "Đã nghiệm thu";
    case "KhongDat":
    case "KhongTheSua":
      return "Không thể sửa";
    default:
      return "Chờ xử lý";
  }
}

export function mapBaoTriToReceipt(bt: BaoTriResponseBackend): MaintenanceReceipt {
  const status = mapMaintenanceStatus(bt.trangThai, bt.ketQua);
  const isDone = status === "Đã nghiệm thu" || status === "Không thể sửa";
  // FN6-06: map enum thô ("SuaChua", "VeSinh"...) → nhãn tiếng Việt qua BACKEND_ENUM_LABELS
  const loaiXuLyLabel = bt.loaiXuLy ? formatBackendEnum(bt.loaiXuLy, bt.loaiXuLy) : undefined;
  return {
    id: String(bt.maPhieuBaoTri),
    equipmentId: String(bt.maThietBi),
    orderId: bt.maDonThue != null ? String(bt.maDonThue) : undefined,
    issueDescription: bt.moTaLoi ?? loaiXuLyLabel ?? "Bảo trì thiết bị",
    status,
    createdAt: bt.ngayBatDau ?? new Date().toISOString(),
    estimatedCost: Number(bt.chiPhi ?? 0),
    actualCost: isDone ? Number(bt.chiPhi ?? 0) : undefined,
    completedAt: bt.ngayHoanThanhThucTe ?? undefined,
    note: loaiXuLyLabel,
    outcomeNote: bt.ketQua ?? undefined,
  };
}

/**
 * Trích xuất trạng thái thiết bị từ chuỗi JSON hoặc enum thô trong giaTriTruoc / giaTriSau của phiếu điều chỉnh kho.
 */
function parseAdjustmentEquipmentStatus(raw?: string | null, fallback: EquipmentStatus = "Sẵn sàng"): EquipmentStatus {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  // Nếu backend lưu JSON object (vd {"TrangThaiSuDung":"ThatLac",...})
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      const st = (obj.trangThaiSuDung ?? obj.TrangThaiSuDung ?? obj.trangThai ?? obj.TrangThai) as string | undefined;
      if (st) return mapEquipmentStatusFromBackend(st);
    } catch {
      // fallback kiểm tra chuỗi bên dưới
    }
  }
  if (/ThatLac|Thất lạc/i.test(trimmed)) return "Thất lạc";
  if (/NgungSuDung|Ngừng sử dụng/i.test(trimmed)) return "Ngừng sử dụng";
  if (/DangBaoTri|Đang bảo trì/i.test(trimmed)) return "Đang bảo trì";
  if (/DangThue|Đang thuê/i.test(trimmed)) return "Đang thuê";
  if (/SanSang|Sẵn sàng/i.test(trimmed)) return "Sẵn sàng";
  return fallback;
}

export function mapDieuChinhKhoToReceipt(dc: DieuChinhKhoResponseBackend): StockAdjustmentReceipt {
  const statusMap: Record<string, StockAdjustmentReceipt["status"]> = {
    DaApDung: "Đã duyệt",
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
    approvedAt: dc.thoiDiemApDung ?? dc.thoiDiemDuyet ?? undefined,
    note: dc.loaiDieuChinh ?? undefined,
    lines: (dc.chiTiet ?? []).map((ct) => ({
      equipmentId: ct.maThietBiHienThi ?? (ct.maThietBi != null ? String(ct.maThietBi) : "-"),
      previousStatus: parseAdjustmentEquipmentStatus(ct.giaTriTruoc, "Sẵn sàng"),
      newStatus: parseAdjustmentEquipmentStatus(
        ct.giaTriSau,
        dc.loaiDieuChinh === "KiemKeSaiLech" ? "Thất lạc" : "Ngừng sử dụng"
      ),
      reason: ct.ghiChu ?? dc.lyDo ?? "",
    })),
  };
}
