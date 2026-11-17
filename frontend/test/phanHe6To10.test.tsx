import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppContext, type AppState } from "../src/context/AppContext";
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
  INITIAL_POLICY_VERSIONS,
  INITIAL_PRODUCTS,
  INITIAL_PROMOTIONS,
  INITIAL_REVIEWS,
  INITIAL_STAFF_ACCOUNTS,
  INITIAL_STOCK_ADJUSTMENTS,
  INITIAL_SUPPLIERS,
} from "../src/store";
import { CategoriesTab } from "../src/views/admin/tabs/CategoriesTab";
import { ProductsTab } from "../src/views/admin/tabs/ProductsTab";
import { EquipmentTab } from "../src/views/admin/tabs/EquipmentTab";
import { SuppliersTab } from "../src/views/admin/tabs/SuppliersTab";
import { InventoryTab } from "../src/views/admin/tabs/InventoryTab";
import { PoliciesTab } from "../src/views/admin/tabs/PoliciesTab";
import { PromotionsTab } from "../src/views/admin/tabs/PromotionsTab";
import { ReviewsTab } from "../src/views/admin/tabs/ReviewsTab";
import { NotificationsTab } from "../src/views/admin/tabs/NotificationsTab";
import { ReportsTab } from "../src/views/admin/tabs/ReportsTab";
import { AuditLogTab } from "../src/views/admin/tabs/AuditLogTab";

function makeAdminMockApp(): AppState {
  const ok = <T = void>(data?: T) => ({ ok: true, message: "OK", data });
  return {
    role: "admin",
    page: "admin",
    selectedProductId: null,
    categories: INITIAL_CATEGORIES,
    products: INITIAL_PRODUCTS,
    suppliers: INITIAL_SUPPLIERS,
    promotions: INITIAL_PROMOTIONS,
    promotionUsages: [],
    equipment: INITIAL_EQUIPMENT,
    orders: INITIAL_ORDERS,
    cart: [],
    importReceipts: INITIAL_IMPORT_RECEIPTS,
    reviews: INITIAL_REVIEWS,
    maintenanceReceipts: INITIAL_MAINTENANCE_RECEIPTS,
    staffAccounts: INITIAL_STAFF_ACCOUNTS,
    stockAdjustments: INITIAL_STOCK_ADJUSTMENTS,
    customers: INITIAL_CUSTOMERS,
    notifications: INITIAL_NOTIFICATIONS,
    policies: INITIAL_POLICIES,
    policyVersions: INITIAL_POLICY_VERSIONS,
    auditLogs: INITIAL_AUDIT_LOGS,
    financialAdjustments: INITIAL_FINANCIAL_ADJUSTMENTS,
    currentUser: {
      id: "NV001",
      username: "admin",
      name: "Quản trị viên",
      email: "admin@geargo.vn",
      phone: "0900000001",
      role: "admin",
      permissions: ["*"],
    },
    pickupDate: "2026-11-20",
    returnDate: "2026-11-22",
    pickupHour: "08:00",
    returnHour: "20:00",
    newOrderId: null,
    appliedPromoCode: "",
    realApi: false,
    setRole: vi.fn(),
    setPage: vi.fn(),
    setSelectedProduct: vi.fn(),
    setPickupDate: vi.fn(),
    setReturnDate: vi.fn(),
    setPickupHour: vi.fn(),
    setReturnHour: vi.fn(),
    setAppliedPromoCode: vi.fn(),
    setNewOrderId: vi.fn(),
    setNotifications: vi.fn(),
    saveCategory: vi.fn(() => ok(INITIAL_CATEGORIES[0])),
    setCategoryStatus: vi.fn(() => ok()),
    saveProduct: vi.fn(() => ok(INITIAL_PRODUCTS[0])),
    saveEquipment: vi.fn(() => ok(INITIAL_EQUIPMENT[0])),
    saveSupplier: vi.fn(() => ok(INITIAL_SUPPLIERS[0])),
    savePromotion: vi.fn(() => ok(INITIAL_PROMOTIONS[0])),
    saveImportReceipt: vi.fn(() => ok(INITIAL_IMPORT_RECEIPTS[0])),
    cancelImportReceipt: vi.fn(() => ok()),
    evaluatePromotion: vi.fn(() => ok({ promotion: INITIAL_PROMOTIONS[0], discount: 50000 })),
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateCartQty: vi.fn(),
    createOrder: vi.fn(() => "DH-1"),
    payOrder: vi.fn(),
    confirmReconciliation: vi.fn(() => ok()),
    finalizeOrderWithoutPayment: vi.fn(() => ok()),
    settleOrder: vi.fn(),
    cancelOrder: vi.fn(),
    getCancellationQuote: vi.fn(() => ({ fee: 0, refund: 0 })),
    advanceOrderStatus: vi.fn(),
    assignEquipment: vi.fn(),
    completePreparation: vi.fn(() => ok()),
    reportEquipmentShortage: vi.fn(() => ok()),
    createHandoverRecord: vi.fn(() => ok()),
    changeAssignedEquipment: vi.fn(() => ok()),
    createReturnReceipt: vi.fn(() => ok()),
    checkOrderOverdue: vi.fn(() => ({ isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 })),
    addContactLog: vi.fn(() => ok()),
    getOverdueConflicts: vi.fn(() => []),
    reportCustomerNoShow: vi.fn(() => ok()),
    approveLostEquipment: vi.fn(() => ok()),
    saveMaintenanceReceipt: vi.fn(() => ok(INITIAL_MAINTENANCE_RECEIPTS[0])),
    completeMaintenanceReceipt: vi.fn(() => ok(INITIAL_MAINTENANCE_RECEIPTS[0])),
    retireEquipment: vi.fn(() => ok()),
    transferEquipmentProduct: vi.fn(() => ok()),
    createStockAdjustment: vi.fn(() => ok(INITIAL_STOCK_ADJUSTMENTS[0])),
    reviewStockAdjustment: vi.fn(() => ok()),
    addSurcharge: vi.fn(() => ok()),
    disputeSurcharge: vi.fn(() => ok()),
    resolveSurchargeDispute: vi.fn(() => ok()),
    addReview: vi.fn(() => ok(INITIAL_REVIEWS[0])),
    hideReview: vi.fn(() => ok()),
    unhideReview: vi.fn(() => ok()),
    respondToReview: vi.fn(() => ok()),
    login: vi.fn(() => ({ ok: true, message: "OK" })),
    register: vi.fn(() => ({ ok: true, message: "OK" })),
    logout: vi.fn(),
    requestPasswordReset: vi.fn(() => ({ ok: true, message: "OK" })),
    resetPassword: vi.fn(() => ({ ok: true, message: "OK" })),
    changePassword: vi.fn(() => ({ ok: true, message: "OK" })),
    updateCurrentUserProfile: vi.fn(() => ({ ok: true, message: "OK" })),
    saveStaffAccount: vi.fn(() => ok(INITIAL_STAFF_ACCOUNTS[0])),
    updateStaffPermissions: vi.fn(() => ok()),
    toggleStaffStatus: vi.fn(() => ok()),
    toggleCustomerStatus: vi.fn(() => ok()),
    sendNotification: vi.fn(() => ok()),
    markNotificationRead: vi.fn(),
    savePolicies: vi.fn(() => ok()),
    addFinancialAdjustment: vi.fn(() => ok(INITIAL_FINANCIAL_ADJUSTMENTS[0])),
    resolveFinancialAdjustment: vi.fn(() => ok()),
    getAvailable: vi.fn(() => 5),
    getDays: vi.fn(() => 2),
    hasValidRentalPeriod: vi.fn(() => true),
    toggleStaffLock: vi.fn(() => ok()),
    saveCustomer: vi.fn(() => ok(INITIAL_CUSTOMERS[0])),
    toggleCustomerLock: vi.fn(() => ok()),
    replyReview: vi.fn(() => ok()),
    updatePolicy: vi.fn(() => ok()),
    pausePromotion: vi.fn(() => ok()),
    resumePromotion: vi.fn(() => ok()),
    addAuditLog: vi.fn(),
    saveFinancialAdjustment: vi.fn(() => ok(INITIAL_FINANCIAL_ADJUSTMENTS[0])),
    updateMaintenanceStatus: vi.fn(() => ok()),
    changeCurrentUserPassword: vi.fn(async () => ok()),
    resetDemo: vi.fn(),
  } as unknown as AppState;
}

describe("Phân hệ 6–10 (Sản phẩm/Thiết bị, NCC/Nhập hàng, Chính sách/KM, Đánh giá/TB, Báo cáo/Nhật ký)", () => {
  it("Phân hệ 6 (UC6.1–UC6.15): CategoriesTab, ProductsTab, EquipmentTab hiển thị đúng dữ liệu", () => {
    const app = makeAdminMockApp();
    const { unmount: u1 } = render(<AppContext.Provider value={app}><CategoriesTab app={app} /></AppContext.Provider>);
    expect(screen.getAllByText(INITIAL_CATEGORIES[0].name).length).toBeGreaterThan(0);
    u1();

    const { unmount: u2 } = render(<AppContext.Provider value={app}><ProductsTab app={app} /></AppContext.Provider>);
    expect(screen.getAllByText(INITIAL_PRODUCTS[0].name).length).toBeGreaterThan(0);
    u2();

    render(<AppContext.Provider value={app}><EquipmentTab app={app} /></AppContext.Provider>);
    expect(screen.getAllByText(INITIAL_EQUIPMENT[0].id).length).toBeGreaterThan(0);
  });

  it("Phân hệ 7 (UC7.1–UC7.10): SuppliersTab và InventoryTab hiển thị NCC và phiếu nhập", () => {
    const app = makeAdminMockApp();
    const { unmount } = render(<AppContext.Provider value={app}><SuppliersTab app={app} /></AppContext.Provider>);
    expect(screen.getAllByText(INITIAL_SUPPLIERS[0].name).length).toBeGreaterThan(0);
    unmount();

    render(<AppContext.Provider value={app}><InventoryTab app={app} /></AppContext.Provider>);
    expect(screen.getAllByText(INITIAL_IMPORT_RECEIPTS[0].id).length).toBeGreaterThan(0);
  });

  it("Phân hệ 8 (UC8.1–UC8.5): PoliciesTab và PromotionsTab hiển thị chính sách và khuyến mãi", () => {
    const app = makeAdminMockApp();
    const { unmount } = render(<AppContext.Provider value={app}><PoliciesTab app={app} /></AppContext.Provider>);
    expect(screen.getAllByText(/Chính sách/i).length).toBeGreaterThan(0);
    unmount();

    render(<AppContext.Provider value={app}><PromotionsTab app={app} /></AppContext.Provider>);
    expect(screen.getAllByText(INITIAL_PROMOTIONS[0].code).length).toBeGreaterThan(0);
  });

  it("Phân hệ 9 (UC9.2, UC9.4): ReviewsTab và NotificationsTab hiển thị kiểm duyệt đánh giá và thông báo", () => {
    const app = makeAdminMockApp();
    const { unmount } = render(<AppContext.Provider value={app}><ReviewsTab app={app} /></AppContext.Provider>);
    expect(screen.getAllByText(/Kiểm duyệt/i).length).toBeGreaterThan(0);
    unmount();

    render(<AppContext.Provider value={app}><NotificationsTab app={app} /></AppContext.Provider>);
    expect(screen.getAllByText(/Thông báo/i).length).toBeGreaterThan(0);
  });

  it("Phân hệ 10 (UC10.1–UC10.4): ReportsTab và AuditLogTab hiển thị báo cáo và nhật ký hệ thống", () => {
    const app = makeAdminMockApp();
    const { unmount } = render(<AppContext.Provider value={app}><ReportsTab app={app} /></AppContext.Provider>);
    expect(screen.getAllByText(/Báo cáo/i).length).toBeGreaterThan(0);
    unmount();

    render(<AppContext.Provider value={app}><AuditLogTab app={app} /></AppContext.Provider>);
    expect(screen.getAllByText(/Audit Log|Nhật ký/i).length).toBeGreaterThan(0);
  });
});
