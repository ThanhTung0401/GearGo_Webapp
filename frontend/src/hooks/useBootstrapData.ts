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
    window.addEventListener("geargo:permissions-changed", onPermissionChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("geargo:permissions-changed", onPermissionChanged);
    };
  }, []);

  // Chỉ nạp dữ liệu theo phiên khi tài khoản hoặc vai trò thực sự đổi
  const sessionKey = params.currentUser
    ? `${params.currentUser.id ?? params.currentUser.name ?? "user"}:${params.role}`
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

      // Đợt 1: Đơn thuê & Thông báo (quan trọng nhất)
      await Promise.all([c.refreshOrders(), a.refreshNotifications()]);
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
    upsertOrder: core.upsertOrder,
    hydrateSession: core.hydrateSession,
  };
}
