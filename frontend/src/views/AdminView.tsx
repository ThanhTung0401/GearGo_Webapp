import { useState } from "react";
import { useApp } from "../context/AppContext";
import { type IconName } from "../components/Icon";
import DashboardLayout from "../layouts/DashboardLayout";
import { PermissionsTab, usePermissions } from "../features/permissions";
import { DashboardTab } from "./admin/tabs/DashboardTab";
import { CategoriesTab } from "./admin/tabs/CategoriesTab";
import { ProductsTab } from "./admin/tabs/ProductsTab";
import { EquipmentTab } from "./admin/tabs/EquipmentTab";
import { InventoryTab } from "./admin/tabs/InventoryTab";
import { SuppliersTab } from "./admin/tabs/SuppliersTab";
import { PromotionsTab } from "./admin/tabs/PromotionsTab";
import { StockAdjustTab } from "./admin/tabs/StockAdjustTab";
import { StaffAccountsTab } from "./admin/tabs/StaffAccountsTab";
import { ReportsTab } from "./admin/tabs/ReportsTab";
import {
  CustomersTab,
  ReviewsTab,
  PoliciesTab,
  NotificationsTab,
  AdjustmentsTab,
  AuditLogTab,
} from "./AdminExtendedTabs";
type AdminTab =
  | "dashboard"
  | "categories"
  | "products"
  | "equipment"
  | "inventory"
  | "stock-adjust"
  | "staff"
  | "customers"
  | "reviews"
  | "suppliers"
  | "promotions"
  | "policies"
  | "notifications"
  | "adjustments"
  | "reports"
  | "audit-log"
  | "permissions";


export default function AdminView() {
  const app = useApp();
  const [tab, setTab] = useState<AdminTab>("dashboard");

  const tabs: { key: AdminTab; label: string; icon: IconName }[] = [
    { key: "dashboard", label: "Tổng quan", icon: "grid" },
    { key: "categories", label: "Danh mục", icon: "tag" },
    { key: "products", label: "Sản phẩm", icon: "tent" },
    { key: "equipment", label: "Thiết bị", icon: "tool" },
    { key: "inventory", label: "Phiếu nhập", icon: "package" },
    { key: "stock-adjust", label: "Điều chỉnh kho", icon: "settings" },
    { key: "staff", label: "Nhân viên", icon: "users" },
    { key: "customers", label: "Khách hàng", icon: "user" },
    { key: "reviews", label: "Đánh giá", icon: "sparkles" },
    { key: "suppliers", label: "Nhà cung cấp", icon: "truck" },
    { key: "promotions", label: "Khuyến mãi", icon: "tag" },
    { key: "policies", label: "Chính sách thuê", icon: "shield" },
    { key: "notifications", label: "Thông báo HT", icon: "bell" },
    { key: "adjustments", label: "Bù trừ tài chính", icon: "wallet" },
    { key: "reports", label: "Báo cáo", icon: "chart" },
    { key: "audit-log", label: "Audit Log", icon: "clipboard" },
    { key: "permissions", label: "Phân quyền", icon: "shield" },
  ];

  const currentTab = tabs.find((item) => item.key === tab);

  return (
    <DashboardLayout
      title={currentTab?.label || "Tổng quan"}
      subtitle="Không gian quản trị GearGo"
      navItems={tabs}
      activeKey={tab}
      onSelectNav={(key) => setTab(key as AdminTab)}
      brandSubtitle="Cổng quản trị viên"
    >
      {tab === "dashboard" && <DashboardTab app={app} />}
      {tab === "categories" && <CategoriesTab app={app} />}
      {tab === "products" && <ProductsTab app={app} />}
      {tab === "equipment" && <EquipmentTab app={app} />}
      {tab === "inventory" && <InventoryTab app={app} />}
      {tab === "stock-adjust" && <StockAdjustTab app={app} />}
      {tab === "staff" && <StaffAccountsTab app={app} />}
      {tab === "customers" && <CustomersTab app={app} />}
      {tab === "reviews" && <ReviewsTab app={app} />}
      {tab === "suppliers" && <SuppliersTab app={app} />}
      {tab === "promotions" && <PromotionsTab app={app} />}
      {tab === "policies" && <PoliciesTab app={app} />}
      {tab === "notifications" && <NotificationsTab app={app} />}
      {tab === "adjustments" && <AdjustmentsTab app={app} />}
      {tab === "reports" && <ReportsTab app={app} />}
      {tab === "audit-log" && <AuditLogTab app={app} />}
      {tab === "permissions" && <PermissionsTab />}
    </DashboardLayout>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
