/**
 * policyPromoMapper.ts - Ánh xạ DTO Chính sách thuê theo phiên bản & Khuyến mãi (M8: UC83–UC87)
 */

import type { PolicyVersion, Promotion, PromotionUsage, RentalPolicyConfig } from "../../types";
import type { ChinhSachBackend, TaoChinhSachRequest } from "../api/policyApi";
import type { KhuyenMaiBackend, SuDungKhuyenMaiBackend } from "../api/promotionApi";

export function mapChinhSachToRentalConfig(
  cs: ChinhSachBackend,
  base?: RentalPolicyConfig
): RentalPolicyConfig {
  const nd = cs.noiDung ?? {};
  const t24_48 = Math.round(Number(nd.huyDon?.tyLeGiuLaiTu24Den48Gio ?? 0.3) * 100);
  const under24 = Math.round(Number(nd.huyDon?.tyLeGiuLaiDuoi24Gio ?? 1) * 100);
  const pickupReminder = nd.mocNhac?.find((m) => m.loai === "TruocNhan")?.soGioTruoc ?? 4;
  const returnReminder = nd.mocNhac?.find((m) => m.loai === "TruocTra")?.soGioTruoc ?? 2;

  return {
    version: `v${cs.phienBan}.0`,
    effectiveDate: cs.thoiDiemApDung.slice(0, 10),
    changeReason: cs.tenChinhSach ?? undefined,
    holdMinutes: Number(nd.thoiGianGiuChoPhut ?? base?.holdMinutes ?? 15),
    standardPickupTime: base?.standardPickupTime ?? "08:00",
    standardReturnTime: base?.standardReturnTime ?? "20:00",
    cancellationFreeHours: 48,
    cancellationTier1Hours: 24,
    cancellationTier1FeePercent: t24_48,
    cancellationTier2FeePercent: under24,
    overdueMultiplier: Number(nd.heSoTre ?? base?.overdueMultiplier ?? 1.5),
    minDepositPercentage: Number(nd.tyLeCocPhanTram ?? base?.minDepositPercentage ?? 100),
    damageCompensationPercent: base?.damageCompensationPercent ?? 50,
    accessoryLossFeeSchedule: base?.accessoryLossFeeSchedule ?? [],
    adminApprovalFeeThreshold: Number(nd.hanMucNhanVien ?? base?.adminApprovalFeeThreshold ?? 1000000),
    reminderPickupHoursBefore: Number(pickupReminder),
    reminderReturnHoursBefore: Number(returnReminder),
    updatedAt: cs.ngayTao,
    updatedBy: `QT#${cs.maNguoiTao}`,
  };
}

export function mapChinhSachToPolicyVersion(
  cs: ChinhSachBackend,
  base?: RentalPolicyConfig
): PolicyVersion & { backendId: number; hieuLuc: string; tenChinhSach?: string | null } {
  const snapshot = mapChinhSachToRentalConfig(cs, base);
  return {
    backendId: cs.maChinhSach,
    hieuLuc: cs.hieuLuc,
    tenChinhSach: cs.tenChinhSach,
    version: snapshot.version,
    effectiveDate: snapshot.effectiveDate,
    updatedAt: cs.ngayTao,
    updatedBy: `QT#${cs.maNguoiTao}`,
    changeReason: cs.tenChinhSach ?? `Phiên bản ${cs.phienBan}`,
    configSnapshot: snapshot,
  };
}

/**
 * Đóng gói cấu hình chính sách từ form UI sang TaoChinhSachRequest theo đúng lược đồ NoiDungChinhSachDto.
 */
export function buildTaoChinhSachRequestFromConfig(
  tenChinhSach: string,
  thoiDiemApDungIso: string,
  cfg: RentalPolicyConfig
): TaoChinhSachRequest {
  return {
    tenChinhSach: tenChinhSach.trim() || `Chính sách áp dụng từ ${thoiDiemApDungIso.slice(0, 10)}`,
    thoiDiemApDung: thoiDiemApDungIso,
    noiDung: {
      thoiGianGiuChoPhut: Number(cfg.holdMinutes),
      heSoTre: Number(cfg.overdueMultiplier),
      tyLeCocPhanTram: Number(cfg.minDepositPercentage),
      hanMucNhanVien: Number(cfg.adminApprovalFeeThreshold),
      huyDon: {
        tyLeGiuLaiTu24Den48Gio: Number((cfg.cancellationTier1FeePercent / 100).toFixed(4)),
        tyLeGiuLaiDuoi24Gio: Number((cfg.cancellationTier2FeePercent / 100).toFixed(4)),
      },
      khongDenNhan: {
        soPhutChoSauGioNhan: 120,
        tyLeGiuLaiTienThue: 1,
      },
      mocNhac: [
        { loai: "TruocNhan", soGioTruoc: Math.max(1, Number(cfg.reminderPickupHoursBefore || 4)) },
        { loai: "TruocTra", soGioTruoc: Math.max(1, Number(cfg.reminderReturnHoursBefore || 2)) },
      ],
      gioNhanChuan: cfg.standardPickupTime || "08:00",
      gioTraChuan: cfg.standardReturnTime || "20:00",
      tyLeBoiThuongHuHong: Number(cfg.damageCompensationPercent ?? 100),
      bieuPhiPhuKien: Array.isArray(cfg.accessoryLossFeeSchedule)
        ? JSON.stringify(cfg.accessoryLossFeeSchedule)
        : String(cfg.accessoryLossFeeSchedule ?? ""),
    },
  };
}

export function mapKhuyenMaiToPromotion(km: KhuyenMaiBackend): Promotion {
  const isFixed = km.loaiGiam === "SoTien" || km.loaiGiam === 1;
  const scope: Promotion["scope"] =
    km.phamVi === "TheoSanPham" || km.phamVi === 1
      ? "products"
      : km.phamVi === "TheoDanhMuc" || km.phamVi === 2
        ? "categories"
        : "all";
  const isInactive = km.trangThai === "TamAn" || km.trangThai === 1;

  return {
    id: String(km.maKhuyenMai),
    code: km.maGiamGia,
    name: km.tenKhuyenMai || km.maGiamGia,
    discountType: isFixed ? "fixed" : "percentage",
    discountValue: Number(km.giaTriGiam ?? 0),
    maxDiscount: km.mucGiamToiDa != null ? Number(km.mucGiamToiDa) : null,
    minimumRental: Number(km.tienThueToiThieu ?? 0),
    scope,
    productIds: (km.sanPhamIds ?? []).map(String),
    categoryIds: (km.danhMucIds ?? []).map(String),
    startsAt: km.batDau,
    endsAt: km.ketThuc,
    totalUsageLimit: km.gioiHanTongLuot ?? null,
    perCustomerLimit: km.gioiHanMoiKhach ?? null,
    usedCount: Number(km.soLuotDaDung ?? 0),
    status: isInactive ? "inactive" : "active",
  };
}

export function mapSuDungKhuyenMaiToUsages(sd: SuDungKhuyenMaiBackend): PromotionUsage[] {
  return (sd.chiTietSuDung ?? []).map((ct) => {
    const status: PromotionUsage["status"] =
      ct.trangThaiLuot === "DaSuDung"
        ? "used"
        : ct.trangThaiLuot === "DaGiaiPhong" || ct.trangThaiLuot === "HetHan"
          ? "released"
          : "reserved";
    return {
      id: String(ct.maLuotSuDung),
      promotionId: String(sd.maKhuyenMai),
      orderId: ct.maDonHienThi || String(ct.maDonThue),
      reservedAt: ct.thoiDiemGiuLuot,
      expiresAt: ct.thoiDiemHetHan,
      usedAt: ct.thoiDiemSuDung ?? undefined,
      discountAmount: Number(ct.tienGiamDon ?? 0),
      status,
    };
  });
}
