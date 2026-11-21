import { useEffect } from "react";
import { getAuthToken } from "../services/apiClient";
import { REAL_MODE } from "./appStateStorage";
import type { UseBootstrapDataParams } from "./bootstrap/types";
import { useBootstrapCoreLoaders } from "./bootstrap/useBootstrapCoreLoaders";
import { useBootstrapAdminLoaders } from "./bootstrap/useBootstrapAdminLoaders";

/**
 * Facade điều phối đồng bộ dữ liệu thật từ ASP.NET Core Backend và khôi phục phiên đăng nhập.
 */
export function useBootstrapData(params: UseBootstrapDataParams) {
  const core = useBootstrapCoreLoaders(params);
  const admin = useBootstrapAdminLoaders(params);

  useEffect(() => {
    if (!REAL_MODE) return;
    void core.refreshCatalog();
    void core.hydrateSession(false);

    const onPermissionChanged = () => {
      void core.hydrateSession(true);
    };
    window.addEventListener("geargo:permissions-changed", onPermissionChanged);
    return () => window.removeEventListener("geargo:permissions-changed", onPermissionChanged);
  }, [core.hydrateSession, core.refreshCatalog]);

  useEffect(() => {
    if (!REAL_MODE || !params.currentUser || !getAuthToken()) return;
    void admin.refreshNotifications();
    void core.refreshOrders();
    void admin.refreshReviews();
    if (params.role === "customer") {
      void core.refreshCart();
      return;
    }
    void admin.refreshEquipment();
    void admin.refreshSuppliers();
    void admin.refreshImportReceipts();
    void admin.refreshAuditLogs();
    void admin.refreshPromotions();
    void admin.refreshPolicies();
    admin.refreshAdminAuxiliaryData();
  }, [
    params.currentUser?.id,
    params.role,
    core.refreshOrders,
    core.refreshCart,
    admin.refreshNotifications,
    admin.refreshReviews,
    admin.refreshEquipment,
    admin.refreshSuppliers,
    admin.refreshImportReceipts,
    admin.refreshAuditLogs,
    admin.refreshPromotions,
    admin.refreshPolicies,
    admin.refreshAdminAuxiliaryData,
  ]);

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
