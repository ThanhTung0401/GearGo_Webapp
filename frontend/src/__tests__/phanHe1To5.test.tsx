import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppContext, type AppState } from "../context/AppContext";
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
} from "../store";
import { LoginView, RegisterView, ForgotPasswordView } from "../views/AuthViews";
import ProductsView from "../views/ProductsView";
import { CartView } from "../views/customer/CartView";
import { MyOrdersView } from "../views/customer/MyOrdersView";
import { ProfileView } from "../views/customer/ProfileView";
import { OrdersTab } from "../views/staff/tabs/OrdersTab";
import ReconciliationSheet from "../views/ReconciliationSheet";

function makeMockApp(overrides: Partial<AppState> = {}): AppState {
  const ok = <T = void>(data?: T) => ({ ok: true, message: "OK", data });
  return {
    role: "customer",
    page: "landing",
    selectedProductId: null,
    categories: INITIAL_CATEGORIES,
    products: INITIAL_PRODUCTS,
    suppliers: INITIAL_SUPPLIERS,
    promotions: INITIAL_PROMOTIONS,
    promotionUsages: [],
    equipment: INITIAL_EQUIPMENT,
    orders: INITIAL_ORDERS,
    cart: [{ productId: INITIAL_PRODUCTS[0].id, quantity: 1 }],
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
      id: "KH001",
      username: "minh",
      name: "Nguyễn Văn Minh",
      email: "minh@geargo.vn",
      phone: "0909123456",
      role: "customer",
      address: "128 Nguyễn Đình Chiểu, Q.3",
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
    createOrder: vi.fn(() => "DH-NEW"),
    payOrder: vi.fn(),
    confirmReconciliation: vi.fn(() => ok()),
    finalizeOrderWithoutPayment: vi.fn(() => ok()),
    settleOrder: vi.fn(),
    cancelOrder: vi.fn(),
    getCancellationQuote: vi.fn(() => ({ fee: 0, refund: 300000 })),
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
    requestPasswordReset: vi.fn(() => ({ ok: true, message: "Đã gửi mã" })),
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
    ...overrides,
  } as unknown as AppState;
}

describe("Phân hệ 1–5 (Tài khoản, Tra cứu, Đặt thuê, Giao nhận, Thanh toán & Đối soát)", () => {
  it("Phân hệ 1 (UC1.1, UC1.2, UC1.4): hiển thị Login, Register, ForgotPassword và kiểm tra mật khẩu không khớp", () => {
    const app = makeMockApp();
    const { unmount } = render(
      <AppContext.Provider value={app}>
        <LoginView />
      </AppContext.Provider>
    );
    expect(screen.getByRole("button", { name: /Đăng nhập/i })).toBeInTheDocument();
    unmount();

    const { unmount: unmountReg, container: regContainer } = render(
      <AppContext.Provider value={app}>
        <RegisterView />
      </AppContext.Provider>
    );
    fireEvent.change(screen.getByPlaceholderText(/Nguyễn Văn A/i), { target: { value: "Trần B" } });
    fireEvent.change(screen.getByPlaceholderText(/example@email.com/i), { target: { value: "b@geargo.vn" } });
    fireEvent.change(screen.getByPlaceholderText(/09/i), { target: { value: "0901112223" } });
    const passInputs = regContainer.querySelectorAll('input[type="password"]');
    expect(passInputs.length).toBeGreaterThanOrEqual(2);
    fireEvent.change(passInputs[0], { target: { value: "123456" } });
    fireEvent.change(passInputs[1], { target: { value: "654321" } });
    fireEvent.click(screen.getByRole("button", { name: /Tạo tài khoản/i }));
    expect(screen.getAllByText(/không khớp/i).length).toBeGreaterThan(0);
    unmountReg();

    render(
      <AppContext.Provider value={app}>
        <ForgotPasswordView />
      </AppContext.Provider>
    );
    expect(screen.getAllByText(/Khôi phục mật khẩu/i).length).toBeGreaterThan(0);
  });

  it("Phân hệ 1 & 9 (UC1.5, UC1.6, UC1.12, UC9.1.2): ProfileView hiển thị hồ sơ, đổi mật khẩu và tab đánh giá có nút tải ảnh", () => {
    const app = makeMockApp();
    render(
      <AppContext.Provider value={app}>
        <ProfileView />
      </AppContext.Provider>
    );
    expect(screen.getAllByText(/Hồ sơ cá nhân/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Đổi mật khẩu/i }));
    expect(screen.getAllByText(/Đổi mật khẩu tài khoản/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Đánh giá sản phẩm/i }));
    expect(screen.getAllByText(/Đánh giá sản phẩm/i).length).toBeGreaterThan(0);
  });

  it("Phân hệ 2 (UC2.1, UC2.3): ProductsView lọc tìm kiếm sản phẩm theo từ khóa", () => {
    const app = makeMockApp();
    render(
      <AppContext.Provider value={app}>
        <ProductsView />
      </AppContext.Provider>
    );
    const searchInput = screen.getByPlaceholderText(/Tìm tên, thương hiệu/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: INITIAL_PRODUCTS[0].name } });
    expect(screen.getAllByText(INITIAL_PRODUCTS[0].name).length).toBeGreaterThan(0);
  });

  it("Phân hệ 3 (UC3.1, UC3.3): CartView và MyOrdersView hiển thị giỏ thuê và danh sách đơn", () => {
    const app = makeMockApp();
    const { unmount } = render(
      <AppContext.Provider value={app}>
        <CartView />
      </AppContext.Provider>
    );
    expect(screen.getAllByText(INITIAL_PRODUCTS[0].name).length).toBeGreaterThan(0);
    unmount();

    render(
      <AppContext.Provider value={app}>
        <MyOrdersView />
      </AppContext.Provider>
    );
    expect(screen.getByText(/Đơn thuê của tôi/i)).toBeInTheDocument();
  });

  it("Phân hệ 4 & 5 (UC4.5, UC5.4): OrdersTab và ReconciliationSheet render chuẩn trạng thái vận hành & đối soát", () => {
    const orderForReconcile = {
      ...INITIAL_ORDERS[0],
      id: "DH-REC-1",
      status: "Chờ đối soát" as const,
      surcharges: [],
    };
    const app = makeMockApp({
      role: "staff",
      orders: [orderForReconcile, ...INITIAL_ORDERS],
    });
    const { unmount } = render(
      <AppContext.Provider value={app}>
        <OrdersTab
          app={app}
          selectedOrderId={null}
          setSelectedOrderId={vi.fn()}
          openOrder={vi.fn()}
          hydrateOperationalOrder={vi.fn()}
        />
      </AppContext.Provider>
    );
    expect(screen.getByText(/DH-REC-1/)).toBeInTheDocument();
    unmount();

    render(
      <AppContext.Provider value={app}>
        <ReconciliationSheet app={app} order={orderForReconcile} onClose={vi.fn()} />
      </AppContext.Provider>
    );
    expect(screen.getAllByText(/Đối soát/i).length).toBeGreaterThan(0);
  });
});
