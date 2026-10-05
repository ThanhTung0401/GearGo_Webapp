import { useState, createContext, useContext, useEffect } from "react";
import {
  Role, Order, Equipment, CartItem,
  INITIAL_PRODUCTS, INITIAL_EQUIPMENT, INITIAL_IMPORT_RECEIPTS, INITIAL_CATEGORIES,
  INITIAL_SUPPLIERS, INITIAL_PROMOTIONS, INITIAL_REVIEWS, INITIAL_ORDERS, INITIAL_MAINTENANCE_RECEIPTS, INITIAL_STAFF_ACCOUNTS, INITIAL_STOCK_ADJUSTMENTS, DEMO_ORDER,
  Product, Category, Supplier, Promotion, PromotionUsage, ActionResult, OrderStatus, AssignedEquipment, Surcharge, MoneyTransaction, ImportReceipt, Review,
  HandoverRecord, ReturnReceipt, ReturnReceiptItem, MaintenanceReceipt, StaffAccount, StockAdjustmentReceipt, StockAdjustmentLine,
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
  settleOrder: (orderId: string, succeed?: boolean) => void;
  cancelOrder: (orderId: string, reason?: string) => void;
  getCancellationQuote: (orderId: string) => { fee: number; refund: number };
  advanceOrderStatus: (orderId: string, status: OrderStatus, by?: string) => void;
  assignEquipment: (orderId: string, assigned: AssignedEquipment[]) => void;
  createHandoverRecord: (orderId: string, record: Omit<HandoverRecord, "id" | "handoverAt">) => ActionResult<HandoverRecord>;
  changeAssignedEquipment: (orderId: string, oldEquipmentId: string, newEquipmentId: string) => ActionResult;
  createReturnReceipt: (orderId: string, input: { returnItems: ReturnReceiptItem[]; staffName: string; note?: string }) => ActionResult<ReturnReceipt>;
  checkOrderOverdue: (order: Order) => { isOverdue: boolean; overdueHours: number; overdueDays: number; surcharge: number };
  saveMaintenanceReceipt: (receipt: MaintenanceReceipt) => ActionResult<MaintenanceReceipt>;
  updateMaintenanceStatus: (id: string, status: MaintenanceReceipt["status"], actualCost?: number, note?: string) => ActionResult;
  toggleStaffLock: (staffId: string, reason?: string) => ActionResult;
  createStockAdjustment: (receipt: { reason: string; createdBy: string; lines: StockAdjustmentLine[] }) => ActionResult<StockAdjustmentReceipt>;
  addSurcharge: (orderId: string, surcharge: Surcharge) => void;
  approveSurcharge: (orderId: string, surchargeId: string) => void;
  rejectSurcharge: (orderId: string, surchargeId: string) => void;
  confirmImportReceipt: (receiptId: string) => string | null;
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
  const [orders, setOrders] = useState<Order[]>(persistedState?.orders ?? INITIAL_ORDERS);
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
  const [pickupDate, setPickupDate] = useState(persistedState?.pickupDate ?? "");
  const [returnDate, setReturnDate] = useState(persistedState?.returnDate ?? "");
  const [pickupHour, setPickupHour] = useState(persistedState?.pickupHour ?? "09:00");
  const [returnHour, setReturnHour] = useState(persistedState?.returnHour ?? "09:00");
  const [newOrderId, setNewOrderId] = useState<string | null>(persistedState?.newOrderId ?? null);
  const [appliedPromoCode, setAppliedPromoCode] = useState(persistedState?.appliedPromoCode ?? "");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
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
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [categories, products, suppliers, promotions, promotionUsages, equipment, orders, cart, importReceipts, reviews, maintenanceReceipts, staffAccounts, stockAdjustments, pickupDate, returnDate, pickupHour, returnHour, newOrderId, appliedPromoCode]);

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
    if (!suppliers.some((supplier) => supplier.id === input.supplierId && supplier.cooperationStatus === "active")) return { ok: false, message: "Vui lòng chọn nhà cung cấp đang hợp tác." };
    if (input.lines.length === 0) return { ok: false, message: "Phiếu nhập cần ít nhất một dòng sản phẩm." };
    const invalidLine = input.lines.find((line) => line.quantity <= 0 || line.unitPrice < 0 || !products.some((product) => product.id === line.productId));
    if (invalidLine) return { ok: false, message: "Số lượng, đơn giá hoặc sản phẩm trong phiếu chưa hợp lệ." };
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
      if (o.id !== orderId || o.status !== "Chờ thanh toán") return o;
      const transaction: MoneyTransaction = {
        id: `GD-${Date.now()}`,
        type: "Thanh toán ban đầu",
        amount: o.rental - o.discount + o.depositTotal,
        status: succeed ? "Thành công" : "Thất bại",
        createdAt: now,
        completedAt: now,
        note: succeed ? "Thanh toán mô phỏng thành công" : "Ngân hàng từ chối giao dịch mô phỏng",
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

  const settleOrder = (orderId: string, succeed = true) => {
    const now = new Date().toLocaleString("vi-VN");
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId || o.status !== "Chờ đối soát") return o;
      const approved = o.surcharges.filter((s) => s.status === "Đã duyệt").reduce((sum, s) => sum + s.amount, 0);
      const difference = o.depositTotal - approved;
      const transaction: MoneyTransaction = {
        id: `GD-${Date.now()}`,
        type: difference >= 0 ? "Hoàn cọc" : "Thu thêm",
        amount: Math.abs(difference),
        status: succeed ? "Thành công" : "Thất bại",
        createdAt: now,
        completedAt: now,
        note: succeed ? "Đối soát mô phỏng thành công" : "Giao dịch đối soát thất bại, cần thử lại",
      };
      return succeed
        ? {
            ...o,
            status: "Hoàn tất",
            reconciledAt: now,
            transactions: [...(o.transactions ?? []), transaction],
            statusHistory: [...o.statusHistory, { status: "Hoàn tất" as OrderStatus, at: now, by: "Nhân viên" }],
          }
        : { ...o, transactions: [...(o.transactions ?? []), transaction] };
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
    const cancellationReason = reason?.trim() || "Khách yêu cầu hủy";
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId || !["Chờ thanh toán", "Đã xác nhận"].includes(o.status)) return o;
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

  // UC16: Quản lý Phiếu Bảo Trì
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

  const confirmImportReceipt = (receiptId: string): string | null => {
    const receipt = importReceipts.find((item) => item.id === receiptId);
    if (!receipt || receipt.status !== "Nháp") return "Phiếu không tồn tại hoặc đã được xử lý.";
    const supplier = suppliers.find((item) => item.id === receipt.supplierId);
    if (!supplier || supplier.cooperationStatus !== "active") return "Nhà cung cấp không tồn tại hoặc đã ngừng hợp tác.";
    if (receipt.lines.some((line) => !Number.isInteger(line.quantity) || line.quantity <= 0 || line.unitPrice < 0 || !products.some((product) => product.id === line.productId))) {
      return "Chi tiết phiếu nhập có sản phẩm, số lượng hoặc đơn giá không hợp lệ.";
    }
    const codes = receipt.lines.flatMap((line) => line.equipmentCodes.map((code) => code.trim()));
    const expected = receipt.lines.reduce((sum, line) => sum + line.quantity, 0);
    if (codes.length !== expected || codes.some((code) => !code)) return "Số mã thiết bị không khớp số lượng thực nhận.";
    if (new Set(codes).size !== codes.length || codes.some((code) => equipment.some((item) => item.id === code))) {
      return "Mã thiết bị bị trùng trong phiếu hoặc đã tồn tại trong kho.";
    }
    const now = new Date().toLocaleString("vi-VN");
    const newEquipment: Equipment[] = receipt.lines.flatMap((line) =>
      line.equipmentCodes.map((code) => ({
        id: code,
        displayCode: code,
        importReceiptLineId: line.id,
        productId: line.productId,
        originalProductId: line.productId,
        importReceiptId: receipt.id,
        importDate: new Date().toISOString().slice(0, 10),
        importPrice: line.unitPrice,
        condition: line.receivingCondition || "Mới",
        includedAccessories: [],
        note: line.note || "",
        equipmentStatus: "Sẵn sàng",
        rentCount: 0,
      }))
    );
    setEquipment((prev) => [...prev, ...newEquipment]);
    setImportReceipts((prev) => prev.map((item) =>
      item.id === receiptId ? {
        ...item,
        supplierName: supplier.name,
        lines: item.lines.map((line) => ({ ...line, productNameSnapshot: products.find((product) => product.id === line.productId)?.name ?? "" })),
        status: "Đã nhập kho",
        confirmedAt: now,
        receivedAt: new Date().toISOString().slice(0, 10),
      } : item
    ));
    return null;
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

  // UC20 & UC22: Phiếu Điều Chỉnh Kho Sau Kiểm Kê
  const createStockAdjustment = (input: { reason: string; createdBy: string; lines: StockAdjustmentLine[] }): ActionResult<StockAdjustmentReceipt> => {
    if (!input.lines.length) return { ok: false, message: "Phiếu điều chỉnh phải có ít nhất 1 dòng thiết bị." };
    const now = new Date().toLocaleString("vi-VN");
    const id = `PDCK-${Date.now()}`;
    const newReceipt: StockAdjustmentReceipt = {
      id,
      createdAt: now,
      createdBy: input.createdBy || "Quản trị viên",
      reason: input.reason || "Điều chỉnh sau kiểm kê kho",
      lines: input.lines,
    };

    // Cập nhật trạng thái các thiết bị trong kho
    setEquipment((prev) => prev.map((e) => {
      const line = input.lines.find((l) => l.equipmentId === e.id);
      if (!line) return e;
      return {
        ...e,
        equipmentStatus: line.newStatus,
        condition: line.newStatus === "Ngừng sử dụng" ? "Hỏng hoàn toàn (Sau kiểm kê)" : e.condition,
      };
    }));

    setStockAdjustments((prev) => [newReceipt, ...prev]);
    return { ok: true, data: newReceipt };
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
    settleOrder,
    cancelOrder,
    getCancellationQuote,
    advanceOrderStatus,
    assignEquipment,
    createHandoverRecord,
    changeAssignedEquipment,
    createReturnReceipt,
    checkOrderOverdue,
    saveMaintenanceReceipt,
    updateMaintenanceStatus,
    toggleStaffLock,
    createStockAdjustment,
    addSurcharge,
    approveSurcharge,
    rejectSurcharge,
    confirmImportReceipt,
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
      <div style={{ minHeight: "100vh", background: "var(--color-cream)", fontFamily: "var(--font-body)" }}>
        {/* Global Header */}
        <header style={{ background: "var(--color-forest)", borderBottom: "3px solid var(--color-amber)", position: "sticky", top: 0, zIndex: 100 }}>
          <div className="app-header-inner max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
            {/* Logo */}
            <button onClick={() => state.setRole("customer")} aria-label="Về trang chủ GearGo" style={{ display: "flex", alignItems: "center", gap: "9px", background: "none", border: "none", cursor: "pointer" }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", color: "var(--color-bark)", background: "var(--color-amber)" }}><Icon name="tent" size={22} /></span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "var(--font-display)", color: "var(--color-cream)", fontSize: "1.3rem", fontWeight: 700, lineHeight: 1 }}>GearGo</div>
                <div style={{ color: "#B9C9C0", fontSize: "0.65rem" }}>Cho thuê đồ cắm trại</div>
              </div>
            </button>

            {/* Customer nav */}
            {isCustomerPage && (
              <nav className="customer-nav flex items-center gap-1 ml-4">
                {customerNavigation.map((n) => (
                  <button key={n.label} onClick={() => setPage(n.p)}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: page === n.p ? "rgba(255,255,255,0.15)" : "transparent", color: "var(--color-cream)", cursor: "pointer", fontSize: "0.85rem", fontWeight: page === n.p ? 600 : 400 }}
                  >{n.label}</button>
                ))}
              </nav>
            )}

            <div style={{ flex: 1 }} />

            {/* Login / Register buttons */}
            {isCustomerPage && !["login", "register", "forgot-password"].includes(page) && (
              <div className="auth-actions flex items-center gap-2">
                <button onClick={() => setPage("login")}
                  style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "var(--color-cream)", cursor: "pointer", fontSize: "0.82rem" }}
                >
                  Đăng nhập
                </button>
                <button onClick={() => setPage("register")}
                  style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "var(--color-amber)", color: "white", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}
                >
                  Đăng ký
                </button>
              </div>
            )}

            {/* Cart button */}
            {isCustomerPage && cart.length > 0 && (
              <button onClick={() => setPage("cart")}
                style={{ background: "var(--color-amber)", color: "white", padding: "7px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Icon name="cart" size={17} /> {cart.reduce((s, c) => s + c.qty, 0)}
              </button>
            )}

            {/* Role switcher */}
            <div className="role-switcher" style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(0,0,0,0.3)", borderRadius: "10px", padding: "4px" }}>
              <span className="desktop-only-label" style={{ color: "var(--color-sage)", fontSize: "0.68rem", paddingLeft: "6px", fontFamily: "var(--font-mono)" }}>Vai trò:</span>
              {(["customer", "staff", "admin"] as Role[]).map((r) => (
                <button key={r} onClick={() => state.setRole(r)}
                  style={{ padding: "5px 10px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, background: role === r ? "var(--color-amber)" : "transparent", color: role === r ? "var(--color-charcoal)" : "var(--color-sage)" }}
                >
                  {r === "customer" ? "Khách" : r === "staff" ? "Nhân viên" : "Admin"}
                </button>
              ))}
            </div>

            {/* Reset */}
            <button className="demo-reset" onClick={() => setShowResetConfirm(true)}
              style={{ background: "#EF4444", color: "white", padding: "5px 10px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.72rem", fontFamily: "var(--font-mono)" }}
              title="Đặt lại dữ liệu demo"
            ><span className="icon-label"><Icon name="refresh" size={14} /> Reset</span></button>
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
        <main>
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
      </div>
    </AppContext.Provider>
  );
}
