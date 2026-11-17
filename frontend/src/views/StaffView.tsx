import { useState, useCallback } from "react";
import { useApp } from "../context/AppContext";

import { orderApi } from "../services/api";
import { mapDonVanHanhChiTietToOrder } from "../services/mappers";
import { type IconName } from "../components/Icon";
import DashboardLayout from "../layouts/DashboardLayout";
import type { StaffTab } from "./staff/returnMapping";
import { OverviewTab } from "./staff/tabs/OverviewTab";
import { OrdersTab } from "./staff/tabs/OrdersTab";
import { HandoverTab } from "./staff/tabs/HandoverTab";
import { ReturnTab } from "./staff/tabs/ReturnTab";
import { EquipmentTab } from "./staff/tabs/EquipmentTab";
import { StaffReportsTab } from "./staff/tabs/StaffReportsTab";
export default function StaffView() {
  const app = useApp();
  const [tab, setTab] = useState<StaffTab>("overview");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const tabs: { key: StaffTab; label: string; icon: IconName }[] = [
    { key: "overview", label: "Tổng quan", icon: "grid" },
    { key: "orders", label: "Đơn thuê", icon: "clipboard" },
    { key: "handover", label: "Chuẩn bị & Bàn giao", icon: "arrow-up" },
    { key: "return", label: "Nhận trả & Phụ phí", icon: "arrow-down" },
    { key: "equipment", label: "Kho & Bảo trì", icon: "tool" },
    { key: "reports", label: "Báo cáo ca & Nhật ký", icon: "chart" },
  ];

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

  const openOrder = (id: string, goTab: StaffTab) => {
    setSelectedOrderId(id);
    setTab(goTab);
    void hydrateOperationalOrder(id);
  };

  const currentTab = tabs.find((item) => item.key === tab);

  return (
    <DashboardLayout
      title={currentTab?.label || "Tổng quan ca"}
      subtitle="Cổng vận hành kho & khách hàng"
      navItems={tabs}
      activeKey={tab}
      onSelectNav={(key) => setTab(key as StaffTab)}
      brandSubtitle="Cổng nhân viên vận hành"
    >
      {tab === "overview" && <OverviewTab app={app} openOrder={openOrder} />}
      {tab === "orders" && <OrdersTab app={app} selectedOrderId={selectedOrderId} setSelectedOrderId={setSelectedOrderId} openOrder={openOrder} hydrateOperationalOrder={hydrateOperationalOrder} />}
      {tab === "handover" && <HandoverTab app={app} selectedOrder={selectedOrder} setSelectedOrderId={setSelectedOrderId} hydrateOperationalOrder={hydrateOperationalOrder} />}
      {tab === "return" && <ReturnTab app={app} selectedOrder={selectedOrder} setSelectedOrderId={setSelectedOrderId} hydrateOperationalOrder={hydrateOperationalOrder} />}
      {tab === "equipment" && <EquipmentTab app={app} />}
      {tab === "reports" && <StaffReportsTab app={app} openOrder={openOrder} />}
    </DashboardLayout>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
