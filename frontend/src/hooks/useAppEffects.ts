import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { Page } from "../context";
import type {
  AuditLogEntry,
  CartItem,
  Category,
  Equipment,
  ImportReceipt,
  MaintenanceReceipt,
  Order,
  OrderStatus,
  PolicyVersion,
  Product,
  Promotion,
  PromotionUsage,
  RentalPolicyConfig,
  Review,
  StaffAccount,
  StockAdjustmentReceipt,
  Supplier,
} from "../store";
import { parseServerTimestamp } from "../modules/orders/customerUtils";
import { getAuthToken } from "../services/apiClient";
import { PREFS_STORAGE_KEY, REAL_MODE, STORAGE_KEY, type PersistedState } from "./appStateStorage";
import type { CurrentUserProfile } from "./useAppStoreState";

interface UseAppEffectsParams {
  page: Page;
  resolvedPage: Page;
  resolvedProductId: string | null;
  authLoading: boolean;
  currentUser: CurrentUserProfile | null;
  navigate: NavigateFunction;
  setSelectedProductId: Dispatch<SetStateAction<string | null>>;
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setPromotionUsages: Dispatch<SetStateAction<PromotionUsage[]>>;
  persistedDeps: {
    categories: Category[];
    products: Product[];
    suppliers: Supplier[];
    promotions: Promotion[];
    promotionUsages: PromotionUsage[];
    equipment: Equipment[];
    orders: Order[];
    cart: CartItem[];
    importReceipts: ImportReceipt[];
    reviews: Review[];
    maintenanceReceipts: MaintenanceReceipt[];
    staffAccounts: StaffAccount[];
    stockAdjustments: StockAdjustmentReceipt[];
    pickupDate: string;
    returnDate: string;
    pickupHour: string;
    returnHour: string;
    newOrderId: string | null;
    appliedPromoCode: string;
    policies: RentalPolicyConfig;
    policyVersions: PolicyVersion[];
    auditLogs?: AuditLogEntry[];
  };
}

/**
 * Hook quản lý các side-effects toàn cục: đồng bộ route, bảo vệ cổng staff,
 * tự động hết hạn đơn giữ chỗ (chuẩn UTC) và lưu trạng thái localStorage.
 */
export function useAppEffects(params: UseAppEffectsParams) {
  const {
    page,
    resolvedPage,
    resolvedProductId,
    authLoading,
    currentUser,
    navigate,
    setSelectedProductId,
    orders,
    setOrders,
    setPromotionUsages,
    persistedDeps,
  } = params;

  // Đồng bộ productId khi truy cập trực tiếp URL /products/:id
  useEffect(() => {
    if (resolvedPage === "product-detail" && resolvedProductId) {
      setSelectedProductId(resolvedProductId);
    }
  }, [resolvedPage, resolvedProductId, setSelectedProductId]);

  // Bảo vệ cổng vận hành /staff: chưa đăng nhập hoặc tài khoản khách -> chuyển về /staff/login
  useEffect(() => {
    if (authLoading) return;
    const isStaffRoute = page === "workspace" || page === "staff" || page === "admin";
    if (isStaffRoute && (!currentUser || currentUser.role === "customer")) {
      navigate("/staff/login", { replace: true });
    }
  }, [authLoading, page, currentUser, navigate]);

  // Tự động hết hạn các đơn giữ chỗ quá thời hạn thanh toán (dùng parseServerTimestamp chuẩn UTC)
  useEffect(() => {
    const expireReservations = () => {
      const now = Date.now();
      setOrders((current) => {
        let changed = false;
        const next = current.map((order) => {
          const expMs = parseServerTimestamp(order.expiresAt);
          if (order.status !== "Chờ thanh toán" || !Number.isFinite(expMs) || expMs > now) return order;
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
  }, [setOrders]);

  // Giải phóng mã khuyến mãi giữ chỗ nếu hết hạn
  useEffect(() => {
    const now = Date.now();
    setPromotionUsages((current) =>
      current.map((usage) => {
        const expMs = parseServerTimestamp(usage.expiresAt);
        return usage.status === "reserved" && Number.isFinite(expMs) && expMs <= now
          ? { ...usage, status: "released", releasedAt: new Date().toISOString() }
          : usage;
      })
    );
  }, [orders, setPromotionUsages]);

  // Lưu trạng thái localStorage (chế độ Demo) hoặc UI prefs (chế độ Real API)
  const {
    categories,
    products,
    suppliers,
    promotions,
    promotionUsages,
    equipment,
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
  } = persistedDeps;

  useEffect(() => {
    if (REAL_MODE) {
      let existingGuestCart: CartItem[] | undefined;
      try {
        const raw = localStorage.getItem(PREFS_STORAGE_KEY);
        if (raw) existingGuestCart = (JSON.parse(raw) as { cart?: CartItem[] }).cart;
      } catch {
        existingGuestCart = undefined;
      }
      // Khi chưa đăng nhập, lưu giỏ tạm khách vãng lai vào localStorage để không mất lúc chuyển sang đăng nhập.
      // Khi đã có token, giữ nguyên guestCart tạm cho tới khi refreshCart() gộp lên backend và xóa đi.
      const guestCart = !getAuthToken() ? cart : existingGuestCart;
      localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({
          pickupDate,
          returnDate,
          pickupHour,
          returnHour,
          ...(guestCart && guestCart.length > 0 ? { cart: guestCart } : {}),
        })
      );
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
}
