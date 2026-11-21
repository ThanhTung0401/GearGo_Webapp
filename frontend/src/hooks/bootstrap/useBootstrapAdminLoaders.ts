import { useCallback } from "react";
import { getAuthToken } from "../../services/apiClient";
import {
  auditApi,
  equipmentApi,
  importReceiptApi,
  inventoryApi,
  notificationApi,
  paymentApi,
  policyApi,
  promotionApi,
  reviewApi,
  staffApi,
  supplierApi,
} from "../../services/api";
import {
  mapBaoTriToReceipt,
  mapChinhSachToPolicyVersion,
  mapChinhSachToRentalConfig,
  mapDanhGiaToReview,
  mapDieuChinhKhoToReceipt,
  mapKhuyenMaiToPromotion,
  mapNhaCungCapToSupplier,
  mapNhatKyToAuditLog,
  mapPhieuNhapToImportReceipt,
  mapThietBiToEquipment,
  mapThongBaoToNotification,
} from "../../services/mappers";
import { NEUTRAL_POLICY_CONFIG, REAL_MODE } from "../appStateStorage";
import type { UseBootstrapDataParams } from "./types";

/**
 * Nhóm loader vận hành/quản trị: Kho, NCC, Phiếu nhập, Khuyến mãi, Chính sách, Đánh giá, Thông báo, Nhật ký & Tài khoản.
 */
export function useBootstrapAdminLoaders(params: UseBootstrapDataParams) {
  const {
    role,
    setEquipment,
    setMaintenanceReceipts,
    setStockAdjustments,
    setSuppliers,
    setImportReceipts,
    setPromotions,
    setPolicyVersions,
    setPolicies,
    setReviews,
    setNotifications,
    setUnreadNotificationCount,
    setAuditLogs,
    setStaffAccounts,
    setCustomers,
    setFinancialAdjustments,
  } = params;

  const refreshEquipment = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken() || (role !== "staff" && role !== "admin")) return;
    try {
      const [eqRes, btRes, adjRes] = await Promise.all([
        equipmentApi.timKiemThietBi({ soMoiTrang: 100 }).catch(() => ({ items: [] })),
        equipmentApi.timKiemBaoTri({ soMoiTrang: 50 }).catch(() => ({ items: [] })),
        inventoryApi.timPhieu({ soMoiTrang: 50 }).catch(() => ({ items: [] })),
      ]);
      setEquipment((eqRes.items ?? []).map(mapThietBiToEquipment));
      setMaintenanceReceipts((btRes.items ?? []).map(mapBaoTriToReceipt));
      setStockAdjustments((adjRes.items ?? []).map(mapDieuChinhKhoToReceipt));
    } catch (err) {
      console.warn("Không thể tải dữ liệu thiết bị/kho:", err);
    }
  }, [role, setEquipment, setMaintenanceReceipts, setStockAdjustments]);

  const refreshSuppliers = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken() || (role !== "staff" && role !== "admin")) return;
    try {
      const res = await supplierApi.timKiem({ soMoiTrang: 50 });
      setSuppliers((res.items ?? []).map(mapNhaCungCapToSupplier));
    } catch (err) {
      console.warn("Không thể tải nhà cung cấp:", err);
    }
  }, [role, setSuppliers]);

  const refreshImportReceipts = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken() || (role !== "staff" && role !== "admin")) return;
    try {
      const res = await importReceiptApi.timKiem({ soMoiTrang: 50 });
      setImportReceipts((res.items ?? []).map(mapPhieuNhapToImportReceipt));
    } catch (err) {
      console.warn("Không thể tải phiếu nhập:", err);
    }
  }, [role, setImportReceipts]);

  const refreshPromotions = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken() || role === "customer") return;
    try {
      const res = await promotionApi.timKiem({ soMoiTrang: 50 });
      setPromotions((res.items ?? []).map(mapKhuyenMaiToPromotion));
    } catch (err) {
      console.warn("Không thể tải khuyến mãi:", err);
    }
  }, [role, setPromotions]);

  const refreshPolicies = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken() || role === "customer") return;
    try {
      const res = await policyApi.layDanhSach({ kichThuoc: 20 });
      setPolicyVersions((res.items ?? []).map((cs) => mapChinhSachToPolicyVersion(cs, NEUTRAL_POLICY_CONFIG)));
      const active = (res.items ?? []).find((cs) => cs.hieuLuc === "HienHanh") ?? (res.items ?? [])[0];
      if (active) setPolicies(mapChinhSachToRentalConfig(active, NEUTRAL_POLICY_CONFIG));
    } catch (err) {
      console.warn("Không thể tải chính sách:", err);
    }
  }, [role, setPolicyVersions, setPolicies]);

  const refreshReviews = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken()) return;
    try {
      const res =
        role === "admin" || role === "staff"
          ? await reviewApi.adminTimKiem({ soMoiTrang: 50 })
          : await reviewApi.layDanhGiaCuaToi({ soMoiTrang: 50 });
      setReviews((res.items ?? []).map(mapDanhGiaToReview));
    } catch {
      // Bỏ qua nếu vai trò hiện tại chưa có đánh giá
    }
  }, [role, setReviews]);

  const refreshNotifications = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken()) return;
    try {
      const res = await notificationApi.layCuaToi({ soMoiTrang: 30 });
      setNotifications((res.items ?? []).map((tb) => mapThongBaoToNotification(tb, role)));
      setUnreadNotificationCount(Number(res.soChuaDoc ?? 0));
    } catch {
      // Không chặn giao diện nếu endpoint thông báo tạm lỗi
    }
  }, [role, setNotifications, setUnreadNotificationCount]);

  const refreshAuditLogs = useCallback(async () => {
    if (!REAL_MODE || !getAuthToken() || (role !== "staff" && role !== "admin")) return;
    try {
      const res = await auditApi.traCuu({ soMoiTrang: 50 });
      setAuditLogs((res.items ?? []).map(mapNhatKyToAuditLog));
    } catch (err) {
      console.warn("Không thể tải nhật ký thao tác:", err);
    }
  }, [role, setAuditLogs]);

  const refreshAdminAuxiliaryData = useCallback(() => {
    void staffApi
      .timNhanVien({ soMoiTrang: 50 })
      .then((res) => {
        setStaffAccounts(
          (res.items ?? []).map((nv) => ({
            id: String(nv.maNhanVien),
            username: nv.email || `NV-${nv.maNhanVien}`,
            name: nv.hoTen || nv.email || `Nhân viên #${nv.maNhanVien}`,
            role: nv.vaiTro === "QuanTriVien" ? "Quản trị viên" : "Nhân viên",
            phone: nv.soDienThoai ?? "",
            email: nv.email ?? "",
            status: nv.trangThaiTaiKhoan === "BiKhoa" ? "locked" : "active",
            createdAt: nv.ngayVaoLam ?? "",
          }))
        );
      })
      .catch(() => {});

    void staffApi
      .timTaiKhoan({ vaiTro: "KhachHang", soMoiTrang: 50 })
      .then((res) => {
        setCustomers(
          (res.items ?? []).map((tk) => ({
            id: String(tk.maKhachHang ?? tk.maTaiKhoan),
            name: tk.hoTen || tk.email || `KH#${tk.maTaiKhoan}`,
            phone: tk.soDienThoai ?? "",
            email: tk.email ?? "",
            address: "",
            status: tk.trangThai === "BiKhoa" ? "locked" : "active",
            lockedReason: tk.lyDoKhoa ?? undefined,
            createdAt: tk.ngayTao,
            totalOrders: 0,
            totalSpent: 0,
            currentDeposit: 0,
          }))
        );
      })
      .catch(() => {});

    void paymentApi
      .layDanhSachCanDoiChieu()
      .then((items) => {
        setFinancialAdjustments(
          (items ?? []).map((g) => ({
            id: String(g.maThanhToan),
            orderId: String(g.maDonThue),
            type: "Thu bù",
            amount: Number(g.tongSoTien ?? 0),
            reason: g.lyDoCanDoiChieu || `Mã GD ${g.maYeuCau} (${g.phuongThuc})`,
            status: g.trangThaiDoiChieu === "DaDoiChieu" ? "Đã duyệt" : "Chờ duyệt",
            createdBy: "Cổng thanh toán",
            createdAt: g.thoiDiemTao,
          }))
        );
      })
      .catch(() => {});
  }, [setStaffAccounts, setCustomers, setFinancialAdjustments]);

  return {
    refreshEquipment,
    refreshSuppliers,
    refreshImportReceipts,
    refreshPromotions,
    refreshPolicies,
    refreshReviews,
    refreshNotifications,
    refreshAuditLogs,
    refreshAdminAuxiliaryData,
  };
}
