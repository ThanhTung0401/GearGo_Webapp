import { useEffect, useRef } from "react";
import { getAuthToken } from "../services/apiClient";
import { REAL_MODE } from "./appStateStorage";
import type { UseBootstrapDataParams } from "./bootstrap/types";
import { useBootstrapCoreLoaders } from "./bootstrap/useBootstrapCoreLoaders";
import { useBootstrapAdminLoaders } from "./bootstrap/useBootstrapAdminLoaders";

/**
 * Facade điều phối đồng bộ dữ liệu thật từ ASP.NET Core Backend và khôi phục phiên đăng nhập.
 * Chạy theo từng đợt nhỏ (sequential batches) để không làm nghẽn giới hạn 6 kết nối HTTP/1.1 của trình duyệt.
 */
export function useBootstrapData(params: UseBootstrapDataParams) {
  const core = useBootstrapCoreLoaders(params);
  const admin = useBootstrapAdminLoaders(params);

  // Giữ ref tới loader mới nhất để tránh re-trigger bão API mỗi khi callback đổi reference
  const loadersRef = useRef({ core, admin });
  loadersRef.current = { core, admin };

  // Chỉ chạy 1 lần lúc khởi tạo ứng dụng và khi có sự kiện đổi quyền hệ thống
  useEffect(() => {
    if (!REAL_MODE) return;
    let cancelled = false;
    void (async () => {
      await loadersRef.current.core.hydrateSession(false);
      if (!cancelled) {
        await loadersRef.current.core.refreshCatalog();
      }
    })();

    const onPermissionChanged = () => {
      void loadersRef.current.core.hydrateSession(true);
    };
    // [BOOT-02]: PermissionsTab.tsx phát "geargo-permissions-changed" (gạch ngang),
    // useBootstrapData trước đây chỉ nghe "geargo:permissions-changed" (hai chấm) → mất sự kiện.
    // Nghe cả hai tên để tương thích ngược và không mất event dù phía nào phát.
    window.addEventListener("geargo:permissions-changed", onPermissionChanged);
    window.addEventListener("geargo-permissions-changed", onPermissionChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("geargo:permissions-changed", onPermissionChanged);
      window.removeEventListener("geargo-permissions-changed", onPermissionChanged);
    };
  }, []);

  // [BOOT-02]: fingerprint quyền → sessionKey đổi khi Admin thêm/xóa quyền của NhanVien,
  // kích hoạt runStaggered() nạp lại các tab quản trị thay vì chờ F5.
  const permsKey = (params.currentUser?.permissions ?? []).slice().sort().join(",");
  const sessionKey = params.currentUser
    ? `${params.currentUser.id ?? params.currentUser.name ?? "user"}:${params.role}:${permsKey}`
    : "";

  useEffect(() => {
    if (!REAL_MODE || !sessionKey || !getAuthToken()) return;
    let cancelled = false;

    // Nạp dữ liệu theo từng đợt 2-3 API để ưu tiên quyền hạn (/api/auth/quyen-cua-toi) và tránh nghẽn connection pool
    const runStaggered = async () => {
      const { core: c, admin: a } = loadersRef.current;
      // Nhường 150ms cho PermissionsProvider lấy /api/auth/quyen-cua-toi trước
      await new Promise((r) => setTimeout(r, 150));
      if (cancelled || !getAuthToken()) return;

      if (params.role === "customer") {
        await Promise.all([c.refreshOrders(), c.refreshCart()]);
        if (cancelled) return;
        await Promise.all([a.refreshNotifications(), a.refreshReviews()]);
        return;
      }

      // [BOOT-01] Staff/Admin login: nạp lại catalog admin ngay Đợt 1 vì trước đó refreshCatalog()
      // ở lượt bootstrap ban đầu đã chạy khi chưa có token (closure role === "customer"), bỏ qua
      // adminLayDanhSachDanhMuc/adminLayDanhSachSanPham.
      // Đợt 1: Catalog quản trị + Đơn thuê & Thông báo
      await Promise.all([c.refreshCatalog(), c.refreshOrders(), a.refreshNotifications()]);
      if (cancelled || !getAuthToken()) return;

      // Đợt 2: Kho thiết bị & Phiếu nhập & NCC
      await Promise.all([a.refreshEquipment(), a.refreshSuppliers(), a.refreshImportReceipts()]);
      if (cancelled || !getAuthToken()) return;

      // Đợt 3: Khuyến mãi, Chính sách, Đánh giá, Nhật ký & dữ liệu phụ trợ
      await Promise.all([a.refreshPromotions(), a.refreshPolicies(), a.refreshReviews()]);
      if (cancelled || !getAuthToken()) return;
      await a.refreshAuditLogs();
      a.refreshAdminAuxiliaryData();
    };

    void runStaggered();
    return () => {
      cancelled = true;
    };
  }, [sessionKey, params.role]);

  return {
    refreshCatalog: core.refreshCatalog,
    refreshCart: core.refreshCart,
    refreshOrders: core.refreshOrders,
    refreshEquipment: admin.refreshEquipment,
    refreshSuppliers: admin.refreshSuppliers,
    refreshImportReceipts: admin.refreshImportReceipts,
    refreshPromotions: admin.refreshPromotions,
    refreshPolicies: admin.refreshPolicies,
    refreshReviews: admin.refreshReviews,
    refreshNotifications: admin.refreshNotifications,
    refreshAuditLogs: admin.refreshAuditLogs,
    // [BOOT-03]: expose để các tab Nhân viên / Khách hàng / Bù trừ tài chính gọi lại sau CRUD.
    refreshAdminAuxiliaryData: admin.refreshAdminAuxiliaryData,
    upsertOrder: core.upsertOrder,
    hydrateSession: core.hydrateSession,
  };
}
