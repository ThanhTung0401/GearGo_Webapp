import { useState, useCallback, useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { resolveRouteFromPath } from "../routes/routeMap";
import { orderApi } from "../services/api";
import { mapDonVanHanhChiTietToOrder } from "../services/mappers";
import { type IconName } from "../components/Icon";
import DashboardLayout from "../layouts/DashboardLayout";
import { PermissionsTab } from "../features/permissions";
import { useHasPerm, usePermissionsContext } from "../features/permissions/PermissionsContext";
import { Permissions } from "../constants/permissions";
import type { StaffTab } from "../modules/orders/returnMapping";
import { OverviewTab } from "../modules/reports/OverviewTab";
import { OrdersTab } from "../modules/orders/OrdersTab";
import { HandoverTab } from "../modules/orders/HandoverTab";
import { ReturnTab } from "../modules/orders/ReturnTab";
import { EquipmentTab as WarehouseMaintenanceTab } from "../modules/inventory/WarehouseMaintenanceTab";
import { StaffReportsTab } from "../modules/reports/StaffReportsTab";
import { DashboardTab } from "../modules/reports/DashboardTab";
import { CategoriesTab } from "../modules/catalog/CategoriesTab";
import { ProductsTab } from "../modules/catalog/ProductsTab";
import { EquipmentTab as EquipmentLifecycleTab } from "../modules/inventory/EquipmentLifecycleTab";
import { InventoryTab } from "../modules/inventory/InventoryTab";
import { SuppliersTab } from "../modules/inventory/SuppliersTab";
import { PromotionsTab } from "../modules/marketing/PromotionsTab";
import { StockAdjustTab } from "../modules/inventory/StockAdjustTab";
import { StaffAccountsTab } from "../modules/auth/StaffAccountsTab";
import { ReportsTab } from "../modules/reports/ReportsTab";
import { CustomersTab } from "../modules/auth/CustomersTab";
import { ReviewsTab } from "../modules/catalog/ReviewsTab";
import { PoliciesTab } from "../modules/marketing/PoliciesTab";
import { NotificationsTab } from "../modules/notifications/NotificationsTab";
import { AdjustmentsTab } from "../modules/reports/AdjustmentsTab";
import { AuditLogTab } from "../modules/reports/AuditLogTab";

type WorkspaceTabKey =
  | "overview"
  | "orders"
  | "handover"
  | "return"
  | "warehouse"
  | "ops-reports"
  | "dashboard"
  | "categories"
  | "products"
  | "equipment-lifecycle"
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

interface WorkspaceTabConfig {
  key: WorkspaceTabKey;
  label: string;
  icon: IconName;
  perm?: string;
  render: () => ReactNode;
}

/**
 * Không gian làm việc hợp nhất cho mọi vai trò nội bộ.
 * Danh sách tab hiển thị 100% dựa vào quyền từ Database qua useHasPerm().
 */
export default function WorkspaceView() {
  const app = useApp();
  const hasPerm = useHasPerm();
  const permCtx = usePermissionsContext();
  const isAdminUser = app.role === "admin" || permCtx?.roleName === "QuanTriVien";
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const selectedOrder = (selectedOrderId ? app.orders.find((o) => o.id === selectedOrderId) : null) ?? null;

  const hydrateOperationalOrder = useCallback(
    async (id: string) => {
      if (!app.realApi) return;
      const numId = Number(id);
      if (!Number.isFinite(numId)) return;
      try {
        const dto = await orderApi.layChiTietVanHanh(numId);
        app.upsertOrder?.(mapDonVanHanhChiTietToOrder(dto));
      } catch {
        // Giữ nguyên dữ liệu hiện có nếu không tải được chi tiết
      }
    },
    [app.realApi]
  );

  // Chuyển sang tab tác nghiệp tương ứng khi mở đơn từ tổng quan/báo cáo
  const openOrder = (id: string, goTab: StaffTab) => {
    setSelectedOrderId(id);
    setTab(goTab as WorkspaceTabKey);
    void hydrateOperationalOrder(id);
  };

  const allTabs: WorkspaceTabConfig[] = [
    { key: "overview", label: "Tổng quan ca", icon: "grid", perm: Permissions.DonThue_Xem, render: () => <OverviewTab app={app} openOrder={openOrder} /> },
    { key: "dashboard", label: "Tổng quan hệ thống", icon: "grid", perm: Permissions.BaoCaoTaiChinh_Xem, render: () => <DashboardTab app={app} /> },
    { key: "orders", label: "Đơn thuê", icon: "clipboard", perm: Permissions.DonThue_Xem, render: () => <OrdersTab app={app} selectedOrderId={selectedOrderId} setSelectedOrderId={setSelectedOrderId} openOrder={openOrder} hydrateOperationalOrder={hydrateOperationalOrder} /> },
    { key: "handover", label: "Chuẩn bị & Bàn giao", icon: "arrow-up", perm: Permissions.BanGiao_Xem, render: () => <HandoverTab app={app} selectedOrder={selectedOrder} setSelectedOrderId={setSelectedOrderId} hydrateOperationalOrder={hydrateOperationalOrder} /> },
    { key: "return", label: "Nhận trả & Phụ phí", icon: "arrow-down", perm: Permissions.NhanTra_Xem, render: () => <ReturnTab app={app} selectedOrder={selectedOrder} setSelectedOrderId={setSelectedOrderId} hydrateOperationalOrder={hydrateOperationalOrder} /> },
    { key: "warehouse", label: "Kho & Bảo trì", icon: "tool", perm: Permissions.Kho_Xem, render: () => <WarehouseMaintenanceTab app={app} /> },
    { key: "ops-reports", label: "Báo cáo ca & Nhật ký", icon: "chart", perm: Permissions.BaoCaoVanHanh_Xem, render: () => <StaffReportsTab app={app} openOrder={openOrder} /> },
    { key: "categories", label: "Danh mục", icon: "tag", perm: Permissions.DanhMuc_Xem, render: () => <CategoriesTab app={app} /> },
    { key: "products", label: "Sản phẩm", icon: "tent", perm: Permissions.SanPham_Xem, render: () => <ProductsTab app={app} /> },
    { key: "equipment-lifecycle", label: "Vòng đời thiết bị", icon: "tool", perm: Permissions.VongDoiThietBi_Xem, render: () => <EquipmentLifecycleTab app={app} /> },
    { key: "inventory", label: "Phiếu nhập", icon: "package", perm: Permissions.PhieuNhap_Xem, render: () => <InventoryTab app={app} /> },
    { key: "stock-adjust", label: "Điều chỉnh kho", icon: "settings", perm: Permissions.DieuChinhKho_Xem, render: () => <StockAdjustTab app={app} /> },
    { key: "suppliers", label: "Nhà cung cấp", icon: "truck", perm: Permissions.NhaCungCap_Xem, render: () => <SuppliersTab app={app} /> },
    { key: "staff", label: "Nhân viên", icon: "users", perm: Permissions.NhanVien_Xem, render: () => <StaffAccountsTab app={app} /> },
    { key: "customers", label: "Khách hàng", icon: "user", perm: Permissions.TaiKhoan_Xem, render: () => <CustomersTab app={app} /> },
    { key: "reviews", label: "Đánh giá", icon: "sparkles", perm: Permissions.DanhGia_Xem, render: () => <ReviewsTab app={app} /> },
    { key: "promotions", label: "Khuyến mãi", icon: "tag", perm: Permissions.KhuyenMai_Xem, render: () => <PromotionsTab app={app} /> },
    { key: "policies", label: "Chính sách thuê", icon: "shield", perm: Permissions.ChinhSach_Xem, render: () => <PoliciesTab app={app} /> },
    { key: "notifications", label: "Thông báo HT", icon: "bell", perm: Permissions.ThongBao_Xem, render: () => <NotificationsTab app={app} /> },
    { key: "adjustments", label: "Bù trừ tài chính", icon: "wallet", perm: Permissions.BaoCaoTaiChinh_Xem, render: () => <AdjustmentsTab app={app} /> },
    { key: "reports", label: "Báo cáo Kho & TC", icon: "chart", perm: Permissions.BaoCao_Xem, render: () => <ReportsTab app={app} /> },
    { key: "audit-log", label: "Audit Log", icon: "clipboard", perm: Permissions.NhatKy_Xem, render: () => <AuditLogTab app={app} /> },
    { key: "permissions", label: "Phân quyền", icon: "shield", perm: Permissions.PhanQuyen_Xem, render: () => <PermissionsTab /> },
  ];

  const location = useLocation();
  const navigate = useNavigate();
  const urlTab = resolveRouteFromPath(location.pathname).staffTab as WorkspaceTabKey | null;

  // Tab Phân quyền chỉ dành riêng cho Quản trị viên; mọi tab khác lọc theo quyền DB
  const visibleTabs = allTabs.filter((t) =>
    t.key === "permissions" ? isAdminUser && hasPerm(t.perm) : hasPerm(t.perm)
  );
  const firstVisibleKey = visibleTabs[0]?.key ?? null;
  const isUrlTabAllowed = Boolean(urlTab && visibleTabs.some((t) => t.key === urlTab));
  const activeTabKey: WorkspaceTabKey = isUrlTabAllowed ? urlTab! : (firstVisibleKey ?? "overview");

  // Điều hướng trực tiếp qua URL làm nguồn chân lý duy nhất (tránh ping-pong state/URL gây remount tab liên tục)
  const setTab = useCallback(
    (nextTab: WorkspaceTabKey) => {
      const nextPath = `/staff/${nextTab}`;
      if (location.pathname !== nextPath) {
        navigate(nextPath);
      }
    },
    [location.pathname, navigate]
  );

  // Tự động điều hướng về tab hợp lệ đầu tiên nếu URL gõ tay không nằm trong quyền được cấp (chỉ chạy sau khi đã tải quyền)
  useEffect(() => {
    if (!permCtx?.loaded || !firstVisibleKey) return;
    if (!isUrlTabAllowed) {
      const target = `/staff/${firstVisibleKey}`;
      if (location.pathname !== target) {
        navigate(target, { replace: true });
      }
    }
  }, [permCtx?.loaded, isUrlTabAllowed, firstVisibleKey, location.pathname, navigate]);

  const currentTab = visibleTabs.find((item) => item.key === activeTabKey) ?? visibleTabs[0];

  return (
    <DashboardLayout
      title={currentTab?.label || "Không gian làm việc"}
      subtitle="Không gian vận hành & quản trị GearGo"
      navItems={visibleTabs}
      activeKey={currentTab?.key ?? activeTabKey}
      onSelectNav={(key) => setTab(key as WorkspaceTabKey)}
      brandSubtitle="Cổng làm việc GearGo"
    >
      {currentTab ? currentTab.render() : (
        <div className="p-8 text-center text-stone-500">
          {!permCtx?.loaded
            ? "Đang tải phân quyền tài khoản..."
            : "Tài khoản chưa được cấp quyền truy cập module nào. Vui lòng liên hệ quản trị viên."}
        </div>
      )}
    </DashboardLayout>
  );
}
