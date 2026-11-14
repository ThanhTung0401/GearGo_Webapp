import { useEffect, useRef, useState } from "react";
import { getAuthToken } from "./services/apiClient";
import {
  DEMO_ORDER_COMPLETED,
  INITIAL_AUDIT_LOGS,
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_EQUIPMENT,
  INITIAL_FINANCIAL_ADJUSTMENTS,
  INITIAL_IMPORT_RECEIPTS,
  INITIAL_MAINTENANCE_RECEIPTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  INITIAL_POLICIES,
  INITIAL_POLICY_VERSIONS,
  INITIAL_PRODUCTS,
  INITIAL_PROMOTIONS,
  INITIAL_REVIEWS,
  INITIAL_STAFF_ACCOUNTS,
  INITIAL_STOCK_ADJUSTMENTS,
  INITIAL_SUPPLIERS,
  type AppNotification,
  type AuditLogEntry,
  type CartItem,
  type Category,
  type CustomerAccount,
  type Equipment,
  type FinancialAdjustment,
  type ImportReceipt,
  type MaintenanceReceipt,
  type Order,
  type OrderStatus,
  type PolicyVersion,
  type Product,
  type Promotion,
  type PromotionUsage,
  type RentalPolicyConfig,
  type Review,
  type Role,
  type StaffAccount,
  type StockAdjustmentReceipt,
  type Supplier,
} from "./store";
import LandingView from "./views/LandingView";
import ProductsView from "./views/ProductsView";
import CustomerPortal from "./views/CustomerPortal";
import StaffView from "./views/StaffView";
import AdminView from "./views/AdminView";
import { LoginView, RegisterView, ForgotPasswordView } from "./views/AuthViews";
import { PublicLayout, AuthLayout } from "./layouts";
import Icon from "./components/Icon";
import {
  loadPersistedState,
  NEUTRAL_POLICY_CONFIG,
  PREFS_STORAGE_KEY,
  REAL_MODE,
  STORAGE_KEY,
  type PersistedState,
} from "./hooks/appStateStorage";
import { useBootstrapData } from "./hooks/useBootstrapData";
import { useAdminConfigActions } from "./hooks/useAdminConfigActions";
import { useCatalogAdminActions } from "./hooks/useCatalogAdminActions";
import { useCartAndOrderActions } from "./hooks/useCartAndOrderActions";
import { useOrderSettlementActions } from "./hooks/useOrderSettlementActions";
import { useHandoverReturnActions } from "./hooks/useHandoverReturnActions";
import { useInventoryActions } from "./hooks/useInventoryActions";
import { useAuthActions } from "./hooks/useAuthActions";

// ─── App State & Context (Re-export từ ./context) ───────────────────────────
import { AppContext, useApp, type Page, type AppState } from "./context";
export { AppContext, useApp, type Page, type AppState };

const persistedState = loadPersistedState();

export default function App() {
  const [role, setRole] = useState<Role>("customer");
  const [page, setPage] = useState<Page>("landing");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>(
    REAL_MODE ? [] : (persistedState?.categories ?? INITIAL_CATEGORIES)
  );
  const [products, setProducts] = useState<Product[]>(() => {
    if (REAL_MODE) return [];
    const source = persistedState?.products ?? INITIAL_PRODUCTS;
    const availableCategories = persistedState?.categories ?? INITIAL_CATEGORIES;
    return source.map((product) => ({
      ...product,
      displayCode: product.displayCode ?? product.id,
      categoryId: product.categoryId ?? availableCategories.find((category) => category.name === product.category)?.id,
      dimensions: product.dimensions ?? "",
      specifications: product.specifications ?? {},
      images: product.images ?? [product.image].filter(Boolean),
    }));
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>(
    REAL_MODE ? [] : (persistedState?.suppliers ?? INITIAL_SUPPLIERS)
  );
  const [promotions, setPromotions] = useState<Promotion[]>(
    REAL_MODE ? [] : (persistedState?.promotions ?? INITIAL_PROMOTIONS)
  );
  const [promotionUsages, setPromotionUsages] = useState<PromotionUsage[]>(
    REAL_MODE ? [] : (persistedState?.promotionUsages ?? [])
  );
  const [equipment, setEquipment] = useState<Equipment[]>(() => {
    if (REAL_MODE) return [];
    return (persistedState?.equipment ?? INITIAL_EQUIPMENT).map((item) => ({
      ...item,
      displayCode: item.displayCode ?? item.id,
      importReceiptLineId:
        item.importReceiptLineId ??
        (() => {
          const receipt = (persistedState?.importReceipts ?? INITIAL_IMPORT_RECEIPTS).find((entry) => entry.id === item.importReceiptId);
          const index = receipt?.lines.findIndex((line) => line.productId === item.originalProductId) ?? -1;
          return index >= 0 ? (receipt?.lines[index].id ?? `${receipt?.id}-LINE-${index + 1}`) : undefined;
        })(),
      includedAccessories: item.includedAccessories ?? [],
      note: item.note ?? "",
    }));
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    if (REAL_MODE) return [];
    const list = persistedState?.orders ?? INITIAL_ORDERS;
    if (!list.some((o) => o.status === "Hoàn tất")) {
      return [...list, DEMO_ORDER_COMPLETED];
    }
    return list;
  });
  const [cart, setCart] = useState<CartItem[]>(REAL_MODE ? [] : (persistedState?.cart ?? []));
  const [importReceipts, setImportReceipts] = useState<ImportReceipt[]>(() => {
    if (REAL_MODE) return [];
    return (persistedState?.importReceipts ?? INITIAL_IMPORT_RECEIPTS).map((receipt) => {
      const supplier = suppliers.find((item) => item.id === receipt.supplierId || item.displayCode === receipt.supplierId);
      return {
        ...receipt,
        displayCode: receipt.displayCode ?? receipt.id,
        supplierId: supplier?.id ?? receipt.supplierId,
        supplierName: supplier?.name ?? receipt.supplierName,
        lines: receipt.lines.map((line, index) => ({
          ...line,
          id: line.id ?? `${receipt.id}-LINE-${index + 1}`,
          receivingCondition: line.receivingCondition ?? "Mới",
          note: line.note ?? "",
        })),
      };
    });
  });
  const [reviews, setReviews] = useState<Review[]>(REAL_MODE ? [] : (persistedState?.reviews ?? INITIAL_REVIEWS));
  const [maintenanceReceipts, setMaintenanceReceipts] = useState<MaintenanceReceipt[]>(
    REAL_MODE ? [] : (persistedState?.maintenanceReceipts ?? INITIAL_MAINTENANCE_RECEIPTS)
  );
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>(
    REAL_MODE ? [] : (persistedState?.staffAccounts ?? INITIAL_STAFF_ACCOUNTS)
  );
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustmentReceipt[]>(
    REAL_MODE ? [] : (persistedState?.stockAdjustments ?? INITIAL_STOCK_ADJUSTMENTS)
  );
  const [customers, setCustomers] = useState<CustomerAccount[]>(
    REAL_MODE ? [] : (persistedState?.customers ?? INITIAL_CUSTOMERS)
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(
    REAL_MODE ? [] : (persistedState?.notifications ?? INITIAL_NOTIFICATIONS)
  );
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [policies, setPolicies] = useState<RentalPolicyConfig>(
    REAL_MODE ? NEUTRAL_POLICY_CONFIG : (persistedState?.policies ?? INITIAL_POLICIES)
  );
  const [policyVersions, setPolicyVersions] = useState<PolicyVersion[]>(
    REAL_MODE ? [] : (persistedState?.policyVersions ?? INITIAL_POLICY_VERSIONS)
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(
    REAL_MODE ? [] : (persistedState?.auditLogs ?? INITIAL_AUDIT_LOGS)
  );
  const [financialAdjustments, setFinancialAdjustments] = useState<FinancialAdjustment[]>(
    REAL_MODE ? [] : (persistedState?.financialAdjustments ?? INITIAL_FINANCIAL_ADJUSTMENTS)
  );
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    username?: string;
    name: string;
    email: string;
    phone: string;
    role: Role;
    permissions?: string[];
    address?: string;
  } | null>(
    REAL_MODE
      ? null
      : (persistedState?.currentUser ?? { id: "KH001", name: "Nguyễn Văn An", email: "an.nguyen@gmail.com", phone: "0901 234 567", role: "customer" })
  );
  const [authLoading, setAuthLoading] = useState<boolean>(() => REAL_MODE && Boolean(getAuthToken()));
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [pickupDate, setPickupDate] = useState(persistedState?.pickupDate ?? "");
  const [returnDate, setReturnDate] = useState(persistedState?.returnDate ?? "");
  const [pickupHour, setPickupHour] = useState(persistedState?.pickupHour ?? "09:00");
  const [returnHour, setReturnHour] = useState(persistedState?.returnHour ?? "09:00");
  const [newOrderId, setNewOrderId] = useState<string | null>(REAL_MODE ? null : (persistedState?.newOrderId ?? null));
  const [appliedPromoCode, setAppliedPromoCode] = useState(REAL_MODE ? "" : (persistedState?.appliedPromoCode ?? ""));
  const pageRef = useRef<Page>(page);
  pageRef.current = page;
  const categoriesRef = useRef<Category[]>(categories);
  categoriesRef.current = categories;

  // Tự động hết hạn các đơn giữ chỗ quá thời hạn thanh toán
  useEffect(() => {
    const expireReservations = () => {
      const now = Date.now();
      setOrders((current) => {
        let changed = false;
        const next = current.map((order) => {
          if (order.status !== "Chờ thanh toán" || !order.expiresAt || new Date(order.expiresAt).getTime() > now) return order;
          changed = true;
          const at = new Date().toLocaleString("vi-VN");
          return {
            ...order,
            status: "Hết hạn" as OrderStatus,
            transactions: (order.transactions ?? []).map((transaction) =>
              transaction.status === "Đang xử lý" ? { ...transaction, status: "Hết hạn" as const, completedAt: at } : transaction
            ),
            statusHistory: [...order.statusHistory, { status: "Hết hạn" as OrderStatus, at, by: "Hệ thống" }],
          };
        });
        return changed ? next : current;
      });
    };
    expireReservations();
    const timer = window.setInterval(expireReservations, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Giải phóng mã khuyến mãi giữ chỗ nếu hết hạn
  useEffect(() => {
    const now = Date.now();
    setPromotionUsages((current) =>
      current.map((usage) =>
        usage.status === "reserved" && usage.expiresAt && new Date(usage.expiresAt).getTime() <= now
          ? { ...usage, status: "released", releasedAt: new Date().toISOString() }
          : usage
      )
    );
  }, [orders]);

  // Lưu trạng thái localStorage (chế độ Demo) hoặc UI prefs (chế độ Real API)
  useEffect(() => {
    if (REAL_MODE) {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ pickupDate, returnDate, pickupHour, returnHour }));
      return;
    }
    const state: PersistedState = {
      schemaVersion: 2,
      categories,
      products,
      suppliers,
      promotions,
      promotionUsages,
      equipment,
      orders,
      cart,
      importReceipts,
      reviews,
      maintenanceReceipts,
      staffAccounts,
      stockAdjustments,
      pickupDate,
      returnDate,
      pickupHour,
      returnHour,
      newOrderId,
      appliedPromoCode,
      policies,
      policyVersions,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [
    categories,
    products,
    suppliers,
    promotions,
    promotionUsages,
    equipment,
    orders,
    cart,
    importReceipts,
    reviews,
    maintenanceReceipts,
    staffAccounts,
    stockAdjustments,
    pickupDate,
    returnDate,
    pickupHour,
    returnHour,
    newOrderId,
    appliedPromoCode,
    policies,
    policyVersions,
  ]);

  const bootstrap = useBootstrapData({
    role,
    currentUser,
    pageRef,
    categoriesRef,
    setRole,
    setPage,
    setCurrentUser,
    setAuthLoading,
    setPermissionNotice,
    setCategories,
    setProducts,
    setCart,
    setAppliedPromoCode,
    setPickupDate,
    setReturnDate,
    setOrders,
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
  });

  const adminConfig = useAdminConfigActions({
    role,
    staffAccounts,
    setStaffAccounts,
    customers,
    setCustomers,
    setNotifications,
    setUnreadNotificationCount,
    policies,
    setPolicies,
    setPolicyVersions,
    promotions,
    setPromotions,
    setAuditLogs,
    setFinancialAdjustments,
  });

  const catalogAdmin = useCatalogAdminActions({
    categories,
    setCategories,
    products,
    setProducts,
    equipment,
    setEquipment,
    orders,
    suppliers,
    setSuppliers,
    promotions,
    setPromotions,
    addAuditLog: adminConfig.addAuditLog,
  });

  const cartOrder = useCartAndOrderActions({
    pickupDate,
    returnDate,
    pickupHour,
    returnHour,
    products,
    equipment,
    orders,
    setOrders,
    cart,
    setCart,
    setPromotions,
    setPromotionUsages,
    setNewOrderId,
    setAppliedPromoCode,
    evaluatePromotion: catalogAdmin.evaluatePromotion,
  });

  const orderSettlement = useOrderSettlementActions({
    orders,
    setOrders,
    setPromotionUsages,
    reviews,
    setReviews,
    setProducts,
    currentUser,
    addAuditLog: adminConfig.addAuditLog,
  });

  const handoverReturn = useHandoverReturnActions({
    orders,
    setOrders,
    equipment,
    setEquipment,
    setMaintenanceReceipts,
    sendNotification: adminConfig.sendNotification,
  });

  const inventoryActions = useInventoryActions({
    products,
    suppliers,
    equipment,
    setEquipment,
    orders,
    importReceipts,
    setImportReceipts,
    maintenanceReceipts,
    setMaintenanceReceipts,
    stockAdjustments,
    setStockAdjustments,
    addAuditLog: adminConfig.addAuditLog,
  });

  const authActions = useAuthActions({
    role,
    setRole,
    setPage,
    currentUser,
    setCurrentUser,
    setPermissionNotice,
    hydrateSession: bootstrap.hydrateSession,
    staffAccounts,
    setStaffAccounts,
    customers,
    setCustomers,
    setOrders,
    setCart,
    setNotifications,
    setUnreadNotificationCount,
    setAuditLogs,
    setFinancialAdjustments,
    setCategories,
    setProducts,
    setSuppliers,
    setPromotions,
    setPromotionUsages,
    setEquipment,
    setMaintenanceReceipts,
    setStockAdjustments,
    setPolicies,
    setImportReceipts,
    setReviews,
    setPickupDate,
    setReturnDate,
    setNewOrderId,
    setAppliedPromoCode,
    addAuditLog: adminConfig.addAuditLog,
  });

  const setSelectedProduct = (id: string) => {
    setSelectedProductId(id);
    setPage("product-detail");
  };

  const state: AppState = {
    role,
    page,
    selectedProductId,
    categories,
    products,
    suppliers,
    promotions,
    promotionUsages,
    equipment,
    orders,
    cart,
    importReceipts,
    reviews,
    maintenanceReceipts,
    staffAccounts,
    stockAdjustments,
    customers,
    notifications,
    policies,
    auditLogs,
    financialAdjustments,
    currentUser,
    pickupDate,
    returnDate,
    pickupHour,
    returnHour,
    newOrderId,
    appliedPromoCode,
    setRole: (r: Role) => {
      setRole(r);
      if (r === "staff") setPage("staff");
      else if (r === "admin") setPage("admin");
      else setPage("landing");
    },
    setPage,
    setSelectedProduct,
    setPickupDate,
    setReturnDate,
    setPickupHour,
    setReturnHour,
    setAppliedPromoCode,
    setNewOrderId,
    setNotifications,
    ...catalogAdmin,
    ...cartOrder,
    ...orderSettlement,
    ...handoverReturn,
    ...inventoryActions,
    ...adminConfig,
    ...authActions,
    policyVersions,
    realApi: REAL_MODE,
    authLoading,
    permissionNotice,
    dismissPermissionNotice: () => setPermissionNotice(null),
    unreadNotificationCount,
    setUnreadNotificationCount,
    setCartItems: setCart,
    ...bootstrap,
  };

  return (
    <AppContext.Provider value={state}>
      {permissionNotice && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-[60] max-w-md rounded-2xl border border-amber-300 bg-[#FFFDF7] p-4 shadow-lg text-[#11231B] flex items-start gap-3"
        >
          <Icon name="alert-circle" className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm leading-relaxed">{permissionNotice}</div>
          <button
            type="button"
            onClick={() => setPermissionNotice(null)}
            className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-stone-100 text-stone-600"
          >
            Đóng
          </button>
        </div>
      )}
      {(page === "login" || page === "register" || page === "forgot-password") && (
        <AuthLayout>
          {page === "login" && <LoginView />}
          {page === "register" && <RegisterView />}
          {page === "forgot-password" && <ForgotPasswordView />}
        </AuthLayout>
      )}

      {page === "staff" && <StaffView />}
      {page === "admin" && <AdminView />}

      {page !== "login" && page !== "register" && page !== "forgot-password" && page !== "staff" && page !== "admin" && (
        <PublicLayout>
          {page === "landing" && <LandingView />}
          {(page === "products" || page === "product-detail") && <ProductsView />}
          {(page === "cart" || page === "checkout" || page === "order-confirmed" || page === "my-orders" || page === "profile" || page === "ai-advisor") && (
            <CustomerPortal />
          )}
        </PublicLayout>
      )}
    </AppContext.Provider>
  );
}
