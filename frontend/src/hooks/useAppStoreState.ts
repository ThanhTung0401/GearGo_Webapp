import { useCallback, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthToken } from "../services/apiClient";
import { PAGE_TO_PATH, resolveRouteFromPath } from "../routes/routeMap";
import type { Page } from "../context";
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
} from "../store";
import { loadPersistedState, NEUTRAL_POLICY_CONFIG, REAL_MODE } from "./appStateStorage";

export type CurrentUserProfile = {
  id?: string;
  username?: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  permissions?: string[];
  address?: string;
  avatarUrl?: string;
};

const persistedState = loadPersistedState();

function normalizeDemoProducts(): Product[] {
  const source = persistedState?.products ?? INITIAL_PRODUCTS;
  const availableCategories = persistedState?.categories ?? INITIAL_CATEGORIES;
  return source.map((product) => ({
    ...product,
    displayCode: product.displayCode ?? product.id,
    categoryId: product.categoryId ?? availableCategories.find((cat) => cat.name === product.category)?.id,
    dimensions: product.dimensions ?? "",
    specifications: product.specifications ?? {},
    images: product.images ?? [product.image].filter(Boolean),
  }));
}

function normalizeDemoEquipment(): Equipment[] {
  return (persistedState?.equipment ?? INITIAL_EQUIPMENT).map((item) => ({
    ...item,
    displayCode: item.displayCode ?? item.id,
    importReceiptLineId:
      item.importReceiptLineId ??
      (() => {
        const receipt = (persistedState?.importReceipts ?? INITIAL_IMPORT_RECEIPTS).find(
          (entry) => entry.id === item.importReceiptId
        );
        const index = receipt?.lines.findIndex((line) => line.productId === item.originalProductId) ?? -1;
        return index >= 0 ? (receipt?.lines[index].id ?? `${receipt?.id}-LINE-${index + 1}`) : undefined;
      })(),
    includedAccessories: item.includedAccessories ?? [],
    note: item.note ?? "",
  }));
}

function normalizeDemoImportReceipts(suppliers: Supplier[]): ImportReceipt[] {
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
}

/**
 * Hook quản lý toàn bộ state khởi tạo và điều hướng URL của ứng dụng.
 */
export function useAppStoreState() {
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedRoute = resolveRouteFromPath(location.pathname);
  const page = resolvedRoute.page;

  const [role, setRole] = useState<Role>("customer");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(resolvedRoute.productId);
  const pageRef = useRef<Page>(page);
  pageRef.current = page;

  // Đồng bộ hàm chuyển trang với React Router
  const setPage = useCallback(
    (next: Page | ((prev: Page) => Page)) => {
      const target = typeof next === "function" ? next(pageRef.current) : next;
      const targetPath = PAGE_TO_PATH[target] ?? "/";
      if (location.pathname !== targetPath) {
        navigate(targetPath);
      }
    },
    [location.pathname, navigate]
  );

  const [categories, setCategories] = useState<Category[]>(
    REAL_MODE ? [] : (persistedState?.categories ?? INITIAL_CATEGORIES)
  );
  const [products, setProducts] = useState<Product[]>(() => (REAL_MODE ? [] : normalizeDemoProducts()));
  const [suppliers, setSuppliers] = useState<Supplier[]>(
    REAL_MODE ? [] : (persistedState?.suppliers ?? INITIAL_SUPPLIERS)
  );
  const [promotions, setPromotions] = useState<Promotion[]>(
    REAL_MODE ? [] : (persistedState?.promotions ?? INITIAL_PROMOTIONS)
  );
  const [promotionUsages, setPromotionUsages] = useState<PromotionUsage[]>(
    REAL_MODE ? [] : (persistedState?.promotionUsages ?? [])
  );
  const [equipment, setEquipment] = useState<Equipment[]>(() => (REAL_MODE ? [] : normalizeDemoEquipment()));
  const [orders, setOrders] = useState<Order[]>(() => {
    if (REAL_MODE) return [];
    const list = persistedState?.orders ?? INITIAL_ORDERS;
    return list.some((o) => o.status === "Hoàn tất") ? list : [...list, DEMO_ORDER_COMPLETED];
  });
  // Khôi phục giỏ tạm từ localStorage cho khách vãng lai ở cả chế độ Real API
  const [cart, setCart] = useState<CartItem[]>(persistedState?.cart ?? []);
  const [importReceipts, setImportReceipts] = useState<ImportReceipt[]>(() =>
    REAL_MODE ? [] : normalizeDemoImportReceipts(suppliers)
  );
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
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(
    REAL_MODE
      ? null
      : (persistedState?.currentUser ?? {
          id: "KH001",
          name: "Nguyễn Văn An",
          email: "an.nguyen@gmail.com",
          phone: "0901 234 567",
          role: "customer",
        })
  );
  const [authLoading, setAuthLoading] = useState<boolean>(() => REAL_MODE && Boolean(getAuthToken()));
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [pickupDate, setPickupDate] = useState(persistedState?.pickupDate ?? "");
  const [returnDate, setReturnDate] = useState(persistedState?.returnDate ?? "");
  const [pickupHour, setPickupHour] = useState(persistedState?.pickupHour ?? "09:00");
  const [returnHour, setReturnHour] = useState(persistedState?.returnHour ?? "09:00");
  const [newOrderId, setNewOrderId] = useState<string | null>(REAL_MODE ? null : (persistedState?.newOrderId ?? null));
  const [appliedPromoCode, setAppliedPromoCode] = useState(REAL_MODE ? "" : (persistedState?.appliedPromoCode ?? ""));

  const categoriesRef = useRef<Category[]>(categories);
  categoriesRef.current = categories;

  const setSelectedProduct = useCallback(
    (id: string) => {
      setSelectedProductId(id);
      navigate(`/products/${encodeURIComponent(id)}`);
    },
    [navigate]
  );

  return {
    navigate,
    resolvedRoute,
    page,
    pageRef,
    setPage,
    role,
    setRole,
    selectedProductId,
    setSelectedProductId,
    setSelectedProduct,
    categories,
    setCategories,
    categoriesRef,
    products,
    setProducts,
    suppliers,
    setSuppliers,
    promotions,
    setPromotions,
    promotionUsages,
    setPromotionUsages,
    equipment,
    setEquipment,
    orders,
    setOrders,
    cart,
    setCart,
    importReceipts,
    setImportReceipts,
    reviews,
    setReviews,
    maintenanceReceipts,
    setMaintenanceReceipts,
    staffAccounts,
    setStaffAccounts,
    stockAdjustments,
    setStockAdjustments,
    customers,
    setCustomers,
    notifications,
    setNotifications,
    unreadNotificationCount,
    setUnreadNotificationCount,
    policies,
    setPolicies,
    policyVersions,
    setPolicyVersions,
    auditLogs,
    setAuditLogs,
    financialAdjustments,
    setFinancialAdjustments,
    currentUser,
    setCurrentUser,
    authLoading,
    setAuthLoading,
    permissionNotice,
    setPermissionNotice,
    pickupDate,
    setPickupDate,
    returnDate,
    setReturnDate,
    pickupHour,
    setPickupHour,
    returnHour,
    setReturnHour,
    newOrderId,
    setNewOrderId,
    appliedPromoCode,
    setAppliedPromoCode,
  };
}
