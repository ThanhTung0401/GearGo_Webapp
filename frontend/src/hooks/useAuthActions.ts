import type { Dispatch, SetStateAction } from "react";
import type { Page } from "../context";
import { getAuthToken, setAuthToken } from "../services/apiClient";
import { authApi, profileApi } from "../services/api";
import {
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
  INITIAL_PRODUCTS,
  INITIAL_PROMOTIONS,
  INITIAL_REVIEWS,
  INITIAL_STAFF_ACCOUNTS,
  INITIAL_STOCK_ADJUSTMENTS,
  INITIAL_SUPPLIERS,
  type ActionResult,
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
import { LEGACY_STORAGE_KEY, REAL_MODE, STORAGE_KEY } from "./appStateStorage";

interface UseAuthActionsParams {
  role: Role;
  setRole: Dispatch<SetStateAction<Role>>;
  setPage: Dispatch<SetStateAction<Page>>;
  currentUser: {
    id?: string;
    username?: string;
    name: string;
    email: string;
    phone: string;
    role: Role;
    permissions?: string[];
    address?: string;
  } | null;
  setCurrentUser: Dispatch<
    SetStateAction<{
      id?: string;
      username?: string;
      name: string;
      email: string;
      phone: string;
      role: Role;
      permissions?: string[];
      address?: string;
    } | null>
  >;
  setPermissionNotice: Dispatch<SetStateAction<string | null>>;
  hydrateSession: (fromPermissionChange?: boolean) => Promise<void>;
  staffAccounts: StaffAccount[];
  setStaffAccounts: Dispatch<SetStateAction<StaffAccount[]>>;
  customers: CustomerAccount[];
  setCustomers: Dispatch<SetStateAction<CustomerAccount[]>>;
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
  setUnreadNotificationCount: Dispatch<SetStateAction<number>>;
  setAuditLogs: Dispatch<SetStateAction<AuditLogEntry[]>>;
  setFinancialAdjustments: Dispatch<SetStateAction<FinancialAdjustment[]>>;
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setProducts: Dispatch<SetStateAction<Product[]>>;
  setSuppliers: Dispatch<SetStateAction<Supplier[]>>;
  setPromotions: Dispatch<SetStateAction<Promotion[]>>;
  setPromotionUsages: Dispatch<SetStateAction<PromotionUsage[]>>;
  setEquipment: Dispatch<SetStateAction<Equipment[]>>;
  setMaintenanceReceipts: Dispatch<SetStateAction<MaintenanceReceipt[]>>;
  setStockAdjustments: Dispatch<SetStateAction<StockAdjustmentReceipt[]>>;
  setPolicies: Dispatch<SetStateAction<RentalPolicyConfig>>;
  setImportReceipts: Dispatch<SetStateAction<ImportReceipt[]>>;
  setReviews: Dispatch<SetStateAction<Review[]>>;
  setPickupDate: Dispatch<SetStateAction<string>>;
  setReturnDate: Dispatch<SetStateAction<string>>;
  setNewOrderId: Dispatch<SetStateAction<string | null>>;
  setAppliedPromoCode: Dispatch<SetStateAction<string>>;
  addAuditLog: (entry: {
    actor: string;
    role: string;
    action: string;
    targetEntity: string;
    targetId: string;
    detail: string;
  }) => void;
}

/**
 * Hook xác thực phiên đăng nhập, cập nhật hồ sơ, đổi mật khẩu, đăng xuất và reset demo.
 */
export function useAuthActions(params: UseAuthActionsParams) {
  const {
    role,
    setRole,
    setPage,
    currentUser,
    setCurrentUser,
    setPermissionNotice,
    hydrateSession,
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
    addAuditLog,
  } = params;

  const login = (user: {
    id?: string;
    username?: string;
    name: string;
    email: string;
    phone: string;
    role: Role;
    permissions?: string[];
    address?: string;
  }) => {
    setCurrentUser(user);
    setRole(user.role);
    setPermissionNotice(null);
    if (REAL_MODE && getAuthToken()) {
      void hydrateSession(false);
    } else {
      addAuditLog({
        actor: user.name,
        role: user.role === "admin" ? "Quản trị viên" : user.role === "staff" ? "Nhân viên" : "Khách hàng",
        action: "Đăng nhập (UC1.2)",
        targetEntity: "Session",
        targetId: user.email || user.username || user.id || "SESSION",
        detail: `Đăng nhập thành công với vai trò ${user.role}`,
      });
    }
    if (user.role === "admin") setPage("admin");
    else if (user.role === "staff") setPage("staff");
    else setPage("landing");
  };

  const updateCurrentUserProfile = async (info: { name: string; phone: string; email: string; otp?: string }): Promise<ActionResult> => {
    if (!currentUser) return { ok: false, message: "Chưa đăng nhập hệ thống." };

    if (REAL_MODE && getAuthToken()) {
      try {
        const updated = await profileApi.capNhatHoSoToi({
          hoTen: info.name,
          email: info.email,
          soDienThoai: info.phone,
          diaChi: currentUser.address ?? null,
          maOtp: info.otp ?? null,
        });
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                name: updated.hoTen ?? info.name,
                email: updated.email ?? info.email,
                phone: updated.soDienThoai ?? info.phone,
              }
            : null
        );
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại." };
      }
    }

    setCurrentUser((prev) => (prev ? { ...prev, name: info.name, phone: info.phone, email: info.email } : null));

    if (role === "admin" || role === "staff") {
      setStaffAccounts((prev) =>
        prev.map((s) => (s.id === currentUser.id || s.email === currentUser.email ? { ...s, name: info.name, phone: info.phone, email: info.email } : s))
      );
    } else {
      setCustomers((prev) =>
        prev.map((c) => (c.id === currentUser.id || c.email === currentUser.email ? { ...c, name: info.name, phone: info.phone, email: info.email } : c))
      );
    }

    addAuditLog({
      actor: info.name,
      role: role === "admin" ? "Quản trị viên" : role === "staff" ? "Nhân viên" : "Khách hàng",
      action: "Cập nhật hồ sơ cá nhân (UC1.6)",
      targetEntity: "UserProfile",
      targetId: currentUser.id || info.email,
      detail: `Cập nhật thông tin liên hệ: SĐT ${info.phone}, Email ${info.email}`,
    });
    return { ok: true };
  };

  const changeCurrentUserPassword = async (oldPass: string, newPass: string): Promise<ActionResult> => {
    if (!currentUser) return { ok: false, message: "Chưa đăng nhập hệ thống." };
    if (newPass.length < 8) {
      return { ok: false, message: "Mật khẩu mới tối thiểu 8 ký tự." };
    }

    if (REAL_MODE) {
      try {
        await authApi.doiMatKhau({
          matKhauHienTai: oldPass,
          matKhauMoi: newPass,
          xacNhanMatKhauMoi: newPass,
          xacNhanMatKhau: newPass,
        } as Parameters<typeof authApi.doiMatKhau>[0]);
        setOrders([]);
        setCart([]);
        setNotifications([]);
        setUnreadNotificationCount(0);
        setAuditLogs([]);
        setStaffAccounts([]);
        setCustomers([]);
        setFinancialAdjustments([]);
        setAuthToken(null);
        setCurrentUser(null);
        setRole("customer");
        setPage("login");
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Đổi mật khẩu thất bại." };
      }
    }

    let currentStoredPass = "123456";
    if (role === "admin" || role === "staff") {
      const staff = staffAccounts.find((s) => s.id === currentUser.id || s.email === currentUser.email || s.username === currentUser.username);
      currentStoredPass = staff?.password || (role === "admin" ? "admin123" : "staff123");
    } else {
      const cust = customers.find((c) => c.id === currentUser.id || c.email === currentUser.email);
      currentStoredPass = cust?.password || "123456";
    }

    if (oldPass !== currentStoredPass) {
      return { ok: false, message: "Mật khẩu hiện tại không chính xác." };
    }

    if (role === "admin" || role === "staff") {
      setStaffAccounts((prev) =>
        prev.map((s) =>
          s.id === currentUser.id || s.email === currentUser.email || s.username === currentUser.username ? { ...s, password: newPass } : s
        )
      );
    } else {
      setCustomers((prev) => prev.map((c) => (c.id === currentUser.id || c.email === currentUser.email ? { ...c, password: newPass } : c)));
    }

    addAuditLog({
      actor: currentUser.name,
      role: role === "admin" ? "Quản trị viên" : role === "staff" ? "Nhân viên" : "Khách hàng",
      action: "Đổi mật khẩu tài khoản (UC1.12)",
      targetEntity: "UserSecurity",
      targetId: currentUser.id || currentUser.email,
      detail: "Người dùng đổi mật khẩu bảo mật cá nhân thành công",
    });

    setCurrentUser(null);
    setRole("customer");
    setPage("login");
    return { ok: true };
  };

  const logout = async () => {
    if (REAL_MODE) {
      try {
        await authApi.dangXuat();
      } catch {
        // Vẫn xóa phiên cục bộ nếu token hết hạn hoặc mất kết nối
      }
      setOrders([]);
      setCart([]);
      setNotifications([]);
      setUnreadNotificationCount(0);
      setAuditLogs([]);
      setStaffAccounts([]);
      setCustomers([]);
      setFinancialAdjustments([]);
    } else {
      const actorName = currentUser?.name || "Người dùng";
      addAuditLog({
        actor: actorName,
        role: role === "admin" ? "Quản trị viên" : role === "staff" ? "Nhân viên" : "Khách hàng",
        action: "Đăng xuất (UC1.3)",
        targetEntity: "Session",
        targetId: currentUser?.email || "SESSION",
        detail: "Đăng xuất tài khoản khỏi phiên làm việc",
      });
    }
    setAuthToken(null);
    setCurrentUser(null);
    setRole("customer");
    setPage("landing");
  };

  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setCategories(INITIAL_CATEGORIES);
    setProducts(
      INITIAL_PRODUCTS.map((product) => ({
        ...product,
        displayCode: product.id,
        categoryId: INITIAL_CATEGORIES.find((category) => category.name === product.category)?.id,
        dimensions: "",
        specifications: {},
        images: [product.image].filter(Boolean),
      }))
    );
    setSuppliers(INITIAL_SUPPLIERS);
    setPromotions(INITIAL_PROMOTIONS);
    setPromotionUsages([]);
    setEquipment(
      INITIAL_EQUIPMENT.map((item) => {
        const receipt = INITIAL_IMPORT_RECEIPTS.find((entry) => entry.id === item.importReceiptId);
        const index = receipt?.lines.findIndex((line) => line.productId === item.originalProductId) ?? -1;
        return {
          ...item,
          displayCode: item.id,
          importReceiptLineId: index >= 0 ? `${receipt?.id}-LINE-${index + 1}` : undefined,
          includedAccessories: [],
          note: "",
        };
      })
    );
    setOrders(INITIAL_ORDERS);
    setMaintenanceReceipts(INITIAL_MAINTENANCE_RECEIPTS);
    setStaffAccounts(INITIAL_STAFF_ACCOUNTS);
    setStockAdjustments(INITIAL_STOCK_ADJUSTMENTS);
    setCustomers(INITIAL_CUSTOMERS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setPolicies(INITIAL_POLICIES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setFinancialAdjustments(INITIAL_FINANCIAL_ADJUSTMENTS);
    setCurrentUser({ name: "Nguyễn Văn An", email: "an.nguyen@gmail.com", phone: "0901 234 567", role: "customer" });
    setCart([]);
    setImportReceipts(
      INITIAL_IMPORT_RECEIPTS.map((receipt) => ({
        ...receipt,
        displayCode: receipt.id,
        supplierId: INITIAL_SUPPLIERS.find((supplier) => supplier.displayCode === receipt.supplierId)?.id ?? receipt.supplierId,
        lines: receipt.lines.map((line, index) => ({
          ...line,
          id: `${receipt.id}-LINE-${index + 1}`,
          receivingCondition: "Mới",
          note: "",
        })),
      }))
    );
    setReviews(INITIAL_REVIEWS);
    setPickupDate("");
    setReturnDate("");
    setNewOrderId(null);
    setAppliedPromoCode("");
    setPage("landing");
    setRole("customer");
  };

  return { login, updateCurrentUserProfile, changeCurrentUserPassword, logout, resetDemo };
}
