import { createContext, useContext } from "react";
import type {
  Role, Order, Equipment, CartItem, Product, Category, Supplier, Promotion, PromotionUsage,
  ActionResult, OrderStatus, AssignedEquipment, Surcharge, MoneyTransaction, ImportReceipt, Review,
  HandoverRecord, ReturnReceipt, ReturnReceiptItem, MaintenanceReceipt, StaffAccount, StockAdjustmentReceipt, StockAdjustmentLine,
  CustomerAccount, AppNotification, RentalPolicyConfig, PolicyVersion, AuditLogEntry, FinancialAdjustment, ReconciliationStatement, ContactLog,
  ImportReceiptAdjustment,
} from "../store";

export type Page =
  | "landing" | "products" | "product-detail"
  | "cart" | "checkout" | "order-confirmed" | "my-orders"
  | "profile"
  | "ai-advisor"
  | "login" | "register" | "forgot-password" | "auth"
  | "staff" | "admin";

export interface AppState {
  role: Role;
  page: Page;
  selectedProductId: string | null;
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
  customers: CustomerAccount[];
  notifications: AppNotification[];
  policies: RentalPolicyConfig;
  policyVersions: PolicyVersion[];
  auditLogs: AuditLogEntry[];
  financialAdjustments: FinancialAdjustment[];
  currentUser: { id?: string; username?: string; name: string; email: string; phone: string; role: Role; permissions?: string[]; address?: string } | null;
  pickupDate: string;
  returnDate: string;
  pickupHour: string;
  returnHour: string;
  newOrderId: string | null;
  appliedPromoCode: string;
  // actions
  setRole: (r: Role) => void;
  setPage: (p: Page) => void;
  setSelectedProduct: (id: string) => void;
  setPickupDate: (d: string) => void;
  setReturnDate: (d: string) => void;
  setPickupHour: (h: string) => void;
  setReturnHour: (h: string) => void;
  setAppliedPromoCode: (code: string) => void;
  setNewOrderId: (id: string | null) => void;
  setNotifications: (n: AppNotification[] | ((prev: AppNotification[]) => AppNotification[])) => void;
  saveCategory: (category: Category) => ActionResult<Category>;
  setCategoryStatus: (id: string, status: Category["status"]) => ActionResult;
  saveProduct: (product: Product) => ActionResult<Product>;
  saveEquipment: (equipment: Equipment) => ActionResult<Equipment>;
  saveSupplier: (supplier: Supplier) => ActionResult<Supplier>;
  savePromotion: (promotion: Promotion) => ActionResult<Promotion>;
  saveImportReceipt: (receipt: ImportReceipt) => ActionResult<ImportReceipt>;
  cancelImportReceipt: (receiptId: string, reason: string) => ActionResult;
  evaluatePromotion: (code: string, rental: number, items: { productId: string; rental: number }[]) => ActionResult<{ promotion: Promotion; discount: number }>;
  addToCart: (productId: string, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, delta: number) => void;
  createOrder: (promoCode: string) => string;
  payOrder: (orderId: string, succeed?: boolean) => void;
  confirmReconciliation: (orderId: string, note?: string) => ActionResult<ReconciliationStatement>;
  finalizeOrderWithoutPayment: (orderId: string, note?: string) => ActionResult;
  settleOrder: (orderId: string, succeed?: boolean, details?: { method?: string; note?: string; amount?: number }) => void;
  cancelOrder: (orderId: string, reason?: string) => void;
  getCancellationQuote: (orderId: string) => { fee: number; refund: number };
  advanceOrderStatus: (orderId: string, status: OrderStatus, by?: string) => void;
  assignEquipment: (orderId: string, assigned: AssignedEquipment[]) => void;
  completePreparation: (orderId: string, assignedEquipmentIds: { productId: string; equipmentId: string }[], staffName?: string) => ActionResult<void>;
  reportEquipmentShortage: (orderId: string, note: string, staffName?: string) => ActionResult<void>;
  createHandoverRecord: (orderId: string, record: Omit<HandoverRecord, "id" | "handoverAt">) => ActionResult<HandoverRecord>;
  changeAssignedEquipment: (orderId: string, oldEquipmentId: string, newEquipmentId: string) => ActionResult;
  createReturnReceipt: (orderId: string, input: { returnItems: ReturnReceiptItem[]; staffName: string; note?: string; photoUrls?: string[] }) => ActionResult<ReturnReceipt>;
  checkOrderOverdue: (order: Order) => { isOverdue: boolean; overdueHours: number; overdueDays: number; surcharge: number };
  addContactLog: (orderId: string, log: Omit<ContactLog, "id" | "contactedAt">) => ActionResult<ContactLog>;
  getOverdueConflicts: (orderId: string) => Array<{ equipmentId: string; nextOrderId: string; nextCustomerName: string; nextPickupTime: string; availableSubstitutes: string[] }>;
  reportCustomerNoShow: (orderId: string, note: string, staffName?: string) => ActionResult<void>;
  approveLostEquipment: (orderId: string, equipmentId: string, staffName?: string) => ActionResult<void>;
  saveMaintenanceReceipt: (receipt: MaintenanceReceipt) => ActionResult<MaintenanceReceipt>;
  updateMaintenanceStatus: (id: string, status: MaintenanceReceipt["status"], actualCost?: number, note?: string) => ActionResult;
  toggleStaffLock: (staffId: string, reason?: string) => ActionResult;
  saveStaffAccount: (staff: StaffAccount) => ActionResult<StaffAccount>;
  saveCustomer: (customer: CustomerAccount) => ActionResult<CustomerAccount>;
  toggleCustomerLock: (customerId: string, reason?: string) => ActionResult;
  sendNotification: (notif: {
    title: string;
    message: string;
    type: AppNotification["type"];
    targetRole: AppNotification["targetRole"];
    category?: AppNotification["category"];
    actionLink?: AppNotification["actionLink"];
  }) => ActionResult<AppNotification>;
  markNotificationRead: (id: string) => void;
  replyReview: (reviewId: string, response: string, responderName?: string) => ActionResult;
  updatePolicy: (policy: Partial<RentalPolicyConfig>, changeReason?: string, effectiveDate?: string) => ActionResult;
  pausePromotion: (promoId: string, reason: string) => ActionResult;
  resumePromotion: (promoId: string) => ActionResult;
  addAuditLog: (entry: { actor: string; role: string; action: string; targetEntity: string; targetId: string; detail: string }) => void;
  saveFinancialAdjustment: (adj: Omit<FinancialAdjustment, "id" | "createdAt">) => ActionResult<FinancialAdjustment>;
  login: (user: { id?: string; username?: string; name: string; email: string; phone: string; role: Role; permissions?: string[]; address?: string }) => void;
  logout: () => void;
  updateCurrentUserProfile: (info: { name: string; phone: string; email: string }) => ActionResult;
  changeCurrentUserPassword: (oldPass: string, newPass: string) => ActionResult;
  createStockAdjustment: (receipt: { reason: string; createdBy: string; lines: StockAdjustmentLine[]; autoApprove?: boolean }) => ActionResult<StockAdjustmentReceipt>;
  approveStockAdjustment: (id: string, note?: string) => ActionResult;
  rejectStockAdjustment: (id: string, note?: string) => ActionResult;
  addSurcharge: (orderId: string, surcharge: Surcharge) => void;
  approveSurcharge: (orderId: string, surchargeId: string) => void;
  rejectSurcharge: (orderId: string, surchargeId: string) => void;
  disputeSurcharge: (orderId: string, surchargeId: string, customerResponse: string) => void;
  resolveDisputedSurcharge: (orderId: string, surchargeId: string, resolution: "approved" | "rejected" | "adjusted", finalAmount: number, resolutionNote: string) => void;
  confirmImportReceipt: (
    receiptId: string,
    inspection?: {
      inspectedBy: string;
      lines: {
        productId: string;
        acceptedCodes: string[];
        damagedCodes?: string[];
        damageNotes?: string;
        rejectedQty?: number;
        rejectionReason?: string;
      }[];
    }
  ) => string | null;
  toggleSupplierStatus: (supplierId: string, status: "active" | "inactive", reason: string) => ActionResult;
  createImportAdjustment: (adjustment: Omit<ImportReceiptAdjustment, "id" | "createdAt" | "status">) => ActionResult<ImportReceiptAdjustment>;
  approveImportAdjustment: (receiptId: string, adjustmentId: string, approvedBy?: string) => ActionResult;
  rejectImportAdjustment: (receiptId: string, adjustmentId: string, reason?: string) => ActionResult;
  markEquipmentReturned: (orderId: string, equipmentId: string, condition: string, note: string) => void;
  transferEquipment: (equipmentId: string, newProductId: string) => ActionResult<Equipment>;
  addReview: (input: { orderId: string; productId: string; rating: number; comment: string; images?: string[] }) => ActionResult<Review>;
  hideReview: (reviewId: string, reason: string) => ActionResult;
  resetDemo: () => void;
  getAvailable: (productId: string) => number;
  getDays: () => number;
  hasValidRentalPeriod: () => boolean;
}

export const AppContext = createContext<AppState>({} as AppState);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
