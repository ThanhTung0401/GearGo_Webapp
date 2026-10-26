import { useState, createContext, useContext, useEffect } from "react";
import {
  Role, Order, Equipment, CartItem,
  INITIAL_PRODUCTS, INITIAL_EQUIPMENT, INITIAL_IMPORT_RECEIPTS, INITIAL_CATEGORIES,
  INITIAL_SUPPLIERS, INITIAL_PROMOTIONS, INITIAL_REVIEWS, INITIAL_ORDERS, INITIAL_MAINTENANCE_RECEIPTS, INITIAL_STAFF_ACCOUNTS, INITIAL_STOCK_ADJUSTMENTS, DEMO_ORDER, DEMO_ORDER_COMPLETED,
  INITIAL_CUSTOMERS, INITIAL_NOTIFICATIONS, INITIAL_POLICIES, INITIAL_POLICY_VERSIONS, INITIAL_AUDIT_LOGS, INITIAL_FINANCIAL_ADJUSTMENTS,
  Product, Category, Supplier, Promotion, PromotionUsage, ActionResult, OrderStatus, AssignedEquipment, Surcharge, MoneyTransaction, ImportReceipt, Review,
  HandoverRecord, ReturnReceipt, ReturnReceiptItem, MaintenanceReceipt, StaffAccount, StockAdjustmentReceipt, StockAdjustmentLine,
  CustomerAccount, AppNotification, RentalPolicyConfig, PolicyVersion, AuditLogEntry, FinancialAdjustment, ReconciliationStatement, ContactLog,
  ImportReceiptAdjustment,
  fmt, statusColors,
} from "./store";
import LandingView from "./views/LandingView";
import ProductsView from "./views/ProductsView";
import CustomerPortal from "./views/CustomerPortal";
import StaffView from "./views/StaffView";
import AdminView from "./views/AdminView";
import { LoginView, RegisterView, ForgotPasswordView } from "./views/AuthViews";
import Icon from "./components/Icon";

// ─── App State ────────────────────────────────────────────────────────────────

export type Page =
  | "landing" | "products" | "product-detail"
  | "cart" | "checkout" | "order-confirmed" | "my-orders"
  | "profile"
  | "ai-advisor"
  | "login" | "register" | "forgot-password"
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

// ─── Context ──────────────────────────────────────────────────────────────────

export const AppContext = createContext<AppState>({} as AppState);
export const useApp = () => useContext(AppContext);

const STORAGE_KEY = "geargo-demo-state-v2";
const LEGACY_STORAGE_KEY = "geargo-demo-state-v1";

interface PersistedState {
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
  currentUser?: { id?: string; username?: string; name: string; email: string; phone: string; role: Role; permissions?: string[]; address?: string } | null;
  pickupDate: string;
  returnDate: string;
  pickupHour?: string;
  returnHour?: string;
  newOrderId: string | null;
  appliedPromoCode?: string;
}

function loadPersistedState(): PersistedState | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    return value ? JSON.parse(value) as PersistedState : null;
  } catch {
    return null;
  }
}

const persistedState = loadPersistedState();

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [role, setRole] = useState<Role>("customer");
  const [page, setPage] = useState<Page>("landing");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>(persistedState?.categories ?? INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(() => {
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
  const [suppliers, setSuppliers] = useState<Supplier[]>(persistedState?.suppliers ?? INITIAL_SUPPLIERS);
  const [promotions, setPromotions] = useState<Promotion[]>(persistedState?.promotions ?? INITIAL_PROMOTIONS);
  const [promotionUsages, setPromotionUsages] = useState<PromotionUsage[]>(persistedState?.promotionUsages ?? []);
  const [equipment, setEquipment] = useState<Equipment[]>(() => (persistedState?.equipment ?? INITIAL_EQUIPMENT).map((item) => ({
    ...item,
    displayCode: item.displayCode ?? item.id,
    importReceiptLineId: item.importReceiptLineId ?? (() => {
      const receipt = (persistedState?.importReceipts ?? INITIAL_IMPORT_RECEIPTS).find((entry) => entry.id === item.importReceiptId);
      const index = receipt?.lines.findIndex((line) => line.productId === item.originalProductId) ?? -1;
      return index >= 0 ? (receipt?.lines[index].id ?? `${receipt?.id}-LINE-${index + 1}`) : undefined;
    })(),
    includedAccessories: item.includedAccessories ?? [],
    note: item.note ?? "",
  })));
  const [orders, setOrders] = useState<Order[]>(() => {
    const list = persistedState?.orders ?? INITIAL_ORDERS;
    if (!list.some((o) => o.status === "Hoàn tất")) {
      return [...list, DEMO_ORDER_COMPLETED];
    }
    return list;
  });
  const [cart, setCart] = useState<CartItem[]>(persistedState?.cart ?? []);
  const [importReceipts, setImportReceipts] = useState<ImportReceipt[]>(() => (persistedState?.importReceipts ?? INITIAL_IMPORT_RECEIPTS).map((receipt) => {
    const supplier = suppliers.find((item) => item.id === receipt.supplierId || item.displayCode === receipt.supplierId);
    return {
      ...receipt,
      displayCode: receipt.displayCode ?? receipt.id,
      supplierId: supplier?.id ?? receipt.supplierId,
      supplierName: supplier?.name ?? receipt.supplierName,
      lines: receipt.lines.map((line, index) => ({ ...line, id: line.id ?? `${receipt.id}-LINE-${index + 1}`, receivingCondition: line.receivingCondition ?? "Mới", note: line.note ?? "" })),
    };
  }));
  const [reviews, setReviews] = useState<Review[]>(persistedState?.reviews ?? INITIAL_REVIEWS);
  const [maintenanceReceipts, setMaintenanceReceipts] = useState<MaintenanceReceipt[]>(persistedState?.maintenanceReceipts ?? INITIAL_MAINTENANCE_RECEIPTS);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>(persistedState?.staffAccounts ?? INITIAL_STAFF_ACCOUNTS);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustmentReceipt[]>(persistedState?.stockAdjustments ?? INITIAL_STOCK_ADJUSTMENTS);
  const [customers, setCustomers] = useState<CustomerAccount[]>(persistedState?.customers ?? INITIAL_CUSTOMERS);
  const [notifications, setNotifications] = useState<AppNotification[]>(persistedState?.notifications ?? INITIAL_NOTIFICATIONS);
  const [policies, setPolicies] = useState<RentalPolicyConfig>(persistedState?.policies ?? INITIAL_POLICIES);
  const [policyVersions, setPolicyVersions] = useState<PolicyVersion[]>(persistedState?.policyVersions ?? INITIAL_POLICY_VERSIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(persistedState?.auditLogs ?? INITIAL_AUDIT_LOGS);
  const [financialAdjustments, setFinancialAdjustments] = useState<FinancialAdjustment[]>(persistedState?.financialAdjustments ?? INITIAL_FINANCIAL_ADJUSTMENTS);
  const [currentUser, setCurrentUser] = useState<{ id?: string; username?: string; name: string; email: string; phone: string; role: Role; permissions?: string[]; address?: string } | null>(
    persistedState?.currentUser ?? { id: "KH001", name: "Nguyễn Văn An", email: "an.nguyen@gmail.com", phone: "0901 234 567", role: "customer" }
  );
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "order" | "system">("all");
  const [pickupDate, setPickupDate] = useState(persistedState?.pickupDate ?? "");
  const [returnDate, setReturnDate] = useState(persistedState?.returnDate ?? "");
  const [pickupHour, setPickupHour] = useState(persistedState?.pickupHour ?? "09:00");
  const [returnHour, setReturnHour] = useState(persistedState?.returnHour ?? "09:00");
  const [newOrderId, setNewOrderId] = useState<string | null>(persistedState?.newOrderId ?? null);
  const [appliedPromoCode, setAppliedPromoCode] = useState(persistedState?.appliedPromoCode ?? "");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              transaction.status === "Đang xử lý"
                ? { ...transaction, status: "Hết hạn" as const, completedAt: at }
                : transaction
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

  useEffect(() => {
    const now = Date.now();
    setPromotionUsages((current) => current.map((usage) =>
      usage.status === "reserved" && usage.expiresAt && new Date(usage.expiresAt).getTime() <= now
        ? { ...usage, status: "released", releasedAt: new Date().toISOString() }
        : usage
    ));
  }, [orders]);

  useEffect(() => {
    const state: PersistedState = {
      schemaVersion: 2, categories, products, suppliers, promotions, promotionUsages,
      equipment, orders, cart, importReceipts, reviews, maintenanceReceipts, staffAccounts, stockAdjustments, pickupDate, returnDate, pickupHour, returnHour, newOrderId, appliedPromoCode,
      policies, policyVersions,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [categories, products, suppliers, promotions, promotionUsages, equipment, orders, cart, importReceipts, reviews, maintenanceReceipts, staffAccounts, stockAdjustments, pickupDate, returnDate, pickupHour, returnHour, newOrderId, appliedPromoCode, policies, policyVersions]);

  const hasValidRentalPeriod = () => {
    if (!pickupDate || !returnDate) return false;
    const pHour = pickupHour || "09:00";
    const rHour = returnHour || "09:00";
    const start = new Date(`${pickupDate}T${pHour}:00`).getTime();
    const end = new Date(`${returnDate}T${rHour}:00`).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && end > start;
  };

  const getDays = () => {
    if (!hasValidRentalPeriod()) return 0;
    const pHour = pickupHour || "09:00";
    const rHour = returnHour || "09:00";
    const start = new Date(`${pickupDate}T${pHour}:00`).getTime();
    const end = new Date(`${returnDate}T${rHour}:00`).getTime();
    const diffHours = (end - start) / 3600000;
    // Quy tắc 8.1 & 8.2 đặc tả: 24h tính 1 ngày, phần lẻ làm tròn lên, tối thiểu 1 ngày
    return Math.max(1, Math.ceil(diffHours / 24));
  };

  const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const normalizeCode = (value: string) => value.trim().toUpperCase();

  const saveCategory = (input: Category): ActionResult<Category> => {
    const name = input.name.trim();
    if (!name) return { ok: false, message: "Vui lòng nhập tên danh mục.", fieldErrors: { name: "Tên danh mục là bắt buộc." } };
    let parentCursor = input.parentId;
    while (parentCursor) {
      if (parentCursor === input.id && input.id) return { ok: false, message: "Danh mục cha tạo thành quan hệ vòng lặp.", fieldErrors: { parentId: "Quan hệ danh mục cha không hợp lệ." } };
      parentCursor = categories.find((category) => category.id === parentCursor)?.parentId ?? null;
    }
    const duplicate = categories.some((category) =>
      category.id !== input.id && category.parentId === (input.parentId || null) && category.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi")
    );
    if (duplicate) return { ok: false, message: "Tên danh mục đã tồn tại trong cùng cấp.", fieldErrors: { name: "Tên danh mục bị trùng." } };
    const category: Category = { ...input, id: input.id || makeId("CAT"), name, parentId: input.parentId || null, displayOrder: Math.max(0, Number(input.displayOrder) || 0) };
    const previous = categories.find((item) => item.id === category.id);
    setCategories((current) => previous ? current.map((item) => item.id === category.id ? category : item) : [...current, category]);
    if (previous && previous.name !== category.name) {
      setProducts((current) => current.map((product) => product.categoryId === category.id ? { ...product, category: category.name } : product));
    }
    return { ok: true, data: category };
  };

  const setCategoryStatus = (id: string, status: Category["status"]): ActionResult => {
    const category = categories.find((item) => item.id === id);
    if (!category) return { ok: false, message: "Không tìm thấy danh mục." };
    if (status === "inactive" && products.some((product) => product.categoryId === id && product.status === "active")) {
      return { ok: false, message: "Hãy tạm dừng các sản phẩm đang kinh doanh trong danh mục trước." };
    }
    setCategories((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    return { ok: true, data: undefined };
  };

  const validateProduct = (input: Product): ActionResult<Product> | null => {
    const errors: Record<string, string> = {};
    const code = normalizeCode(input.displayCode || input.id);
    if (!code) errors.displayCode = "Mã sản phẩm là bắt buộc.";
    if (products.some((product) => product.id !== input.id && normalizeCode(product.displayCode || product.id) === code)) errors.displayCode = "Mã sản phẩm đã tồn tại.";
    if (!input.name.trim()) errors.name = "Tên sản phẩm là bắt buộc.";
    const category = categories.find((item) => item.id === input.categoryId);
    if (!category) errors.categoryId = "Vui lòng chọn danh mục.";
    if (input.status === "active" && category?.status !== "active") errors.categoryId = "Sản phẩm đang kinh doanh phải thuộc danh mục hoạt động.";
    if (!Number.isFinite(input.pricePerDay) || input.pricePerDay < 0) errors.pricePerDay = "Giá thuê phải từ 0 trở lên.";
    if (!Number.isFinite(input.deposit) || input.deposit < 0) errors.deposit = "Mức cọc phải từ 0 trở lên.";
    if (!Number.isFinite(input.compensation) || input.compensation < 0) errors.compensation = "Giá trị bồi thường phải từ 0 trở lên.";
    if (Object.keys(errors).length) return { ok: false, message: "Vui lòng kiểm tra lại thông tin sản phẩm.", fieldErrors: errors };
    return null;
  };

  const saveProduct = (input: Product): ActionResult<Product> => {
    const error = validateProduct(input);
    if (error) return error;
    const category = categories.find((item) => item.id === input.categoryId)!;
    const product: Product = {
      ...input,
      id: input.id || makeId("PROD"),
      displayCode: normalizeCode(input.displayCode || input.id),
      category: category.name,
      name: input.name.trim(),
      brand: input.brand.trim(),
      description: input.description.trim(),
      dimensions: input.dimensions?.trim() ?? "",
      specifications: input.specifications ?? {},
      images: input.images?.length ? input.images : [input.image].filter(Boolean),
      image: input.images?.[0] || input.image,
      rating: input.rating ?? 0,
      reviews: input.reviews ?? 0,
    };
    const exists = products.some((item) => item.id === product.id);
    setProducts((current) => exists ? current.map((item) => item.id === product.id ? product : item) : [...current, product]);
    return { ok: true, data: product };
  };

  const saveEquipment = (input: Equipment): ActionResult<Equipment> => {
    if (!equipment.some((item) => item.id === input.id)) return { ok: false, message: "Không tìm thấy thiết bị." };
    if (!input.condition.trim()) return { ok: false, message: "Vui lòng nhập tình trạng thiết bị.", fieldErrors: { condition: "Tình trạng là bắt buộc." } };

    // UC6.14 Dòng phụ 3.1: Chặn chuyển sang "Ngừng sử dụng" khi thiết bị đang cho thuê
    if (input.equipmentStatus === "Ngừng sử dụng") {
      const activeRented = orders.find(
        (o) => o.status === "Đang thuê" && o.assignedEquipment.some((ae) => ae.equipmentId === input.id && !ae.returnedAt)
      );
      if (activeRented) {
        return {
          ok: false,
          message: `Thiết bị ${input.id} đang được khách thuê trong đơn ${activeRented.id}. Không thể ngừng sử dụng khi chưa thu hồi hoặc giải quyết bồi hoàn! (UC6.14 Dòng 3.1)`,
        };
      }
    }

    const equipmentItem = { ...input, displayCode: normalizeCode(input.displayCode || input.id), includedAccessories: input.includedAccessories ?? [], note: input.note ?? "" };
    setEquipment((current) => current.map((item) => item.id === equipmentItem.id ? equipmentItem : item));
    return { ok: true, data: equipmentItem };
  };

  const saveSupplier = (input: Supplier): ActionResult<Supplier> => {
    const code = normalizeCode(input.displayCode);
    const errors: Record<string, string> = {};
    if (!code) errors.displayCode = "Mã nhà cung cấp là bắt buộc.";
    if (suppliers.some((supplier) => supplier.id !== input.id && normalizeCode(supplier.displayCode) === code)) errors.displayCode = "Mã nhà cung cấp đã tồn tại.";
    if (!input.name.trim()) errors.name = "Tên nhà cung cấp là bắt buộc.";
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = "Email không hợp lệ.";
    if (Object.keys(errors).length) return { ok: false, message: "Vui lòng kiểm tra thông tin nhà cung cấp.", fieldErrors: errors };
    const supplier = { ...input, id: input.id || makeId("SUP"), displayCode: code, name: input.name.trim() };
    const exists = suppliers.some((item) => item.id === supplier.id);
    setSuppliers((current) => exists ? current.map((item) => item.id === supplier.id ? supplier : item) : [...current, supplier]);
    return { ok: true, data: supplier };
  };

  // UC7.4: Thay đổi tình trạng hợp tác nhà cung cấp kèm lý do
  const toggleSupplierStatus = (supplierId: string, status: "active" | "inactive", reason: string): ActionResult => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return { ok: false, message: "Không tìm thấy nhà cung cấp." };
    if (!reason.trim()) return { ok: false, message: "Vui lòng nhập lý do thay đổi trạng thái hợp tác (theo UC7.4)." };

    setSuppliers((prev) =>
      prev.map((s) => (s.id === supplierId ? { ...s, cooperationStatus: status, statusReason: reason.trim() } : s))
    );

    addAuditLog({
      actor: "Quản trị viên",
      role: "admin",
      action: `Đổi trạng thái NCC (${status === "active" ? "Đang hợp tác" : "Ngừng hợp tác"})`,
      targetEntity: "Supplier",
      targetId: supplierId,
      detail: `Lý do: ${reason.trim()}`,
    });

    return { ok: true, data: undefined };
  };

  const savePromotion = (input: Promotion): ActionResult<Promotion> => {
    const code = normalizeCode(input.code);
    const errors: Record<string, string> = {};
    if (!code) errors.code = "Mã giảm giá là bắt buộc.";
    if (promotions.some((promotion) => promotion.id !== input.id && normalizeCode(promotion.code) === code)) errors.code = "Mã giảm giá đã tồn tại.";
    const existingPromotion = promotions.find((promotion) => promotion.id === input.id);
    if (existingPromotion && existingPromotion.usedCount > 0 && normalizeCode(existingPromotion.code) !== code) errors.code = "Không thể đổi mã đã có lượt sử dụng.";
    if (!input.name.trim()) errors.name = "Tên chương trình là bắt buộc.";
    if (input.discountValue <= 0 || (input.discountType === "percentage" && input.discountValue > 100)) errors.discountValue = "Giá trị giảm không hợp lệ.";
    if (!input.startsAt || !input.endsAt || new Date(input.endsAt) <= new Date(input.startsAt)) errors.endsAt = "Thời gian kết thúc phải sau bắt đầu.";
    if (input.scope === "products" && input.productIds.length === 0) errors.scope = "Chọn ít nhất một sản phẩm.";
    if (input.scope === "categories" && input.categoryIds.length === 0) errors.scope = "Chọn ít nhất một danh mục.";
    if (Object.keys(errors).length) return { ok: false, message: "Vui lòng kiểm tra thông tin khuyến mãi.", fieldErrors: errors };
    const promotion = { ...input, id: input.id || makeId("PROMO"), code, name: input.name.trim() };
    const exists = promotions.some((item) => item.id === promotion.id);
    setPromotions((current) => exists ? current.map((item) => item.id === promotion.id ? promotion : item) : [...current, promotion]);
    return { ok: true, data: promotion };
  };

  const evaluatePromotion = (rawCode: string, rental: number, items: { productId: string; rental: number }[]): ActionResult<{ promotion: Promotion; discount: number }> => {
    const promotion = promotions.find((item) => normalizeCode(item.code) === normalizeCode(rawCode));
    if (!promotion) return { ok: false, message: "Mã giảm giá không tồn tại." };
    const now = Date.now();
    if (promotion.status !== "active" || now < new Date(promotion.startsAt).getTime() || now > new Date(promotion.endsAt).getTime()) return { ok: false, message: "Mã giảm giá chưa hoạt động hoặc đã hết hạn." };
    if (promotion.totalUsageLimit !== null && promotion.usedCount >= promotion.totalUsageLimit) return { ok: false, message: "Mã giảm giá đã hết lượt sử dụng." };
    if (rental < promotion.minimumRental) return { ok: false, message: `Tiền thuê tối thiểu để áp dụng là ${fmt(promotion.minimumRental)}.` };
    const eligibleRental = items.filter((item) =>
      promotion.scope === "all"
      || (promotion.scope === "products" && promotion.productIds.includes(item.productId))
      || (promotion.scope === "categories" && promotion.categoryIds.includes(products.find((product) => product.id === item.productId)?.categoryId ?? ""))
    ).reduce((sum, item) => sum + item.rental, 0);
    if (eligibleRental <= 0) return { ok: false, message: "Giỏ thuê không có sản phẩm thuộc phạm vi khuyến mãi." };
    const rawDiscount = promotion.discountType === "percentage" ? Math.round(eligibleRental * promotion.discountValue / 100) : promotion.discountValue;
    const discount = Math.min(eligibleRental, promotion.maxDiscount === null ? rawDiscount : Math.min(rawDiscount, promotion.maxDiscount));
    return { ok: true, data: { promotion, discount } };
  };

  const saveImportReceipt = (input: ImportReceipt): ActionResult<ImportReceipt> => {
    const displayCode = normalizeCode(input.displayCode || input.id);
    if (!displayCode) return { ok: false, message: "Vui lòng nhập mã phiếu nhập." };
    if (importReceipts.some((receipt) => receipt.id !== input.id && normalizeCode(receipt.displayCode || receipt.id) === displayCode)) return { ok: false, message: "Mã phiếu nhập đã tồn tại." };
    if (!suppliers.some((supplier) => supplier.id === input.supplierId && supplier.cooperationStatus === "active")) return { ok: false, message: "Vui lòng chọn nhà cung cấp đang hợp tác (UC7.5)." };
    if (input.lines.length === 0) return { ok: false, message: "Phiếu nhập cần ít nhất một dòng sản phẩm." };
    
    // UC7.5.1: Đơn giá không âm; đơn giá 0 phải có lý do (hàng tặng/bảo hành)
    for (const line of input.lines) {
      if (line.quantity <= 0 || !Number.isInteger(line.quantity)) return { ok: false, message: "Số lượng từng dòng phải là số nguyên dương." };
      if (line.unitPrice < 0) return { ok: false, message: "Đơn giá nhập không được âm." };
      if (line.unitPrice === 0 && !line.priceZeroReason?.trim() && !line.note?.trim()) {
        return { ok: false, message: `Sản phẩm với đơn giá 0 ₫ bắt buộc phải nhập lý do (hàng khuyến mãi/tài trợ/bảo hành) theo UC7.5.1!` };
      }
      if (!products.some((product) => product.id === line.productId)) return { ok: false, message: "Sản phẩm không tồn tại trong danh mục." };
    }

    const receipt: ImportReceipt = { ...input, id: input.id || makeId("RECEIPT"), displayCode };
    const exists = importReceipts.some((item) => item.id === receipt.id);
    setImportReceipts((current) => exists ? current.map((item) => item.id === receipt.id ? receipt : item) : [...current, receipt]);
    return { ok: true, data: receipt };
  };

  const cancelImportReceipt = (receiptId: string, reason: string): ActionResult => {
    const receipt = importReceipts.find((item) => item.id === receiptId);
    if (!receipt || receipt.status !== "Nháp") return { ok: false, message: "Chỉ phiếu nháp mới có thể hủy." };
    if (!reason.trim()) return { ok: false, message: "Vui lòng nhập lý do hủy." };
    setImportReceipts((current) => current.map((item) => item.id === receiptId ? { ...item, status: "Đã hủy", note: reason.trim() } : item));
    return { ok: true, data: undefined };
  };

  const getAvailable = (productId: string) => {
    if (!hasValidRentalPeriod()) return 0;
    const requestedStart = new Date(`${pickupDate}T${pickupHour || "09:00"}:00`).getTime();
    const requestedEnd = new Date(`${returnDate}T${returnHour || "09:00"}:00`).getTime();
    const total = equipment.filter(
      (e) => e.productId === productId && !["Đang bảo trì", "Thất lạc", "Ngừng sử dụng"].includes(e.equipmentStatus)
    ).length;
    const booked = orders
      .filter((o) => ["Chờ thanh toán", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận", "Đang thuê"].includes(o.status))
      .filter((o) => {
        const orderStart = new Date(o.pickupTime.replace(" ", "T")).getTime();
        const orderEnd = new Date(o.returnTime.replace(" ", "T")).getTime();
        return requestedStart < orderEnd && requestedEnd > orderStart;
      })
      .reduce((sum, o) => {
        const item = o.items.find((i) => i.productId === productId);
        return sum + (item?.qty ?? 0);
      }, 0);
    return Math.max(0, total - booked);
  };

  const addToCart = (productId: string, qty = 1) =>
    setCart((prev) => {
      const product = products.find((item) => item.id === productId && item.status === "active");
      if (!product) return prev;
      const available = hasValidRentalPeriod() ? getAvailable(productId) : Number.MAX_SAFE_INTEGER;
      const ex = prev.find((c) => c.productId === productId);
      if (ex) return prev.map((c) => c.productId === productId ? { ...c, qty: Math.min(available, c.qty + qty) } : c);
      return available > 0 ? [...prev, { productId, qty: Math.min(available, Math.max(1, qty)) }] : prev;
    });

  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((c) => c.productId !== productId));

  const updateCartQty = (productId: string, delta: number) =>
    setCart((prev) => prev
      .map((c) => c.productId === productId ? { ...c, qty: Math.max(1, Math.min(hasValidRentalPeriod() ? Math.max(1, getAvailable(productId)) : Number.MAX_SAFE_INTEGER, c.qty + delta)) } : c)
    );

  const createOrder = (promoCode: string): string => {
    if (!hasValidRentalPeriod() || cart.length === 0) {
      throw new Error("Khoảng thuê hoặc giỏ thuê không hợp lệ.");
    }
    const unavailable = cart.find((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      return !product || product.status !== "active" || item.qty > getAvailable(item.productId);
    });
    if (unavailable) throw new Error("Một sản phẩm đã tạm dừng hoặc không còn đủ số lượng cho thời gian đã chọn.");
    const days = getDays();
    const items = cart.map((c) => {
      const p = products.find((p) => p.id === c.productId)!;
      return {
        productId: p.id,
        productName: p.name,
        qty: c.qty,
        days,
        pricePerDay: p.pricePerDay,
        depositPerUnit: p.deposit,
        compensation: p.compensation,
      };
    });
    const rental = items.reduce((s, i) => s + i.pricePerDay * i.qty * i.days, 0);
    const depositTotal = items.reduce((s, i) => s + i.depositPerUnit * i.qty, 0);
    const promotionResult = promoCode.trim() ? evaluatePromotion(promoCode, rental, items.map((item) => ({ productId: item.productId, rental: item.pricePerDay * item.qty * item.days }))) : null;
    if (promotionResult && !promotionResult.ok) throw new Error(promotionResult.message);
    const discount = promotionResult?.ok ? promotionResult.data.discount : 0;
    const id = `DT-${Date.now().toString().slice(-8)}`;
    const now = new Date().toLocaleString("vi-VN");
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const order: Order = {
      id,
      customerId: "KH002",
      customerName: "Nguyễn Văn An",
      customerPhone: "0901 234 567",
      items,
      pickupTime: `${pickupDate} ${pickupHour || "09:00"}`,
      returnTime: `${returnDate} ${returnHour || "09:00"}`,
      rental,
      discount,
      depositTotal,
      promoCode: promoCode || undefined,
      status: "Chờ thanh toán",
      createdAt: now,
      expiresAt,
      assignedEquipment: [],
      surcharges: [],
      transactions: [],
      statusHistory: [{ status: "Chờ thanh toán", at: now, by: "Hệ thống" }],
    };
    setOrders((prev) => [...prev, order]);
    if (promotionResult?.ok) {
      setPromotionUsages((current) => [...current, {
        id: makeId("PROMO-USE"),
        promotionId: promotionResult.data.promotion.id,
        orderId: id,
        reservedAt: nowIso,
        expiresAt: expiresAt,
        discountAmount: discount,
        status: "reserved",
      }]);
    }
    setNewOrderId(id);
    setCart([]);
    setAppliedPromoCode("");
    return id;
  };

  const payOrder = (orderId: string, succeed = true) => {
    const now = new Date().toLocaleString("vi-VN");
    const payableOrder = orders.find((order) => order.id === orderId && order.status === "Chờ thanh toán");
    if (succeed && payableOrder?.promoCode) {
      setPromotions((current) => current.map((promotion) =>
        normalizeCode(promotion.code) === normalizeCode(payableOrder.promoCode ?? "")
          ? { ...promotion, usedCount: promotion.usedCount + 1 }
          : promotion
      ));
      setPromotionUsages((current) => current.map((usage) => usage.orderId === orderId && usage.status === "reserved" ? { ...usage, status: "used", usedAt: new Date().toISOString() } : usage));
    }
    setOrders((prev) => prev.map((o) => {
      // UC5.1: Sinh mã đối soát ngân hàng Bank Reference Code (ví dụ FT241025...)
      const refCode = `FT${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
      const transaction: MoneyTransaction = {
        id: `GD-${Date.now()}`,
        type: "Thanh toán ban đầu",
        amount: o.rental - o.discount + o.depositTotal,
        status: succeed ? "Thành công" : "Thất bại",
        createdAt: now,
        completedAt: succeed ? now : undefined,
        note: succeed ? "Thanh toán trực tuyến VietQR 24/7 thành công" : "Ngân hàng/Cổng thanh toán từ chối giao dịch",
        referenceCode: succeed ? refCode : undefined,
        method: "VietQR 24/7",
      };
      return succeed
        ? {
            ...o,
            status: "Đã xác nhận",
            paidAt: now,
            transactions: [...(o.transactions ?? []), transaction],
            statusHistory: [...o.statusHistory, { status: "Đã xác nhận" as OrderStatus, at: now, by: "Hệ thống" }],
          }
        : { ...o, transactions: [...(o.transactions ?? []), transaction] };
    }));
  };

  // UC5.4 Bước 4: Xác nhận bảng đối soát - Lưu căn cứ và số phải thu/hoàn, giữ trạng thái "Chờ đối soát"
  const confirmReconciliation = (orderId: string, note?: string): ActionResult<ReconciliationStatement> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng cần đối soát." };

    // Kiểm tra Tiền điều kiện & Dòng sự kiện 1.1:
    const debt = order.assignedEquipment.filter((ae) => !ae.returnedAt);
    if (debt.length > 0) {
      return { ok: false, message: `Còn ${debt.length} thiết bị chưa nhận trả/chưa kết luận mất. Vui lòng giải quyết trước khi đối soát!` };
    }
    const pendingSurcharges = order.surcharges.filter((s) => s.status === "Chờ duyệt");
    if (pendingSurcharges.length > 0) {
      return { ok: false, message: `Còn ${pendingSurcharges.length} phụ phí đang chờ duyệt. Vui lòng phê duyệt hoặc từ chối trước!` };
    }
    const disputedSurcharges = order.surcharges.filter((s) => s.status === "Tranh chấp");
    if (disputedSurcharges.length > 0) {
      return { ok: false, message: `Có ${disputedSurcharges.length} phụ phí đang tranh chấp. Cần thỏa thuận xong với khách trước!` };
    }

    const now = new Date().toLocaleString("vi-VN");
    const approved = order.surcharges.filter((s) => s.status === "Đã duyệt").reduce((sum, s) => sum + s.amount, 0);

    // Tính toán các khoản tiền đã hoàn hoặc thu bổ sung trước đó
    const priorRefund = (order.transactions || [])
      .filter((t) => (t.type === "Hoàn cọc" || t.type === "Hoàn tiền hủy") && t.status === "Thành công")
      .reduce((s, t) => s + t.amount, 0);
    const priorCollect = (order.transactions || [])
      .filter((t) => t.type === "Thu thêm" && t.status === "Thành công")
      .reduce((s, t) => s + t.amount, 0);
    const priorSettled = priorCollect - priorRefund;

    // Số dư chênh lệch còn lại: Cọc thực thu - Phụ phí hợp lệ - Các khoản đã xử lý trước
    const netDifference = order.depositTotal - approved - priorSettled;

    const statement: ReconciliationStatement = {
      confirmedAt: now,
      confirmedBy: currentUser?.name || "Nhân viên",
      depositCollected: order.depositTotal,
      totalApprovedSurcharges: approved,
      totalPriorSettlements: priorSettled,
      netDifference,
      settlementType: netDifference === 0 ? "balanced" : netDifference > 0 ? "refund" : "collect",
      status: "confirmed",
      note: note || "Đã xác nhận căn cứ bảng đối soát cọc",
    };

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, reconciliation: statement } : o)));

    addAuditLog({
      actor: currentUser?.name || "Nhân viên",
      role: currentUser?.role || "staff",
      action: "Xác nhận bảng đối soát (UC5.4 Bước 4)",
      targetEntity: "Order",
      targetId: orderId,
      detail: `Căn cứ: Cọc ${fmt(order.depositTotal)}, Phí duyệt: ${fmt(approved)}, Đã xử lý trước: ${fmt(priorSettled)}, Chênh lệch: ${fmt(Math.abs(netDifference))} (${netDifference > 0 ? "Phải hoàn" : netDifference < 0 ? "Phải thu" : "Cân bằng 0đ"})`,
    });

    return { ok: true, data: statement };
  };

  // UC5.4 Bước 5.1 & 6, 7: Chốt đối soát trực tiếp khi chênh lệch bằng 0 (bỏ qua giao dịch tiền)
  const finalizeOrderWithoutPayment = (orderId: string, note?: string): ActionResult => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    if (order.status !== "Chờ đối soát") return { ok: false, message: "Đơn hàng phải ở trạng thái Chờ đối soát." };

    // Kiểm tra tiền điều kiện
    const debt = order.assignedEquipment.filter((ae) => !ae.returnedAt);
    if (debt.length > 0) return { ok: false, message: `Còn ${debt.length} thiết bị chưa trả` };
    const pendingSurcharges = order.surcharges.filter((s) => s.status === "Chờ duyệt");
    if (pendingSurcharges.length > 0) return { ok: false, message: `Còn ${pendingSurcharges.length} phụ phí chưa duyệt` };

    const approved = order.surcharges.filter((s) => s.status === "Đã duyệt").reduce((sum, s) => sum + s.amount, 0);
    const priorRefund = (order.transactions || [])
      .filter((t) => (t.type === "Hoàn cọc" || t.type === "Hoàn tiền hủy") && t.status === "Thành công")
      .reduce((s, t) => s + t.amount, 0);
    const priorCollect = (order.transactions || [])
      .filter((t) => t.type === "Thu thêm" && t.status === "Thành công")
      .reduce((s, t) => s + t.amount, 0);
    const priorSettled = priorCollect - priorRefund;
    const netDifference = order.depositTotal - approved - priorSettled;

    if (netDifference !== 0) {
      return { ok: false, message: `Số tiền chênh lệch là ${fmt(Math.abs(netDifference))}, không thể chốt theo luồng chênh lệch 0 đ (Dòng 5.1)!` };
    }

    const now = new Date().toLocaleString("vi-VN");
    const statement: ReconciliationStatement = {
      confirmedAt: order.reconciliation?.confirmedAt || now,
      confirmedBy: order.reconciliation?.confirmedBy || currentUser?.name || "Nhân viên",
      depositCollected: order.depositTotal,
      totalApprovedSurcharges: approved,
      totalPriorSettlements: priorSettled,
      netDifference: 0,
      settlementType: "balanced",
      status: "locked",
      lockedAt: now,
      lockedBy: currentUser?.name || "Nhân viên",
      note: note || "Chốt đối soát cân bằng không phát sinh chênh lệch tiền (Dòng 5.1)",
    };

    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        status: "Hoàn tất",
        reconciledAt: now,
        reconciliation: statement,
        statusHistory: [...o.statusHistory, { status: "Hoàn tất" as OrderStatus, at: now, by: currentUser?.name || "Nhân viên" }],
      };
    }));

    addAuditLog({
      actor: currentUser?.name || "Nhân viên",
      role: currentUser?.role || "staff",
      action: "Khóa đối soát & Hoàn tất đơn (UC5.4 Bước 5.1/6/7)",
      targetEntity: "Order",
      targetId: orderId,
      detail: `Khóa đối soát chênh lệch 0 đ - Chuyển Hoàn tất đơn ${orderId}`,
    });

    return { ok: true, data: undefined };
  };

  // UC5.4 Bước 5, 6, 7: Quyết toán tiền (UC5.5 Thu thêm hoặc UC5.6 Hoàn cọc) và khóa đối soát
  const settleOrder = (orderId: string, succeed = true, details?: { method?: string; note?: string; amount?: number }) => {
    const now = new Date().toLocaleString("vi-VN");
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId || o.status !== "Chờ đối soát") return o;
      const approved = o.surcharges.filter((s) => s.status === "Đã duyệt").reduce((sum, s) => sum + s.amount, 0);

      const priorRefund = (o.transactions || [])
        .filter((t) => (t.type === "Hoàn cọc" || t.type === "Hoàn tiền hủy") && t.status === "Thành công")
        .reduce((s, t) => s + t.amount, 0);
      const priorCollect = (o.transactions || [])
        .filter((t) => t.type === "Thu thêm" && t.status === "Thành công")
        .reduce((s, t) => s + t.amount, 0);
      const priorSettled = priorCollect - priorRefund;
      const difference = o.depositTotal - approved - priorSettled;

      const amount = details?.amount ?? Math.abs(difference);
      const defaultNote = succeed ? (difference >= 0 ? "Hoàn cọc thành công" : "Thu thêm thành công") : "Giao dịch đối soát thất bại";
      const fullNote = details?.note || (details?.method ? `${defaultNote} qua ${details.method}` : defaultNote);
      const transaction: MoneyTransaction = {
        id: `GD-${Date.now()}`,
        type: difference >= 0 ? "Hoàn cọc" : "Thu thêm",
        amount,
        status: succeed ? "Thành công" : "Thất bại",
        createdAt: now,
        completedAt: now,
        note: fullNote,
      };

      if (succeed) {
        addAuditLog({
          actor: currentUser?.name || "Nhân viên",
          role: currentUser?.role || "staff",
          action: difference >= 0 ? "Hoàn cọc đối soát (UC5.6)" : "Thu thêm đối soát (UC5.5)",
          targetEntity: "Order",
          targetId: orderId,
          detail: `${fullNote} - Số tiền: ${fmt(amount)}`,
        });
      }

      // Khóa bảng đối soát khi giao dịch thành công (UC5.4 Bước 7)
      const updatedStatement: ReconciliationStatement = {
        ...(o.reconciliation || {
          confirmedAt: now,
          confirmedBy: currentUser?.name || "Nhân viên",
          depositCollected: o.depositTotal,
          totalApprovedSurcharges: approved,
          totalPriorSettlements: priorSettled,
          netDifference: difference,
          settlementType: difference >= 0 ? "refund" : "collect",
        }),
        status: succeed ? "locked" : (o.reconciliation?.status || "confirmed"),
        lockedAt: succeed ? now : undefined,
        lockedBy: succeed ? (currentUser?.name || "Nhân viên") : undefined,
      };

      return succeed
        ? {
            ...o,
            status: "Hoàn tất",
            reconciledAt: now,
            reconciliation: updatedStatement,
            transactions: [...(o.transactions ?? []), transaction],
            statusHistory: [...o.statusHistory, { status: "Hoàn tất" as OrderStatus, at: now, by: currentUser?.name || "Nhân viên" }],
          }
        : {
            ...o,
            reconciliation: updatedStatement,
            transactions: [...(o.transactions ?? []), transaction],
          };
    }));
  };

  const getCancellationQuote = (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return { fee: 0, refund: 0 };
    const pickup = new Date(order.pickupTime.replace(" ", "T")).getTime();
    const hours = (pickup - Date.now()) / 3600000;
    const paidRental = order.rental - order.discount;
    // Mục 119 đặc tả: >48h hoàn 100%, 24h-48h khấu trừ 30%, <24h giữ toàn bộ tiền thuê
    const feeRate = hours >= 48 ? 0 : hours >= 24 ? 0.3 : 1.0;
    const wasPaid = Boolean(order.paidAt);
    const fee = wasPaid ? Math.round(paidRental * feeRate) : 0;
    return { fee, refund: wasPaid ? paidRental + order.depositTotal - fee : 0 };
  };

  const cancelOrder = (orderId: string, reason?: string) => {
    const quote = getCancellationQuote(orderId);
    const now = new Date().toLocaleString("vi-VN");
    setOrders((prev) => prev.map((o) => {
      // UC3.4: Cho phép hủy đơn đối với mọi trạng thái trước khi bàn giao thiết bị
      if (o.id !== orderId || !["Chờ thanh toán", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status)) return o;
      const refundTransaction: MoneyTransaction | null = o.paidAt
        ? {
            id: `GD-${Date.now()}`,
            type: "Hoàn tiền hủy",
            amount: quote.refund,
            status: "Thành công",
            createdAt: now,
            completedAt: now,
            note: `Phí hủy được giữ lại: ${fmt(quote.fee)}. Lý do: ${cancellationReason}`,
          }
        : null;
      return {
        ...o,
        status: "Khách hủy",
        cancellationFee: quote.fee,
        cancellationRefund: quote.refund,
        cancellationReason,
        transactions: refundTransaction ? [...(o.transactions ?? []), refundTransaction] : (o.transactions ?? []),
        statusHistory: [...o.statusHistory, { status: "Khách hủy" as OrderStatus, at: now, by: `Khách hàng (${cancellationReason})` }],
      };
    }));
    setPromotionUsages((current) => current.map((usage) => usage.orderId === orderId && usage.status === "reserved" ? { ...usage, status: "released", releasedAt: new Date().toISOString() } : usage));
  };

  const addReview = (input: { orderId: string; productId: string; rating: number; comment: string; images?: string[] }): ActionResult<Review> => {
    const order = orders.find((o) => o.id === input.orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn thuê tương ứng." };
    if (order.status !== "Hoàn tất") return { ok: false, message: "Chỉ đơn thuê đã hoàn tất mới được phép đánh giá." };
    const item = order.items.find((i) => i.productId === input.productId);
    if (!item) return { ok: false, message: "Sản phẩm không thuộc đơn thuê này." };
    const alreadyReviewed = reviews.some((r) => r.orderId === input.orderId && r.productId === input.productId);
    if (alreadyReviewed) return { ok: false, message: "Sản phẩm này trong đơn đã được đánh giá trước đó." };
    if (input.rating < 1 || input.rating > 5) return { ok: false, message: "Số sao đánh giá phải từ 1 đến 5." };
    if (!input.comment.trim()) return { ok: false, message: "Vui lòng nhập nội dung đánh giá." };

    const now = new Date().toLocaleString("vi-VN");
    const newReview: Review = {
      id: makeId("REV"),
      orderId: input.orderId,
      productId: input.productId,
      productName: item.productName,
      customerId: order.customerId,
      customerName: order.customerName,
      rating: Math.round(input.rating),
      comment: input.comment.trim(),
      images: input.images ?? [],
      createdAt: now,
      status: "active",
    };

    setReviews((prev) => [newReview, ...prev]);

    // Cập nhật lại rating và review count sản phẩm
    const activeReviews = [...reviews.filter((r) => r.productId === input.productId && r.status === "active"), newReview];
    const avg = Number((activeReviews.reduce((sum, r) => sum + r.rating, 0) / activeReviews.length).toFixed(1));
    setProducts((prev) => prev.map((p) => p.id === input.productId ? { ...p, rating: avg, reviews: activeReviews.length } : p));

    return { ok: true, data: newReview };
  };

  const hideReview = (reviewId: string, reason: string): ActionResult => {
    const rev = reviews.find((r) => r.id === reviewId);
    if (!rev) return { ok: false, message: "Không tìm thấy đánh giá." };
    if (!reason.trim()) return { ok: false, message: "Vui lòng nhập lý do ẩn đánh giá." };

    setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, status: "hidden", hiddenReason: reason.trim(), hiddenBy: "Quản trị viên" } : r));

    const remaining = reviews.filter((r) => r.productId === rev.productId && r.id !== reviewId && r.status === "active");
    const avg = remaining.length ? Number((remaining.reduce((sum, r) => sum + r.rating, 0) / remaining.length).toFixed(1)) : 5.0;
    setProducts((prev) => prev.map((p) => p.id === rev.productId ? { ...p, rating: avg, reviews: remaining.length } : p));

    return { ok: true, data: undefined };
  };

  const replyReview = (reviewId: string, response: string, responderName = "Quản trị viên"): ActionResult => {
    const rev = reviews.find((r) => r.id === reviewId);
    if (!rev) return { ok: false, message: "Không tìm thấy đánh giá tương ứng." };
    if (!response.trim()) return { ok: false, message: "Vui lòng nhập nội dung phản hồi của cửa hàng." };

    const now = new Date().toLocaleString("vi-VN");
    setReviews((prev) => prev.map((r) =>
      r.id === reviewId
        ? {
            ...r,
            storeResponse: {
              response: response.trim(),
              respondedAt: now,
              respondedBy: responderName,
            },
          }
        : r
    ));

    addAuditLog({
      actor: responderName,
      role: "Quản trị viên",
      action: "Phản hồi đánh giá (UC9.2)",
      targetEntity: "Review",
      targetId: reviewId,
      detail: `Phản hồi cho khách hàng ${rev.customerName} tại sản phẩm ${rev.productName || rev.productId}`,
    });

    return { ok: true, data: undefined };
  };

  const advanceOrderStatus = (orderId: string, status: OrderStatus, by = "Nhân viên") => {
    const now = new Date().toLocaleString("vi-VN");
    setOrders((prev) => prev.map((o) =>
      o.id === orderId
        ? { ...o, status, statusHistory: [...o.statusHistory, { status, at: now, by }] }
        : o
    ));
  };

  const assignEquipment = (orderId: string, assigned: AssignedEquipment[]) => {
    setOrders((prev) => prev.map((o) =>
      o.id === orderId ? { ...o, assignedEquipment: assigned } : o
    ));
    // mark equipment as "Đang thuê"
    const ids = assigned.map((a) => a.equipmentId);
    setEquipment((prev) => prev.map((e) =>
      ids.includes(e.id) ? { ...e, equipmentStatus: "Đang thuê" } : e
    ));
  };

  // UC4.1: Hoàn tất chuẩn bị & Phân công serial (Lưu vào order, chuyển Sẵn sàng nhận & gửi thông báo)
  const completePreparation = (
    orderId: string,
    assignedEquipmentIds: { productId: string; equipmentId: string }[],
    staffName = "Nhân viên kho"
  ): ActionResult<void> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    if (!["Đã xác nhận", "Đang chuẩn bị"].includes(order.status)) {
      return { ok: false, message: "Chỉ đơn Đã xác nhận hoặc Đang chuẩn bị mới có thể lưu phân công." };
    }

    // Kiểm tra đủ số lượng từng món theo đơn (UC4.1 bước 5)
    for (const item of order.items) {
      const count = assignedEquipmentIds.filter((a) => a.productId === item.productId).length;
      if (count < item.qty) {
        return { ok: false, message: `Chưa phân công đủ số lượng cho sản phẩm: ${item.productName} (Yêu cầu ${item.qty}, mới gán ${count}).` };
      }
    }

    const now = new Date().toLocaleString("vi-VN");
    const assigned: AssignedEquipment[] = assignedEquipmentIds.map((a) => ({
      equipmentId: a.equipmentId,
      productId: a.productId,
      assignedAt: now,
    }));

    // Cập nhật trạng thái đơn sang "Sẵn sàng nhận" và lưu assignedEquipment (UC4.1 bước 6)
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        assignedEquipment: assigned,
        status: "Sẵn sàng nhận",
        shortageReported: undefined, // Xóa cảnh báo thiếu nếu đã soạn đủ
        statusHistory: [...o.statusHistory, { status: "Sẵn sàng nhận", at: now, by: `${staffName}: Đã phân công đủ ${assigned.length} thiết bị` }],
      };
    }));

    // Gửi thông báo cho khách hàng (Dòng 725 & 730)
    sendNotification({
      title: "Thiết bị đã sẵn sàng nhận!",
      message: `Đơn hàng #${order.id} của quý khách đã được chuẩn bị đầy đủ thiết bị và sẵn sàng nhận tại cửa hàng.`,
      type: "order",
      targetRole: "customer",
    });

    return { ok: true, data: undefined };
  };

  // UC4.1 Dòng phụ 5.1: Cảnh báo không đủ thiết bị soạn hàng
  const reportEquipmentShortage = (orderId: string, note: string, staffName = "Nhân viên kho"): ActionResult<void> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    const now = new Date().toLocaleString("vi-VN");

    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        shortageReported: { reportedAt: now, staffName, note, status: "Chờ xử lý" },
        statusHistory: [...o.statusHistory, { status: o.status, at: now, by: `${staffName}: Báo thiếu thiết bị - ${note}` }],
      };
    }));

    sendNotification({
      title: "Cảnh báo thiếu thiết bị soạn hàng",
      message: `Đơn hàng #${order.id} (${order.customerName}) thiếu thiết bị: ${note}. Quản trị viên vui lòng can thiệp xử lý với khách.`,
      type: "system",
      targetRole: "admin",
    });

    return { ok: true, data: undefined };
  };

  // UC4.4: Thêm nhật ký liên hệ xử lý quá hạn (Contact Log)
  const addContactLog = (orderId: string, log: Omit<ContactLog, "id" | "contactedAt">): ActionResult<ContactLog> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    const now = new Date().toLocaleString("vi-VN");
    const newLog: ContactLog = {
      id: `CLOG-${Date.now()}`,
      contactedAt: now,
      ...log,
    };

    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        contactLogs: [newLog, ...(o.contactLogs || [])],
        statusHistory: [...o.statusHistory, { status: o.status, at: now, by: `${log.staffName}: Liên hệ khách (${log.outcome}) - ${log.note}` }],
      };
    }));

    return { ok: true, data: newLog };
  };

  // UC4.4: Kiểm tra ảnh hưởng lịch thuê kế tiếp (Supply Chain Conflict Detection)
  const getOverdueConflicts = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return [];
    const overdueDebts = order.assignedEquipment.filter((ae) => !ae.returnedAt).map((ae) => ae.equipmentId);
    if (overdueDebts.length === 0) return [];

    const conflicts: Array<{
      equipmentId: string;
      nextOrderId: string;
      nextCustomerName: string;
      nextPickupTime: string;
      availableSubstitutes: string[];
    }> = [];

    // Tìm các đơn sắp tới có gán thiết bị này
    const upcomingOrders = orders.filter((o) =>
      o.id !== orderId &&
      ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status)
    );

    for (const uo of upcomingOrders) {
      for (const ae of uo.assignedEquipment) {
        if (overdueDebts.includes(ae.equipmentId)) {
          const substitutes = equipment
            .filter((e) => e.productId === ae.productId && e.equipmentStatus === "Sẵn sàng" && e.id !== ae.equipmentId)
            .map((e) => e.id);

          conflicts.push({
            equipmentId: ae.equipmentId,
            nextOrderId: uo.id,
            nextCustomerName: uo.customerName,
            nextPickupTime: uo.pickupTime,
            availableSubstitutes: substitutes,
          });
        }
      }
    }

    return conflicts;
  };

  // UC4.5 Dòng phụ 4.2: Ghi nhận khách không đến nhận tại quầy (No-Show)
  const reportCustomerNoShow = (orderId: string, note: string, staffName = "Nhân viên kho"): ActionResult<void> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    const now = new Date().toLocaleString("vi-VN");

    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        noShowReported: { reportedAt: now, staffName, note },
        statusHistory: [...o.statusHistory, { status: o.status, at: now, by: `${staffName}: Ghi nhận khách không đến nhận (${note})` }],
      };
    }));

    sendNotification({
      title: "Khách hàng không đến nhận đồ",
      message: `Đơn hàng #${order.id} (${order.customerName}) quá giờ hẹn nhận nhưng khách chưa đến. Ghi chú: ${note}. Quản trị viên vui lòng xử lý theo UC3.4.`,
      type: "order",
      targetRole: "admin",
    });

    return { ok: true, data: undefined };
  };

  // UC4.3 Dòng phụ 3.2: Duyệt kết luận mất thiết bị & dừng tính trễ
  const approveLostEquipment = (orderId: string, equipmentId: string, staffName = "Quản trị viên"): ActionResult<void> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    const now = new Date().toLocaleString("vi-VN");

    // Cập nhật lostApproved trong returnReceipts
    const updatedReceipts = order.returnReceipts?.map((rc) => ({
      ...rc,
      items: rc.items.map((it) => it.equipmentId === equipmentId ? { ...it, lostApproved: true } : it),
    }));

    // Cập nhật trạng thái thiết bị sang Thất lạc
    setEquipment((prev) => prev.map((e) =>
      e.id === equipmentId ? { ...e, equipmentStatus: "Thất lạc" } : e
    ));

    // Duyệt phụ phí bồi thường nếu có
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        returnReceipts: updatedReceipts,
        surcharges: o.surcharges.map((s) => s.equipmentId === equipmentId ? { ...s, status: "Đã duyệt" } : s),
        statusHistory: [...o.statusHistory, { status: o.status, at: now, by: `${staffName}: Duyệt kết luận mất thiết bị ${equipmentId}` }],
      };
    }));

    return { ok: true, data: undefined };
  };

  // UC10: Đổi thiết bị đã gán trước khi bàn giao nếu phát hiện lỗi
  const changeAssignedEquipment = (orderId: string, oldEquipmentId: string, newEquipmentId: string): ActionResult => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    const newEq = equipment.find((e) => e.id === newEquipmentId);
    if (!newEq || newEq.equipmentStatus !== "Sẵn sàng") {
      return { ok: false, message: "Thiết bị thay thế không sẵn sàng trong kho." };
    }

    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        assignedEquipment: o.assignedEquipment.map((a) =>
          a.equipmentId === oldEquipmentId ? { ...a, equipmentId: newEquipmentId } : a
        ),
      };
    }));

    // Cập nhật trạng thái kho: hoàn trả serial cũ và chiếm serial mới
    setEquipment((prev) => prev.map((e) => {
      if (e.id === oldEquipmentId) return { ...e, equipmentStatus: "Sẵn sàng" };
      if (e.id === newEquipmentId) return { ...e, equipmentStatus: order.status === "Đang thuê" ? "Đang thuê" : "Sẵn sàng" };
      return e;
    }));

    return { ok: true, data: undefined };
  };

  // UC11: Biên bản Bàn giao Thiết bị
  const createHandoverRecord = (orderId: string, record: Omit<HandoverRecord, "id" | "handoverAt">): ActionResult<HandoverRecord> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    const now = new Date().toLocaleString("vi-VN");
    const id = `BBBG-${order.id}`;

    const newRecord: HandoverRecord = {
      id,
      orderId,
      handoverAt: now,
      ...record,
    };

    // Đánh dấu thiết bị sang "Đang thuê"
    const assignedIds = record.items.map((i) => i.equipmentId);
    setEquipment((prev) => prev.map((e) =>
      assignedIds.includes(e.id) ? { ...e, equipmentStatus: "Đang thuê" } : e
    ));

    // Đổi trạng thái đơn sang "Đang thuê"
    setOrders((prev) => prev.map((o) =>
      o.id === orderId ? {
        ...o,
        status: "Đang thuê",
        handedOverAt: now,
        handoverRecord: newRecord,
        statusHistory: [...o.statusHistory, { status: "Đang thuê", at: now, by: record.staffName || "Nhân viên kho" }],
      } : o
    ));

    return { ok: true, data: newRecord };
  };

  // UC12: Nhận trả nhiều đợt & Trả một phần (Partial Return)
  const createReturnReceipt = (
    orderId: string,
    input: { returnItems: ReturnReceiptItem[]; staffName: string; note?: string }
  ): ActionResult<ReturnReceipt> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: "Không tìm thấy đơn hàng." };
    if (!input.returnItems.length) return { ok: false, message: "Vui lòng chọn ít nhất một thiết bị nhận trả đợt này." };

    const now = new Date().toLocaleString("vi-VN");
    const currentRounds = order.returnReceipts?.length || 0;
    const returnRound = currentRounds + 1;
    const receiptId = `PNT-${order.id}-${returnRound}`;

    // Cập nhật từng thiết bị trong assignedEquipment
    const updatedAssigned = order.assignedEquipment.map((ae) => {
      const ri = input.returnItems.find((item) => item.equipmentId === ae.equipmentId);
      if (ri) {
        return {
          ...ae,
          returnedAt: now,
          returnCondition: ri.condition,
          returnNote: ri.note || "",
        };
      }
      return ae;
    });

    // Kiểm tra xem sau đợt này đơn còn thiết bị nợ không
    const remainingDebt = updatedAssigned.filter((ae) => !ae.returnedAt);
    const isFinalReturn = remainingDebt.length === 0;

    // Tự động tạo phiếu bảo trì nếu hỏng/vệ sinh và phụ phí nếu có
    const newMaintenance: MaintenanceReceipt[] = [];
    const newSurcharges: Surcharge[] = [];

    input.returnItems.forEach((ri) => {
      if (["Cần vệ sinh", "Hỏng nhẹ", "Hỏng nặng", "Thiếu phụ kiện"].includes(ri.condition)) {
        const pbtId = `PBT-${Date.now()}-${ri.equipmentId}`;
        ri.maintenanceReceiptId = pbtId;
        newMaintenance.push({
          id: pbtId,
          equipmentId: ri.equipmentId,
          productId: ri.productId,
          orderId: order.id,
          issueDescription: `${ri.condition}: ${ri.note || "Cần bảo dưỡng sau khi khách trả đồ"}`,
          status: "Chờ xử lý",
          createdAt: now,
          estimatedCost: ri.surchargeAmount || 0,
          note: `Tự động tạo từ phiếu nhận trả ${receiptId}`,
        });
      }

      if (ri.surchargeAmount > 0) {
        newSurcharges.push({
          id: `PC-${Date.now()}-${ri.equipmentId}`,
          type: ri.condition,
          equipmentId: ri.equipmentId,
          amount: ri.surchargeAmount,
          reason: `${ri.condition} (${receiptId}) — ${ri.note || "Phụ phí khắc phục/bồi thường"}`,
          status: "Chờ duyệt",
          createdBy: input.staffName || "Nhân viên nhận trả",
        });
      }
    });

    if (newMaintenance.length) {
      setMaintenanceReceipts((prev) => [...newMaintenance, ...prev]);
    }

    // Cập nhật trạng thái vật lý của thiết bị trong kho
    setEquipment((prev) => prev.map((e) => {
      const ri = input.returnItems.find((item) => item.equipmentId === e.id);
      if (!ri) return e;
      let nextStatus: Equipment["equipmentStatus"] = "Sẵn sàng";
      if (ri.condition === "Mất thiết bị") nextStatus = "Thất lạc";
      else if (["Cần vệ sinh", "Hỏng nhẹ", "Hỏng nặng", "Thiếu phụ kiện"].includes(ri.condition)) nextStatus = "Đang bảo trì";
      return {
        ...e,
        equipmentStatus: nextStatus,
        rentCount: ri.condition === "Mất thiết bị" ? e.rentCount : e.rentCount + 1,
      };
    }));

    const newReceipt: ReturnReceipt = {
      id: receiptId,
      orderId: order.id,
      returnRound,
      returnedAt: now,
      staffName: input.staffName || "Nhân viên kho",
      items: input.returnItems,
      isFinalReturn,
      note: input.note || "",
      photoUrls: input.photoUrls || [],
    };

    const newStatus: OrderStatus = isFinalReturn ? "Đã nhận trả" : "Đang thuê";
    const history = isFinalReturn
      ? [...order.statusHistory, { status: "Đã nhận trả" as OrderStatus, at: now, by: input.staffName || "Nhân viên" }]
      : order.statusHistory;

    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        assignedEquipment: updatedAssigned,
        status: newStatus,
        returnedAt: isFinalReturn ? now : o.returnedAt,
        returnReceipts: [...(o.returnReceipts || []), newReceipt],
        surcharges: [...o.surcharges, ...newSurcharges],
        statusHistory: history,
      };
    }));

    return { ok: true, data: newReceipt };
  };

  // UC13: Quản lý Quá hạn & tính phụ phí trễ
  const checkOrderOverdue = (order: Order) => {
    if (["Hoàn tất", "Khách hủy", "Cửa hàng hủy", "Hết hạn", "Đã nhận trả", "Chờ đối soát"].includes(order.status)) {
      return { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };
    }
    if (!order.returnTime) return { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };

    const parsedDeadline = new Date(order.returnTime.replace(" ", "T") + (order.returnTime.includes(":") && order.returnTime.split(":").length === 2 ? ":00" : "")).getTime();
    const now = Date.now();
    if (isNaN(parsedDeadline) || now <= parsedDeadline) {
      return { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };
    }

    // Đơn quá hạn nếu còn thiết bị nợ
    const hasDebt = order.assignedEquipment.length === 0 || order.assignedEquipment.some((ae) => !ae.returnedAt);
    if (!hasDebt) return { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };

    const diffHours = (now - parsedDeadline) / 3600000;
    const overdueDays = Math.max(1, Math.ceil(diffHours / 24));
    const dailyRentalTotal = order.items.reduce((sum, item) => sum + item.pricePerDay * item.qty, 0);
    const surcharge = Math.round(overdueDays * dailyRentalTotal * 1.5);

    return { isOverdue: true, overdueHours: Math.round(diffHours), overdueDays, surcharge };
  };

  // UC16: Quản lý Phiếu Bảo Trì (UC6.12 & UC6.13)
  const saveMaintenanceReceipt = (receipt: MaintenanceReceipt): ActionResult<MaintenanceReceipt> => {
    setMaintenanceReceipts((prev) => {
      const idx = prev.findIndex((m) => m.id === receipt.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = receipt;
        return copy;
      }
      return [receipt, ...prev];
    });
    // Cập nhật thiết bị tương ứng sang trạng thái Đang bảo trì
    setEquipment((prev) => prev.map((e) => e.id === receipt.equipmentId ? { ...e, equipmentStatus: "Đang bảo trì" } : e));
    addAuditLog({
      actor: "NV Kho Mai",
      role: "staff",
      action: "Tạo phiếu bảo trì (UC6.12)",
      targetEntity: "MaintenanceReceipt",
      targetId: receipt.id,
      detail: `Thiết bị: ${receipt.equipmentId} - Lỗi: ${receipt.issueDescription} - Dự tính: ${fmt(receipt.estimatedCost)}`,
    });
    return { ok: true, data: receipt };
  };

  const updateMaintenanceStatus = (id: string, status: MaintenanceReceipt["status"], actualCost?: number, note?: string): ActionResult => {
    const m = maintenanceReceipts.find((item) => item.id === id);
    if (!m) return { ok: false, message: "Không tìm thấy phiếu bảo trì." };
    const now = new Date().toLocaleString("vi-VN");

    setMaintenanceReceipts((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        status,
        actualCost: actualCost !== undefined ? actualCost : item.actualCost,
        completedAt: status === "Hoàn tất" ? now : item.completedAt,
        note: note || item.note,
      };
    }));

    if (status === "Hoàn tất") {
      setEquipment((prev) => prev.map((e) => e.id === m.equipmentId ? { ...e, equipmentStatus: "Sẵn sàng" } : e));
    } else if (status === "Không thể sửa") {
      setEquipment((prev) => prev.map((e) => e.id === m.equipmentId ? { ...e, equipmentStatus: "Ngừng sử dụng" } : e));
    }

    addAuditLog({
      actor: "NV Kho Mai",
      role: "staff",
      action: "Nghiệm thu bảo trì (UC6.13)",
      targetEntity: "MaintenanceReceipt",
      targetId: id,
      detail: `Trạng thái: ${status}${actualCost !== undefined ? ` - Chi phí thực tế: ${fmt(actualCost)}` : ""}${note ? ` (${note})` : ""}`,
    });

    return { ok: true, data: undefined };
  };

  const addSurcharge = (orderId: string, surcharge: Surcharge) =>
    setOrders((prev) => prev.map((o) =>
      o.id === orderId ? { ...o, surcharges: [...o.surcharges, surcharge] } : o
    ));

  const approveSurcharge = (orderId: string, surchargeId: string) =>
    setOrders((prev) => prev.map((o) =>
      o.id === orderId
        ? { ...o, surcharges: o.surcharges.map((s) => s.id === surchargeId ? { ...s, status: "Đã duyệt" as const, reviewedBy: "Quản trị viên", reviewedAt: new Date().toLocaleString("vi-VN") } : s) }
        : o
    ));

  const rejectSurcharge = (orderId: string, surchargeId: string) =>
    setOrders((prev) => prev.map((o) =>
      o.id === orderId
        ? { ...o, surcharges: o.surcharges.map((s) => s.id === surchargeId ? { ...s, status: "Từ chối" as const, reviewedBy: "Quản trị viên", reviewedAt: new Date().toLocaleString("vi-VN") } : s) }
        : o
    ));

  // UC5.2 Dòng phụ 5.1: Khách hàng khiếu nại phụ phí -> Chuyển sang "Tranh chấp"
  const disputeSurcharge = (orderId: string, surchargeId: string, customerResponse: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              surcharges: o.surcharges.map((s) =>
                s.id === surchargeId
                  ? {
                      ...s,
                      status: "Tranh chấp" as const,
                      customerResponse: customerResponse.trim(),
                    }
                  : s
              ),
            }
          : o
      )
    );
  };

  // UC5.3 Dòng chính 4 & 5: Quản trị viên xử lý kết luận tranh chấp phụ phí
  const resolveDisputedSurcharge = (
    orderId: string,
    surchargeId: string,
    resolution: "approved" | "rejected" | "adjusted",
    finalAmount: number,
    resolutionNote: string
  ) => {
    const now = new Date().toLocaleString("vi-VN");
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              surcharges: o.surcharges.map((s) => {
                if (s.id !== surchargeId) return s;
                if (resolution === "rejected") {
                  return {
                    ...s,
                    amount: 0,
                    status: "Từ chối" as const,
                    reviewedBy: "Quản trị viên",
                    reviewedAt: now,
                    resolutionNote,
                  };
                }
                return {
                  ...s,
                  originalAmount: s.originalAmount || s.amount,
                  amount: finalAmount,
                  status: "Đã duyệt" as const,
                  reviewedBy: "Quản trị viên",
                  reviewedAt: now,
                  resolutionNote,
                };
              }),
            }
          : o
      )
    );
  };

  const confirmImportReceipt = (
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
  ): string | null => {
    const receipt = importReceipts.find((item) => item.id === receiptId);
    if (!receipt || receipt.status !== "Nháp") return "Phiếu không tồn tại hoặc đã được xử lý.";
    const supplier = suppliers.find((item) => item.id === receipt.supplierId);
    if (!supplier || supplier.cooperationStatus !== "active") return "Nhà cung cấp không tồn tại hoặc đã ngừng hợp tác.";
    if (receipt.lines.some((line) => !Number.isInteger(line.quantity) || line.quantity <= 0 || line.unitPrice < 0 || !products.some((product) => product.id === line.productId))) {
      return "Chi tiết phiếu nhập có sản phẩm, số lượng hoặc đơn giá không hợp lệ.";
    }

    const now = new Date().toLocaleString("vi-VN");
    const nowDateOnly = new Date().toISOString().slice(0, 10);
    let newEquipment: Equipment[] = [];
    let updatedReceiptLines = receipt.lines;

    if (inspection && inspection.lines) {
      // UC7.7 & UC7.7.2: Kiểm định chất lượng hàng thực nhận
      const newMaintReceipts: MaintenanceReceipt[] = [];

      for (const inspLine of inspection.lines) {
        const line = receipt.lines.find((l) => l.productId === inspLine.productId);
        const unitPrice = line?.unitPrice || 0;

        // A. Hàng đạt chuẩn -> Trạng thái Sẵn sàng
        inspLine.acceptedCodes.forEach((code) => {
          newEquipment.push({
            id: code,
            displayCode: code,
            importReceiptLineId: line?.id,
            productId: inspLine.productId,
            originalProductId: inspLine.productId,
            importReceiptId: receipt.id,
            importDate: nowDateOnly,
            importPrice: unitPrice,
            condition: "Mới 100%",
            includedAccessories: [],
            note: "Kiểm nhận đạt chuẩn nhập kho",
            equipmentStatus: "Sẵn sàng",
            rentCount: 0,
          });
        });

        // B. Hàng lỗi chấp nhận bảo hành (UC7.7.2) -> Trạng thái Đang bảo trì
        inspLine.damagedCodes?.forEach((code) => {
          newEquipment.push({
            id: code,
            displayCode: code,
            importReceiptLineId: line?.id,
            productId: inspLine.productId,
            originalProductId: inspLine.productId,
            importReceiptId: receipt.id,
            importDate: nowDateOnly,
            importPrice: unitPrice,
            condition: "Lỗi khi nhập kho (chờ xử lý)",
            includedAccessories: [],
            note: inspLine.damageNotes || "Hàng lỗi khi nhập kho (UC7.7.2)",
            equipmentStatus: "Đang bảo trì",
            rentCount: 0,
          });

          newMaintReceipts.push({
            id: `PBTI-${Date.now().toString().slice(-4)}-${code}`,
            equipmentId: code,
            issueDescription: `Hàng lỗi khi giao nhận từ NCC ${supplier.name}: ${inspLine.damageNotes || "Lỗi kỹ thuật xuất xưởng"} (UC7.7.2)`,
            estimatedCost: 0,
            status: "Đang sửa chữa",
            createdAt: now,
          });
        });
      }

      if (newMaintReceipts.length > 0) {
        setMaintenanceReceipts((prev) => [...newMaintReceipts, ...prev]);
      }

      updatedReceiptLines = receipt.lines.map((line) => {
        const insp = inspection.lines.find((il) => il.productId === line.productId);
        if (!insp) return line;
        return {
          ...line,
          acceptedQty: insp.acceptedCodes.length,
          acceptedCodes: insp.acceptedCodes,
          damagedQty: insp.damagedCodes?.length || 0,
          damagedCodes: insp.damagedCodes,
          damageNotes: insp.damageNotes,
          rejectedQty: insp.rejectedQty || 0,
          rejectionReason: insp.rejectionReason,
          equipmentCodes: [...insp.acceptedCodes, ...(insp.damagedCodes || [])],
        };
      });
    } else {
      // Cách xác nhận cũ trực tiếp
      const codes = receipt.lines.flatMap((line) => line.equipmentCodes.map((code) => code.trim()));
      const expected = receipt.lines.reduce((sum, line) => sum + line.quantity, 0);
      if (codes.length !== expected || codes.some((code) => !code)) return "Số mã thiết bị không khớp số lượng thực nhận.";
      if (new Set(codes).size !== codes.length || codes.some((code) => equipment.some((item) => item.id === code))) {
        return "Mã thiết bị bị trùng trong phiếu hoặc đã tồn tại trong kho.";
      }
      newEquipment = receipt.lines.flatMap((line) =>
        line.equipmentCodes.map((code) => ({
          id: code,
          displayCode: code,
          importReceiptLineId: line.id,
          productId: line.productId,
          originalProductId: line.productId,
          importReceiptId: receipt.id,
          importDate: nowDateOnly,
          importPrice: line.unitPrice,
          condition: line.receivingCondition || "Mới",
          includedAccessories: [],
          note: line.note || "",
          equipmentStatus: "Sẵn sàng",
          rentCount: 0,
        }))
      );
    }

    setEquipment((prev) => [...prev, ...newEquipment]);
    setImportReceipts((prev) => prev.map((item) =>
      item.id === receiptId ? {
        ...item,
        supplierName: supplier.name,
        lines: updatedReceiptLines.map((line) => ({ ...line, productNameSnapshot: products.find((product) => product.id === line.productId)?.name ?? "" })),
        status: "Đã nhập kho",
        confirmedAt: now,
        receivedAt: nowDateOnly,
        inspectedBy: inspection?.inspectedBy || "Quản trị viên",
      } : item
    ));

    addAuditLog({
      actor: inspection?.inspectedBy || "Quản trị viên",
      role: "admin",
      action: "Xác nhận nhập kho (UC7.7)",
      targetEntity: "ImportReceipt",
      targetId: receiptId,
      detail: `Đã kích hoạt ${newEquipment.length} thiết bị mới vào kho từ NCC ${supplier.name}`,
    });

    return null;
  };

  // UC7.10: Lập đề nghị xử lý sai lệch phiếu nhập đã chốt (Chờ duyệt)
  const createImportAdjustment = (input: Omit<ImportReceiptAdjustment, "id" | "createdAt" | "status">): ActionResult<ImportReceiptAdjustment> => {
    const receipt = importReceipts.find((r) => r.id === input.importReceiptId);
    if (!receipt) return { ok: false, message: "Không tìm thấy phiếu nhập gốc." };
    if (receipt.status !== "Đã nhập kho") return { ok: false, message: "Chỉ phiếu đã nhập kho mới cần xử lý sai lệch." };

    const newAdj: ImportReceiptAdjustment = {
      ...input,
      id: `DCNH-${Date.now().toString().slice(-4)}`,
      status: "Chờ duyệt",
      createdAt: new Date().toLocaleString("vi-VN"),
    };

    setImportReceipts((prev) =>
      prev.map((r) =>
        r.id === input.importReceiptId
          ? { ...r, adjustments: [...(r.adjustments || []), newAdj] }
          : r
      )
    );

    addAuditLog({
      actor: input.createdBy,
      role: "staff",
      action: "Lập đề nghị điều chỉnh phiếu nhập (UC7.10)",
      targetEntity: "ImportReceipt",
      targetId: input.importReceiptId,
      detail: `Loại: ${input.type} - Lý do: ${input.reason}`,
    });

    return { ok: true, data: newAdj };
  };

  // UC7.10 & UC7.10.1: Duyệt điều chỉnh phiếu nhập có kiểm tra lịch thuê tương lai
  const approveImportAdjustment = (receiptId: string, adjustmentId: string, approvedBy = "Quản trị viên"): ActionResult => {
    const receipt = importReceipts.find((r) => r.id === receiptId);
    if (!receipt) return { ok: false, message: "Không tìm thấy phiếu nhập." };
    const adj = receipt.adjustments?.find((a) => a.id === adjustmentId);
    if (!adj) return { ok: false, message: "Không tìm thấy bản đề nghị điều chỉnh." };

    // Dòng phụ 4.1: Kiểm tra an toàn lịch thuê tương lai nếu điều chỉnh số lượng
    if (adj.type === "Số lượng") {
      const relatedEquips = equipment.filter((e) => e.importReceiptId === receiptId);
      const inRentOrFuture = relatedEquips.some((e) =>
        orders.some((o) =>
          (o.status === "Đang thuê" || o.status === "Đang chuẩn bị" || o.status === "Sẵn sàng nhận") &&
          (o.assignedEquipmentIds?.includes(e.id) || o.items.some((it) => it.equipmentId === e.id))
        )
      );
      if (inRentOrFuture) {
        return {
          ok: false,
          message: "Cảnh báo an toàn (Dòng phụ 4.1): Thiết bị trong lô nhập này đang được khách thuê hoặc đã gán lịch giao sắp tới. Vui lòng xử lý cam kết khách hàng trước khi giảm kho!",
        };
      }
    }

    const now = new Date().toLocaleString("vi-VN");
    setImportReceipts((prev) =>
      prev.map((r) => {
        if (r.id !== receiptId) return r;
        const updatedAdjustments = (r.adjustments || []).map((a) =>
          a.id === adjustmentId
            ? { ...a, status: "Đã duyệt" as const, approvedBy, approvedAt: now }
            : a
        );
        return { ...r, adjustments: updatedAdjustments };
      })
    );

    addAuditLog({
      actor: approvedBy,
      role: "admin",
      action: "Duyệt điều chỉnh phiếu nhập (UC7.10)",
      targetEntity: "ImportReceipt",
      targetId: receiptId,
      detail: `Mã điều chỉnh: ${adjustmentId} - Loại: ${adj.type}`,
    });

    return { ok: true, data: undefined };
  };

  const rejectImportAdjustment = (receiptId: string, adjustmentId: string, reason = ""): ActionResult => {
    const receipt = importReceipts.find((r) => r.id === receiptId);
    if (!receipt) return { ok: false, message: "Không tìm thấy phiếu nhập." };

    const now = new Date().toLocaleString("vi-VN");
    setImportReceipts((prev) =>
      prev.map((r) => {
        if (r.id !== receiptId) return r;
        const updatedAdjustments = (r.adjustments || []).map((a) =>
          a.id === adjustmentId
            ? { ...a, status: "Từ chối" as const, approvedBy: "Quản trị viên", approvedAt: now, reviewNote: reason }
            : a
        );
        return { ...r, adjustments: updatedAdjustments };
      })
    );

    return { ok: true, data: undefined };
  };

  const markEquipmentReturned = (orderId: string, equipmentId: string, condition: string, note: string) => {
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      const assigned = o.assignedEquipment.map((a) =>
        a.equipmentId === equipmentId ? { ...a, returnedAt: new Date().toLocaleString("vi-VN"), returnCondition: condition, returnNote: note } : a
      );
      const allReturned = assigned.every((a) => a.returnedAt);
      const now = new Date().toLocaleString("vi-VN");
      const newStatus: OrderStatus = allReturned ? "Đã nhận trả" : o.status;
      const history = allReturned
        ? [...o.statusHistory, { status: "Đã nhận trả" as OrderStatus, at: now, by: "Nhân viên" }]
        : o.statusHistory;
      return { ...o, assignedEquipment: assigned, status: newStatus, statusHistory: history };
    }));
    // mark equipment back
    const statusAfter: Equipment["equipmentStatus"] =
      condition === "Bình thường" || condition === "Cần vệ sinh" ? "Sẵn sàng" : "Đang bảo trì";
    setEquipment((prev) => prev.map((e) =>
      e.id === equipmentId ? { ...e, equipmentStatus: statusAfter, rentCount: e.rentCount + 1 } : e
    ));
  };

  const transferEquipment = (equipmentId: string, newProductId: string): ActionResult<Equipment> => {
    const item = equipment.find((entry) => entry.id === equipmentId);
    if (!item) return { ok: false, message: "Không tìm thấy thiết bị." };
    if (item.equipmentStatus !== "Sẵn sàng") return { ok: false, message: "Chỉ thiết bị Sẵn sàng mới được chuyển loại." };
    const target = products.find((product) => product.id === newProductId && product.status === "active");
    if (!target) return { ok: false, message: "Sản phẩm đích không tồn tại hoặc đã tạm dừng." };
    const assigned = orders.some((order) => !["Hoàn tất", "Khách hủy", "Cửa hàng hủy", "Hết hạn"].includes(order.status) && order.assignedEquipment.some((entry) => entry.equipmentId === equipmentId && !entry.returnedAt));
    if (assigned) return { ok: false, message: "Thiết bị đang được phân công cho một đơn chưa kết thúc." };
    const updated = { ...item, productId: newProductId };
    setEquipment((current) => current.map((entry) => entry.id === equipmentId ? updated : entry));
    return { ok: true, data: updated };
  };

  // UC23: Quản lý Nhân viên & Khóa tài khoản
  const toggleStaffLock = (staffId: string, reason?: string): ActionResult => {
    const staff = staffAccounts.find((s) => s.id === staffId);
    if (!staff) return { ok: false, message: "Không tìm thấy tài khoản nhân viên." };
    if (staff.role === "Quản trị viên") return { ok: false, message: "Không thể khóa tài khoản Quản trị viên hệ thống." };
    const nextStatus: StaffAccount["status"] = staff.status === "active" ? "locked" : "active";
    setStaffAccounts((prev) => prev.map((s) => s.id === staffId ? {
      ...s,
      status: nextStatus,
      lockedReason: nextStatus === "locked" ? (reason || "Khóa bởi Quản trị viên") : undefined,
    } : s));
    return { ok: true, data: undefined };
  };

  // UC6.10: Kiểm kê và đề nghị điều chỉnh kho
  const createStockAdjustment = (input: { reason: string; createdBy: string; lines: StockAdjustmentLine[]; autoApprove?: boolean }): ActionResult<StockAdjustmentReceipt> => {
    if (!input.lines.length) return { ok: false, message: "Phiếu điều chỉnh phải có ít nhất 1 dòng thiết bị." };
    const now = new Date().toLocaleString("vi-VN");
    const id = `PDCK-${Date.now()}`;
    const autoApprove = input.autoApprove ?? false;
    const newReceipt: StockAdjustmentReceipt = {
      id,
      createdAt: now,
      createdBy: input.createdBy || "Nhân viên kho",
      reason: input.reason || "Kiểm kê định kỳ kho",
      status: autoApprove ? "Đã duyệt" : "Chờ duyệt",
      approvedBy: autoApprove ? input.createdBy : undefined,
      approvedAt: autoApprove ? now : undefined,
      lines: input.lines,
    };

    // Nếu tự động duyệt (ví dụ Quản trị viên lập trực tiếp) thì cập nhật kho ngay
    if (autoApprove) {
      setEquipment((prev) => prev.map((e) => {
        const line = input.lines.find((l) => l.equipmentId === e.id);
        if (!line) return e;
        return {
          ...e,
          equipmentStatus: line.newStatus,
          condition: line.newStatus === "Ngừng sử dụng" ? "Hỏng hoàn toàn (Sau kiểm kê)" : e.condition,
        };
      }));
    }

    setStockAdjustments((prev) => [newReceipt, ...prev]);
    return { ok: true, data: newReceipt };
  };

  // UC6.11 & UC6.11.1: Quản trị viên duyệt điều chỉnh kho có kiểm tra ảnh hưởng lịch thuê
  const approveStockAdjustment = (id: string, note?: string): ActionResult => {
    const receipt = stockAdjustments.find((r) => r.id === id);
    if (!receipt) return { ok: false, message: "Không tìm thấy phiếu điều chỉnh kho." };
    if (receipt.status === "Đã duyệt") return { ok: false, message: "Phiếu này đã được phê duyệt trước đó." };

    // UC6.11.1: Kiểm tra ảnh hưởng lịch thuê đối với từng thiết bị trong phiếu
    for (const line of receipt.lines) {
      if (line.newStatus === "Thất lạc" || line.newStatus === "Ngừng sử dụng") {
        // Kiểm tra thiết bị đang ở nhà khách
        const activeRented = orders.find(
          (o) => o.status === "Đang thuê" && o.assignedEquipment.some((ae) => ae.equipmentId === line.equipmentId && !ae.returnedAt)
        );
        if (activeRented) {
          return {
            ok: false,
            message: `Thiết bị ${line.equipmentId} đang ở khách thuê (Đơn ${activeRented.id}). Cần thu hồi hoặc giải quyết bồi hoàn trước khi điều chỉnh mất/ngừng dùng! (UC6.11 Dòng 2.1)`,
          };
        }

        // Kiểm tra đơn đã cam kết sắp giao (Đang chuẩn bị, Sẵn sàng nhận)
        const upcomingOrder = orders.find(
          (o) => ["Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status) && o.assignedEquipment.some((ae) => ae.equipmentId === line.equipmentId)
        );
        if (upcomingOrder) {
          return {
            ok: false,
            message: `Thiết bị ${line.equipmentId} đã được gán cho Đơn ${upcomingOrder.id} (${upcomingOrder.status}). Vui lòng điều phối thiết bị thay thế trước khi duyệt giảm kho! (UC6.11.1)`,
          };
        }
      }
    }

    const now = new Date().toLocaleString("vi-VN");
    // Cập nhật trạng thái các thiết bị trong kho
    setEquipment((prev) =>
      prev.map((e) => {
        const line = receipt.lines.find((l) => l.equipmentId === e.id);
        if (!line) return e;
        return {
          ...e,
          equipmentStatus: line.newStatus,
          condition: line.newStatus === "Ngừng sử dụng" ? "Hỏng hoàn toàn (Sau kiểm kê)" : e.condition,
        };
      })
    );

    // Cập nhật trạng thái phiếu điều chỉnh
    setStockAdjustments((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "Đã duyệt",
              approvedBy: "Quản trị viên",
              approvedAt: now,
              note: note || r.note,
            }
          : r
      )
    );

    return { ok: true, data: undefined };
  };

  const rejectStockAdjustment = (id: string, note?: string): ActionResult => {
    const receipt = stockAdjustments.find((r) => r.id === id);
    if (!receipt) return { ok: false, message: "Không tìm thấy phiếu điều chỉnh kho." };
    const now = new Date().toLocaleString("vi-VN");
    setStockAdjustments((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "Từ chối",
              approvedBy: "Quản trị viên",
              approvedAt: now,
              note: note || "Từ chối điều chỉnh (Dữ liệu kho giữ nguyên)",
            }
          : r
      )
    );
    return { ok: true, data: undefined };
  };

  const saveCustomer = (customer: CustomerAccount): ActionResult<CustomerAccount> => {
    if (!customer.name.trim()) return { ok: false, message: "Họ tên không được để trống" };
    if (!customer.phone.trim()) return { ok: false, message: "Số điện thoại không được để trống" };
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === customer.id);
      if (exists) return prev.map((c) => (c.id === customer.id ? customer : c));
      return [...prev, customer];
    });
    addAuditLog({ actor: "Admin", role: "Quản trị viên", action: "Cập nhật khách hàng", targetEntity: "CustomerAccount", targetId: customer.id, detail: `Lưu thông tin khách hàng: ${customer.name}` });
    return { ok: true, data: customer };
  };

  const toggleCustomerLock = (customerId: string, reason?: string): ActionResult => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return { ok: false, message: "Không tìm thấy khách hàng" };
    const nextStatus: CustomerAccount["status"] = cust.status === "active" ? "locked" : "active";
    setCustomers((prev) => prev.map((c) => c.id === customerId ? { ...c, status: nextStatus, lockedReason: nextStatus === "locked" ? (reason || "Vi phạm quy định thuê thiết bị") : undefined } : c));
    addAuditLog({ actor: "Admin", role: "Quản trị viên", action: nextStatus === "locked" ? "Khóa khách hàng" : "Mở khóa khách hàng", targetEntity: "CustomerAccount", targetId: customerId, detail: `Lý do: ${reason || "N/A"}` });
    return { ok: true, data: undefined };
  };

  const sendNotification = (notif: {
    title: string;
    message: string;
    type: AppNotification["type"];
    targetRole: AppNotification["targetRole"];
    category?: AppNotification["category"];
    actionLink?: AppNotification["actionLink"];
  }): ActionResult<AppNotification> => {
    if (!notif.title.trim()) return { ok: false, message: "Tiêu đề không được để trống" };
    if (!notif.message.trim()) return { ok: false, message: "Nội dung không được để trống" };
    const newNotif: AppNotification = {
      id: `NOTIF-${Date.now()}`,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      targetRole: notif.targetRole,
      category: notif.category || "system",
      actionLink: notif.actionLink,
      createdAt: new Date().toLocaleString("vi-VN"),
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    addAuditLog({ actor: "Admin", role: "Quản trị viên", action: "Gửi thông báo hệ thống (UC9.4)", targetEntity: "AppNotification", targetId: newNotif.id, detail: `Tiêu đề: ${newNotif.title} - Đối tượng: ${newNotif.targetRole}` });
    return { ok: true, data: newNotif };
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  // UC8.1 & UC8.1.1: Cấu hình chính sách có phiên bản & lưu snapshot lịch sử
  const updatePolicy = (
    patch: Partial<RentalPolicyConfig>,
    changeReason = "Cập nhật quy định thuê mượn và biểu phí bồi thường",
    effectiveDate = new Date().toLocaleDateString("vi-VN")
  ): ActionResult => {
    // Validation theo UC8.1 dòng phụ 2.1: Chặn giá trị âm hoặc mâu thuẫn mốc hủy
    if (patch.holdMinutes !== undefined && patch.holdMinutes <= 0) {
      return { ok: false, message: "Thời gian giữ chỗ phải lớn hơn 0 phút." };
    }
    if (patch.overdueMultiplier !== undefined && patch.overdueMultiplier <= 0) {
      return { ok: false, message: "Hệ số phạt trễ hạn phải lớn hơn 0." };
    }
    if (
      (patch.cancellationTier1FeePercent !== undefined && (patch.cancellationTier1FeePercent < 0 || patch.cancellationTier1FeePercent > 100)) ||
      (patch.cancellationTier2FeePercent !== undefined && (patch.cancellationTier2FeePercent < 0 || patch.cancellationTier2FeePercent > 100))
    ) {
      return { ok: false, message: "Tỷ lệ phí hủy phải nằm trong khoảng từ 0% đến 100%." };
    }
    const tier1 = patch.cancellationTier1FeePercent ?? policies.cancellationTier1FeePercent;
    const tier2 = patch.cancellationTier2FeePercent ?? policies.cancellationTier2FeePercent;
    if (tier1 > tier2) {
      return { ok: false, message: "Mâu thuẫn mốc hủy: Phí hủy trước 24-48h không được cao hơn phí hủy sát giờ (<24h)." };
    }

    // Tự động sinh phiên bản mới: v1.x -> v1.(x+1)
    const currentVerNum = parseFloat(policies.version?.replace("v", "") || "1.2");
    const newVersion = `v${(currentVerNum + 0.1).toFixed(1)}`;
    const nowStr = new Date().toLocaleString("vi-VN");
    const updatedBy = role === "admin" ? "Nguyễn Văn Trưởng (Admin)" : "Nhân viên hệ thống";

    // Lưu snapshot phiên bản cũ vào lịch sử policyVersions (UC8.1.1)
    const oldSnapshot: PolicyVersion = {
      version: policies.version || "v1.2",
      effectiveDate: policies.effectiveDate || "01/12/2024",
      updatedAt: policies.updatedAt,
      updatedBy: policies.updatedBy,
      changeReason: policies.changeReason || "Phiên bản tiền nhiệm",
      configSnapshot: { ...policies },
    };
    setPolicyVersions((prev) => [oldSnapshot, ...prev]);

    const updated: RentalPolicyConfig = {
      ...policies,
      ...patch,
      version: newVersion,
      effectiveDate,
      changeReason,
      updatedAt: nowStr,
      updatedBy,
    };
    setPolicies(updated);
    addAuditLog({
      actor: "Admin",
      role: "Quản trị viên",
      action: `Ban hành chính sách mới (${newVersion})`,
      targetEntity: "RentalPolicy",
      targetId: newVersion,
      detail: `Áp dụng từ ${effectiveDate}: ${changeReason}`,
    });
    return { ok: true, data: undefined };
  };

  // UC8.5: Tạm dừng / Ngừng chương trình khuyến mãi kèm lý do
  const pausePromotion = (promoId: string, reason: string): ActionResult => {
    if (!reason.trim()) return { ok: false, message: "Vui lòng nhập lý do tạm dừng/ngừng chương trình (bắt buộc theo UC8.5)." };
    const promo = promotions.find((p) => p.id === promoId);
    if (!promo) return { ok: false, message: "Khuyến mãi không tồn tại." };
    if (promo.status === "inactive") return { ok: false, message: "Chương trình đã ở trạng thái tạm dừng." };

    setPromotions((prev) =>
      prev.map((p) =>
        p.id === promoId
          ? {
              ...p,
              status: "inactive",
              stopReason: reason.trim(),
              updatedAt: new Date().toLocaleString("vi-VN"),
              updatedBy: "Quản trị viên",
            }
          : p
      )
    );
    addAuditLog({
      actor: "Admin",
      role: "Quản trị viên",
      action: "Ngừng chương trình khuyến mãi",
      targetEntity: "Promotion",
      targetId: promo.code,
      detail: `Tạm dừng mã ${promo.code}. Lý do: ${reason.trim()}`,
    });
    return { ok: true, data: undefined };
  };

  // UC8.5: Kích hoạt lại chương trình khuyến mãi (kiểm tra hạn)
  const resumePromotion = (promoId: string): ActionResult => {
    const promo = promotions.find((p) => p.id === promoId);
    if (!promo) return { ok: false, message: "Khuyến mãi không tồn tại." };
    if (promo.status === "active") return { ok: false, message: "Chương trình đang hoạt động." };
    if (new Date(promo.endsAt).getTime() < Date.now()) {
      return { ok: false, message: "Không thể kích hoạt lại chương trình đã hết hạn thời gian (theo quy tắc UC8.5)." };
    }

    setPromotions((prev) =>
      prev.map((p) =>
        p.id === promoId
          ? {
              ...p,
              status: "active",
              stopReason: undefined,
              updatedAt: new Date().toLocaleString("vi-VN"),
              updatedBy: "Quản trị viên",
            }
          : p
      )
    );
    addAuditLog({
      actor: "Admin",
      role: "Quản trị viên",
      action: "Kích hoạt lại khuyến mãi",
      targetEntity: "Promotion",
      targetId: promo.code,
      detail: `Mở lại chương trình ${promo.code}`,
    });
    return { ok: true, data: undefined };
  };

  const addAuditLog = (entry: { actor: string; role: string; action: string; targetEntity: string; targetId: string; detail: string }) => {
    const log: AuditLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: new Date().toLocaleString("vi-VN"),
      ...entry,
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  const saveStaffAccount = (staff: StaffAccount): ActionResult<StaffAccount> => {
    if (!staff.name.trim()) return { ok: false, message: "Tên nhân viên không được để trống" };
    if (!staff.username.trim()) return { ok: false, message: "Tên đăng nhập không được để trống" };
    setStaffAccounts((prev) => {
      const exists = prev.some((s) => s.id === staff.id);
      if (exists) return prev.map((s) => s.id === staff.id ? staff : s);
      return [...prev, staff];
    });
    addAuditLog({ actor: "Admin", role: "Quản trị viên", action: "Cập nhật tài khoản NV", targetEntity: "StaffAccount", targetId: staff.id, detail: `Lưu nhân viên ${staff.name} - Quyền: ${staff.role}` });
    return { ok: true, data: staff };
  };

  const saveFinancialAdjustment = (adj: Omit<FinancialAdjustment, "id" | "createdAt">): ActionResult<FinancialAdjustment> => {
    if (!adj.reason.trim()) return { ok: false, message: "Lý do điều chỉnh không được để trống" };
    if (adj.amount <= 0) return { ok: false, message: "Số tiền điều chỉnh phải lớn hơn 0" };
    const newAdj: FinancialAdjustment = {
      id: `PDC-TC-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toLocaleString("vi-VN"),
      ...adj,
    };
    setFinancialAdjustments((prev) => [newAdj, ...prev]);
    addAuditLog({ actor: "Admin", role: "Quản trị viên", action: "Tạo điều chỉnh tài chính", targetEntity: "FinancialAdjustment", targetId: newAdj.id, detail: `${adj.type}: ${fmt(adj.amount)} - ${adj.reason}` });
    return { ok: true, data: newAdj };
  };

  const login = (user: { id?: string; username?: string; name: string; email: string; phone: string; role: Role; permissions?: string[]; address?: string }) => {
    setCurrentUser(user);
    setRole(user.role);
    addAuditLog({
      actor: user.name,
      role: user.role === "admin" ? "Quản trị viên" : user.role === "staff" ? "Nhân viên" : "Khách hàng",
      action: "Đăng nhập (UC1.2)",
      targetEntity: "Session",
      targetId: user.email || user.username || user.id || "SESSION",
      detail: `Đăng nhập thành công với vai trò ${user.role}`
    });
    if (user.role === "admin") setPage("admin");
    else if (user.role === "staff") setPage("staff");
    else setPage("landing");
  };

  // Cập nhật hồ sơ cá nhân của tài khoản đang đăng nhập (UC1.6)
  const updateCurrentUserProfile = (info: { name: string; phone: string; email: string }): ActionResult => {
    if (!currentUser) return { ok: false, message: "Chưa đăng nhập hệ thống." };
    setCurrentUser((prev) => (prev ? { ...prev, ...info } : null));

    // Cập nhật thông tin vào danh sách thực thể tương ứng (UC1.6)
    if (role === "admin" || role === "staff") {
      setStaffAccounts((prev) =>
        prev.map((s) => (s.id === currentUser.id || s.email === currentUser.email ? { ...s, ...info } : s))
      );
    } else {
      setCustomers((prev) =>
        prev.map((c) => (c.id === currentUser.id || c.email === currentUser.email ? { ...c, ...info } : c))
      );
    }

    addAuditLog({
      actor: info.name,
      role: role === "admin" ? "Quản trị viên" : role === "staff" ? "Nhân viên" : "Khách hàng",
      action: "Cập nhật hồ sơ cá nhân (UC1.6)",
      targetEntity: "UserProfile",
      targetId: currentUser.id || info.email,
      detail: `Cập nhật thông tin liên hệ: SĐT ${info.phone}, Email ${info.email}`
    });
    return { ok: true };
  };

  // Đổi mật khẩu tài khoản người dùng đang đăng nhập (UC1.12)
  const changeCurrentUserPassword = (oldPass: string, newPass: string): ActionResult => {
    if (!currentUser) return { ok: false, message: "Chưa đăng nhập hệ thống." };
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
    if (newPass.length < 6) {
      return { ok: false, message: "Mật khẩu mới tối thiểu 6 ký tự." };
    }

    if (role === "admin" || role === "staff") {
      setStaffAccounts((prev) =>
        prev.map((s) => (s.id === currentUser.id || s.email === currentUser.email || s.username === currentUser.username ? { ...s, password: newPass } : s))
      );
    } else {
      setCustomers((prev) =>
        prev.map((c) => (c.id === currentUser.id || c.email === currentUser.email ? { ...c, password: newPass } : c))
      );
    }

    addAuditLog({
      actor: currentUser.name,
      role: role === "admin" ? "Quản trị viên" : role === "staff" ? "Nhân viên" : "Khách hàng",
      action: "Đổi mật khẩu tài khoản (UC1.12)",
      targetEntity: "UserSecurity",
      targetId: currentUser.id || currentUser.email,
      detail: "Người dùng đổi mật khẩu bảo mật cá nhân thành công"
    });
    return { ok: true };
  };

  const logout = () => {
    const actorName = currentUser?.name || "Người dùng";
    addAuditLog({ actor: actorName, role: role === "admin" ? "Quản trị viên" : role === "staff" ? "Nhân viên" : "Khách hàng", action: "Đăng xuất (UC1.3)", targetEntity: "Session", targetId: currentUser?.email || "SESSION", detail: "Đăng xuất tài khoản khỏi phiên làm việc" });
    setCurrentUser(null);
    setRole("customer");
    setPage("landing");
  };

  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setCategories(INITIAL_CATEGORIES);
    setProducts(INITIAL_PRODUCTS.map((product) => ({
      ...product,
      displayCode: product.id,
      categoryId: INITIAL_CATEGORIES.find((category) => category.name === product.category)?.id,
      dimensions: "",
      specifications: {},
      images: [product.image].filter(Boolean),
    })));
    setSuppliers(INITIAL_SUPPLIERS);
    setPromotions(INITIAL_PROMOTIONS);
    setPromotionUsages([]);
    setEquipment(INITIAL_EQUIPMENT.map((item) => {
      const receipt = INITIAL_IMPORT_RECEIPTS.find((entry) => entry.id === item.importReceiptId);
      const index = receipt?.lines.findIndex((line) => line.productId === item.originalProductId) ?? -1;
      return { ...item, displayCode: item.id, importReceiptLineId: index >= 0 ? `${receipt?.id}-LINE-${index + 1}` : undefined, includedAccessories: [], note: "" };
    }));
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
    setImportReceipts(INITIAL_IMPORT_RECEIPTS.map((receipt) => ({
      ...receipt,
      displayCode: receipt.id,
      supplierId: INITIAL_SUPPLIERS.find((supplier) => supplier.displayCode === receipt.supplierId)?.id ?? receipt.supplierId,
      lines: receipt.lines.map((line, index) => ({ ...line, id: `${receipt.id}-LINE-${index + 1}`, receivingCondition: "Mới", note: "" })),
    })));
    setReviews(INITIAL_REVIEWS);
    setPickupDate("");
    setReturnDate("");
    setNewOrderId(null);
    setAppliedPromoCode("");
    setShowResetConfirm(false);
    setPage("landing");
    setRole("customer");
  };

  const setSelectedProduct = (id: string) => {
    setSelectedProductId(id);
    setPage("product-detail");
  };

  const state: AppState = {
    role, page, selectedProductId, categories, products, suppliers, promotions, promotionUsages, equipment, orders, cart, importReceipts, reviews, maintenanceReceipts, staffAccounts, stockAdjustments,
    customers, notifications, policies, auditLogs, financialAdjustments, currentUser,
    pickupDate, returnDate, pickupHour, returnHour, newOrderId, appliedPromoCode,
    setRole: (r) => {
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
    saveCategory,
    setCategoryStatus,
    saveProduct,
    saveEquipment,
    saveSupplier,
    savePromotion,
    saveImportReceipt,
    cancelImportReceipt,
    evaluatePromotion,
    addToCart,
    removeFromCart,
    updateCartQty,
    createOrder,
    payOrder,
    confirmReconciliation,
    finalizeOrderWithoutPayment,
    settleOrder,
    cancelOrder,
    getCancellationQuote,
    advanceOrderStatus,
    assignEquipment,
    completePreparation,
    reportEquipmentShortage,
    createHandoverRecord,
    changeAssignedEquipment,
    createReturnReceipt,
    checkOrderOverdue,
    addContactLog,
    getOverdueConflicts,
    reportCustomerNoShow,
    approveLostEquipment,
    saveMaintenanceReceipt,
    updateMaintenanceStatus,
    toggleStaffLock,
    saveStaffAccount,
    saveCustomer,
    toggleCustomerLock,
    sendNotification,
    markNotificationRead,
    replyReview,
    updatePolicy,
    policyVersions,
    pausePromotion,
    resumePromotion,
    addAuditLog,
    saveFinancialAdjustment,
    login,
    logout,
    updateCurrentUserProfile,
    changeCurrentUserPassword,
    createStockAdjustment,
    approveStockAdjustment,
    rejectStockAdjustment,
    addSurcharge,
    approveSurcharge,
    rejectSurcharge,
    disputeSurcharge,
    resolveDisputedSurcharge,
    confirmImportReceipt,
    toggleSupplierStatus,
    createImportAdjustment,
    approveImportAdjustment,
    rejectImportAdjustment,
    markEquipmentReturned,
    transferEquipment,
    addReview,
    hideReview,
    resetDemo,
    getAvailable,
    getDays,
    hasValidRentalPeriod,
  };

  const customerPages: Page[] = ["landing", "products", "product-detail", "cart", "checkout", "order-confirmed", "my-orders", "profile", "ai-advisor", "login", "register", "forgot-password"];
  const isCustomerPage = customerPages.includes(page);
  const customerNavigation = [
    { label: "Thuê đồ", p: "products" as Page },
    { label: "Cách thuê", p: "landing" as Page },
    { label: "Tư vấn AI", p: "ai-advisor" as Page },
    { label: "Đơn thuê", p: "my-orders" as Page },
    { label: "Tài khoản", p: "profile" as Page },
  ];
  const navigateCustomer = (target: Page) => {
    setPage(target);
    setMobileMenuOpen(false);
  };

  return (
    <AppContext.Provider value={state}>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--color-cream)", fontFamily: "var(--font-body)" }}>
        {/* Global Header */}
        <header style={{
          background: "rgba(22, 53, 40, 0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 8px 32px rgba(17, 35, 27, 0.2)"
        }}>
          <div className="app-header-inner max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            {/* Logo */}
            <button onClick={() => state.setRole("customer")} aria-label="Về trang chủ GearGo" style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
              <span style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                color: "white",
                background: "linear-gradient(135deg, #E07A43 0%, #D46931 100%)",
                boxShadow: "0 4px 14px rgba(224, 122, 67, 0.4)"
              }}>
                <Icon name="tent" size={22} />
              </span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "var(--font-display)", color: "white", fontSize: "1.35rem", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.01em" }}>GearGo</div>
                <div style={{ color: "#D1DDD5", fontSize: "0.68rem", fontWeight: 500, marginTop: 2 }}>Outdoor Rental & Gear</div>
              </div>
            </button>

            {/* Customer nav */}
            {isCustomerPage && (
              <nav className="customer-nav flex items-center gap-1 ml-4 flex-shrink-0">
                {customerNavigation.map((n) => (
                  <button key={n.label} onClick={() => setPage(n.p)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "9px",
                      border: page === n.p ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
                      background: page === n.p ? "rgba(255,255,255,0.12)" : "transparent",
                      color: page === n.p ? "#FFFFFF" : "#C7D5CC",
                      cursor: "pointer",
                      fontSize: "0.84rem",
                      fontWeight: page === n.p ? 700 : 500,
                      whiteSpace: "nowrap",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (page !== n.p) e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      if (page !== n.p) e.currentTarget.style.background = "transparent";
                    }}
                  >{n.label}</button>
                ))}
              </nav>
            )}

            <div style={{ flex: 1, minWidth: 8 }} />

            {/* Notification Bell (UC9.3) */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                aria-label="Thông báo"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: notifDropdownOpen ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
                  color: "white",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.2s ease",
                }}
              >
                <Icon name="bell" size={18} />
                {notifications.filter((n) => !n.isRead && (n.targetRole === "all" || n.targetRole === role)).length > 0 && (
                  <span style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    background: "#EF4444",
                    color: "white",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "0 2px 6px rgba(239,68,68,0.5)"
                  }}>
                    {notifications.filter((n) => !n.isRead && (n.targetRole === "all" || n.targetRole === role)).length}
                  </span>
                )}
              </button>

              {/* Notification Popover Drawer (UC9.3 & UC9.3.1) */}
              {notifDropdownOpen && (
                <div style={{
                  position: "absolute",
                  right: 0,
                  top: 46,
                  width: 390,
                  maxHeight: 520,
                  background: "white",
                  borderRadius: 14,
                  boxShadow: "0 20px 45px rgba(0,0,0,0.25)",
                  border: "1px solid var(--color-bone)",
                  zIndex: 200,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden"
                }}>
                  {/* Header Drawer */}
                  <div style={{
                    padding: "14px 16px",
                    background: "var(--color-forest)",
                    color: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>🔔 Trung tâm thông báo (UC9.3)</div>
                      <div style={{ fontSize: "0.72rem", color: "#C7D5CC" }}>Thông báo nghiệp vụ & điều hướng đích (UC9.3.1)</div>
                    </div>
                    <button
                      onClick={() => setNotifDropdownOpen(false)}
                      style={{ background: "transparent", border: 0, color: "white", fontSize: "1.2rem", cursor: "pointer", padding: "2px 6px" }}
                    >✕</button>
                  </div>

                  {/* Thanh filter tabs */}
                  <div style={{ display: "flex", background: "var(--color-cream)", borderBottom: "1px solid var(--color-bone)", padding: "4px 8px", gap: 4 }}>
                    {[
                      { key: "all" as const, label: "Tất cả" },
                      { key: "unread" as const, label: "Chưa đọc" },
                      { key: "order" as const, label: "Đơn thuê" },
                      { key: "system" as const, label: "Hệ thống" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setNotifFilter(tab.key)}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          border: "none",
                          borderRadius: 6,
                          fontSize: "0.72rem",
                          fontWeight: notifFilter === tab.key ? 700 : 500,
                          background: notifFilter === tab.key ? "white" : "transparent",
                          color: notifFilter === tab.key ? "var(--color-forest)" : "#6B7280",
                          boxShadow: notifFilter === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Sub-bar Đánh dấu đã đọc */}
                  <div style={{ padding: "8px 12px", background: "var(--color-parchment)", display: "flex", justifyContent: "space-between", fontSize: "0.74rem", borderBottom: "1px solid var(--color-bone)" }}>
                    <span style={{ color: "#6B7280" }}>
                      {notifications.filter((n) => n.targetRole === "all" || n.targetRole === role).length} thông báo trong hộp thư
                    </span>
                    <button
                      onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))}
                      style={{ background: "none", border: "none", color: "var(--color-forest)", fontWeight: 700, cursor: "pointer", fontSize: "0.74rem" }}
                    >
                      ✓ Đánh dấu tất cả đã đọc
                    </button>
                  </div>

                  {/* Danh sách thông báo */}
                  <div style={{ overflowY: "auto", maxHeight: 360, padding: "8px" }}>
                    {(() => {
                      const userNotifs = notifications.filter((n) => n.targetRole === "all" || n.targetRole === role);
                      const filteredNotifs = userNotifs.filter((n) => {
                        if (notifFilter === "unread") return !n.isRead;
                        if (notifFilter === "order") return n.category === "order" || n.category === "rental" || n.category === "finance";
                        if (notifFilter === "system") return n.category === "system" || n.category === "promo" || !n.category;
                        return true;
                      });

                      const handleNotifAction = (n: AppNotification) => {
                        markNotificationRead(n.id);
                        setNotifDropdownOpen(false);
                        if (!n.actionLink) return;
                        if (n.actionLink.type === "order") {
                          if (role === "customer") setPage("my-orders");
                          else if (role === "staff") setPage("staff");
                          else if (role === "admin") setPage("admin");
                        } else if (n.actionLink.type === "reviews") {
                          sessionStorage.setItem("geargo_profile_section", "reviews");
                          setPage("profile");
                        } else if (n.actionLink.type === "page") {
                          if (role === "admin") setPage("admin");
                          else setPage((n.actionLink.targetId as any) || "products");
                        }
                      };

                      if (filteredNotifs.length === 0) {
                        return (
                          <div style={{ padding: 28, textAlign: "center", color: "#9CA3AF", fontSize: "0.82rem" }}>
                            Không có thông báo nào trong mục này.
                          </div>
                        );
                      }

                      return filteredNotifs.map((n) => (
                        <div
                          key={n.id}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 10,
                            marginBottom: 8,
                            background: n.isRead ? "#F9FAFB" : "#EFF6FF",
                            border: n.isRead ? "1px solid #E5E7EB" : "1px solid #BFDBFE",
                            display: "flex",
                            flexDirection: "column",
                            gap: 6
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span style={{
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: n.type === "alert" ? "#FEE2E2" : n.type === "warning" ? "#FEF3C7" : n.type === "success" ? "#DCFCE7" : "#DBEAFE",
                                color: n.type === "alert" ? "#DC2626" : n.type === "warning" ? "#B45309" : n.type === "success" ? "#15803D" : "#1D4ED8"
                              }}>
                                {n.category === "order" ? "📦 Đơn thuê" : n.category === "rental" ? "🏕️ Kho vận" : n.category === "promo" ? "🏷️ Ưu đãi" : "⚙️ Hệ thống"}
                              </span>
                              <strong style={{ fontSize: "0.82rem", color: "var(--color-bark)" }}>{n.title}</strong>
                            </div>
                            {!n.isRead && (
                              <button
                                onClick={() => markNotificationRead(n.id)}
                                style={{ background: "none", border: "none", color: "#2563EB", fontSize: "0.7rem", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}
                              >
                                Đã đọc
                              </button>
                            )}
                          </div>

                          <p style={{ fontSize: "0.78rem", color: "#4B5563", lineHeight: 1.45, margin: 0 }}>{n.message}</p>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                            <span style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>{n.createdAt}</span>
                            {n.actionLink && (
                              <button
                                onClick={() => handleNotifAction(n)}
                                style={{
                                  background: "var(--color-forest)",
                                  color: "white",
                                  border: "none",
                                  borderRadius: 6,
                                  padding: "3px 8px",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                              >
                                <span>{n.actionLink.label || "Xem chi tiết"}</span>
                                <span>→</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Auth Actions & User Info & Logout */}
            {currentUser ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowUserProfileModal(true)}
                  title="Nhấn để xem thông tin hồ sơ & đổi mật khẩu (UC1.5, UC1.6, UC1.12)"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(255,255,255,0.08)",
                    padding: "4px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.18)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: role === "admin" ? "#D97706" : role === "staff" ? "#2563EB" : "var(--color-amber)",
                    display: "grid",
                    placeItems: "center",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    flexShrink: 0
                  }}>
                    {currentUser.name.charAt(0)}
                  </div>
                  <div style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                    <div style={{ color: "white", fontSize: "0.8rem", fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap" }}>{currentUser.name}</div>
                    <div style={{ color: "#D1D5DB", fontSize: "0.68rem", whiteSpace: "nowrap" }}>
                      {role === "admin" ? "Quản trị viên" : role === "staff" ? "Nhân viên" : "Khách hàng"} • Hồ sơ ⚙
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => state.logout()}
                  title="Đăng xuất khỏi hệ thống (UC1.3)"
                  style={{
                    padding: "6px 11px",
                    borderRadius: 9,
                    border: "1px solid rgba(239,68,68,0.4)",
                    background: "rgba(239,68,68,0.15)",
                    color: "#FCA5A5",
                    cursor: "pointer",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.25)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.15)")}
                >
                  Đăng xuất
                </button>
              </div>
            ) : isCustomerPage && !["login", "register", "forgot-password"].includes(page) ? (
              <div className="auth-actions flex items-center gap-2.5 flex-shrink-0">
                <button onClick={() => setPage("login")}
                  style={{
                    padding: "7px 13px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.84rem",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)")}
                >
                  Đăng nhập
                </button>
                <button onClick={() => setPage("register")}
                  style={{
                    padding: "7px 15px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #E07A43 0%, #D46931 100%)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 14px rgba(224, 122, 67, 0.35)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  Đăng ký
                </button>
              </div>
            ) : null}

            {/* Cart button */}
            {isCustomerPage && cart.length > 0 && (
              <button onClick={() => setPage("cart")}
                style={{
                  background: "linear-gradient(135deg, #E07A43 0%, #D46931 100%)",
                  color: "white",
                  padding: "7px 14px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.86rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  boxShadow: "0 4px 14px rgba(224, 122, 67, 0.4)"
                }}
              >
                <Icon name="cart" size={18} /> {cart.reduce((s, c) => s + c.qty, 0)}
              </button>
            )}

            {/* Role switcher */}
            <div className="role-switcher" style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "12px",
              padding: "3px",
              flexShrink: 0,
              whiteSpace: "nowrap"
            }}>
              <span className="desktop-only-label" style={{ color: "#B9C9C0", fontSize: "0.7rem", paddingLeft: "6px", fontWeight: 600, whiteSpace: "nowrap" }}>Vai trò:</span>
              {(["customer", "staff", "admin"] as Role[]).map((r) => (
                <button key={r} onClick={() => state.setRole(r)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    background: role === r ? "var(--color-amber)" : "transparent",
                    color: role === r ? "white" : "#B9C9C0",
                    transition: "all 0.2s ease"
                  }}
                >
                  {r === "customer" ? "Khách" : r === "staff" ? "Nhân viên" : "Admin"}
                </button>
              ))}
            </div>

            {/* Reset */}
            <button className="demo-reset" onClick={() => setShowResetConfirm(true)}
              style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#FCA5A5", padding: "5px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "0.74rem", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}
              title="Đặt lại dữ liệu demo"
            ><span className="icon-label" style={{ whiteSpace: "nowrap" }}><Icon name="refresh" size={14} /> Reset</span></button>
            {isCustomerPage && (
              <button className="customer-mobile-toggle" onClick={() => setMobileMenuOpen(true)} aria-label="Mở menu"
                style={{ width: 44, height: 44, border: "1px solid rgba(255,255,255,0.22)", borderRadius: 9, background: "transparent", color: "white", cursor: "pointer" }}>
                <Icon name="menu" />
              </button>
            )}
          </div>
        </header>

        <button className={`drawer-backdrop ${mobileMenuOpen ? "is-open" : ""}`} aria-label="Đóng menu" onClick={() => setMobileMenuOpen(false)} />
        <aside className={`customer-mobile-drawer ${mobileMenuOpen ? "is-open" : ""}`} aria-label="Điều hướng khách hàng">
          <div className="flex justify-between items-center" style={{ paddingBottom: 14, borderBottom: "1px solid var(--color-bone)", marginBottom: 8 }}>
            <div className="icon-label" style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--color-bark)" }}><Icon name="tent" /> GearGo</div>
            <button onClick={() => setMobileMenuOpen(false)} aria-label="Đóng menu" style={{ width: 44, border: 0, borderRadius: 8, background: "var(--color-parchment)", display: "grid", placeItems: "center" }}><Icon name="close" /></button>
          </div>
          {customerNavigation.map((item) => (
            <button key={item.label} onClick={() => navigateCustomer(item.p)}
              style={{ border: 0, borderRadius: 9, padding: "0 14px", textAlign: "left", background: page === item.p ? "var(--color-parchment)" : "transparent", color: "var(--color-bark)", fontWeight: page === item.p ? 700 : 500, cursor: "pointer" }}>
              {item.label}
            </button>
          ))}
          <div style={{ height: 1, background: "var(--color-bone)", margin: "10px 0" }} />
          <button onClick={() => navigateCustomer("cart")} style={{ border: "1px solid var(--color-bone)", borderRadius: 9, background: "white", textAlign: "left", padding: "0 14px", cursor: "pointer" }}>
            <span className="icon-label"><Icon name="cart" size={18} /> Giỏ thuê ({cart.reduce((sum, item) => sum + item.qty, 0)})</span>
          </button>
          <button onClick={() => navigateCustomer("login")} style={{ border: 0, borderRadius: 9, background: "var(--color-forest)", color: "white", padding: "0 14px", cursor: "pointer", fontWeight: 700 }}>Đăng nhập</button>
          <div style={{ marginTop: "auto", background: "var(--color-parchment)", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: "0.72rem", color: "#6B7280", marginBottom: 8 }}>Chuyển vai trò demo</div>
            <div className="flex gap-2">
              {(["customer", "staff", "admin"] as Role[]).map((item) => (
                <button key={item} onClick={() => { state.setRole(item); setMobileMenuOpen(false); }}
                  style={{ flex: 1, minHeight: 38, border: 0, borderRadius: 7, background: role === item ? "var(--color-amber)" : "white", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}>
                  {item === "customer" ? "Khách" : item === "staff" ? "NV" : "Admin"}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Role banner */}
        <div style={{ background: "var(--color-parchment)", borderBottom: "1px solid var(--color-bone)", padding: "5px 0" }}>
          <div className="demo-banner max-w-7xl mx-auto px-4 flex items-center gap-3" style={{ fontSize: "0.72rem", color: "var(--color-bark)" }}>
            <span className="icon-label"><Icon name="shield" size={14} /> <strong>Chế độ demo · {role === "customer" ? "Khách hàng" : role === "staff" ? "Nhân viên" : "Quản trị viên"}</strong></span>
            <span style={{ color: "var(--color-bone)" }}>|</span>
            <span style={{ color: "#9CA3AF" }}>Dữ liệu prototype — thanh toán và AI là mô phỏng</span>
            {newOrderId && <span style={{ color: "var(--color-forest)", fontWeight: 600 }}>✓ Đơn mới: {newOrderId}</span>}
          </div>
        </div>

        {/* Page content */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {page === "landing" && <LandingView />}
          {(page === "products" || page === "product-detail") && <ProductsView />}
          {(page === "cart" || page === "checkout" || page === "order-confirmed" || page === "my-orders" || page === "profile" || page === "ai-advisor") && <CustomerPortal />}
          {page === "login" && <LoginView />}
          {page === "register" && <RegisterView />}
          {page === "forgot-password" && <ForgotPasswordView />}
          {page === "staff" && <StaffView />}
          {page === "admin" && <AdminView />}
        </main>
        {isCustomerPage && (
          <footer className="site-footer">
            <div className="site-footer-grid">
              <div>
                <div className="icon-label" style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 800, marginBottom: 12 }}><Icon name="tent" /> GearGo</div>
                <p style={{ color: "#C7D1CB", lineHeight: 1.65, maxWidth: 360, fontSize: "0.85rem" }}>Đồ cắm trại đáng tin cậy cho mỗi chuyến đi. Đặt trực tuyến, nhận và trả trực tiếp tại cửa hàng.</p>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Cửa hàng</div>
                <div style={{ color: "#C7D1CB", fontSize: "0.82rem", lineHeight: 1.8 }}>128 Nguyễn Đình Chiểu, Quận 3<br />08:00–20:00 mỗi ngày<br />0901 234 567</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Khám phá</div>
                <div className="flex flex-col gap-2"><button onClick={() => setPage("products")}>Thuê đồ</button><button onClick={() => setPage("ai-advisor")}>Tư vấn bộ đồ</button><button onClick={() => setPage("my-orders")}>Theo dõi đơn</button></div>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Chính sách</div>
                <div className="flex flex-col gap-2"><button onClick={() => setPage("landing")}>Hướng dẫn thuê</button><button onClick={() => setPage("landing")}>Hủy và hoàn tiền</button><button onClick={() => setPage("landing")}>Cọc và bồi thường</button></div>
              </div>
            </div>
          </footer>
        )}
        {showResetConfirm && (
          <div role="dialog" aria-modal="true" aria-labelledby="reset-title" style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(23,46,35,0.6)", display: "grid", placeItems: "center", padding: "20px" }}>
            <div style={{ width: "min(100%, 420px)", background: "white", borderRadius: "16px", padding: "22px", boxShadow: "0 12px 28px rgba(23,46,35,0.2)" }}>
              <h2 id="reset-title" style={{ fontSize: "1.2rem", color: "var(--color-bark)", marginBottom: "8px" }}>Đặt lại toàn bộ dữ liệu demo?</h2>
              <p style={{ color: "#6B7280", lineHeight: 1.5, fontSize: "0.85rem", marginBottom: "18px" }}>Đơn thuê, giao dịch, phiếu nhập và thay đổi thiết bị trong trình duyệt sẽ bị xóa. Thao tác này không thể hoàn tác.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowResetConfirm(false)} style={{ flex: 1, background: "white", border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "10px", cursor: "pointer", fontWeight: 600 }}>Quay lại</button>
                <button onClick={resetDemo} style={{ flex: 1, background: "#C04A3E", color: "white", border: "none", borderRadius: "8px", padding: "10px", cursor: "pointer", fontWeight: 700 }}>Đặt lại dữ liệu</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Hồ sơ cá nhân & Đổi mật khẩu (UC1.5, UC1.6, UC1.12) */}
        {showUserProfileModal && currentUser && (
          <UserProfileModal
            currentUser={currentUser}
            role={role}
            onClose={() => setShowUserProfileModal(false)}
            onUpdateProfile={state.updateCurrentUserProfile}
            onChangePassword={state.changeCurrentUserPassword}
          />
        )}
      </div>
    </AppContext.Provider>
  );
}

// ─── Modal Xem & Sửa Thông Tin Cá Nhân / Đổi Mật Khẩu (UC1.5, UC1.6, UC1.12) ──
function UserProfileModal({
  currentUser,
  role,
  onClose,
  onUpdateProfile,
  onChangePassword,
}: {
  currentUser: {
    id?: string;
    username?: string;
    name: string;
    email: string;
    phone: string;
    role: Role;
    permissions?: string[];
    address?: string;
  };
  role: Role;
  onClose: () => void;
  onUpdateProfile: (info: { name: string; phone: string; email: string }) => ActionResult;
  onChangePassword: (oldPass: string, newPass: string) => ActionResult;
}) {
  const [tab, setTab] = useState<"info" | "password">("info");
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone);
  const [email, setEmail] = useState(currentUser.email);
  const [infoMsg, setInfoMsg] = useState("");
  const [infoError, setInfoError] = useState("");

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passError, setPassError] = useState("");

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setInfoMsg("");
    setInfoError("");
    if (!name.trim()) {
      setInfoError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!phone.trim()) {
      setInfoError("Vui lòng nhập số điện thoại.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setInfoError("Địa chỉ email không hợp lệ.");
      return;
    }
    const res = onUpdateProfile({ name: name.trim(), phone: phone.trim(), email: email.trim() });
    if (res.ok) {
      setInfoMsg("✓ Cập nhật thông tin cá nhân thành công!");
    } else {
      setInfoError(res.message);
    }
  };

  const handleChangePass = (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg("");
    setPassError("");
    if (!oldPass) {
      setPassError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (newPass.length < 6) {
      setPassError("Mật khẩu mới tối thiểu 6 ký tự.");
      return;
    }
    if (newPass !== confirmPass) {
      setPassError("Xác nhận mật khẩu mới không khớp.");
      return;
    }
    const res = onChangePassword(oldPass, newPass);
    if (res.ok) {
      setPassMsg("✓ Đổi mật khẩu thành công!");
      setOldPass("");
      setNewPass("");
      setConfirmPass("");
    } else {
      setPassError(res.message);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: role === "admin" ? "#D97706" : role === "staff" ? "#2563EB" : "var(--color-amber)",
              color: "white",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: "1rem"
            }}>
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: "1.1rem" }}>{currentUser.name}</h3>
              <p style={{ fontSize: "0.78rem", color: "#6B7280" }}>
                {role === "admin" ? "Quản trị viên hệ thống" : role === "staff" ? "Nhân viên tác nghiệp" : "Khách hàng GearGo"} {currentUser.id ? `• ${currentUser.id}` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm text-lg" aria-label="Đóng modal">×</button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-200 px-5 pt-2" style={{ gap: 8, background: "#F9FAFB" }}>
          <button
            type="button"
            onClick={() => setTab("info")}
            style={{
              padding: "8px 14px",
              fontSize: "0.84rem",
              fontWeight: 700,
              borderBottom: tab === "info" ? "2px solid var(--color-forest)" : "2px solid transparent",
              color: tab === "info" ? "var(--color-forest)" : "#6B7280",
              background: "none",
              cursor: "pointer"
            }}
          >
            Hồ sơ cá nhân (UC1.5, UC1.6)
          </button>
          <button
            type="button"
            onClick={() => setTab("password")}
            style={{
              padding: "8px 14px",
              fontSize: "0.84rem",
              fontWeight: 700,
              borderBottom: tab === "password" ? "2px solid var(--color-forest)" : "2px solid transparent",
              color: tab === "password" ? "var(--color-forest)" : "#6B7280",
              background: "none",
              cursor: "pointer"
            }}
          >
            Đổi mật khẩu (UC1.12)
          </button>
        </div>

        <div className="modal-body" style={{ padding: 20 }}>
          {tab === "info" ? (
            <form onSubmit={handleSaveInfo} className="flex flex-col gap-3.5">
              {/* Thông tin định danh cố định */}
              <div style={{ background: "#F3F4F6", borderRadius: 8, padding: "10px 14px" }}>
                <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr", fontSize: "0.8rem" }}>
                  <div>
                    <span style={{ color: "#6B7280" }}>Mã tài khoản: </span>
                    <strong style={{ fontFamily: "var(--font-mono)" }}>{currentUser.id || "N/A"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#6B7280" }}>Tên đăng nhập: </span>
                    <strong style={{ fontFamily: "var(--font-mono)" }}>@{currentUser.username || currentUser.email.split("@")[0]}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#6B7280" }}>Vai trò: </span>
                    <span className="badge" style={{ background: role === "admin" ? "#FEF3C7" : role === "staff" ? "#E0E7FF" : "#DCFCE7", color: role === "admin" ? "#B45309" : role === "staff" ? "#3730A3" : "#15803D", fontWeight: 700 }}>
                      {role === "admin" ? "Quản trị viên" : role === "staff" ? "Nhân viên" : "Khách hàng"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#6B7280" }}>Trạng thái: </span>
                    <span className="badge badge-success">Hoạt động</span>
                  </div>
                </div>

                {/* Nhóm quyền nghiệp vụ nếu là nhân viên */}
                {currentUser.permissions && currentUser.permissions.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #D1D5DB" }}>
                    <div style={{ fontSize: "0.75rem", color: "#4B5563", fontWeight: 600, marginBottom: 4 }}>
                      Nhóm quyền nghiệp vụ được gán (UC1.10):
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {currentUser.permissions.map((p) => (
                        <span key={p} style={{ background: "#EEF2FF", color: "#4338CA", fontSize: "0.7rem", fontWeight: 600, padding: "2px 7px", borderRadius: 6 }}>
                          ✓ {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Thông tin có thể cập nhật (UC1.6) */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Họ và tên</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => { setName(e.target.value); setInfoMsg(""); setInfoError(""); }}
                  className="form-input"
                />
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Số điện thoại</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setInfoMsg(""); setInfoError(""); }}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setInfoMsg(""); setInfoError(""); }}
                    className="form-input"
                  />
                </div>
              </div>

              {infoMsg && <div className="badge badge-success" style={{ padding: 8, textAlign: "center" }}>{infoMsg}</div>}
              {infoError && <div className="form-error-msg">{infoError}</div>}

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Đóng</button>
                <button type="submit" className="btn btn-primary btn-md" style={{ flex: 1 }}>Lưu thông tin</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePass} className="flex flex-col gap-3.5">
              <p style={{ fontSize: "0.8rem", color: "#6B7280", margin: 0 }}>
                Nhập mật khẩu hiện tại và tạo mật khẩu mới an toàn tối thiểu 6 ký tự.
              </p>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Mật khẩu hiện tại *</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu đang dùng"
                  value={oldPass}
                  onChange={(e) => { setOldPass(e.target.value); setPassMsg(""); setPassError(""); }}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Mật khẩu mới *</label>
                <input
                  type="password"
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  value={newPass}
                  onChange={(e) => { setNewPass(e.target.value); setPassMsg(""); setPassError(""); }}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>Xác nhận mật khẩu mới *</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPass}
                  onChange={(e) => { setConfirmPass(e.target.value); setPassMsg(""); setPassError(""); }}
                  className="form-input"
                />
              </div>

              {passMsg && <div className="badge badge-success" style={{ padding: 8, textAlign: "center" }}>{passMsg}</div>}
              {passError && <div className="form-error-msg">{passError}</div>}

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={onClose} className="btn btn-secondary btn-md" style={{ flex: 1 }}>Hủy</button>
                <button type="submit" className="btn btn-primary btn-md" style={{ flex: 1 }}>Xác nhận đổi mật khẩu</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
