import type { AppState } from "../context";
import type { Role } from "../store";
import { REAL_MODE } from "./appStateStorage";
import { useAppStoreState } from "./useAppStoreState";
import { useAppEffects } from "./useAppEffects";
import { useBootstrapData } from "./useBootstrapData";
import { useAdminConfigActions } from "./useAdminConfigActions";
import { useCatalogAdminActions } from "./useCatalogAdminActions";
import { useCartAndOrderActions } from "./useCartAndOrderActions";
import { useOrderSettlementActions } from "./useOrderSettlementActions";
import { useHandoverReturnActions } from "./useHandoverReturnActions";
import { useInventoryActions } from "./useInventoryActions";
import { useAuthActions } from "./useAuthActions";

/**
 * Hook lắp ghép state, bootstrap dữ liệu và toàn bộ action hooks thành AppState cung cấp cho AppContext.
 */
export function useAppProviderValue() {
  const store = useAppStoreState();

  useAppEffects({
    page: store.page,
    resolvedPage: store.resolvedRoute.page,
    resolvedProductId: store.resolvedRoute.productId,
    authLoading: store.authLoading,
    currentUser: store.currentUser,
    navigate: store.navigate,
    setSelectedProductId: store.setSelectedProductId,
    orders: store.orders,
    setOrders: store.setOrders,
    setPromotionUsages: store.setPromotionUsages,
    persistedDeps: {
      categories: store.categories,
      products: store.products,
      suppliers: store.suppliers,
      promotions: store.promotions,
      promotionUsages: store.promotionUsages,
      equipment: store.equipment,
      orders: store.orders,
      cart: store.cart,
      importReceipts: store.importReceipts,
      reviews: store.reviews,
      maintenanceReceipts: store.maintenanceReceipts,
      staffAccounts: store.staffAccounts,
      stockAdjustments: store.stockAdjustments,
      pickupDate: store.pickupDate,
      returnDate: store.returnDate,
      pickupHour: store.pickupHour,
      returnHour: store.returnHour,
      newOrderId: store.newOrderId,
      appliedPromoCode: store.appliedPromoCode,
      policies: store.policies,
      policyVersions: store.policyVersions,
    },
  });

  const bootstrap = useBootstrapData({
    role: store.role,
    currentUser: store.currentUser,
    pageRef: store.pageRef,
    categoriesRef: store.categoriesRef,
    setRole: store.setRole,
    setPage: store.setPage,
    setCurrentUser: store.setCurrentUser,
    setAuthLoading: store.setAuthLoading,
    setPermissionNotice: store.setPermissionNotice,
    setCategories: store.setCategories,
    setProducts: store.setProducts,
    setCart: store.setCart,
    setAppliedPromoCode: store.setAppliedPromoCode,
    setPickupDate: store.setPickupDate,
    setReturnDate: store.setReturnDate,
    setOrders: store.setOrders,
    setEquipment: store.setEquipment,
    setMaintenanceReceipts: store.setMaintenanceReceipts,
    setStockAdjustments: store.setStockAdjustments,
    setSuppliers: store.setSuppliers,
    setImportReceipts: store.setImportReceipts,
    setPromotions: store.setPromotions,
    setPolicyVersions: store.setPolicyVersions,
    setPolicies: store.setPolicies,
    setReviews: store.setReviews,
    setNotifications: store.setNotifications,
    setUnreadNotificationCount: store.setUnreadNotificationCount,
    setAuditLogs: store.setAuditLogs,
    setStaffAccounts: store.setStaffAccounts,
    setCustomers: store.setCustomers,
    setFinancialAdjustments: store.setFinancialAdjustments,
  });

  const adminConfig = useAdminConfigActions({
    role: store.role,
    staffAccounts: store.staffAccounts,
    setStaffAccounts: store.setStaffAccounts,
    customers: store.customers,
    setCustomers: store.setCustomers,
    setNotifications: store.setNotifications,
    setUnreadNotificationCount: store.setUnreadNotificationCount,
    policies: store.policies,
    setPolicies: store.setPolicies,
    setPolicyVersions: store.setPolicyVersions,
    promotions: store.promotions,
    setPromotions: store.setPromotions,
    setAuditLogs: store.setAuditLogs,
    setFinancialAdjustments: store.setFinancialAdjustments,
  });

  const catalogAdmin = useCatalogAdminActions({
    categories: store.categories,
    setCategories: store.setCategories,
    products: store.products,
    setProducts: store.setProducts,
    equipment: store.equipment,
    setEquipment: store.setEquipment,
    orders: store.orders,
    suppliers: store.suppliers,
    setSuppliers: store.setSuppliers,
    promotions: store.promotions,
    setPromotions: store.setPromotions,
    addAuditLog: adminConfig.addAuditLog,
  });

  const cartOrder = useCartAndOrderActions({
    pickupDate: store.pickupDate,
    returnDate: store.returnDate,
    pickupHour: store.pickupHour,
    returnHour: store.returnHour,
    products: store.products,
    equipment: store.equipment,
    orders: store.orders,
    setOrders: store.setOrders,
    cart: store.cart,
    setCart: store.setCart,
    setPromotions: store.setPromotions,
    setPromotionUsages: store.setPromotionUsages,
    setNewOrderId: store.setNewOrderId,
    setAppliedPromoCode: store.setAppliedPromoCode,
    evaluatePromotion: catalogAdmin.evaluatePromotion,
  });

  const orderSettlement = useOrderSettlementActions({
    orders: store.orders,
    setOrders: store.setOrders,
    setPromotionUsages: store.setPromotionUsages,
    reviews: store.reviews,
    setReviews: store.setReviews,
    setProducts: store.setProducts,
    currentUser: store.currentUser,
    addAuditLog: adminConfig.addAuditLog,
  });

  const handoverReturn = useHandoverReturnActions({
    orders: store.orders,
    setOrders: store.setOrders,
    equipment: store.equipment,
    setEquipment: store.setEquipment,
    setMaintenanceReceipts: store.setMaintenanceReceipts,
    sendNotification: adminConfig.sendNotification,
  });

  const inventoryActions = useInventoryActions({
    products: store.products,
    suppliers: store.suppliers,
    equipment: store.equipment,
    setEquipment: store.setEquipment,
    orders: store.orders,
    importReceipts: store.importReceipts,
    setImportReceipts: store.setImportReceipts,
    maintenanceReceipts: store.maintenanceReceipts,
    setMaintenanceReceipts: store.setMaintenanceReceipts,
    stockAdjustments: store.stockAdjustments,
    setStockAdjustments: store.setStockAdjustments,
    addAuditLog: adminConfig.addAuditLog,
  });

  const authActions = useAuthActions({
    role: store.role,
    setRole: store.setRole,
    setPage: store.setPage,
    currentUser: store.currentUser,
    setCurrentUser: store.setCurrentUser,
    setPermissionNotice: store.setPermissionNotice,
    hydrateSession: bootstrap.hydrateSession,
    staffAccounts: store.staffAccounts,
    setStaffAccounts: store.setStaffAccounts,
    customers: store.customers,
    setCustomers: store.setCustomers,
    setOrders: store.setOrders,
    setCart: store.setCart,
    setNotifications: store.setNotifications,
    setUnreadNotificationCount: store.setUnreadNotificationCount,
    setAuditLogs: store.setAuditLogs,
    setFinancialAdjustments: store.setFinancialAdjustments,
    setCategories: store.setCategories,
    setProducts: store.setProducts,
    setSuppliers: store.setSuppliers,
    setPromotions: store.setPromotions,
    setPromotionUsages: store.setPromotionUsages,
    setEquipment: store.setEquipment,
    setMaintenanceReceipts: store.setMaintenanceReceipts,
    setStockAdjustments: store.setStockAdjustments,
    setPolicies: store.setPolicies,
    setImportReceipts: store.setImportReceipts,
    setReviews: store.setReviews,
    setPickupDate: store.setPickupDate,
    setReturnDate: store.setReturnDate,
    setNewOrderId: store.setNewOrderId,
    setAppliedPromoCode: store.setAppliedPromoCode,
    addAuditLog: adminConfig.addAuditLog,
  });

  const dismissPermissionNotice = () => store.setPermissionNotice(null);

  const state: AppState = {
    role: store.role,
    page: store.page,
    selectedProductId: store.selectedProductId,
    categories: store.categories,
    products: store.products,
    suppliers: store.suppliers,
    promotions: store.promotions,
    promotionUsages: store.promotionUsages,
    equipment: store.equipment,
    orders: store.orders,
    cart: store.cart,
    importReceipts: store.importReceipts,
    reviews: store.reviews,
    maintenanceReceipts: store.maintenanceReceipts,
    staffAccounts: store.staffAccounts,
    stockAdjustments: store.stockAdjustments,
    customers: store.customers,
    notifications: store.notifications,
    policies: store.policies,
    auditLogs: store.auditLogs,
    financialAdjustments: store.financialAdjustments,
    currentUser: store.currentUser,
    pickupDate: store.pickupDate,
    returnDate: store.returnDate,
    pickupHour: store.pickupHour,
    returnHour: store.returnHour,
    newOrderId: store.newOrderId,
    appliedPromoCode: store.appliedPromoCode,
    setRole: (r: Role) => {
      store.setRole(r);
      if (r === "staff" || r === "admin") store.setPage("workspace");
      else store.setPage("landing");
    },
    setPage: store.setPage,
    setSelectedProduct: store.setSelectedProduct,
    setPickupDate: store.setPickupDate,
    setReturnDate: store.setReturnDate,
    setPickupHour: store.setPickupHour,
    setReturnHour: store.setReturnHour,
    setAppliedPromoCode: store.setAppliedPromoCode,
    setNewOrderId: store.setNewOrderId,
    setNotifications: store.setNotifications,
    ...catalogAdmin,
    ...cartOrder,
    ...orderSettlement,
    ...handoverReturn,
    ...inventoryActions,
    ...adminConfig,
    ...authActions,
    policyVersions: store.policyVersions,
    realApi: REAL_MODE,
    authLoading: store.authLoading,
    permissionNotice: store.permissionNotice,
    dismissPermissionNotice,
    unreadNotificationCount: store.unreadNotificationCount,
    setUnreadNotificationCount: store.setUnreadNotificationCount,
    setCartItems: store.setCart,
    ...bootstrap,
  };

  return {
    state,
    page: store.page,
    currentUser: store.currentUser,
    permissionNotice: store.permissionNotice,
    dismissPermissionNotice,
  };
}
