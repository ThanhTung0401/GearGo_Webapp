import { useState } from "react";
import { useApp } from "../context/AppContext";
import { type IconName } from "../components/Icon";
import DashboardLayout from "../layouts/DashboardLayout";
import { PermissionsTab } from "../features/permissions";
import { useHasPerm } from "../features/permissions/PermissionsContext";
import { Permissions } from "../constants/permissions";
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
import { CustomersTab, ReviewsTab, PoliciesTab, NotificationsTab, AdjustmentsTab, AuditLogTab } from "./AdminExtendedTabs";
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

  const tabs: { key: AdminTab; label: string; icon: IconName; perm?: string }[] = [
    { key: "dashboard", label: "Tổng quan", icon: "grid" },
    { key: "categories", label: "Danh mục", icon: "tag", perm: Permissions.DanhMuc_Xem },
    { key: "products", label: "Sản phẩm", icon: "tent", perm: Permissions.SanPham_Xem },
    { key: "equipment", label: "Thiết bị", icon: "tool", perm: Permissions.VongDoiThietBi_Xem },
    { key: "inventory", label: "Phiếu nhập", icon: "package", perm: Permissions.PhieuNhap_Xem },
    { key: "stock-adjust", label: "Điều chỉnh kho", icon: "settings", perm: Permissions.DieuChinhKho_Xem },
    { key: "staff", label: "Nhân viên", icon: "users", perm: Permissions.NhanVien_Xem },
    { key: "customers", label: "Khách hàng", icon: "user", perm: Permissions.TaiKhoan_Xem },
    { key: "reviews", label: "Đánh giá", icon: "sparkles", perm: Permissions.DanhGia_Xem },
    { key: "suppliers", label: "Nhà cung cấp", icon: "truck", perm: Permissions.NhaCungCap_Xem },
    { key: "promotions", label: "Khuyến mãi", icon: "tag", perm: Permissions.KhuyenMai_Xem },
    { key: "policies", label: "Chính sách thuê", icon: "shield", perm: Permissions.ChinhSach_Xem },
    { key: "notifications", label: "Thông báo HT", icon: "bell", perm: Permissions.ThongBao_Xem },
    { key: "adjustments", label: "Bù trừ tài chính", icon: "wallet", perm: Permissions.BaoCaoTaiChinh_Xem },
    { key: "reports", label: "Báo cáo", icon: "chart", perm: Permissions.BaoCao_Xem },
    { key: "audit-log", label: "Audit Log", icon: "clipboard", perm: Permissions.NhatKy_Xem },
    { key: "permissions", label: "Phân quyền", icon: "shield", perm: Permissions.PhanQuyen_Xem },
  ];

  const hasPerm = useHasPerm();
  const visibleTabs = tabs.filter((t) => hasPerm(t.perm));
  const currentTab = tabs.find((item) => item.key === tab);

  return (
    <DashboardLayout
      title={currentTab?.label || "Tổng quan"}
      subtitle="Không gian quản trị GearGo"
      navItems={visibleTabs}
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
