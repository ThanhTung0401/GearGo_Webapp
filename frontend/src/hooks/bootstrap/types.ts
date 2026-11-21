import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Page } from "../../context";
import type {
  AppNotification,
  AuditLogEntry,
  CartItem,
  Category,
  CustomerAccount,
  Equipment,
  FinancialAdjustment,
  ImportReceipt,
  MaintenanceReceipt,
  Order,
  PolicyVersion,
  Product,
  Promotion,
  RentalPolicyConfig,
  Review,
  Role,
  StaffAccount,
  StockAdjustmentReceipt,
  Supplier,
} from "../../store";

export interface UseBootstrapDataParams {
  role: Role;
  currentUser: { id?: string; name: string } | null;
  pageRef: MutableRefObject<Page>;
  categoriesRef: MutableRefObject<Category[]>;
  setRole: Dispatch<SetStateAction<Role>>;
  setPage: Dispatch<SetStateAction<Page>>;
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
  setAuthLoading: Dispatch<SetStateAction<boolean>>;
  setPermissionNotice: Dispatch<SetStateAction<string | null>>;
  setCategories: Dispatch<SetStateAction<Category[]>>;
  setProducts: Dispatch<SetStateAction<Product[]>>;
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  setAppliedPromoCode: Dispatch<SetStateAction<string>>;
  setPickupDate: Dispatch<SetStateAction<string>>;
  setReturnDate: Dispatch<SetStateAction<string>>;
  setOrders: Dispatch<SetStateAction<Order[]>>;
  setEquipment: Dispatch<SetStateAction<Equipment[]>>;
  setMaintenanceReceipts: Dispatch<SetStateAction<MaintenanceReceipt[]>>;
  setStockAdjustments: Dispatch<SetStateAction<StockAdjustmentReceipt[]>>;
  setSuppliers: Dispatch<SetStateAction<Supplier[]>>;
  setImportReceipts: Dispatch<SetStateAction<ImportReceipt[]>>;
  setPromotions: Dispatch<SetStateAction<Promotion[]>>;
  setPolicyVersions: Dispatch<SetStateAction<PolicyVersion[]>>;
  setPolicies: Dispatch<SetStateAction<RentalPolicyConfig>>;
  setReviews: Dispatch<SetStateAction<Review[]>>;
  setNotifications: Dispatch<SetStateAction<AppNotification[]>>;
  setUnreadNotificationCount: Dispatch<SetStateAction<number>>;
  setAuditLogs: Dispatch<SetStateAction<AuditLogEntry[]>>;
  setStaffAccounts: Dispatch<SetStateAction<StaffAccount[]>>;
  setCustomers: Dispatch<SetStateAction<CustomerAccount[]>>;
  setFinancialAdjustments: Dispatch<SetStateAction<FinancialAdjustment[]>>;
}
