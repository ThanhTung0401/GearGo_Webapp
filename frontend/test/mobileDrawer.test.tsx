import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardLayout from "../src/layouts/DashboardLayout";
import PublicLayout from "../src/layouts/PublicLayout";
import { AppContext, type AppState } from "../src/context";

// Tạo mock AppContext tối thiểu để kiểm tra hành vi mở Mobile Drawer
function createMinimalAppState(overrides: Partial<AppState> = {}): AppState {
  return {
    role: "customer",
    page: "landing",
    selectedProductId: null,
    categories: [],
    products: [],
    suppliers: [],
    promotions: [],
    promotionUsages: [],
    equipment: [],
    orders: [],
    cart: [],
    reviews: [],
    maintenanceReceipts: [],
    staffAccounts: [],
    stockAdjustments: [],
    customers: [],
    notifications: [],
    policies: {} as AppState["policies"],
    auditLogs: [],
    financialAdjustments: [],
    currentUser: null,
    pickupDate: "",
    returnDate: "",
    pickupHour: "09:00",
    returnHour: "09:00",
    newOrderId: null,
    appliedPromoCode: "",
    realApi: true,
    setRole: () => {},
    setPage: () => {},
    setSelectedProduct: () => {},
    setPickupDate: () => {},
    setReturnDate: () => {},
    setPickupHour: () => {},
    setReturnHour: () => {},
    setAppliedPromoCode: () => {},
    setNewOrderId: () => {},
    setNotifications: () => {},
    markNotificationRead: () => {},
    logout: async () => {},
    updateCurrentUserProfile: async () => ({ ok: true, message: "" }),
    changeCurrentUserPassword: async () => ({ ok: true, message: "" }),
    resetDemo: () => {},
    ...overrides,
  } as unknown as AppState;
}

describe("Mobile Drawer behavior", () => {
  it("PublicLayout opens #mobile-nav-drawer when clicking Mở menu", () => {
    const state = createMinimalAppState();
    const { container } = render(
      <AppContext.Provider value={state}>
        <PublicLayout>
          <div>Content</div>
        </PublicLayout>
      </AppContext.Provider>
    );
    expect(document.body.querySelector("#mobile-nav-drawer")).toBeNull();
    fireEvent.click(screen.getByLabelText("Mở menu"));
    expect(document.body.querySelector("#mobile-nav-drawer")).not.toBeNull();
  });

  it("DashboardLayout opens mobile drawer via Portal when clicking Mở menu quản trị", () => {
    const state = createMinimalAppState({ role: "admin", page: "admin" });
    render(
      <AppContext.Provider value={state}>
        <DashboardLayout
          title="Tổng quan"
          subtitle="Admin"
          navItems={[{ key: "dashboard", label: "Tổng quan", icon: "grid" }]}
          activeKey="dashboard"
          onSelectNav={() => {}}
        >
          <div>Content</div>
        </DashboardLayout>
      </AppContext.Provider>
    );
    expect(document.body.querySelector('[data-open="true"]')).toBeNull();
    fireEvent.click(screen.getByLabelText("Mở menu quản trị"));
    expect(document.body.querySelector('[data-open="true"]')).not.toBeNull();
  });
});
