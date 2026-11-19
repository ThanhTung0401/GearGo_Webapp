import { isRealApiEnabled } from "../services/apiClient";
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
  PromotionUsage,
  RentalPolicyConfig,
  Review,
  Role,
  StaffAccount,
  StockAdjustmentReceipt,
  Supplier,
} from "../store";

export const STORAGE_KEY = "geargo-demo-state-v2";
export const LEGACY_STORAGE_KEY = "geargo-demo-state-v1";
export const PREFS_STORAGE_KEY = "geargo-ui-prefs-v1";
export const REAL_MODE = isRealApiEnabled();

export const NEUTRAL_POLICY_CONFIG: RentalPolicyConfig = {
  version: "v1.0",
  effectiveDate: "",
  holdMinutes: 15,
  standardPickupTime: "08:00",
  standardReturnTime: "20:00",
  cancellationFreeHours: 48,
  cancellationTier1Hours: 24,
  cancellationTier1FeePercent: 30,
  cancellationTier2FeePercent: 100,
  overdueMultiplier: 1.5,
  minDepositPercentage: 100,
  damageCompensationPercent: 50,
  accessoryLossFeeSchedule: [],
  adminApprovalFeeThreshold: 1000000,
  reminderPickupHoursBefore: 4,
  reminderReturnHoursBefore: 2,
  updatedAt: "",
  updatedBy: "Hệ thống",
};

export function mapBackendRoleToFrontend(vaiTro?: string | null): Role {
  if (!vaiTro || vaiTro === "KhachHang") return "customer";
  if (vaiTro === "QuanTriVien") return "admin";
  // Mọi vai trò nội bộ khác từ DB (NhanVien, Shipper, LaoCong, ...) đều vào Workspace và phân quyền động theo DB
  return "staff";
}

export interface PersistedState {
  schemaVersion?: number;
  categories?: Category[];
  products: Product[];
  suppliers?: Supplier[];
  promotions?: Promotion[];
  promotionUsages?: PromotionUsage[];
  equipment: Equipment[];
  orders: Order[];
  cart: CartItem[];
  importReceipts?: ImportReceipt[];
  reviews?: Review[];
  maintenanceReceipts?: MaintenanceReceipt[];
  staffAccounts?: StaffAccount[];
  stockAdjustments?: StockAdjustmentReceipt[];
  customers?: CustomerAccount[];
  notifications?: AppNotification[];
  policies?: RentalPolicyConfig;
  policyVersions?: PolicyVersion[];
  auditLogs?: AuditLogEntry[];
  financialAdjustments?: FinancialAdjustment[];
  currentUser?: {
    id?: string;
    username?: string;
    name: string;
    email: string;
    phone: string;
    role: Role;
    permissions?: string[];
    address?: string;
  } | null;
  pickupDate: string;
  returnDate: string;
  pickupHour?: string;
  returnHour?: string;
  newOrderId: string | null;
  appliedPromoCode?: string;
}

export function loadPersistedState(): PersistedState | null {
  try {
    if (REAL_MODE) {
      const prefsRaw = localStorage.getItem(PREFS_STORAGE_KEY);
      return prefsRaw ? (JSON.parse(prefsRaw) as PersistedState) : null;
    }
    const value = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    return value ? (JSON.parse(value) as PersistedState) : null;
  } catch {
    return null;
  }
}

export const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const normalizeCode = (value: string) => value.trim().toUpperCase();
