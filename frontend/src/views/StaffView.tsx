import { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { isRealApiEnabled } from "../services/apiClient";
import {
  equipmentApi,
  orderApi,
  handoverApi,
  returnApi,
  surchargeApi,
  reportApi,
  auditApi,
  type ChuanBiResponseBackend,
  type PhieuBanGiaoBackend,
  type NhanTraBackend,
  type ChiTietNhanTraBackend,
  type ThietBiConNoBackend,
  type QuaHanChiTietBackend,
  type BaoCaoVanHanhBackend,
} from "../services/api";
import { mapDonVanHanhChiTietToOrder, mapPhuPhiToSurcharge, mapNhatKyToAuditLog, type AuditLogEntryWithRef } from "../services/mappers";
import type { Surcharge } from "../types";
import {
  fmt,
  statusColors,
  Order,
  ReturnReceipt,
  ReturnReceiptItem,
  MaintenanceReceipt,
  Equipment,
  ImportReceipt,
  Supplier,
} from "../store";
import Icon, { type IconName } from "../components/Icon";
import DashboardLayout from "../layouts/DashboardLayout";
import ReconciliationSheet from "./ReconciliationSheet";
import EquipmentLifecycleModal from "../components/EquipmentLifecycleModal";
import InventoryAuditModal from "../components/InventoryAuditModal";
import SupplierProfileModal from "../components/SupplierProfileModal";
import GoodsReceivingModal from "../components/GoodsReceivingModal";

/** Ánh xạ tên tình trạng nhận trả UI sang enum backend `ketLuan`. */
function mapReturnCondToBackend(cond: ReturnReceiptItem["condition"]): string {
  switch (cond) {
    case "Bình thường":
      return "Dat";
    case "Cần vệ sinh":
      return "CanVeSinh";
    case "Hỏng nhẹ":
      return "HongNhe";
    case "Hỏng nặng":
      return "HongNang";
    case "Thiếu phụ kiện":
      return "ThieuPhuKien";
    case "Mất thiết bị":
      return "MatThietBi";
    default:
      return "Dat";
  }
}

/** Ánh xạ tên tình trạng nhận trả sang loại phụ phí `loaiPhi`. */
function mapReturnCondToSurchargeType(cond: ReturnReceiptItem["condition"]): string {
  switch (cond) {
    case "Cần vệ sinh":
      return "VeSinhDacBiet";
    case "Thiếu phụ kiện":
      return "MatPhuKien";
    case "Mất thiết bị":
      return "MatThietBi";
    case "Hỏng nhẹ":
    case "Hỏng nặng":
    default:
      return "HuHong";
  }
}

type StaffTab = "overview" | "orders" | "handover" | "return" | "equipment" | "reports";

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
function OverviewTab({ app, openOrder }: { app: ReturnType<typeof useApp>; openOrder: (id: string, tab: StaffTab) => void }) {
  const preparing = app.orders.filter((o) => ["Đã xác nhận", "Đang chuẩn bị"].includes(o.status));
  const readyToHandover = app.orders.filter((o) => o.status === "Sẵn sàng nhận");
  const inRent = app.orders.filter((o) => o.status === "Đang thuê");
  const partialReturned = app.orders.filter((o) => {
    if (o.status !== "Đang thuê") return false;
    const returnedCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
    return returnedCnt > 0 && returnedCnt < o.assignedEquipment.length;
  });
  const overdueOrders = app.orders.filter((o) => app.checkOrderOverdue(o).isOverdue);
  const reconcile = app.orders.filter((o) => o.status === "Chờ đối soát");
  const maintenanceCount = app.maintenanceReceipts.filter((m) => ["Chờ xử lý", "Đang bảo dưỡng"].includes(m.status)).length;

  return (
    <div>
      <h2 className="staff-title text-xl mb-4">Tổng quan ca làm việc</h2>
      <div className="staff-kpi-grid">
        {[
          { label: "Cần chuẩn bị", value: preparing.length, color: "#B45309", bg: "#FEF3C7", icon: "settings" as IconName, tab: "handover" as StaffTab },
          { label: "Sẵn sàng giao", value: readyToHandover.length, color: "#15803D", bg: "#DCFCE7", icon: "arrow-up" as IconName, tab: "handover" as StaffTab },
          { label: "Đang thuê", value: inRent.length, color: "#1D4ED8", bg: "#DBEAFE", icon: "tent" as IconName, tab: "orders" as StaffTab },
          { label: "Trả một phần", value: partialReturned.length, color: "#C2410C", bg: "#FFF7ED", icon: "arrow-down" as IconName, tab: "return" as StaffTab },
          { label: "Quá hạn hẹn trả", value: overdueOrders.length, color: "#DC2626", bg: "#FEE2E2", icon: "alert-circle" as IconName, tab: "return" as StaffTab },
          { label: "Chờ đối soát", value: reconcile.length, color: "#374151", bg: "#F3F4F6", icon: "wallet" as IconName, tab: "return" as StaffTab },
          { label: "Cần bảo trì", value: maintenanceCount, color: "#7C3AED", bg: "#F5F3FF", icon: "tool" as IconName, tab: "equipment" as StaffTab },
        ].map((s) => (
          <div key={s.label} className="staff-kpi-card" style={{ background: s.bg }}>
            <div style={{ color: s.color }}><Icon name={s.icon} size={22} /></div>
            <div className="staff-kpi-val" style={{ color: s.color }}>{s.value}</div>
            <div className="staff-kpi-label" style={{ color: s.color }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Cảnh báo đơn quá hạn (UC13) */}
      {overdueOrders.length > 0 && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: "#B91C1C", fontWeight: 700, fontSize: "0.95rem" }}>
            <Icon name="alert-circle" size={20} />
            <span>CẢNH BÁO: Có {overdueOrders.length} đơn thuê quá hạn hẹn trả</span>
          </div>
          <p style={{ color: "#991B1B", fontSize: "0.82rem", marginBottom: 12 }}>
            Thiết bị chưa được trả đúng hạn cam kết. Nhân viên vui lòng gọi điện nhắc khách hoặc áp dụng phụ phí trễ hạn (150% giá ngày theo block 24h).
          </p>
          <div className="flex flex-col gap-2">
            {overdueOrders.map((o) => {
              const od = app.checkOrderOverdue(o);
              return (
                <div key={o.id} style={{ background: "white", borderRadius: 8, padding: "10px 14px", border: "1px solid #FCA5A5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#DC2626" }}>{o.displayCode || o.id}</span> — <strong>{o.customerName}</strong> ({o.customerPhone})
                    <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                      Hạn trả: {o.returnTime} · <strong style={{ color: "#B91C1C" }}>Trễ {od.overdueDays} ngày ({od.overdueHours} giờ)</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#DC2626", fontSize: "0.85rem" }}>
                      +{fmt(od.surcharge)} (150%)
                    </span>
                    <button onClick={() => openOrder(o.id, "return")}
                      style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                      Nhận trả / Xử lý trễ →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--color-bark)", marginBottom: "12px" }}>
        Đơn cần chuẩn bị & nhận trả hôm nay
      </h3>
      <div className="flex flex-col gap-3">
        {app.orders.filter((o) => ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận", "Đang thuê", "Chờ đối soát"].includes(o.status)).map((o) => {
          const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
          const isOverdue = app.checkOrderOverdue(o).isOverdue;
          const returnedCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
          const isPartial = o.status === "Đang thuê" && returnedCnt > 0 && returnedCnt < o.assignedEquipment.length;
          const actionTab: StaffTab = o.status === "Đang thuê" || o.status === "Chờ đối soát" ? "return" : "handover";

          return (
            <div key={o.id} onClick={() => openOrder(o.id, actionTab)}
              style={{ background: "white", borderRadius: "10px", padding: "14px 16px", border: "1px solid var(--color-bone)", display: "flex", gap: "12px", alignItems: "center", cursor: "pointer" }}
              className="hover:shadow-md transition-shadow"
            >
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--color-forest)", fontWeight: 700 }}>{o.displayCode || o.id}</span>
                  <span style={{ background: sc.bg, color: sc.text, padding: "2px 8px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 600 }}>{o.status}</span>
                  {isPartial && (
                    <span style={{ background: "#FFF7ED", color: "#C2410C", padding: "2px 8px", borderRadius: 10, fontSize: "0.7rem", fontWeight: 700 }}>
                      Đã trả {returnedCnt}/{o.assignedEquipment.length} món
                    </span>
                  )}
                  {isOverdue && (
                    <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "2px 8px", borderRadius: 10, fontSize: "0.7rem", fontWeight: 700 }}>
                      Quá hạn
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-bark)" }}>{o.customerName} · {o.customerPhone}</div>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                  {o.items.length > 0 ? o.items.map((i) => `${i.productName} ×${i.qty}`).join(", ") : `Đã gán ${o.assignedEquipment.length} thiết bị`}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Hẹn nhận: {o.pickupTime}</div>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Hẹn trả: {o.returnTime}</div>
                {o.total !== undefined && <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", marginTop: 2 }}>{fmt(o.rental - o.discount + o.depositTotal)}</div>}
              </div>
              <span style={{ color: "var(--color-forest)", fontSize: "1.1rem" }}>→</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Orders Tab (UC4.5: Bộ lọc vận hành & Tra cứu hồ sơ đơn) ────────────────────────────────────
function OrdersTab({ app, openOrder, hydrateOperationalOrder }: { app: ReturnType<typeof useApp>; selectedOrderId: string | null; setSelectedOrderId: (id: string | null) => void; openOrder: (id: string, tab: StaffTab) => void; hydrateOperationalOrder: (id: string) => Promise<void> }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tất cả");
  const [quickFilter, setQuickFilter] = useState<"all" | "delivery_today" | "pickup_today" | "overdue" | "partial">("all");
  const [viewingDetailOrderId, setViewingDetailOrderId] = useState<string | null>(null);
  const [noShowTarget, setNoShowTarget] = useState<Order | null>(null);
  const [noShowNote, setNoShowNote] = useState("Đã gọi điện nhắc 2 lần nhưng không nghe máy / Khách không đến quầy");
  const [noShowSubmitting, setNoShowSubmitting] = useState(false);
  const [noShowError, setNoShowError] = useState("");
  const statuses = ["Tất cả", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận", "Đang thuê", "Trả một phần", "Quá hạn", "Chờ đối soát", "Hoàn tất"];

  const viewingDetailOrder = viewingDetailOrderId ? app.orders.find((o) => o.id === viewingDetailOrderId) ?? null : null;

  // Đếm nhanh số lượng theo nghiệp vụ vận hành (UC4.5)
  const deliveryTodayCount = app.orders.filter((o) => ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status)).length;
  const pickupTodayCount = app.orders.filter((o) => ["Đang thuê", "Quá hạn"].includes(o.status)).length;
  const overdueCount = app.orders.filter((o) => app.checkOrderOverdue(o).isOverdue).length;
  const partialCount = app.orders.filter((o) => {
    if (o.status !== "Đang thuê") return false;
    const returnedCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
    return returnedCnt > 0 && returnedCnt < o.assignedEquipment.length;
  }).length;

  const handleOpenDetail = (order: Order) => {
    setViewingDetailOrderId(order.id);
    void hydrateOperationalOrder(order.id);
  };

  const handleSubmitNoShow = async () => {
    if (!noShowTarget || !noShowNote.trim()) return;
    if (app.realApi) {
      setNoShowSubmitting(true);
      setNoShowError("");
      try {
        await orderApi.ghiNhanKhongDenNhan(Number(noShowTarget.backendId ?? noShowTarget.id), {
          ghiChu: noShowNote.trim(),
          xuLyHuy: false,
        });
        await hydrateOperationalOrder(noShowTarget.id);
        await app.refreshOrders?.();
        setNoShowTarget(null);
      } catch (err) {
        setNoShowError(err instanceof Error ? err.message : "Không thể ghi nhận khách vắng mặt.");
      } finally {
        setNoShowSubmitting(false);
      }
      return;
    }

    const res = app.reportCustomerNoShow(noShowTarget.id, noShowNote.trim(), app.currentUser?.name || "Nhân viên kho");
    if (res.ok) {
      setNoShowTarget(null);
    } else {
      setNoShowError(res.message);
    }
  };

  const filtered = app.orders.filter((o) => {
    const isOverdue = app.checkOrderOverdue(o).isOverdue;
    const returnedCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
    const isPartial = o.status === "Đang thuê" && returnedCnt > 0 && returnedCnt < o.assignedEquipment.length;

    let matchQuick = true;
    if (quickFilter === "delivery_today") matchQuick = ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status);
    if (quickFilter === "pickup_today") matchQuick = ["Đang thuê", "Quá hạn"].includes(o.status);
    if (quickFilter === "overdue") matchQuick = isOverdue;
    if (quickFilter === "partial") matchQuick = isPartial;

    let matchStatus = filter === "Tất cả" || o.status === filter;
    if (filter === "Quá hạn") matchStatus = isOverdue;
    if (filter === "Trả một phần") matchStatus = isPartial;

    const q = search.toLowerCase();
    const matchSearch =
      (o.displayCode || o.id).toLowerCase().includes(q) ||
      o.id.includes(search) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(search);
    return matchQuick && matchStatus && matchSearch;
  });

  return (
    <div>
      {/* UC4.5: Thanh lọc nhanh vận hành trong ca */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)" }}>Bộ lọc ca trực:</span>
        {[
          { key: "all", label: `Tất cả (${app.orders.length})` },
          { key: "delivery_today", label: `🚚 Cần giao hôm nay (${deliveryTodayCount})` },
          { key: "pickup_today", label: `📦 Cần thu hôm nay (${pickupTodayCount})` },
          { key: "overdue", label: `⚠️ Quá hạn (${overdueCount})` },
          { key: "partial", label: `🔄 Trả 1 phần (${partialCount})` },
        ].map((btn) => (
          <button
            key={btn.key}
            type="button"
            onClick={() => { setQuickFilter(btn.key as typeof quickFilter); setFilter("Tất cả"); }}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              border: quickFilter === btn.key ? "1px solid var(--color-forest)" : "1px solid var(--color-bone)",
              background: quickFilter === btn.key ? "var(--color-forest)" : "white",
              color: quickFilter === btn.key ? "white" : "var(--color-bark)",
              fontWeight: quickFilter === btn.key ? 700 : 500,
              fontSize: "0.78rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          placeholder="🔍 Tìm mã đơn, tên khách, SĐT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input flex-1 min-w-[220px]"
        />
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setQuickFilter("all"); }}
          aria-label="Lọc trạng thái đơn"
          className="form-select max-w-[200px]"
        >
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="staff-table-wrap">
        <table className="staff-table">
          <thead>
            <tr>
              {["Mã đơn", "Khách hàng", "Sản phẩm", "Lịch thuê", "Tổng thu", "Trạng thái", "Thao tác"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => {
              const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
              const isOverdue = app.checkOrderOverdue(o).isOverdue;
              const returnedCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
              const isPartial = o.status === "Đang thuê" && returnedCnt > 0 && returnedCnt < o.assignedEquipment.length;
              const canReportNoShow = ["Sẵn sàng nhận", "Đang chuẩn bị", "Đã xác nhận"].includes(o.status);

              return (
                <tr key={o.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                  <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--color-forest)", fontWeight: 700 }}>
                    <button onClick={() => handleOpenDetail(o)} style={{ background: "none", border: "none", padding: 0, color: "var(--color-forest)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
                      {o.displayCode || o.id}
                    </button>
                    {o.noShowReported && (
                      <div style={{ fontSize: "0.65rem", color: "#DC2626", fontWeight: 700, marginTop: 2 }}>
                        ⚠️ Khách vắng mặt
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{o.customerName}</div>
                    <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>{o.customerPhone}</div>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "0.8rem", color: "#6B7280" }}>
                    {o.items.length > 0 ? o.items.map((it) => `${it.productName.split("–")[0].trim()} ×${it.qty}`).join(", ") : `${o.assignedEquipment.length} thiết bị đã gán`}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "0.75rem", color: "#6B7280" }}>
                    <div>📤 {o.pickupTime}</div>
                    <div style={{ color: isOverdue ? "#DC2626" : "#6B7280", fontWeight: isOverdue ? 700 : 400 }}>📥 {o.returnTime}</div>
                  </td>
                  <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700 }}>
                    {fmt(o.rental - o.discount + o.depositTotal)}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <div className="flex flex-col gap-1 items-start">
                      <span style={{ background: sc.bg, color: sc.text, padding: "2px 8px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 600 }}>{o.status}</span>
                      {isPartial && <span style={{ background: "#FFF7ED", color: "#C2410C", padding: "2px 6px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700 }}>Trả {returnedCnt}/{o.assignedEquipment.length} món</span>}
                      {isOverdue && <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "2px 6px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700 }}>Quá hạn</span>}
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        onClick={() => openOrder(o.id, o.status === "Đang thuê" || o.status === "Chờ đối soát" ? "return" : "handover")}
                        className="btn btn-primary btn-sm"
                      >
                        {o.status === "Đang thuê" ? "Nhận trả" : o.status === "Chờ đối soát" ? "Đối soát" : o.status === "Sẵn sàng nhận" ? "Bàn giao" : "Chuẩn bị"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDetail(o)}
                        style={{ background: "#F3F4F6", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "5px 8px", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}
                      >
                        Hồ sơ
                      </button>

                      {canReportNoShow && !o.noShowReported && (
                        <button
                          type="button"
                          onClick={() => {
                            setNoShowTarget(o);
                            setNoShowError("");
                            setNoShowNote("Đã gọi điện nhắc 2 lần nhưng không nghe máy / Khách không đến quầy");
                          }}
                          style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 6, padding: "5px 6px", fontSize: "0.68rem", cursor: "pointer", fontWeight: 700 }}
                          title="Ghi nhận khách không đến nhận đồ theo UC4.5 Dòng 836"
                        >
                          No-show
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* UC4.5 Bước 3: Modal Xem Toàn Diện Hồ Sơ Vận Hành Đơn Hàng */}
      {viewingDetailOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 750, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div className="flex justify-between items-start mb-4 border-b border-bone pb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "var(--color-parchment)", color: "var(--color-moss)", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  HỒ SƠ VẬN HÀNH ĐƠN HÀNG (UC4.5)
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Chi tiết đơn #{viewingDetailOrder.displayCode || viewingDetailOrder.id} — {viewingDetailOrder.customerName}
                </h3>
                <div style={{ fontSize: "0.82rem", color: "#6B7280" }}>
                  SĐT: <strong>{viewingDetailOrder.customerPhone}</strong> · Trạng thái: <strong>{viewingDetailOrder.status}</strong>
                </div>
              </div>
              <button onClick={() => setViewingDetailOrderId(null)} style={{ border: "none", background: "none", fontSize: "1.3rem", cursor: "pointer" }}>✕</button>
            </div>

            {/* Thông tin lịch trình & tài chính */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-parchment rounded-lg mb-4 text-xs">
              <div>
                <span className="text-gray-500 block">📤 Hẹn nhận:</span>
                <strong>{viewingDetailOrder.pickupTime}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">📥 Hẹn trả:</span>
                <strong>{viewingDetailOrder.returnTime}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">💰 Tiền thuê & cọc:</span>
                <strong className="text-forest font-mono">{fmt(viewingDetailOrder.rental - viewingDetailOrder.discount + viewingDetailOrder.depositTotal)}</strong>
              </div>
              <div>
                <span className="text-gray-500 block">📦 Tổng thiết bị:</span>
                <strong>{viewingDetailOrder.items.reduce((sum, it) => sum + it.qty, 0)} món</strong>
              </div>
            </div>

            {/* Cảnh báo No-Show hoặc Thiếu đồ nếu có */}
            {viewingDetailOrder.noShowReported && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", marginBottom: 14, color: "#991B1B", fontSize: "0.8rem" }}>
                <strong>⚠️ BIÊN BẢN KHÁCH VẮNG MẶT (No-Show):</strong> {viewingDetailOrder.noShowReported.note}
                <div style={{ fontSize: "0.72rem", color: "#B91C1C" }}>Ghi nhận lúc: {viewingDetailOrder.noShowReported.reportedAt} bởi {viewingDetailOrder.noShowReported.staffName}</div>
              </div>
            )}

            {/* Danh sách thiết bị phân công & Biên bản bàn giao */}
            <div className="mb-4">
              <h4 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-bark)", marginBottom: 6 }}>
                1. Thiết bị phân công ({viewingDetailOrder.assignedEquipment.length} serial):
              </h4>
              <div className="flex flex-col gap-1">
                {viewingDetailOrder.assignedEquipment.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Chưa phân công serial (Đơn đang chờ soạn hàng).</p>
                ) : (
                  viewingDetailOrder.assignedEquipment.map((ae) => (
                    <div key={ae.equipmentId} className="flex justify-between items-center bg-gray-50 p-2 rounded text-xs border border-bone">
                      <div>
                        <strong className="font-mono text-forest">{ae.equipmentDisplayCode || ae.equipmentId}</strong> {ae.assignedAt ? `(Gán lúc: ${ae.assignedAt})` : ""}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${ae.returnedAt ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                        {ae.returnedAt ? `✓ Đã trả (${ae.returnCondition || "Tốt"})` : "Đang thuê"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* BBBG nếu có */}
            {viewingDetailOrder.handoverRecord && (
              <div className="mb-4 bg-green-50 border border-green-200 p-3 rounded-lg text-xs">
                <div className="flex justify-between items-center mb-1">
                  <strong className="text-green-800 font-mono">{viewingDetailOrder.handoverRecord.id}</strong>
                  <span className="text-green-700">Đã bàn giao: {viewingDetailOrder.handoverRecord.handoverAt}</span>
                </div>
                <div className="text-gray-600">
                  Người nhận: <strong>{viewingDetailOrder.handoverRecord.receiverName || viewingDetailOrder.customerName}</strong> ({viewingDetailOrder.handoverRecord.receiverPhone || viewingDetailOrder.customerPhone}) · CCCD: {viewingDetailOrder.handoverRecord.receiverIdCard || "Đã đối chiếu"}
                </div>
              </div>
            )}

            {/* Lịch sử các đợt nhận trả PNT */}
            {(viewingDetailOrder.returnReceipts?.length || 0) > 0 && (
              <div className="mb-4">
                <h4 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-bark)", marginBottom: 6 }}>
                  2. Lịch sử nhận trả ({viewingDetailOrder.returnReceipts?.length} phiếu):
                </h4>
                <div className="flex flex-col gap-1">
                  {viewingDetailOrder.returnReceipts?.map((rc) => (
                    <div key={rc.id} className="flex justify-between items-center bg-amber-50 border border-amber-200 p-2 rounded text-xs">
                      <div>
                        <strong className="font-mono text-amber-900">{rc.id}</strong> — Đợt {rc.returnRound} ({rc.items.length} món)
                        <div className="text-gray-500 text-[11px]">{rc.returnedAt} · NV: {rc.staffName}</div>
                      </div>
                      <span className="font-bold text-amber-800">{rc.isFinalReturn ? "Trả đợt cuối" : "Trả một phần"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lịch sử trạng thái */}
            <div className="mb-4">
              <h4 style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-bark)", marginBottom: 6 }}>
                3. Nhật ký chuyển trạng thái (Audit timeline):
              </h4>
              <div className="flex flex-col gap-1 text-xs text-gray-600">
                {viewingDetailOrder.statusHistory.map((sh, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-gray-400 font-mono">{sh.at}</span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 font-bold">{sh.status}</span>
                    <span className="text-gray-500">bởi {sh.by}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-bone pt-3">
              <button
                onClick={() => {
                  const targetTab: StaffTab = viewingDetailOrder.status === "Đang thuê" || viewingDetailOrder.status === "Chờ đối soát" ? "return" : "handover";
                  openOrder(viewingDetailOrder.id, targetTab);
                  setViewingDetailOrderId(null);
                }}
                className="btn btn-primary btn-sm"
              >
                Chuyển đến màn hình thao tác →
              </button>
              <button onClick={() => setViewingDetailOrderId(null)} className="btn btn-secondary btn-sm">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ghi nhận khách không đến nhận đồ (UC4.5 No-Show) */}
      {noShowTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 460, width: "100%", padding: 22 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "#B91C1C", marginBottom: 8 }}>
              Ghi nhận khách không đến nhận (No-Show)
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#4B5563", marginBottom: 12 }}>
              Đơn <strong>#{noShowTarget.displayCode || noShowTarget.id}</strong> — {noShowTarget.customerName} ({noShowTarget.customerPhone})
            </p>
            <textarea
              rows={3}
              value={noShowNote}
              onChange={(e) => setNoShowNote(e.target.value)}
              placeholder="Ghi chú số lần gọi nhắc / lý do khách không đến..."
              style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: 10, fontSize: "0.84rem", marginBottom: 10 }}
            />
            {noShowError && (
              <div role="alert" style={{ fontSize: "0.78rem", color: "#B91C1C", background: "#FEF2F2", padding: "6px 10px", borderRadius: 6, marginBottom: 10 }}>
                {noShowError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setNoShowTarget(null)} className="btn btn-secondary btn-sm">
                Hủy
              </button>
              <button
                type="button"
                disabled={noShowSubmitting || !noShowNote.trim()}
                onClick={() => void handleSubmitNoShow()}
                className="btn btn-danger btn-sm"
              >
                {noShowSubmitting ? "Đang ghi nhận..." : "Xác nhận ghi nhận No-Show"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Handover Tab (UC4.1 Chuẩn bị kho & Phân công serial | UC4.2 Tiếp khách & Bàn giao tại quầy) ──────
function HandoverTab({ app, selectedOrder, setSelectedOrderId, hydrateOperationalOrder }: { app: ReturnType<typeof useApp>; selectedOrder: Order | null; setSelectedOrderId: (id: string | null) => void; hydrateOperationalOrder: (id: string) => Promise<void> }) {
  const [subTab, setSubTab] = useState<"prep" | "handover">("prep");
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [prepState, setPrepState] = useState<ChuanBiResponseBackend | null>(null);
  const [draftBbbg, setDraftBbbg] = useState<PhieuBanGiaoBackend | null>(null);
  const [handoverBusy, setHandoverBusy] = useState(false);
  const [handoverError, setHandoverError] = useState("");
  const [handoverSuccess, setHandoverSuccess] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    "Túi đựng & bao bọc bảo vệ": true,
    "Đầy đủ phụ kiện tiêu chuẩn (cọc, dây, cáp sạc...)": true,
    "Thiết bị hoạt động tốt & sạch sẽ lúc giao": true,
    "Khách hàng đã kiểm tra thực tế tại quầy": true,
  });
  const [handoverNote, setHandoverNote] = useState("");
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [changingEquip, setChangingEquip] = useState<{ productId: string; oldId: string } | null>(null);

  // State UC4.2: Đối chiếu người nhận & Quét QR
  const [qrCodeSearch, setQrCodeSearch] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverIdCard, setReceiverIdCard] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [earlyPickupAccepted, setEarlyPickupAccepted] = useState(true);
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=200&auto=format&fit=crop&q=60"
  ]);

  // State UC4.1: Báo thiếu thiết bị (Dòng 5.1)
  const [showShortageModal, setShowShortageModal] = useState(false);
  const [shortageNote, setShortageNote] = useState("");

  const eligiblePrep = app.orders.filter((o) => ["Đã xác nhận", "Đang chuẩn bị"].includes(o.status));
  const eligibleHandover = app.orders.filter((o) => o.status === "Sẵn sàng nhận");
  const order = selectedOrder;

  const syncFromPrepResponse = (prep: ChuanBiResponseBackend) => {
    setPrepState(prep);
    const nextAssignments: Record<string, string[]> = {};
    prep.danhSachDong.forEach((dong) => {
      if (dong.danhSachPhanCong.length > 0) {
        nextAssignments[String(dong.maSanPham)] = dong.danhSachPhanCong.map((pc) => String(pc.maThietBi));
      }
    });
    setAssignments(nextAssignments);
  };

  // Đồng bộ trạng thái đơn và khôi phục serial đã phân công (cùng tình trạng chuẩn bị backend)
  useEffect(() => {
    setHandoverError("");
    setHandoverSuccess("");
    if (!selectedOrder) {
      setPrepState(null);
      setDraftBbbg(null);
      return;
    }

    if (selectedOrder.status === "Sẵn sàng nhận") {
      setSubTab("handover");
    } else if (["Đã xác nhận", "Đang chuẩn bị"].includes(selectedOrder.status)) {
      setSubTab("prep");
    }

    // Khôi phục serial đã lưu từ order state nếu có
    const initialAssigned: Record<string, string[]> = {};
    selectedOrder.items.forEach((item) => {
      const found = selectedOrder.assignedEquipment
        .filter((ae) => ae.productId === item.productId)
        .map((ae) => ae.equipmentId);
      if (found.length > 0) {
        initialAssigned[item.productId] = found;
      }
    });
    setAssignments(initialAssigned);

    setReceiverName(selectedOrder.customerName);
    setReceiverPhone(selectedOrder.customerPhone);
    setReceiverIdCard((selectedOrder.displayCode || selectedOrder.id).replace(/\D/g, "").slice(-4).padStart(12, "07920100"));

    if (app.realApi) {
      const donId = Number(selectedOrder.backendId ?? selectedOrder.id);
      if (Number.isFinite(donId)) {
        void hydrateOperationalOrder(selectedOrder.id);
        void handoverApi
          .layTinhTrangChuanBi(donId)
          .then(syncFromPrepResponse)
          .catch(() => {});
        if (selectedOrder.status === "Sẵn sàng nhận") {
          void handoverApi
            .taoHoacLayNhap(donId)
            .then(setDraftBbbg)
            .catch(() => {});
        } else {
          setDraftBbbg(null);
        }
      }
    }
  }, [selectedOrder?.id, selectedOrder?.status, app.realApi]);

  const pickEquipment = (productId: string, idx: number, equipId: string) => {
    setAssignments((prev) => {
      const arr = [...(prev[productId] || [])];
      arr[idx] = equipId;
      return { ...prev, [productId]: arr };
    });
  };

  const handleStartPreparation = async () => {
    if (!order) return;
    if (!app.realApi) {
      app.advanceOrderStatus(order.id, "Đang chuẩn bị", app.currentUser?.name || "Nhân viên kho");
      return;
    }
    setHandoverBusy(true);
    setHandoverError("");
    try {
      const donId = Number(order.backendId ?? order.id);
      const prep = await handoverApi.batDauChuanBi(donId);
      syncFromPrepResponse(prep);
      await hydrateOperationalOrder(order.id);
    } catch (err) {
      setHandoverError(err instanceof Error ? err.message : "Không thể chuyển sang trạng thái Đang chuẩn bị.");
    } finally {
      setHandoverBusy(false);
    }
  };

  const handleSwapEquipment = async (productId: string, oldId: string, newId: string) => {
    if (!order) return;
    if (app.realApi && prepState) {
      const donId = Number(order.backendId ?? order.id);
      const dong = prepState.danhSachDong.find((d) => String(d.maSanPham) === productId);
      const oldPc = dong?.danhSachPhanCong.find((pc) => String(pc.maThietBi) === oldId);
      if (oldPc) {
        setHandoverBusy(true);
        setHandoverError("");
        try {
          const updatedPrep = await handoverApi.thayTheThietBi(donId, oldPc.maPhanCong, Number(newId), "Đổi mã thiết bị tại khâu chuẩn bị");
          syncFromPrepResponse(updatedPrep);
          await hydrateOperationalOrder(order.id);
          void app.refreshEquipment?.();
          setChangingEquip(null);
          return;
        } catch (err) {
          setHandoverError(err instanceof Error ? err.message : "Không thể thay thế mã thiết bị.");
          return;
        } finally {
          setHandoverBusy(false);
        }
      }
    }

    const res = app.changeAssignedEquipment(order.id, oldId, newId);
    if (!res.ok) {
      setHandoverError(res.message);
      return;
    }
    setAssignments((prev) => {
      const arr = (prev[productId] || []).map((id) => (id === oldId ? newId : id));
      return { ...prev, [productId]: arr };
    });
    setChangingEquip(null);
  };

  // UC4.1: Hoàn tất chuẩn bị kho & Lưu vĩnh viễn phân công serial
  const handleCompletePreparation = async () => {
    if (!order) return;
    setHandoverError("");
    setHandoverSuccess("");

    const itemsArr: { productId: string; equipmentId: string }[] = [];
    for (const item of order.items) {
      const assignedIds = assignments[item.productId] || [];
      if (assignedIds.filter(Boolean).length < item.qty) {
        setHandoverError(`Vui lòng chọn đủ ${item.qty} mã thiết bị cho "${item.productName}"!`);
        return;
      }
      assignedIds.forEach((eid) => {
        if (eid) itemsArr.push({ productId: item.productId, equipmentId: eid });
      });
    }

    if (app.realApi) {
      setHandoverBusy(true);
      try {
        const donId = Number(order.backendId ?? order.id);
        let latestPrep = prepState;
        if (order.status === "Đã xác nhận") {
          latestPrep = await handoverApi.batDauChuanBi(donId);
        } else if (!latestPrep) {
          latestPrep = await handoverApi.layTinhTrangChuanBi(donId);
        }

        // Gửi gán / thay thế từng dòng chi tiết đơn cho backend
        for (const dong of latestPrep.danhSachDong) {
          const desiredIds = (assignments[String(dong.maSanPham)] || []).map((x) => Number(x)).filter(Boolean);
          const existingIds = dong.danhSachPhanCong.map((pc) => pc.maThietBi);
          const remainingToAssign = desiredIds.filter((id) => !existingIds.includes(id));

          // Thay thế những slot đã gán cũ mà người dùng đổi lựa chọn
          for (let i = 0; i < dong.danhSachPhanCong.length; i++) {
            const pc = dong.danhSachPhanCong[i];
            if (!desiredIds.includes(pc.maThietBi) && remainingToAssign.length > 0) {
              const replacementId = remainingToAssign.shift()!;
              latestPrep = await handoverApi.thayTheThietBi(donId, pc.maPhanCong, replacementId, "Cập nhật phân công thiết bị");
            }
          }

          if (remainingToAssign.length > 0) {
            latestPrep = await handoverApi.ganThietBi(donId, dong.maChiTietDon, remainingToAssign);
          }
        }

        const readyPrep = await handoverApi.xacNhanSanSang(donId, handoverNote.trim() || undefined);
        syncFromPrepResponse(readyPrep);
        await hydrateOperationalOrder(order.id);
        await app.refreshOrders?.();
        void app.refreshEquipment?.();
        setHandoverSuccess(`Đã hoàn tất chuẩn bị và chuyển đơn ${order.displayCode || order.id} sang "Sẵn sàng nhận"!`);
        setSubTab("handover");
      } catch (err) {
        setHandoverError(err instanceof Error ? err.message : "Không thể hoàn tất chuẩn bị đơn hàng.");
      } finally {
        setHandoverBusy(false);
      }
      return;
    }

    const res = app.completePreparation(order.id, itemsArr, app.currentUser?.name || "Nhân viên kho");
    if (res.ok) {
      setHandoverSuccess(`Đã hoàn tất chuẩn bị và chuyển đơn ${order.id} sang "Sẵn sàng nhận"!`);
      setSubTab("handover");
    } else {
      setHandoverError(res.message);
    }
  };

  // UC4.1: Báo thiếu thiết bị
  const handleReportShortage = () => {
    if (!order || !shortageNote.trim()) {
      setHandoverError("Vui lòng nhập lý do thiếu thiết bị để báo Quản trị viên!");
      return;
    }
    const res = app.reportEquipmentShortage(order.id, shortageNote, app.currentUser?.name || "Nhân viên kho");
    if (res.ok) {
      setHandoverSuccess(`Đã ghi nhận cảnh báo thiếu hàng cho đơn ${order.displayCode || order.id}.`);
      setShowShortageModal(false);
      setShortageNote("");
    } else {
      setHandoverError(res.message);
    }
  };

  // UC4.2: Chốt Bàn giao tại quầy & Ký BBBG
  const handleCompleteHandover = async () => {
    if (!order) return;
    if (!receiverName.trim() || !receiverPhone.trim()) {
      setHandoverError("Vui lòng nhập đầy đủ họ tên và số điện thoại người nhận thực tế tại quầy!");
      return;
    }

    if (app.realApi) {
      setHandoverBusy(true);
      setHandoverError("");
      try {
        const donId = Number(order.backendId ?? order.id);
        const draft = draftBbbg ?? (await handoverApi.taoHoacLayNhap(donId));
        const latestPrep = prepState ?? (await handoverApi.layTinhTrangChuanBi(donId));
        const allPhanCongs = latestPrep.danhSachDong.flatMap((d) => d.danhSachPhanCong);

        await handoverApi.capNhatNhap(draft.maPhieuBanGiao, {
          tenNguoiNhanThucTe: receiverName.trim(),
          thoiDiemKhachXacNhan: new Date().toISOString(),
          bangChungXacNhan: JSON.stringify(evidencePhotos),
          ghiChu: handoverNote || "Thiết bị và phụ kiện bàn giao đầy đủ, đúng hiện trạng cam kết.",
          chiTiet: allPhanCongs.map((pc) => ({
            maPhanCong: pc.maPhanCong,
            tinhTrangTruocThue: "Tốt (Đã kiểm tại quầy)",
            phuKienThucGiao: JSON.stringify(
              Object.entries(checklist)
                .filter(([, checked]) => checked)
                .map(([name]) => name)
            ),
            danhSachAnh: JSON.stringify(evidencePhotos),
            ghiChu: handoverNote || undefined,
          })),
        });

        await handoverApi.chotBanGiao(draft.maPhieuBanGiao, receiverName.trim());
        await hydrateOperationalOrder(order.id);
        await app.refreshOrders?.();
        void app.refreshEquipment?.();
        setShowHandoverModal(true);
      } catch (err) {
        setHandoverError(err instanceof Error ? err.message : "Không thể chốt bàn giao thiết bị (BBBG).");
      } finally {
        setHandoverBusy(false);
      }
      return;
    }

    const itemsCheck = order.items.flatMap((item) => {
      const assignedIds = assignments[item.productId] || [];
      return assignedIds.map((eid) => ({
        equipmentId: eid,
        productId: item.productId,
        condition: "Tốt (Đã kiểm tại quầy)",
        accessoriesOk: true,
        note: handoverNote || "Hoạt động chuẩn, phụ kiện nguyên vẹn",
      }));
    });

    const checklistArr = Object.entries(checklist).map(([name, checked]) => ({ name, checked }));

    const res = app.createHandoverRecord(order.id, {
      orderId: order.id,
      staffName: app.currentUser?.name || "Nhân viên kho",
      customerName: order.customerName,
      receiverName,
      receiverPhone,
      receiverIdCard,
      isAuthorizedReceiver: isAuthorized,
      earlyPickupConfirmed: earlyPickupAccepted,
      photoUrls: evidencePhotos,
      items: itemsCheck,
      accessoriesChecklist: checklistArr,
      initialNotes: handoverNote || "Thiết bị và phụ kiện bàn giao đầy đủ, đúng hiện trạng cam kết.",
      signatureConfirmed: true,
    });

    if (res.ok) {
      setShowHandoverModal(true);
    } else {
      setHandoverError(res.message);
    }
  };

  const handleQrSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCodeSearch.trim()) return;
    const term = qrCodeSearch.trim().toLowerCase();
    const found = app.orders.find((o) =>
      (o.displayCode || o.id).toLowerCase().includes(term) ||
      o.id.toLowerCase().includes(term) ||
      o.customerPhone.includes(term) ||
      o.customerName.toLowerCase().includes(term)
    );
    if (found) {
      setSelectedOrderId(found.id);
      setQrCodeSearch("");
      setHandoverError("");
    } else {
      setHandoverError(`Không tìm thấy đơn hàng nào khớp với mã/QR "${qrCodeSearch}"!`);
    }
  };

  const allAssigned = order ? order.items.every((item) => {
    const arr = assignments[item.productId] || [];
    return arr.filter(Boolean).length >= item.qty;
  }) : false;

  return (
    <div>
      {/* Sub-tab chuyển đổi giữa Chuẩn bị kho (UC4.1) và Bàn giao tại quầy (UC4.2) */}
      <div className="flex gap-2 mb-4 border-b border-bone pb-3 items-center flex-wrap">
        <button
          type="button"
          onClick={() => { setSubTab("prep"); setSelectedOrderId(null); }}
          style={{
            padding: "8px 18px",
            borderRadius: "8px",
            border: subTab === "prep" ? "2px solid var(--color-forest)" : "1px solid var(--color-bone)",
            background: subTab === "prep" ? "var(--color-forest)" : "white",
            color: subTab === "prep" ? "white" : "var(--color-bark)",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>📦 1. Chuẩn bị kho (UC4.1)</span>
          <span style={{ background: subTab === "prep" ? "rgba(255,255,255,0.25)" : "#FEF3C7", color: subTab === "prep" ? "white" : "#B45309", padding: "1px 7px", borderRadius: 12, fontSize: "0.72rem" }}>
            {eligiblePrep.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setSubTab("handover"); setSelectedOrderId(null); }}
          style={{
            padding: "8px 18px",
            borderRadius: "8px",
            border: subTab === "handover" ? "2px solid var(--color-forest)" : "1px solid var(--color-bone)",
            background: subTab === "handover" ? "var(--color-forest)" : "white",
            color: subTab === "handover" ? "white" : "var(--color-bark)",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>🤝 2. Tiếp khách & Bàn giao (UC4.2)</span>
          <span style={{ background: subTab === "handover" ? "rgba(255,255,255,0.25)" : "#DCFCE7", color: subTab === "handover" ? "white" : "#15803D", padding: "1px 7px", borderRadius: 12, fontSize: "0.72rem" }}>
            {eligibleHandover.length}
          </span>
        </button>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "300px 1fr" }}>
        {/* Left Column: Order Picker & QR scanner */}
        <div>
          {subTab === "handover" && (
            <form onSubmit={handleQrSearch} className="mb-3">
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-bark)", display: "block", marginBottom: 4 }}>
                📷 Quét QR / Tra nhanh mã đơn tại quầy:
              </label>
              <div className="flex gap-1">
                <input
                  placeholder="Quét mã QR hoặc nhập #ORD..."
                  value={qrCodeSearch}
                  onChange={(e) => setQrCodeSearch(e.target.value)}
                  style={{ flex: 1, border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 10px", fontSize: "0.82rem" }}
                />
                <button type="submit" style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
                  Tìm
                </button>
              </div>
            </form>
          )}

          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", color: "var(--color-bark)", marginBottom: "10px" }}>
            {subTab === "prep" ? "Danh sách đơn cần chuẩn bị" : "Đơn sẵn sàng chờ giao khách"}
          </h3>

          <div className="flex flex-col gap-2">
            {(subTab === "prep" ? eligiblePrep : eligibleHandover).map((o) => {
              const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
              const isSelected = selectedOrder?.id === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => { setSelectedOrderId(o.id); setShowHandoverModal(false); }}
                  style={{
                    background: isSelected ? "var(--color-forest)" : "white",
                    color: isSelected ? "white" : "var(--color-bark)",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    border: `1px solid ${isSelected ? "var(--color-forest)" : "var(--color-bone)"}`,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 700, opacity: isSelected ? 0.9 : 1, color: isSelected ? "white" : "var(--color-moss)" }}>
                      {o.displayCode || o.id}
                    </span>
                    <span style={{ background: isSelected ? "rgba(255,255,255,0.2)" : sc.bg, color: isSelected ? "white" : sc.text, padding: "2px 7px", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 600 }}>
                      {o.status}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{o.customerName}</div>
                  <div style={{ fontSize: "0.72rem", opacity: isSelected ? 0.85 : 0.7 }}>
                    Hẹn nhận: {o.pickupTime}
                  </div>
                  {o.shortageReported && (
                    <div style={{ marginTop: 4, background: isSelected ? "rgba(220,38,38,0.3)" : "#FEE2E2", color: isSelected ? "#FECACA" : "#DC2626", padding: "2px 6px", borderRadius: 4, fontSize: "0.68rem", fontWeight: 700 }}>
                      ⚠️ Đã báo thiếu: {o.shortageReported.note}
                    </div>
                  )}
                </button>
              );
            })}
            {(subTab === "prep" ? eligiblePrep : eligibleHandover).length === 0 && (
              <p style={{ fontSize: "0.85rem", color: "#9CA3AF", padding: 12 }}>
                {subTab === "prep" ? "Hiện không có đơn nào cần soạn hàng." : "Hiện không có đơn nào chờ nhận tại quầy."}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Workflows */}
        <div>
          {handoverError && (
            <div role="alert" style={{ background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", marginBottom: 12 }}>
              {handoverError}
            </div>
          )}
          {handoverSuccess && (
            <div style={{ background: "#DCFCE7", color: "#15803D", border: "1px solid #BBF7D0", borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", fontWeight: 600, marginBottom: 12 }}>
              {handoverSuccess}
            </div>
          )}
          {!order ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#9CA3AF", background: "white", borderRadius: 12, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "3rem", marginBottom: "8px" }}>{subTab === "prep" ? "📦" : "🤝"}</div>
              <p>{subTab === "prep" ? "Chọn đơn ở danh sách bên trái để phân công mã serial và soạn hàng" : "Chọn đơn hoặc quét mã QR ở bên trái để tiến hành bàn giao đồ tại quầy"}</p>
            </div>
          ) : subTab === "prep" ? (
            /* ─── PHÂN HỆ 4.1: CHUẨN BỊ KHO & PHÂN CÔNG SERIAL ─── */
            <div>
              <div style={{ background: "var(--color-parchment)", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", border: "1px solid var(--color-bone)" }}>
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--color-moss)", fontWeight: 700 }}>{order.displayCode || order.id}</div>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{order.customerName} · {order.customerPhone}</div>
                    <div style={{ fontSize: "0.82rem", color: "#6B7280" }}>📤 Hẹn nhận: <strong>{order.pickupTime}</strong> → 📥 Hẹn trả: <strong>{order.returnTime}</strong></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ background: "var(--color-forest)", color: "white", padding: "4px 10px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 700 }}>
                      {order.status}
                    </span>
                    {order.status === "Đã xác nhận" && (
                      <button disabled={handoverBusy} onClick={() => void handleStartPreparation()} style={{ background: "var(--color-amber)", color: "white", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700, cursor: handoverBusy ? "wait" : "pointer" }}>
                        {handoverBusy ? "Đang xử lý..." : "Nhận soạn hàng →"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {order.shortageReported && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: "#991B1B", fontSize: "0.82rem" }}>
                  <strong>⚠️ CẢNH BÁO THIẾU HÀNG (UC4.1.5.1):</strong> {order.shortageReported.note}
                  <div style={{ fontSize: "0.75rem", color: "#B91C1C", marginTop: 2 }}>Đang chờ Quản trị viên can thiệp xử lý với khách hàng. Không tự ý giảm lượng hoặc đổi sản phẩm.</div>
                </div>
              )}

              <div className="flex justify-between items-center mb-3">
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)" }}>Gán mã thiết bị (Serial) & Kiểm tra phụ kiện</h4>
                <button onClick={() => setShowShortageModal(true)} style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                  ⚠️ Báo thiếu hàng cho QTV
                </button>
              </div>

              {order.items.map((item) => {
                const chosenForItem = assignments[item.productId] || [];
                const avail = app.equipment.filter(
                  (e) => e.productId === item.productId && (e.equipmentStatus === "Sẵn sàng" || chosenForItem.includes(e.id))
                );
                return (
                  <div key={item.productId} style={{ background: "white", borderRadius: "10px", border: "1px solid var(--color-bone)", padding: "14px 16px", marginBottom: "12px" }}>
                    <div className="flex justify-between items-center mb-2">
                      <div style={{ fontWeight: 700, color: "var(--color-bark)" }}>
                        {item.productName} — Yêu cầu: <span style={{ color: "var(--color-forest)" }}>{item.qty} chiếc</span>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: avail.length >= item.qty ? "#15803D" : "#DC2626", fontWeight: 600 }}>
                        Kho sẵn sàng: {avail.length} chiếc
                      </span>
                    </div>

                    {Array.from({ length: item.qty }).map((_, idx) => {
                      const currentChosen = assignments[item.productId]?.[idx];
                      return (
                        <div key={idx} className="flex items-center gap-3 mb-2 flex-wrap">
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "#9CA3AF", width: 60 }}>Món {idx + 1}:</span>
                          <select
                            value={currentChosen || ""}
                            onChange={(e) => pickEquipment(item.productId, idx, e.target.value)}
                            style={{ flex: 1, minWidth: 200, border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "6px 10px", fontSize: "0.85rem", background: "white" }}
                          >
                            <option value="">-- Chọn mã thiết bị sẵn sàng --</option>
                            {avail.map((e) => (
                              <option key={e.id} value={e.id}>{e.displayCode || e.id} ({e.condition} · đã thuê {e.rentCount} lần)</option>
                            ))}
                          </select>
                          {currentChosen && (
                            <div className="flex items-center gap-2">
                              <span style={{ color: "#15803D", fontSize: "0.82rem", fontWeight: 700 }}>✓ Đã gán</span>
                              <button onClick={() => setChangingEquip({ productId: item.productId, oldId: currentChosen })}
                                style={{ background: "#F3F4F6", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", fontSize: "0.72rem", cursor: "pointer" }}>
                                Đổi mã
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {avail.length < item.qty && (
                      <div style={{ background: "#FEE2E2", borderRadius: "6px", padding: "6px 10px", fontSize: "0.75rem", color: "#DC2626", marginTop: "4px" }}>
                        ⚠️ Kho không đủ số lượng sẵn sàng cho đơn này! Vui lòng báo Quản trị viên.
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Modal Đổi serial thay thế (Dòng phụ 3.1) */}
              {changingEquip && (
                <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, padding: 14, marginBottom: 14 }}>
                  <strong style={{ color: "#92400E", fontSize: "0.85rem" }}>Đổi serial thiết bị {app.equipment.find((x) => x.id === changingEquip.oldId)?.displayCode || changingEquip.oldId} trước khi giao:</strong>
                  <div className="flex gap-2 mt-2">
                    <select id="swapSelect" style={{ flex: 1, border: "1px solid #FCD34D", borderRadius: 6, padding: "6px 10px", background: "white", fontSize: "0.85rem" }}>
                      {app.equipment.filter((e) => e.productId === changingEquip.productId && e.equipmentStatus === "Sẵn sàng" && e.id !== changingEquip.oldId).map((e) => (
                        <option key={e.id} value={e.id}>{e.displayCode || e.id} ({e.condition})</option>
                      ))}
                    </select>
                    <button disabled={handoverBusy} onClick={() => {
                      const sel = (document.getElementById("swapSelect") as HTMLSelectElement)?.value;
                      if (sel) void handleSwapEquipment(changingEquip.productId, changingEquip.oldId, sel);
                    }} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 700, cursor: "pointer" }}>
                      {handoverBusy ? "Đang đổi..." : "Xác nhận đổi"}
                    </button>
                    <button onClick={() => setChangingEquip(null)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  disabled={!allAssigned || handoverBusy}
                  onClick={() => void handleCompletePreparation()}
                  style={{
                    background: allAssigned && !handoverBusy ? "var(--color-forest)" : "#9CA3AF",
                    color: "white", padding: "10px 24px", borderRadius: 8, border: "none",
                    cursor: allAssigned && !handoverBusy ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.95rem"
                  }}
                >
                  {handoverBusy ? "Đang lưu & xác nhận..." : "✓ Hoàn tất chuẩn bị & Chuyển \"Sẵn sàng nhận\" (UC4.1)"}
                </button>
              </div>

              {/* Modal Báo thiếu thiết bị */}
              {showShortageModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
                  <div style={{ background: "white", borderRadius: 12, maxWidth: 480, width: "100%", padding: 20 }}>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "#DC2626", marginBottom: 8 }}>
                      ⚠️ Báo thiếu thiết bị soạn hàng (UC4.1.5.1)
                    </h3>
                    <p style={{ fontSize: "0.82rem", color: "#4B5563", marginBottom: 12 }}>
                      Ghi nhận tình trạng kho không đủ thiết bị thay thế hoặc mã bị hỏng để Quản trị viên liên hệ thỏa thuận với khách.
                    </p>
                    <textarea
                      placeholder="Ghi rõ món bị thiếu hoặc hư hỏng (ví dụ: Thiếu 1 Lều 2 người do đơn trước chưa hoàn tất bảo dưỡng)..."
                      value={shortageNote}
                      onChange={(e) => setShortageNote(e.target.value)}
                      rows={3}
                      style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", marginBottom: 14 }}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowShortageModal(false)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>Hủy</button>
                      <button onClick={handleReportShortage} style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 6, padding: "6px 16px", fontWeight: 700, cursor: "pointer" }}>Gửi cảnh báo QTV</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ─── PHÂN HỆ 4.2: TIẾP KHÁCH & BÀN GIAO TẠI QUẦY ─── */
            <div>
              <div style={{ background: "var(--color-parchment)", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", border: "1px solid var(--color-bone)" }}>
                <div className="flex justify-between items-start">
                  <div>
                    <span style={{ fontSize: "0.72rem", background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                      SẴN SÀNG BÀN GIAO
                    </span>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-bark)", marginTop: 4 }}>
                      Đơn #{order.displayCode || order.id} — {order.customerName}
                    </h3>
                    <div style={{ fontSize: "0.82rem", color: "#6B7280" }}>
                      📤 Hẹn nhận: <strong>{order.pickupTime}</strong> · 📥 Hẹn trả: <strong>{order.returnTime}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "#15803D", fontWeight: 700 }}>✓ ĐÃ THU ĐỦ 100% TIỀN & CỌC</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", fontSize: "1rem" }}>
                      {fmt(order.rental - order.discount + order.depositTotal)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cảnh báo nhận sớm (Dòng phụ 1.2) */}
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div style={{ fontSize: "0.82rem", color: "#92400E" }}>
                    🕒 <strong>Khách nhận đồ tại quầy:</strong> Kiểm tra thời điểm nhận hợp lệ và sự chấp thuận của cửa hàng.
                  </div>
                  <label className="flex items-center gap-2" style={{ fontSize: "0.78rem", color: "#92400E", cursor: "pointer", fontWeight: 600 }}>
                    <input type="checkbox" checked={earlyPickupAccepted} onChange={(e) => setEarlyPickupAccepted(e.target.checked)} style={{ accentColor: "var(--color-forest)" }} />
                    Quản lý ca đã duyệt bàn giao
                  </label>
                </div>
              </div>

              {/* UC4.2 Bước 2: Đối chiếu người nhận thực tế tại quầy */}
              <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: 16, marginBottom: 16 }}>
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10 }}>1. Đối chiếu người nhận thực tế (UC4.2.2)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 2 }}>Họ tên người nhận tại quầy *</label>
                    <input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 10px", fontSize: "0.85rem" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 2 }}>Số điện thoại người nhận *</label>
                    <input value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 10px", fontSize: "0.85rem" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 2 }}>Số CCCD / Mã định danh</label>
                    <input value={receiverIdCard} onChange={(e) => setReceiverIdCard(e.target.value)} style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 10px", fontSize: "0.85rem" }} />
                  </div>
                </div>
                <label className="flex items-center gap-2" style={{ fontSize: "0.82rem", color: "var(--color-bark)", cursor: "pointer" }}>
                  <input type="checkbox" checked={isAuthorized} onChange={(e) => setIsAuthorized(e.target.checked)} style={{ accentColor: "var(--color-forest)" }} />
                  <span>Người nhận thay có giấy ủy quyền / tin nhắn ủy quyền hợp lệ từ chính chủ đơn (Dòng phụ 1.1)</span>
                </label>
              </div>

              {/* Danh sách thiết bị đã phân công sẵn */}
              <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: 16, marginBottom: 16 }}>
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10 }}>2. Kiểm tra cùng khách từng thiết bị & phụ kiện</h4>
                <div className="flex flex-col gap-2">
                  {order.items.flatMap((i) => (assignments[i.productId] || []).map((code) => ({
                    code: app.equipment.find((e) => e.id === code)?.displayCode || code,
                    item: i,
                  }))).map(({ code, item }) => (
                    <div key={code} style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", fontSize: "0.88rem" }}>{code}</span>
                        <span style={{ fontSize: "0.82rem", color: "#374151", marginLeft: 8 }}>— {item.productName}</span>
                      </div>
                      <span style={{ fontSize: "0.75rem", background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                        ✓ Ngoại quan tốt
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Checklist phụ kiện & Bằng chứng ảnh chụp (UC4.2.3) */}
              <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: 16, marginBottom: 16 }}>
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10 }}>3. Checklist bàn giao & Bằng chứng ảnh</h4>
                <div className="flex flex-col gap-2 mb-3">
                  {Object.entries(checklist).map(([name, checked]) => (
                    <label key={name} className="flex items-center gap-2" style={{ fontSize: "0.85rem", cursor: "pointer", color: "var(--color-bark)" }}>
                      <input type="checkbox" checked={checked} onChange={(e) => setChecklist((prev) => ({ ...prev, [name]: e.target.checked }))} style={{ accentColor: "var(--color-forest)", width: 16, height: 16 }} />
                      <span>{name}</span>
                    </label>
                  ))}
                </div>

                <div className="mb-3">
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 4 }}>
                    Ảnh bằng chứng hiện trạng trước thuê (UC4.2 Dòng 747):
                  </span>
                  <div className="flex gap-2 items-center">
                    {evidencePhotos.map((url, i) => (
                      <img key={i} src={url} alt="Bằng chứng giao" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid var(--color-bone)" }} />
                    ))}
                    <button type="button" onClick={() => alert("Đã chụp thêm 1 ảnh bằng chứng thiết bị tại quầy!")} style={{ width: 60, height: 60, border: "1px dashed #9CA3AF", borderRadius: 6, background: "none", cursor: "pointer", fontSize: "1.2rem", color: "#6B7280" }}>
                      📷+
                    </button>
                  </div>
                </div>

                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 4 }}>
                  Ghi chú hiện trạng bàn giao:
                </label>
                <textarea placeholder="Ghi nhận phụ kiện dây đai, tem bảo hành, số lượng đinh cọc..." value={handoverNote} onChange={(e) => setHandoverNote(e.target.value)} rows={2}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", resize: "none" }}
                />
              </div>

              <button
                disabled={handoverBusy}
                onClick={() => void handleCompleteHandover()}
                style={{
                  background: handoverBusy ? "#9CA3AF" : "var(--color-forest)",
                  color: "white", padding: "12px 28px", borderRadius: 8, border: "none",
                  cursor: handoverBusy ? "wait" : "pointer", fontWeight: 700, fontSize: "0.95rem", width: "100%"
                }}
              >
                {handoverBusy ? "Đang lập & chốt BBBG..." : "✓ Bàn giao thiết bị cho khách & Lập Biên bản (BBBG)"}
              </button>
            </div>
          )}

          {/* Modal xem Biên bản bàn giao vừa tạo (BBBG) */}
          {showHandoverModal && order && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
              <div style={{ background: "white", borderRadius: 16, maxWidth: 640, width: "100%", padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span style={{ fontSize: "0.72rem", background: "#DCFCE7", color: "#15803D", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>ĐÃ BÀN GIAO THÀNH CÔNG</span>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--color-bark)", marginTop: 4 }}>
                      Biên bản Bàn giao BBBG-{order.displayCode || order.id}
                    </h3>
                  </div>
                  <button onClick={() => setShowHandoverModal(false)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
                </div>

                <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, fontSize: "0.85rem", marginBottom: 14 }}>
                  <div className="grid grid-cols-2 gap-2">
                    <div><strong>Khách đặt hàng:</strong> {order.customerName}</div>
                    <div><strong>Người nhận thực tế:</strong> {receiverName} {isAuthorized ? "(Người nhận thay)" : ""}</div>
                    <div><strong>SĐT người nhận:</strong> {receiverPhone}</div>
                    <div><strong>CCCD / Định danh:</strong> {receiverIdCard || "Đã kiểm tra đối chiếu"}</div>
                    <div><strong>Thời gian bàn giao:</strong> {new Date().toLocaleString("vi-VN")}</div>
                    <div><strong>Nhân viên bàn giao:</strong> {app.currentUser?.name || "Nhân viên kho"}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <strong style={{ fontSize: "0.82rem", color: "var(--color-bark)" }}>Danh sách thiết bị giao:</strong>
                  <div className="flex flex-col gap-1 mt-1">
                    {order.items.flatMap((i) => assignments[i.productId] || []).map((code) => (
                      <div key={code} style={{ fontSize: "0.8rem", color: "#374151", background: "#F3F4F6", padding: "4px 8px", borderRadius: 6 }}>
                        • Mã thiết bị: <strong style={{ color: "var(--color-forest)" }}>{app.equipment.find((e) => e.id === code)?.displayCode || code}</strong> (Tình trạng: Tốt, hoạt động chuẩn)
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: "0.8rem", color: "#4B5563", marginBottom: 16 }}>
                  <strong>Checklist đã kiểm:</strong> Tất cả 4 hạng mục an toàn, vệ sinh và phụ kiện đã được xác nhận đạt chuẩn cùng khách hàng.
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => window.print()} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                    🖨 In Biên bản
                  </button>
                  <button onClick={() => { setShowHandoverModal(false); setSelectedOrderId(null); }} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
                    Đóng & Hoàn tất
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Return Tab (UC4.3 Nhận trả nhiều đợt & Trả 1 phần, UC4.4 Xử lý quá hạn & Nhật ký gọi khách) ───
function ReturnTab({
  app,
  selectedOrder,
  setSelectedOrderId,
  hydrateOperationalOrder,
}: {
  app: ReturnType<typeof useApp>;
  selectedOrder: Order | null;
  setSelectedOrderId: (id: string | null) => void;
  hydrateOperationalOrder: (id: string) => Promise<void>;
}) {
  const [selectedItemsToReturn, setSelectedItemsToReturn] = useState<Record<string, boolean>>({});
  const [itemConditions, setItemConditions] = useState<Record<string, ReturnReceiptItem["condition"]>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [itemSurcharges, setItemSurcharges] = useState<Record<string, number>>({});
  const [returnStaffNote, setReturnStaffNote] = useState("");
  const [viewingReceipt, setViewingReceipt] = useState<ReturnReceipt | null>(null);
  const [viewingBackendReceipt, setViewingBackendReceipt] = useState<NhanTraBackend | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "completed" | "all">("active");

  // State kết nối API thật nhận trả, phụ phí, quá hạn & duyệt mất
  const [debtItemsBackend, setDebtItemsBackend] = useState<ThietBiConNoBackend[]>([]);
  const [returnReceiptsBackend, setReturnReceiptsBackend] = useState<NhanTraBackend[]>([]);
  const [surchargesBackend, setSurchargesBackend] = useState<Surcharge[]>([]);
  const [overdueDetailBackend, setOverdueDetailBackend] = useState<QuaHanChiTietBackend | null>(null);
  const [affectedOrdersBackend, setAffectedOrdersBackend] = useState<Array<Record<string, unknown>>>([]);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnBusy, setReturnBusy] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnSuccess, setReturnSuccess] = useState<string | null>(null);
  const [rejectingSurchargeId, setRejectingSurchargeId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveLostTarget, setApproveLostTarget] = useState<{ phieuId: number; chiTiet: ChiTietNhanTraBackend } | null>(null);
  const [lostApproveReason, setLostApproveReason] = useState("Xác nhận mất thiết bị sau đối chiếu kho và khách hàng");
  const [lostBienBan, setLostBienBan] = useState("");
  const [lostCompAmount, setLostCompAmount] = useState<number>(1000000);

  // State UC4.4: Nhật ký liên hệ quá hạn & Xung đột lịch
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactOutcome, setContactOutcome] = useState<"Hẹn giờ trả mới" | "Xin gia hạn thêm" | "Không nghe máy" | "Khách báo mất">("Hẹn giờ trả mới");
  const [contactNote, setContactNote] = useState("");
  const [newExpectedTime, setNewExpectedTime] = useState("");
  const [contactNotice, setContactNotice] = useState<string | null>(null);

  // State UC4.3: Ảnh bằng chứng hư hại
  const [damagePhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=200&auto=format&fit=crop&q=60"
  ]);

  // Lọc đơn theo trạng thái: Đang xử lý, Đã hoàn tất hoặc Tất cả
  const eligibleOrders = app.orders.filter((o) => {
    if (statusFilter === "active") return ["Đang thuê", "Đã nhận trả", "Chờ đối soát"].includes(o.status);
    if (statusFilter === "completed") return o.status === "Hoàn tất";
    return ["Đang thuê", "Đã nhận trả", "Chờ đối soát", "Hoàn tất"].includes(o.status);
  });
  const order = selectedOrder;

  const loadReturnData = useCallback(async () => {
    if (!app.realApi || !order) return;
    const donId = order.backendId ?? Number(order.id);
    if (!Number.isFinite(donId)) return;
    setReturnLoading(true);
    setReturnError(null);
    try {
      const [debt, receipts, surcharges, overdue, affected] = await Promise.all([
        returnApi.layThietBiConNo(donId).catch(() => [] as ThietBiConNoBackend[]),
        returnApi.layDanhSachTheoDon(donId).catch(() => [] as NhanTraBackend[]),
        surchargeApi.layTheoDon(donId).catch(() => []),
        returnApi.layChiTietQuaHan(donId).catch(() => null),
        returnApi.layDonBiAnhHuong(donId).catch(() => []),
      ]);
      setDebtItemsBackend(debt);
      setReturnReceiptsBackend(receipts);
      setSurchargesBackend(surcharges.map(mapPhuPhiToSurcharge));
      setOverdueDetailBackend(overdue);
      setAffectedOrdersBackend(Array.isArray(affected) ? (affected as Array<Record<string, unknown>>) : []);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Không thể tải dữ liệu nhận trả của đơn.");
    } finally {
      setReturnLoading(false);
    }
  }, [app.realApi, order?.id, order?.backendId]);

  useEffect(() => {
    setReturnSuccess(null);
    setReturnError(null);
    void loadReturnData();
  }, [loadReturnData]);

  // Tính toán quá hạn (ưu tiên backend khi realApi bật)
  const mockOverdueInfo = order ? app.checkOrderOverdue(order) : { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };
  const realMaxDays = overdueDetailBackend
    ? Math.max(0, ...overdueDetailBackend.danhSachThietBi.map((x) => x.soNgayTre))
    : 0;
  const overdueInfo = app.realApi && overdueDetailBackend
    ? {
        isOverdue: realMaxDays > 0 || Number(overdueDetailBackend.tongPhiTreDuKien ?? 0) > 0,
        overdueDays: realMaxDays,
        overdueHours: realMaxDays * 24,
        surcharge: Number(overdueDetailBackend.tongPhiTreDuKien ?? 0),
      }
    : mockOverdueInfo;
  const overdueConflicts = order && !app.realApi ? app.getOverdueConflicts(order.id) : [];

  // Danh sách thiết bị còn nợ (hợp nhất từ API thật hoặc mock)
  const debtEquipment = order?.assignedEquipment.filter((ae) => !ae.returnedAt) || [];
  const returnedEquipment = order?.assignedEquipment.filter((ae) => ae.returnedAt) || [];
  const debtRows = app.realApi
    ? debtItemsBackend.map((d) => {
        const prod = app.products.find((p) => p.name === d.tenSanPham);
        return {
          key: String(d.maChiTietBanGiao),
          maChiTietBanGiao: d.maChiTietBanGiao,
          equipmentId: String(d.maThietBi),
          displayCode: d.maThietBiHienThi,
          productName: d.tenSanPham,
          compensation: prod?.compensation || 1000000,
        };
      })
    : debtEquipment.map((ae) => {
        const prod = app.products.find((p) => p.id === ae.productId);
        return {
          key: ae.equipmentId,
          maChiTietBanGiao: undefined as number | undefined,
          equipmentId: ae.equipmentId,
          displayCode: ae.equipmentDisplayCode || ae.equipmentId,
          productName: prod?.name || "Thiết bị thuê",
          compensation: prod?.compensation || 1000000,
        };
      });

  const currentReturnRound = app.realApi
    ? returnReceiptsBackend.length + 1
    : (order?.returnReceipts?.length || 0) + 1;
  const displaySurcharges = app.realApi ? surchargesBackend : order?.surcharges || [];

  const defaultFee = (cond: ReturnReceiptItem["condition"], compensation: number) => {
    if (cond === "Cần vệ sinh") return 50000;
    if (cond === "Hỏng nhẹ") return Math.round(compensation * 0.1);
    if (cond === "Hỏng nặng") return Math.round(compensation * 0.4);
    if (cond === "Thiếu phụ kiện") return 80000;
    if (cond === "Mất thiết bị") return compensation;
    return 0;
  };

  const handleToggleSelect = (rowKey: string, _compensation: number, maChiTietBanGiao?: number) => {
    setSelectedItemsToReturn((prev) => {
      const next = !prev[rowKey];
      if (next && !itemConditions[rowKey]) {
        setItemConditions((c) => ({ ...c, [rowKey]: "Bình thường" }));
        setItemSurcharges((s) => ({ ...s, [rowKey]: 0 }));
      }
      if (next && app.realApi && maChiTietBanGiao) {
        // Lấy gợi ý phí quá hạn / hư hỏng nếu có từ backend
        void surchargeApi.goiYPhi(maChiTietBanGiao).then((hints) => {
          const overdueHint = hints.find((h) => h.loaiPhi === "TreHan");
          if (overdueHint && overdueHint.soTienGoiY > 0 && !(itemSurcharges[rowKey] > 0)) {
            setItemSurcharges((s) => ({ ...s, [rowKey]: s[rowKey] || overdueHint.soTienGoiY }));
          }
        }).catch(() => {});
      }
      return { ...prev, [rowKey]: next };
    });
  };

  const handleConditionChange = (rowKey: string, cond: ReturnReceiptItem["condition"], compensation: number) => {
    setItemConditions((prev) => ({ ...prev, [rowKey]: cond }));
    const fee = defaultFee(cond, compensation);
    setItemSurcharges((prev) => ({ ...prev, [rowKey]: fee }));
  };

  const handleCreateReceipt = async () => {
    if (!order) return;
    setReturnError(null);
    setReturnSuccess(null);

    const selectedRows = debtRows.filter((r) => selectedItemsToReturn[r.key]);
    if (selectedRows.length === 0) {
      setReturnError("Vui lòng tick chọn ít nhất 1 thiết bị khách mang đến trả đợt này.");
      return;
    }

    if (app.realApi) {
      const donId = order.backendId ?? Number(order.id);
      if (!Number.isFinite(donId)) return;
      setReturnBusy(true);
      try {
        const bgIds = selectedRows
          .map((r) => r.maChiTietBanGiao)
          .filter((x): x is number => typeof x === "number" && x > 0);
        if (bgIds.length === 0) {
          throw new Error("Không tìm thấy mã chi tiết bàn giao hợp lệ để lập phiếu nhận trả.");
        }
        const noteText =
          returnStaffNote.trim() || `Nhận trả đợt ${currentReturnRound} (${selectedRows.length} thiết bị)`;
        const draft = await returnApi.taoPhieuNhap(donId, bgIds, noteText);
        const nowIso = new Date().toISOString();

        const updatedDraft = await returnApi.capNhatPhieuNhap(
          draft.maPhieu,
          selectedRows.map((row) => {
            const cond = itemConditions[row.key] || "Bình thường";
            return {
              maChiTietBanGiao: row.maChiTietBanGiao!,
              thoiDiemTraThucTe: nowIso,
              ketLuan: mapReturnCondToBackend(cond),
              tinhTrangSauThue: cond,
              danhSachAnh: cond === "Bình thường" ? undefined : damagePhotos,
              bienBanMat:
                cond === "Mất thiết bị"
                  ? itemNotes[row.key]?.trim() || "Khách báo mất thiết bị khi nhận trả"
                  : undefined,
              ghiChu: itemNotes[row.key]?.trim() || undefined,
            };
          }),
          noteText
        );

        // Lập phụ phí phát sinh kèm theo nếu có số tiền > 0 hoặc báo mất
        for (const row of selectedRows) {
          const cond = itemConditions[row.key] || "Bình thường";
          const fee = itemSurcharges[row.key] || 0;
          if (fee > 0 || cond === "Mất thiết bị") {
            await surchargeApi.lapPhi({
              maDonThue: donId,
              maChiTietBanGiao: row.maChiTietBanGiao,
              loaiPhi: mapReturnCondToSurchargeType(cond),
              soTienDeNghi: fee > 0 ? fee : row.compensation,
              lyDo: itemNotes[row.key]?.trim() || `Phụ phí ${cond} (${row.displayCode})`,
              danhSachAnh: cond === "Bình thường" ? undefined : damagePhotos,
            });
          }
        }

        const hasLostItem = selectedRows.some(
          (row) => (itemConditions[row.key] || "Bình thường") === "Mất thiết bị"
        );
        let finalReceipt = updatedDraft;
        if (!hasLostItem) {
          finalReceipt = await returnApi.chotNhanTra(draft.maPhieu);
          setReturnSuccess(`Đã lập và chốt phiếu nhận trả ${finalReceipt.maPhieuHienThi}.`);
        } else {
          setReturnSuccess(
            `Đã tạo phiếu nháp ${updatedDraft.maPhieuHienThi}. Do có thiết bị báo mất, vui lòng duyệt kết luận mất hoặc tách dòng chờ xử lý trước khi chốt.`
          );
        }

        setViewingBackendReceipt(finalReceipt);
        setSelectedItemsToReturn({});
        setItemNotes({});
        setReturnStaffNote("");
        await Promise.all([
          loadReturnData(),
          hydrateOperationalOrder(order.id),
          app.refreshOrders?.(),
          app.refreshEquipment?.(),
        ]);
      } catch (err) {
        setReturnError(err instanceof Error ? err.message : "Không thể lập phiếu nhận trả trên máy chủ.");
      } finally {
        setReturnBusy(false);
      }
      return;
    }

    const returnItems: ReturnReceiptItem[] = selectedRows.map((row) => {
      const ae = order.assignedEquipment.find((a) => a.equipmentId === row.equipmentId)!;
      const cond = itemConditions[row.key] || "Bình thường";
      const surcharge = itemSurcharges[row.key] || 0;
      const note = itemNotes[row.key] || "";
      return {
        equipmentId: row.equipmentId,
        productId: ae.productId,
        condition: cond,
        surchargeAmount: surcharge,
        note,
        lostApproved: false,
      };
    });

    const res = app.createReturnReceipt(order.id, {
      returnItems,
      staffName: app.currentUser?.name || "NV Kho",
      note: returnStaffNote || `Nhận trả đợt ${currentReturnRound} (${returnItems.length} thiết bị)`,
      photoUrls: damagePhotos,
    });

    if (res.ok) {
      setViewingReceipt(res.data ?? null);
      setSelectedItemsToReturn({});
      setItemNotes({});
      setReturnStaffNote("");
      setReturnSuccess(`Đã lập phiếu nhận trả ${res.data?.id || ""}.`);
    } else {
      setReturnError(res.message);
    }
  };

  const handleCloseBackendReceipt = async (phieuId: number) => {
    if (!order) return;
    setReturnBusy(true);
    setReturnError(null);
    setReturnSuccess(null);
    try {
      const closed = await returnApi.chotNhanTra(phieuId);
      setViewingBackendReceipt(closed);
      setReturnSuccess(`Đã chốt phiếu ${closed.maPhieuHienThi}.`);
      await Promise.all([
        loadReturnData(),
        hydrateOperationalOrder(order.id),
        app.refreshOrders?.(),
        app.refreshEquipment?.(),
      ]);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Không thể chốt phiếu nhận trả.");
    } finally {
      setReturnBusy(false);
    }
  };

  const handleSplitPendingLine = async (phieuId: number, chiTietId: number) => {
    if (!order) return;
    setReturnBusy(true);
    setReturnError(null);
    try {
      const { phieuGoc, phieuMoi } = await returnApi.tachDongChoXuLy(
        phieuId,
        [chiTietId],
        "Tách dòng thiết bị mất/cần xác minh thêm sang phiếu xử lý riêng"
      );
      setViewingBackendReceipt(phieuGoc);
      setReturnSuccess(`Đã tách dòng chờ xử lý sang phiếu ${phieuMoi.maPhieuHienThi}.`);
      await loadReturnData();
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Không thể tách dòng chờ xử lý.");
    } finally {
      setReturnBusy(false);
    }
  };

  const handleConfirmApproveLost = async () => {
    if (!order || !approveLostTarget) return;
    const donId = order.backendId ?? Number(order.id);
    if (!Number.isFinite(donId)) return;
    setReturnBusy(true);
    setReturnError(null);
    try {
      const { phieuId, chiTiet } = approveLostTarget;
      // Tìm phụ phí bồi thường hiện có của thiết bị này, nếu chưa có thì lập mới
      let matchedSurcharge = surchargesBackend.find(
        (s) => s.handoverItemId === chiTiet.maChiTietBanGiao && s.type === "Mất đồ" && s.backendId
      );
      let surchargeId = matchedSurcharge?.backendId;
      if (!surchargeId) {
        const created = await surchargeApi.lapPhi({
          maDonThue: donId,
          maChiTietBanGiao: chiTiet.maChiTietBanGiao,
          loaiPhi: "MatThietBi",
          soTienDeNghi: lostCompAmount,
          lyDo: lostApproveReason.trim() || `Bồi thường mất thiết bị ${chiTiet.maThietBiHienThi}`,
        });
        surchargeId = created.maPhuPhi;
      }
      await returnApi.duyetKetLuanMat(phieuId, chiTiet.maChiTietNhanTra, {
        lyDo: lostApproveReason.trim() || "Duyệt kết luận mất thiết bị",
        bienBanMat: lostBienBan.trim() || chiTiet.bienBanMat || `Biên bản mất ${chiTiet.maThietBiHienThi}`,
        maPhuPhiBoiThuong: surchargeId,
      });
      setApproveLostTarget(null);
      setReturnSuccess(`Đã duyệt kết luận mất cho thiết bị ${chiTiet.maThietBiHienThi}.`);
      const refreshedReceipts = await returnApi.layDanhSachTheoDon(donId).catch(() => [] as NhanTraBackend[]);
      const updatedModalReceipt = refreshedReceipts.find((r) => r.maPhieu === phieuId) || null;
      if (viewingBackendReceipt?.maPhieu === phieuId) {
        setViewingBackendReceipt(updatedModalReceipt);
      }
      await Promise.all([loadReturnData(), hydrateOperationalOrder(order.id)]);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Không thể duyệt kết luận mất (yêu cầu quyền Quản trị viên).");
    } finally {
      setReturnBusy(false);
    }
  };

  const handleApproveSurcharge = async (surcharge: Surcharge) => {
    if (!order) return;
    if (app.realApi) {
      if (!surcharge.backendId) return;
      setReturnBusy(true);
      setReturnError(null);
      try {
        await surchargeApi.duyetPhi(surcharge.backendId);
        setReturnSuccess("Đã duyệt phụ phí thành công.");
        await Promise.all([loadReturnData(), hydrateOperationalOrder(order.id)]);
      } catch (err) {
        setReturnError(err instanceof Error ? err.message : "Không thể duyệt phụ phí (cần quyền Quản trị viên).");
      } finally {
        setReturnBusy(false);
      }
      return;
    }
    app.approveSurcharge(order.id, surcharge.id);
  };

  const handleRejectSurcharge = async (surcharge: Surcharge) => {
    if (!order || !surcharge.backendId) return;
    if (!rejectReason.trim()) {
      setReturnError("Vui lòng nhập lý do từ chối phụ phí.");
      return;
    }
    setReturnBusy(true);
    setReturnError(null);
    try {
      await surchargeApi.tuChoiPhi(surcharge.backendId, rejectReason.trim());
      setRejectingSurchargeId(null);
      setRejectReason("");
      setReturnSuccess("Đã từ chối phụ phí.");
      await Promise.all([loadReturnData(), hydrateOperationalOrder(order.id)]);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Không thể từ chối phụ phí.");
    } finally {
      setReturnBusy(false);
    }
  };

  const handleApplyOverdueFee = async () => {
    if (!order || !overdueInfo.isOverdue) return;
    setReturnError(null);
    setReturnSuccess(null);

    if (app.realApi) {
      const donId = order.backendId ?? Number(order.id);
      if (!Number.isFinite(donId)) return;
      setReturnBusy(true);
      try {
        const overdueItems = overdueDetailBackend?.danhSachThietBi.filter((x) => x.soNgayTre > 0 && x.phiTreDuKien > 0) || [];
        if (overdueItems.length > 0) {
          for (const item of overdueItems) {
            await surchargeApi.lapPhi({
              maDonThue: donId,
              maChiTietBanGiao: item.maChiTietBanGiao,
              loaiPhi: "TreHan",
              soTienDeNghi: item.phiTreDuKien,
              lyDo: `Quá hạn trả ${item.soNgayTre} ngày (${item.maThietBiHienThi}) × 150% giá thuê ngày`,
            });
          }
        } else {
          await surchargeApi.lapPhi({
            maDonThue: donId,
            loaiPhi: "TreHan",
            soTienDeNghi: overdueInfo.surcharge,
            lyDo: `Quá hạn trả ${overdueInfo.overdueDays} ngày × 150% đơn giá thuê ngày`,
          });
        }
        setReturnSuccess(`Đã lập phụ phí quá hạn ${fmt(overdueInfo.surcharge)} lên máy chủ.`);
        await Promise.all([loadReturnData(), hydrateOperationalOrder(order.id)]);
      } catch (err) {
        setReturnError(err instanceof Error ? err.message : "Không thể lập phụ phí quá hạn.");
      } finally {
        setReturnBusy(false);
      }
      return;
    }

    app.addSurcharge(order.id, {
      id: `PC-OVERDUE-${order.id}-${Date.now()}`,
      type: "Quá hạn",
      equipmentId: "TẤT CẢ",
      amount: overdueInfo.surcharge,
      reason: `Quá hạn trả ${overdueInfo.overdueDays} ngày (${overdueInfo.overdueHours} giờ) × 150% tiền thuê ngày`,
      status: "Chờ duyệt",
      createdBy: "Hệ thống tự động",
    });
    setReturnSuccess(`Đã thêm phụ phí quá hạn ${fmt(overdueInfo.surcharge)} vào đơn.`);
  };

  const handleSaveContactLog = () => {
    if (!order || !contactNote.trim()) {
      setContactNotice("Vui lòng nhập ghi chú nội dung cuộc gọi nhắc khách.");
      return;
    }
    const res = app.addContactLog(order.id, {
      staffName: app.currentUser?.name || "NV Kho",
      outcome: contactOutcome,
      note: contactNote,
      newExpectedTime: newExpectedTime || undefined,
    });
    if (res.ok) {
      setContactNotice("Đã lưu nhật ký liên hệ vào phiên làm việc.");
      setContactNote("");
      setNewExpectedTime("");
    } else {
      setContactNotice(res.message);
    }
  };

  return (
    <div className="responsive-staff-grid grid gap-6" style={{ gridTemplateColumns: "300px 1fr" }}>
      {/* Cột trái: Danh sách đơn */}
      <div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--color-bark)", marginBottom: "8px" }}>
          Đơn nhận trả & đối soát
        </h3>

        {/* Bộ lọc trạng thái đơn */}
        <div className="flex gap-1 mb-3">
          {[
            { key: "active", label: "Đang xử lý", count: app.orders.filter((o) => ["Đang thuê", "Đã nhận trả", "Chờ đối soát"].includes(o.status)).length },
            { key: "completed", label: "Hoàn tất", count: app.orders.filter((o) => o.status === "Hoàn tất").length },
            { key: "all", label: "Tất cả", count: app.orders.filter((o) => ["Đang thuê", "Đã nhận trả", "Chờ đối soát", "Hoàn tất"].includes(o.status)).length },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key as typeof statusFilter)}
              style={{
                flex: 1,
                padding: "5px 6px",
                borderRadius: 6,
                fontSize: "0.72rem",
                fontWeight: statusFilter === f.key ? 700 : 500,
                border: "1px solid",
                borderColor: statusFilter === f.key ? "var(--color-forest)" : "var(--color-bone)",
                background: statusFilter === f.key ? "var(--color-forest)" : "white",
                color: statusFilter === f.key ? "white" : "var(--color-bark)",
                cursor: "pointer",
              }}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {eligibleOrders.length === 0 ? (
            <div style={{ background: "white", borderRadius: 10, padding: "20px 14px", border: "1px solid var(--color-bone)", fontSize: "0.82rem", color: "#6B7280", textAlign: "center" }}>
              Không có đơn nào trong nhóm lọc này.
            </div>
          ) : (
            eligibleOrders.map((o) => {
              const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
              const isOd = app.checkOrderOverdue(o).isOverdue;
              const retCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
              const isPart = o.status === "Đang thuê" && retCnt > 0 && retCnt < o.assignedEquipment.length;

              return (
                <button
                  key={o.id}
                  onClick={() => {
                    setSelectedOrderId(o.id);
                    setSelectedItemsToReturn({});
                    void hydrateOperationalOrder(o.id);
                  }}
                  style={{
                    background: selectedOrder?.id === o.id ? "var(--color-forest)" : "white",
                    color: selectedOrder?.id === o.id ? "white" : "var(--color-bark)",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    border: `1px solid ${selectedOrder?.id === o.id ? "var(--color-forest)" : "var(--color-bone)"}`,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", opacity: 0.85 }}>{o.displayCode || o.id}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{o.customerName}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span style={{ background: selectedOrder?.id === o.id ? "rgba(255,255,255,0.2)" : sc.bg, color: selectedOrder?.id === o.id ? "white" : sc.text, padding: "2px 7px", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 600 }}>
                      {o.status}
                    </span>
                    {isPart && <span style={{ background: "#FFF7ED", color: "#C2410C", padding: "2px 6px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700 }}>Trả 1 phần</span>}
                    {isOd && <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "2px 6px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700 }}>Quá hạn</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Cột phải: Xử lý nhận trả từng đợt & Đối soát */}
      <div>
        {returnError && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", fontWeight: 600 }}>
            {returnError}
          </div>
        )}
        {returnSuccess && (
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", fontWeight: 600 }}>
            {returnSuccess}
          </div>
        )}

        {!order ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#9CA3AF", background: "white", borderRadius: 12, border: "1px solid var(--color-bone)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, color: "var(--color-moss)" }}>
              <Icon name="arrow-down" size={36} />
            </div>
            <p>Chọn một đơn thuê ở bên trái để lập phiếu nhận trả hoặc đối soát cọc.</p>
          </div>
        ) : order.status === "Hoàn tất" ? (
          <div>
            <ReconciliationSheet
              order={order}
              app={app}
              userRole={app.currentUser?.role === "Quản trị viên" ? "admin" : "staff"}
              onAfterMutation={async () => {
                await Promise.all([loadReturnData(), hydrateOperationalOrder(order.id)]);
              }}
            />
          </div>
        ) : (
          <div>
            {/* Header info đơn */}
            <div style={{ background: "var(--color-parchment)", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", border: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--color-moss)", fontWeight: 700 }}>
                    {order.displayCode || order.id}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                    {order.customerName} {order.customerPhone ? `· ${order.customerPhone}` : ""}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#6B7280" }}>
                    Hẹn trả dự kiến: <strong style={{ color: overdueInfo.isOverdue ? "#DC2626" : "inherit" }}>{order.returnTime}</strong>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>
                    Tổng thiết bị đã giao: <strong>{order.assignedEquipment.length}</strong>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#15803D" }}>
                    Đã trả / xử lý: <strong>{app.realApi ? Math.max(0, order.assignedEquipment.length - debtRows.length) : returnedEquipment.length}</strong>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: debtRows.length > 0 ? "#DC2626" : "#15803D", fontWeight: 700 }}>
                    Còn nợ: {debtRows.length} chiếc
                  </div>
                </div>
              </div>
              {returnLoading && (
                <div style={{ marginTop: 8, fontSize: "0.76rem", color: "#6B7280" }}>
                  Đang đồng bộ danh sách thiết bị còn nợ và phiếu nhận trả từ máy chủ...
                </div>
              )}
            </div>

            {/* Banner Cảnh báo quá hạn & Đơn kế tiếp bị ảnh hưởng */}
            {overdueInfo.isOverdue && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
                <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontWeight: 700, color: "#DC2626", fontSize: "0.95rem" }}>
                        <span className="icon-label">
                          <Icon name="alert-circle" size={16} />
                          ĐƠN THUÊ QUÁ HẠN: Trễ {overdueInfo.overdueDays} ngày
                        </span>
                      </span>
                      {(overdueConflicts.length > 0 || affectedOrdersBackend.length > 0) && (
                        <span style={{ background: "#DC2626", color: "white", padding: "1px 6px", borderRadius: 4, fontSize: "0.68rem", fontWeight: 700 }}>
                          ẢNH HƯỞNG {app.realApi ? affectedOrdersBackend.length : overdueConflicts.length} ĐƠN SAU
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#991B1B", marginTop: 2 }}>
                      Phạt trễ 150% đơn giá ngày = <strong>+{fmt(overdueInfo.surcharge)}</strong>.
                    </div>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <button
                      onClick={() => {
                        setContactNotice(null);
                        setShowContactModal(true);
                      }}
                      style={{ background: "#1E40AF", color: "white", border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      Nhật ký gọi ({order.contactLogs?.length || 0})
                    </button>
                    <button
                      disabled={returnBusy}
                      onClick={handleApplyOverdueFee}
                      style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 700, fontSize: "0.8rem", cursor: returnBusy ? "not-allowed" : "pointer" }}
                    >
                      + Lập phụ phí trễ
                    </button>
                  </div>
                </div>

                {overdueConflicts.length > 0 && (
                  <div style={{ background: "white", border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px", marginTop: 8 }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#B91C1C", marginBottom: 4 }}>
                      CẢNH BÁO KẸT THIẾT BỊ ĐƠN TIẾP THEO:
                    </div>
                    {overdueConflicts.map((c, idx) => (
                      <div key={idx} style={{ fontSize: "0.75rem", color: "#374151", marginBottom: 2 }}>
                        • Thiết bị <strong style={{ color: "var(--color-forest)" }}>{c.equipmentId}</strong> đang bị trễ cho đơn kế tiếp: <strong>{c.nextOrderId}</strong> ({c.nextCustomerName} - Hẹn nhận: {c.nextPickupTime}).
                        {c.availableSubstitutes.length > 0 ? (
                          <span style={{ color: "#15803D", marginLeft: 6 }}>
                            Gợi ý mã thay thế: <strong>{c.availableSubstitutes.slice(0, 3).join(", ")}</strong>
                          </span>
                        ) : (
                          <span style={{ color: "#DC2626", marginLeft: 6, fontWeight: 700 }}>
                            (Kho không còn mã thay thế)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {app.realApi && affectedOrdersBackend.length > 0 && (
                  <div style={{ background: "white", border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px", marginTop: 8 }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#B91C1C", marginBottom: 4 }}>
                      ĐƠN ĐẶT KẾ TIẾP BỊ ẢNH HƯỞNG BỞI THIẾT BỊ TRỄ HẠN:
                    </div>
                    {affectedOrdersBackend.map((item, idx) => (
                      <div key={idx} style={{ fontSize: "0.75rem", color: "#374151", marginBottom: 2 }}>
                        • {String(item.maDonHienThi || item.maDonThue || `Đơn #${idx + 1}`)} — {String(item.tenSanPham || item.tenKhachHang || "Cần điều phối thiết bị dự phòng")}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Form Lập Phiếu Nhận Trả Từng Đợt (khi còn thiết bị nợ) */}
            {debtRows.length > 0 && (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-forest)", padding: "18px", marginBottom: 20 }}>
                <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                  <div>
                    <span style={{ background: "var(--color-forest)", color: "white", padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>
                      ĐỢT TRẢ SỐ {currentReturnRound}
                    </span>
                    <h4 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--color-bark)", margin: "4px 0 0" }}>
                      Lập Phiếu Nhận Trả ({order.displayCode || order.id})
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      const allSel: Record<string, boolean> = {};
                      debtRows.forEach((row) => {
                        allSel[row.key] = true;
                      });
                      setSelectedItemsToReturn(allSel);
                    }}
                    style={{ background: "var(--color-parchment)", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                  >
                    Chọn tất cả {debtRows.length} món nợ
                  </button>
                </div>

                <p style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 12 }}>
                  Tick chọn những thiết bị khách mang đến trả lần này. Những món chưa chọn sẽ giữ nguyên trạng thái nợ thiết bị.
                </p>

                <div className="flex flex-col gap-3">
                  {debtRows.map((row) => {
                    const isSelected = !!selectedItemsToReturn[row.key];
                    const cond = itemConditions[row.key] || "Bình thường";
                    const fee = itemSurcharges[row.key] || 0;

                    return (
                      <div key={row.key} style={{ background: isSelected ? "#F0FDF4" : "#F9FAFB", border: `1px solid ${isSelected ? "#86EFAC" : "var(--color-bone)"}`, borderRadius: 10, padding: "12px 14px" }}>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(row.key, row.compensation, row.maChiTietBanGiao)}
                            style={{ width: 18, height: 18, accentColor: "var(--color-forest)", cursor: "pointer" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", fontSize: "0.85rem" }}>
                                {row.displayCode}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{row.productName}</span>
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>
                              Giá trị bồi thường tham chiếu: {fmt(row.compensation)}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #CBD5E1" }}>
                            <div className="flex flex-wrap gap-2 items-center mb-2">
                              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>Tình trạng nhận lại:</span>
                              {(["Bình thường", "Cần vệ sinh", "Hỏng nhẹ", "Hỏng nặng", "Thiếu phụ kiện", "Mất thiết bị"] as ReturnReceiptItem["condition"][]).map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => handleConditionChange(row.key, c, row.compensation)}
                                  style={{
                                    border: "1px solid",
                                    borderColor: cond === c ? "var(--color-forest)" : "var(--color-bone)",
                                    background: cond === c ? "var(--color-forest)" : "white",
                                    color: cond === c ? "white" : "var(--color-bark)",
                                    borderRadius: 6,
                                    padding: "3px 8px",
                                    fontSize: "0.72rem",
                                    cursor: "pointer",
                                    fontWeight: cond === c ? 700 : 500,
                                  }}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>

                            <div className="flex gap-2 items-center flex-wrap">
                              <input
                                placeholder="Ghi chú chi tiết lỗi/hư hỏng hoặc tình trạng..."
                                value={itemNotes[row.key] || ""}
                                onChange={(e) => setItemNotes((prev) => ({ ...prev, [row.key]: e.target.value }))}
                                style={{ flex: 1, minWidth: 200, border: "1px solid var(--color-bone)", borderRadius: 6, padding: "5px 8px", fontSize: "0.8rem", background: "white" }}
                              />
                              <div className="flex items-center gap-1">
                                <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>Phụ phí:</span>
                                <input
                                  type="number"
                                  value={fee}
                                  onChange={(e) => setItemSurcharges((prev) => ({ ...prev, [row.key]: Number(e.target.value) }))}
                                  style={{ width: 110, border: "1px solid var(--color-bone)", borderRadius: 6, padding: "5px 8px", fontSize: "0.8rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: fee > 0 ? "#DC2626" : "inherit" }}
                                />
                                <span style={{ fontSize: "0.75rem" }}>đ</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 12 }}>
                  <input
                    placeholder="Ghi chú chung của nhân viên nhận trả đợt này (tùy chọn)..."
                    value={returnStaffNote}
                    onChange={(e) => setReturnStaffNote(e.target.value)}
                    style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.82rem", background: "white" }}
                  />
                </div>

                {(() => {
                  const selCount = debtRows.filter((r) => selectedItemsToReturn[r.key]).length;
                  const remainAfter = debtRows.length - selCount;
                  return (
                    <div style={{ marginTop: 12, background: remainAfter > 0 ? "#FFF7ED" : "#DCFCE7", border: `1px solid ${remainAfter > 0 ? "#FFEDD5" : "#BBF7D0"}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem", color: remainAfter > 0 ? "#C2410C" : "#15803D" }}>
                      {remainAfter > 0 ? (
                        <>
                          <strong>Nhận trả một phần:</strong> Khách trả {selCount} món, còn nợ lại <strong>{remainAfter} món</strong>. Đơn vẫn giữ trạng thái <strong>Đang thuê</strong> cho đến khi thu hồi đủ.
                        </>
                      ) : (
                        <>
                          <strong>Hoàn tất nhận trả (Lần trả cuối):</strong> Toàn bộ {debtRows.length} thiết bị còn lại sẽ được thu hồi / xử lý, sẵn sàng bước <strong>Đối soát cọc</strong>.
                        </>
                      )}
                    </div>
                  );
                })()}

                <button
                  disabled={returnBusy}
                  onClick={handleCreateReceipt}
                  style={{ marginTop: 14, background: "var(--color-forest)", color: "white", padding: "10px 22px", borderRadius: 8, border: "none", cursor: returnBusy ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.9rem" }}
                >
                  {returnBusy ? "Đang xử lý..." : `✓ Xác nhận lập Phiếu Nhận Trả Đợt ${currentReturnRound}`}
                </button>
              </div>
            )}

            {/* Lịch sử các đợt nhận trả đã lập (Backend realApi) */}
            {app.realApi && returnReceiptsBackend.length > 0 && (
              <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: 16, marginBottom: 20 }}>
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12 }}>
                  Lịch sử các đợt nhận trả ({returnReceiptsBackend.length} phiếu)
                </h4>
                <div className="flex flex-col gap-2">
                  {returnReceiptsBackend.map((rc) => {
                    const isClosed = rc.trangThai === "DaChot";
                    return (
                      <div key={rc.maPhieu} style={{ background: "var(--color-parchment)", borderRadius: 8, padding: "10px 14px", border: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontSize: "0.85rem" }}>
                              {rc.maPhieuHienThi}
                            </strong>
                            <span style={{ fontSize: "0.72rem", background: rc.laLanTraCuoi ? "#DCFCE7" : "#FFF7ED", color: rc.laLanTraCuoi ? "#15803D" : "#C2410C", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>
                              {rc.laLanTraCuoi ? "Lần trả cuối" : `Đợt ${rc.lanTra}`}
                            </span>
                            <span style={{ fontSize: "0.7rem", background: isClosed ? "#DCFCE7" : "#FEF3C7", color: isClosed ? "#15803D" : "#B45309", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>
                              {isClosed ? "Đã chốt" : rc.trangThai}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: 2 }}>
                            {rc.thoiDiemChot || rc.thoiDiemLap} · {rc.tenNhanVienLucNhan || "Nhân viên kho"} · {rc.chiTiet.length} thiết bị
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isClosed && (
                            <button
                              disabled={returnBusy}
                              onClick={() => handleCloseBackendReceipt(rc.maPhieu)}
                              style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: "0.74rem", cursor: "pointer", fontWeight: 700 }}
                            >
                              Chốt phiếu
                            </button>
                          )}
                          <button
                            onClick={() => setViewingBackendReceipt(rc)}
                            style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                          >
                            Xem phiếu
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lịch sử các đợt nhận trả (Mock mode) */}
            {!app.realApi && (order.returnReceipts?.length || 0) > 0 && (
              <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: 16, marginBottom: 20 }}>
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12 }}>
                  Lịch sử các đợt nhận trả ({order.returnReceipts?.length} phiếu)
                </h4>
                <div className="flex flex-col gap-2">
                  {order.returnReceipts?.map((rc) => (
                    <div key={rc.id} style={{ background: "var(--color-parchment)", borderRadius: 8, padding: "10px 14px", border: "1px solid var(--color-bone)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontSize: "0.85rem" }}>{rc.id}</strong>
                          <span style={{ fontSize: "0.72rem", background: rc.isFinalReturn ? "#DCFCE7" : "#FFF7ED", color: rc.isFinalReturn ? "#15803D" : "#C2410C", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>
                            {rc.isFinalReturn ? "Lần trả cuối" : `Đợt ${rc.returnRound}`}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                          {rc.returnedAt} · Người nhận: {rc.staffName} · {rc.items.length} thiết bị
                        </div>
                      </div>
                      <button onClick={() => setViewingReceipt(rc)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}>
                        Xem phiếu
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danh sách phụ phí đã đề xuất */}
            {displaySurcharges.length > 0 && (
              <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: 16, marginBottom: 20 }}>
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10 }}>Phụ phí bồi thường & trễ hạn</h4>
                {displaySurcharges.map((s) => (
                  <div key={s.id} style={{ background: "#FFF7ED", borderRadius: 8, padding: "10px 14px", border: "1px solid #FED7AA", marginBottom: 8 }}>
                    <div className="flex justify-between items-center gap-3 flex-wrap">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{s.type} — {s.equipmentId}</div>
                        <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>{s.reason}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#DC2626" }}>+{fmt(s.amount)}</span>
                        <span style={{ background: s.status === "Đã duyệt" ? "#DCFCE7" : s.status === "Từ chối" ? "#FEE2E2" : "#FEF3C7", color: s.status === "Đã duyệt" ? "#15803D" : s.status === "Từ chối" ? "#B91C1C" : "#B45309", padding: "3px 8px", borderRadius: 8, fontSize: "0.7rem", fontWeight: 600 }}>
                          {s.status}
                        </span>
                        {s.status === "Chờ duyệt" && (
                          <>
                            <button
                              disabled={returnBusy}
                              onClick={() => handleApproveSurcharge(s)}
                              style={{ background: "#15803D", color: "white", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: "0.7rem", cursor: "pointer", fontWeight: 700 }}
                            >
                              Duyệt
                            </button>
                            {app.realApi && s.backendId && (
                              <button
                                disabled={returnBusy}
                                onClick={() => {
                                  setRejectingSurchargeId(s.id);
                                  setRejectReason("");
                                }}
                                style={{ background: "white", color: "#B91C1C", border: "1px solid #FCA5A5", borderRadius: 6, padding: "3px 8px", fontSize: "0.7rem", cursor: "pointer", fontWeight: 700 }}
                              >
                                Từ chối
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {rejectingSurchargeId === s.id && (
                      <div className="flex gap-2 items-center mt-2 pt-2" style={{ borderTop: "1px dashed #FDBA74" }}>
                        <input
                          placeholder="Nhập lý do từ chối phụ phí..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          style={{ flex: 1, border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", fontSize: "0.78rem", background: "white" }}
                        />
                        <button
                          disabled={returnBusy}
                          onClick={() => handleRejectSurcharge(s)}
                          style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: "0.74rem", cursor: "pointer", fontWeight: 700 }}
                        >
                          Xác nhận từ chối
                        </button>
                        <button
                          onClick={() => setRejectingSurchargeId(null)}
                          style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", fontSize: "0.74rem", cursor: "pointer" }}
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Chuyển sang Chờ đối soát (mock) hoặc mở bảng đối soát trực tiếp (realApi / Chờ đối soát) */}
            {!app.realApi && order.status === "Đã nhận trả" && (
              <div style={{ background: "#EFF6FF", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", border: "1px solid #BFDBFE" }}>
                <div style={{ fontWeight: 700, color: "#1D4ED8", marginBottom: "4px" }}>✓ Toàn bộ thiết bị đã nhận trả xong</div>
                <div style={{ fontSize: "0.82rem", color: "#1E40AF", marginBottom: "10px" }}>Chuyển đơn sang Chờ đối soát để lập lệnh hoàn cọc hoặc thu thêm.</div>
                <button
                  onClick={() => app.advanceOrderStatus(order.id, "Chờ đối soát")}
                  style={{ background: "#1D4ED8", color: "white", padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}
                >
                  Chuyển sang Chờ đối soát →
                </button>
              </div>
            )}

            {(order.status === "Chờ đối soát" || (app.realApi && order.status === "Đã nhận trả")) && (
              <div style={{ marginTop: 20 }}>
                <ReconciliationSheet
                  order={order}
                  app={app}
                  userRole={app.currentUser?.role === "Quản trị viên" ? "admin" : "staff"}
                  onAfterMutation={async () => {
                    await Promise.all([loadReturnData(), hydrateOperationalOrder(order.id)]);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Modal xem chi tiết Phiếu Nhận Trả Backend */}
        {viewingBackendReceipt && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
            <div style={{ background: "white", borderRadius: 16, maxWidth: 640, width: "100%", padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span style={{ fontSize: "0.72rem", background: viewingBackendReceipt.laLanTraCuoi ? "#DCFCE7" : "#FFF7ED", color: viewingBackendReceipt.laLanTraCuoi ? "#15803D" : "#C2410C", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                    {viewingBackendReceipt.laLanTraCuoi ? "LẦN NHẬN TRẢ CUỐI CÙNG" : `PHIẾU NHẬN TRẢ ĐỢT ${viewingBackendReceipt.lanTra}`}
                  </span>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--color-bark)", marginTop: 4 }}>
                    Phiếu Nhận Trả: {viewingBackendReceipt.maPhieuHienThi}
                  </h3>
                </div>
                <button onClick={() => setViewingBackendReceipt(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, fontSize: "0.82rem", marginBottom: 14 }}>
                <div><strong>Đơn thuê:</strong> {order?.displayCode || viewingBackendReceipt.maDonThue}</div>
                <div><strong>Thời điểm lập / chốt:</strong> {viewingBackendReceipt.thoiDiemChot || viewingBackendReceipt.thoiDiemLap}</div>
                <div><strong>Nhân viên nhận:</strong> {viewingBackendReceipt.tenNhanVienLucNhan || "Nhân viên kho"}</div>
                <div><strong>Trạng thái:</strong> {viewingBackendReceipt.trangThai} · Còn nợ sau phiếu: {viewingBackendReceipt.soThietBiConNo} chiếc</div>
                <div><strong>Ghi chú:</strong> {viewingBackendReceipt.ghiChu || "Không có"}</div>
              </div>

              <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>Chi tiết thiết bị trong phiếu:</strong>
              <div className="flex flex-col gap-2 mt-2 mb-4">
                {viewingBackendReceipt.chiTiet.map((ct) => {
                  const isLost = ct.ketLuan === "MatThietBi";
                  const lostApproved = Boolean(ct.thoiDiemDuyetMat);
                  const canSplit = viewingBackendReceipt.trangThai !== "DaChot" && viewingBackendReceipt.chiTiet.length > 1;
                  return (
                    <div key={ct.maChiTietNhanTra} style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>
                          {ct.maThietBiHienThi}
                        </strong>{" "}
                        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{ct.tenSanPham}</span>
                        <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                          Kết luận: <strong>{ct.tinhTrangSauThue || ct.ketLuan || "Chưa kết luận"}</strong>
                          {ct.ghiChu ? ` · ${ct.ghiChu}` : ""}
                        </div>
                        {lostApproved && (
                          <div style={{ fontSize: "0.72rem", color: "#15803D", fontWeight: 600 }}>
                            ✓ Đã duyệt mất bởi {ct.tenNguoiDuyetMat || "Quản trị viên"}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isLost && !lostApproved && (
                          <button
                            disabled={returnBusy}
                            onClick={() => {
                              setApproveLostTarget({ phieuId: viewingBackendReceipt.maPhieu, chiTiet: ct });
                              setLostBienBan(ct.bienBanMat || `Biên bản mất thiết bị ${ct.maThietBiHienThi}`);
                              const prod = app.products.find((p) => p.name === ct.tenSanPham);
                              setLostCompAmount(prod?.compensation || 1000000);
                            }}
                            style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                          >
                            Duyệt mất
                          </button>
                        )}
                        {canSplit && (
                          <button
                            disabled={returnBusy}
                            onClick={() => handleSplitPendingLine(viewingBackendReceipt.maPhieu, ct.maChiTietNhanTra)}
                            style={{ background: "white", color: "var(--color-bark)", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 10px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}
                          >
                            Tách chờ xử lý
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2">
                {viewingBackendReceipt.trangThai !== "DaChot" && (
                  <button
                    disabled={returnBusy}
                    onClick={() => handleCloseBackendReceipt(viewingBackendReceipt.maPhieu)}
                    style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}
                  >
                    ✓ Chốt phiếu nhận trả
                  </button>
                )}
                <button onClick={() => window.print()} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>
                  In phiếu
                </button>
                <button onClick={() => setViewingBackendReceipt(null)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Duyệt kết luận mất thiết bị */}
        {approveLostTarget && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 10000, display: "grid", placeItems: "center", padding: 20 }}>
            <div style={{ background: "white", borderRadius: 14, maxWidth: 460, width: "100%", padding: 22 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--color-bark)", marginBottom: 8 }}>
                Duyệt kết luận mất: {approveLostTarget.chiTiet.maThietBiHienThi}
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 12 }}>
                Thao tác này ghi nhận thiết bị thất lạc vĩnh viễn và liên kết phụ phí bồi thường vào phiếu nhận trả.
              </p>
              <label style={{ fontSize: "0.76rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Biên bản xác nhận mất</label>
              <input
                value={lostBienBan}
                onChange={(e) => setLostBienBan(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.82rem", marginBottom: 10 }}
              />
              <label style={{ fontSize: "0.76rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Số tiền bồi thường đề nghị (đ)</label>
              <input
                type="number"
                value={lostCompAmount}
                onChange={(e) => setLostCompAmount(Number(e.target.value))}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.85rem", fontFamily: "var(--font-mono)", marginBottom: 10 }}
              />
              <label style={{ fontSize: "0.76rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Lý do duyệt</label>
              <textarea
                rows={2}
                value={lostApproveReason}
                onChange={(e) => setLostApproveReason(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 10px", fontSize: "0.82rem", marginBottom: 14 }}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setApproveLostTarget(null)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: "0.82rem" }}>
                  Hủy
                </button>
                <button
                  disabled={returnBusy}
                  onClick={handleConfirmApproveLost}
                  style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 8, padding: "7px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}
                >
                  {returnBusy ? "Đang duyệt..." : "Xác nhận duyệt mất"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal xem chi tiết Phiếu Nhận Trả PNT-... (Mock mode) */}
        {viewingReceipt && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
            <div style={{ background: "white", borderRadius: 16, maxWidth: 580, width: "100%", padding: 24 }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span style={{ fontSize: "0.72rem", background: viewingReceipt.isFinalReturn ? "#DCFCE7" : "#FFF7ED", color: viewingReceipt.isFinalReturn ? "#15803D" : "#C2410C", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                    {viewingReceipt.isFinalReturn ? "LẦN NHẬN TRẢ CUỐI CÙNG" : `PHIẾU NHẬN TRẢ ĐỢT ${viewingReceipt.returnRound}`}
                  </span>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--color-bark)", marginTop: 4 }}>
                    Phiếu Nhận Trả: {viewingReceipt.id}
                  </h3>
                </div>
                <button onClick={() => setViewingReceipt(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, fontSize: "0.82rem", marginBottom: 14 }}>
                <div><strong>Mã đơn thuê:</strong> {viewingReceipt.orderId}</div>
                <div><strong>Thời gian nhận:</strong> {viewingReceipt.returnedAt}</div>
                <div><strong>Nhân viên nhận:</strong> {viewingReceipt.staffName}</div>
                <div><strong>Ghi chú:</strong> {viewingReceipt.note || "Không có"}</div>
              </div>

              <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>Chi tiết thiết bị nhận trong đợt này:</strong>
              <div className="flex flex-col gap-2 mt-2 mb-4">
                {viewingReceipt.items.map((it) => (
                  <div key={it.equipmentId} style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{it.equipmentId}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Tình trạng: <strong>{it.condition}</strong> {it.note ? `(${it.note})` : ""}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {it.condition === "Mất thiết bị" && !it.lostApproved && (
                        <button
                          onClick={() => {
                            const res = app.approveLostEquipment(viewingReceipt.orderId, it.equipmentId, "Quản trị viên");
                            if (res.ok) {
                              setReturnSuccess(`Đã duyệt kết luận mất cho thiết bị ${it.equipmentId}.`);
                              setViewingReceipt((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      items: prev.items.map((x) =>
                                        x.equipmentId === it.equipmentId ? { ...x, lostApproved: true } : x
                                      ),
                                    }
                                  : null
                              );
                            }
                          }}
                          style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 4, padding: "2px 8px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          Duyệt mất
                        </button>
                      )}
                      {it.surchargeAmount > 0 && (
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#DC2626", fontSize: "0.85rem" }}>
                          +{fmt(it.surchargeAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => window.print()} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}>
                  In phiếu
                </button>
                <button onClick={() => setViewingReceipt(null)} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nhật ký cuộc gọi & Xử lý quá hạn (UC4.4) */}
        {showContactModal && order && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
            <div style={{ background: "white", borderRadius: 16, maxWidth: 620, width: "100%", padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span style={{ fontSize: "0.72rem", background: "#FEE2E2", color: "#DC2626", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                    XỬ LÝ ĐƠN QUÁ HẠN (UC4.4)
                  </span>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-bark)", marginTop: 4 }}>
                    Nhật ký liên hệ đơn {order.displayCode || order.id}
                  </h3>
                  <div style={{ fontSize: "0.82rem", color: "#4B5563" }}>
                    Khách hàng: <strong>{order.customerName}</strong> {order.customerPhone ? `(${order.customerPhone})` : ""}
                  </div>
                </div>
                <button onClick={() => setShowContactModal(false)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
              </div>

              {contactNotice && (
                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: "0.8rem" }}>
                  {contactNotice}
                </div>
              )}

              {/* Lịch sử các cuộc gọi trước */}
              <div style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>
                  Lịch sử các lần liên hệ ({order.contactLogs?.length || 0} lần):
                </strong>
                <div className="flex flex-col gap-2 mt-2" style={{ maxHeight: 180, overflowY: "auto" }}>
                  {(order.contactLogs?.length || 0) === 0 ? (
                    <div style={{ fontSize: "0.8rem", color: "#9CA3AF", fontStyle: "italic", background: "#F9FAFB", padding: "8px 12px", borderRadius: 6 }}>
                      Chưa có lịch sử liên hệ nào. Vui lòng ghi lại kết quả cuộc gọi bên dưới.
                    </div>
                  ) : (
                    order.contactLogs?.map((log) => (
                      <div key={log.id} style={{ background: "#F9FAFB", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px" }}>
                        <div className="flex justify-between items-center mb-1">
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-forest)" }}>
                            {log.staffName} · {log.contactedAt}
                          </span>
                          <span style={{ fontSize: "0.7rem", background: "#FEF3C7", color: "#B45309", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                            {log.outcome}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#374151" }}>{log.note}</div>
                        {log.newExpectedTime && (
                          <div style={{ fontSize: "0.72rem", color: "#1D4ED8", marginTop: 2 }}>
                            Khách hẹn trả mới: <strong>{log.newExpectedTime}</strong>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Form ghi nhận lần gọi mới */}
              <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)", marginBottom: 16 }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)", display: "block", marginBottom: 8 }}>
                  + Ghi nhận cuộc gọi mới trong ca trực:
                </strong>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 2 }}>Kết quả liên hệ *</label>
                    <select
                      value={contactOutcome}
                      onChange={(e) => setContactOutcome(e.target.value as typeof contactOutcome)}
                      style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 8px", fontSize: "0.82rem", background: "white" }}
                    >
                      <option value="Hẹn giờ trả mới">Khách hẹn giờ trả mới</option>
                      <option value="Xin gia hạn thêm">Khách xin gia hạn thuê thêm</option>
                      <option value="Không nghe máy">Không nghe máy / Thuê bao</option>
                      <option value="Khách báo mất">Khách báo mất thiết bị</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 2 }}>Hạn hẹn mới (nếu có)</label>
                    <input
                      placeholder="VD: 18:00 ngày mai"
                      value={newExpectedTime}
                      onChange={(e) => setNewExpectedTime(e.target.value)}
                      style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 8px", fontSize: "0.82rem", background: "white" }}
                    />
                  </div>
                </div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 2 }}>Ghi chú nội dung cuộc gọi *</label>
                <textarea
                  placeholder="Ghi rõ lý do trễ, cam kết của khách..."
                  value={contactNote}
                  onChange={(e) => setContactNote(e.target.value)}
                  rows={2}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 8px", fontSize: "0.82rem", background: "white", resize: "none" }}
                />
                <button
                  type="button"
                  onClick={handleSaveContactLog}
                  style={{ marginTop: 8, background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
                >
                  Lưu vào lịch sử liên hệ
                </button>
              </div>

              <div className="flex justify-end">
                <button onClick={() => setShowContactModal(false)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Equipment & Maintenance Tab (UC16) ───────────────────────────────────────
function EquipmentTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [subTab, setSubTab] = useState<"inventory" | "maintenance" | "import">("inventory");
  const [filter, setFilter] = useState("Tất cả");
  const [productFilter, setProductFilter] = useState("Tất cả");
  const [transferModal, setTransferModal] = useState<Equipment | null>(null);
  const [targetProductId, setTargetProductId] = useState("");
  const [viewingLifecycle, setViewingLifecycle] = useState<Equipment | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // State UC7.3 & UC7.7: Nhập hàng & Kiểm nhận cho nhân viên kho
  const [inspectingImportReceipt, setInspectingImportReceipt] = useState<ImportReceipt | null>(null);
  const [viewingSupplierProfile, setViewingSupplierProfile] = useState<Supplier | null>(null);
  const [importSearch, setImportSearch] = useState("");
  const [importStatusFilter, setImportStatusFilter] = useState("Tất cả");

  // State UC6.12: Tạo phiếu bảo trì
  const [showCreateMaintenanceModal, setShowCreateMaintenanceModal] = useState(false);
  const [createMaintEquipId, setCreateMaintEquipId] = useState("");
  const [createMaintIssue, setCreateMaintIssue] = useState("");
  const [createMaintCost, setCreateMaintCost] = useState(150000);
  const [createMaintOrderId, setCreateMaintOrderId] = useState("");
  const [createMaintNote, setCreateMaintNote] = useState("");

  // State UC6.13: Nghiệm thu bảo trì
  const [acceptingMaintenance, setAcceptingMaintenance] = useState<MaintenanceReceipt | null>(null);
  const [actualRepairCost, setActualRepairCost] = useState(0);
  const [repairOutcome, setRepairOutcome] = useState<"Hoàn tất" | "Không thể sửa">("Hoàn tất");
  const [repairOutcomeNote, setRepairOutcomeNote] = useState("");
  const [equipBusy, setEquipBusy] = useState(false);
  const [equipError, setEquipError] = useState<string | null>(null);
  const [equipSuccess, setEquipSuccess] = useState<string | null>(null);

  const products = ["Tất cả", ...Array.from(new Set(app.products.map((p) => p.name)))];
  const statuses = ["Tất cả", "Sẵn sàng", "Đang thuê", "Đang bảo trì", "Thất lạc", "Ngừng sử dụng"];

  const filtered = app.equipment.filter((e) => {
    const matchStatus = filter === "Tất cả" || e.equipmentStatus === filter;
    const pname = app.products.find((p) => p.id === e.productId)?.name || "";
    const matchProduct = productFilter === "Tất cả" || pname === productFilter;
    return matchStatus && matchProduct;
  });

  const statusStyle: Record<string, { bg: string; text: string }> = {
    "Sẵn sàng": { bg: "#DCFCE7", text: "#15803D" },
    "Đang thuê": { bg: "#DBEAFE", text: "#1D4ED8" },
    "Đang bảo trì": { bg: "#FEF3C7", text: "#B45309" },
    "Thất lạc": { bg: "#FEE2E2", text: "#DC2626" },
    "Ngừng sử dụng": { bg: "#F3F4F6", text: "#6B7280" },
  };

  const handleTransfer = async () => {
    if (!transferModal || !targetProductId) return;
    setEquipError(null);
    setEquipSuccess(null);

    if (app.realApi || isRealApiEnabled()) {
      setEquipBusy(true);
      try {
        const targetProduct = app.products.find((p) => p.id === targetProductId);
        const equipIdNum = transferModal.backendId ?? (Number(transferModal.id) || parseInt(transferModal.id.replace(/\D/g, ""), 10));
        const targetSpIdNum = targetProduct?.backendId ?? (Number(targetProductId) || parseInt(targetProductId.replace(/\D/g, ""), 10));
        if (!equipIdNum || !targetSpIdNum) {
          throw new Error("Không xác định được mã thiết bị hoặc sản phẩm đích hợp lệ.");
        }
        const checkImpact = await equipmentApi.xemAnhHuongThayDoi(equipIdNum, {
          loaiThayDoi: "GiangCap",
          maSanPhamDich: targetSpIdNum,
        });
        if (!checkImpact.coTheApDungHienTai) {
          setEquipError(`Cảnh báo cam kết: Không thể điều chuyển do vướng đơn thuê: ${checkImpact.vuongMac.join("; ")}`);
          return;
        }
        await equipmentApi.deNghiDieuChuyenSanPham(equipIdNum, {
          maSanPhamDich: targetSpIdNum,
          lyDo: "Giáng cấp / điều chuyển thiết bị sang phân khúc sản phẩm đích",
        });
        await Promise.all([app.refreshEquipment?.(), app.refreshCatalog?.()]);
        setEquipSuccess(`Đã chuyển thiết bị ${transferModal.displayCode || transferModal.id} sang sản phẩm đích.`);
        setTransferModal(null);
      } catch (err) {
        setEquipError(err instanceof Error ? err.message : "Lỗi gửi đề nghị điều chuyển thiết bị.");
      } finally {
        setEquipBusy(false);
      }
      return;
    }

    const res = app.transferEquipment(transferModal.id, targetProductId);
    if (res.ok) {
      setEquipSuccess(`Đã chuyển thiết bị ${transferModal.displayCode || transferModal.id} sang sản phẩm đích.`);
      setTransferModal(null);
    } else {
      setEquipError(res.message);
    }
  };

  return (
    <div>
      {equipError && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.82rem", fontWeight: 600 }}>
          {equipError}
        </div>
      )}
      {equipSuccess && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: "0.82rem", fontWeight: 600 }}>
          {equipSuccess}
        </div>
      )}
      {/* Sub tabs: Kho / Phiếu bảo trì / Nhập hàng */}
      <div className="flex gap-2 mb-4 border-b border-bone pb-2 flex-wrap">
        <button onClick={() => setSubTab("inventory")}
          style={{ background: subTab === "inventory" ? "var(--color-forest)" : "white", color: subTab === "inventory" ? "white" : "var(--color-bark)", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
          📦 Danh sách kho ({app.equipment.length} thiết bị)
        </button>
        <button onClick={() => setSubTab("maintenance")}
          style={{ background: subTab === "maintenance" ? "var(--color-forest)" : "white", color: subTab === "maintenance" ? "white" : "var(--color-bark)", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
          🛠 Phiếu bảo trì & sửa chữa ({app.maintenanceReceipts.length} phiếu)
        </button>
        <button onClick={() => setSubTab("import")}
          style={{ background: subTab === "import" ? "var(--color-forest)" : "white", color: subTab === "import" ? "white" : "var(--color-bark)", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
          🚚 Nhập hàng & Kiểm nhận ({app.importReceipts.length} phiếu)
        </button>
      </div>

      {subTab === "inventory" && (
        <div>
          <div className="flex gap-3 mb-4 flex-wrap items-center">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              aria-label="Lọc theo trạng thái thiết bị"
              style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 12px", fontSize: "0.85rem", background: "white" }}
            >
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}
              aria-label="Lọc theo sản phẩm"
              style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 12px", fontSize: "0.85rem", background: "white" }}
            >
              {products.map((s) => <option key={s}>{s}</option>)}
            </select>
            <div className="flex gap-2 flex-wrap">
              {["Sẵn sàng", "Đang thuê", "Đang bảo trì", "Thất lạc"].map((s) => {
                const cnt = app.equipment.filter((e) => e.equipmentStatus === s).length;
                const style = statusStyle[s];
                return <div key={s} style={{ background: style.bg, color: style.text, padding: "5px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700 }}>{s}: {cnt}</div>;
              })}
            </div>
            <button onClick={() => setShowAuditModal(true)}
              style={{ background: "var(--color-amber)", color: "white", padding: "7px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", marginLeft: "auto" }}>
              📋 Kiểm kê kho (UC6.10)
            </button>
          </div>

          <div className="responsive-table" style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
                  {["Mã thiết bị", "Sản phẩm hiện tại", "Phiếu nhập", "Ngày nhập", "Tình trạng", "Trạng thái", "Số lần thuê", "Thao tác"].map((h) => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const p = app.products.find((pr) => pr.id === e.productId);
                  const origP = app.products.find((pr) => pr.id === e.originalProductId);
                  const moved = e.productId !== e.originalProductId;
                  const st = statusStyle[e.equipmentStatus] || { bg: "#F3F4F6", text: "#374151" };
                  return (
                    <tr key={e.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-forest)" }}>{e.displayCode || e.id}</td>
                      <td style={{ padding: "9px 12px", fontSize: "0.82rem" }}>
                        <div style={{ fontWeight: 600 }}>{p?.name}</div>
                        {moved && <div style={{ fontSize: "0.68rem", color: "var(--color-amber)", fontWeight: 700 }}>↳ Giáng cấp/chuyển từ {origP?.name}</div>}
                      </td>
                      <td style={{ padding: "9px 12px", fontSize: "0.78rem", color: "#9CA3AF", fontFamily: "var(--font-mono)" }}>{e.importReceiptId}</td>
                      <td style={{ padding: "9px 12px", fontSize: "0.78rem", color: "#6B7280" }}>{e.importDate}</td>
                      <td style={{ padding: "9px 12px", fontSize: "0.8rem", color: "#6B7280" }}>{e.condition}</td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{ background: st.bg, color: st.text, padding: "2px 8px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 600 }}>{e.equipmentStatus}</span>
                      </td>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", textAlign: "center" }}>{e.rentCount}</td>
                      <td style={{ padding: "9px 12px" }}>
                        <div className="flex gap-1">
                          <button onClick={() => setViewingLifecycle(e)}
                            style={{ background: "white", border: "1px solid var(--color-forest)", color: "var(--color-forest)", borderRadius: 6, padding: "3px 8px", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}>
                            🔍 Sổ đời
                          </button>
                          {e.equipmentStatus === "Sẵn sàng" && (
                            <button onClick={() => { setTransferModal(e); setTargetProductId(""); }}
                              style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "3px 8px", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}>
                              Chuyển loại
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Modal chuyển loại thiết bị (giáng cấp cũ sang tiết kiệm) */}
          {transferModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
              <div style={{ background: "white", borderRadius: 14, maxWidth: 460, width: "100%", padding: 20 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-bark)", marginBottom: 8 }}>
                  Chuyển loại thiết bị: {transferModal.displayCode || transferModal.id}
                </h3>
                <p style={{ fontSize: "0.82rem", color: "#6B7280", marginBottom: 12 }}>
                  Dùng khi thiết bị cũ khấu hao (ví dụ từ Tiêu chuẩn sang Tiết kiệm).
                </p>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Sản phẩm đích mới:</label>
                <select value={targetProductId} onChange={(e) => setTargetProductId(e.target.value)}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px", fontSize: "0.85rem", marginBottom: 14, background: "white" }}>
                  <option value="">-- Chọn sản phẩm đích --</option>
                  {app.products.filter((p) => p.id !== transferModal.productId && p.status === "active").map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({fmt(p.pricePerDay)}/ngày)</option>
                  ))}
                </select>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setTransferModal(null)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>Hủy</button>
                  <button disabled={!targetProductId} onClick={handleTransfer} style={{ background: targetProductId ? "var(--color-forest)" : "#9CA3AF", color: "white", border: "none", borderRadius: 6, padding: "6px 16px", cursor: targetProductId ? "pointer" : "not-allowed", fontWeight: 700 }}>Xác nhận chuyển</button>
                </div>
              </div>
            </div>
          )}

          {viewingLifecycle && <EquipmentLifecycleModal equipment={viewingLifecycle} app={app} onClose={() => setViewingLifecycle(null)} />}
          {showAuditModal && <InventoryAuditModal app={app} onClose={() => setShowAuditModal(false)} />}
        </div>
      )}

      {subTab === "maintenance" && (
        /* Tab Phiếu bảo trì (UC6.12 & UC6.13) */
        <div>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--color-bark)" }}>
                Hồ sơ bảo trì & sửa chữa thiết bị
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                Ghi nhận các thiết bị hư hỏng, ước tính kinh phí và nghiệm thu đưa về kho Sẵn sàng.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const firstAvailable = app.equipment.find((e) => e.equipmentStatus !== "Ngừng sử dụng")?.id || "";
                setCreateMaintEquipId(firstAvailable);
                setShowCreateMaintenanceModal(true);
              }}
              style={{ background: "var(--color-forest)", color: "white", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}
            >
              + Tạo phiếu bảo trì (UC6.12)
            </button>
          </div>

          <div className="responsive-table" style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
                  {["Mã phiếu", "Mã thiết bị", "Mô tả lỗi / Hư hỏng", "Đơn liên quan", "Ngày tạo", "Dự tính", "Thực tế", "Trạng thái", "Thao tác"].map((h) => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {app.maintenanceReceipts.map((m, i) => {
                  const matchedEquip = app.equipment.find(
                    (eq) => eq.id === m.equipmentId || eq.displayCode === m.equipmentId
                  );
                  const equipDisplay = matchedEquip?.displayCode || m.equipmentId;
                  return (
                  <tr key={m.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-forest)" }}>{m.displayCode || m.id}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{equipDisplay}</td>
                    <td style={{ padding: "9px 12px", fontSize: "0.82rem" }}>
                      <div>{m.issueDescription}</div>
                      {m.note && <div style={{ fontSize: "0.7rem", color: "#6B7280" }}>{m.note}</div>}
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: "#6B7280" }}>{m.orderId || "—"}</td>
                    <td style={{ padding: "9px 12px", fontSize: "0.78rem", color: "#6B7280" }}>{m.createdAt}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 700 }}>{fmt(m.estimatedCost)}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 700, color: m.actualCost ? "var(--color-forest)" : "#9CA3AF" }}>
                      {m.actualCost !== undefined ? fmt(m.actualCost) : "—"}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{
                        background: m.status === "Hoàn tất" ? "#DCFCE7" : m.status === "Đang bảo dưỡng" ? "#FEF3C7" : m.status === "Không thể sửa" ? "#FEE2E2" : "#F3F4F6",
                        color: m.status === "Hoàn tất" ? "#15803D" : m.status === "Đang bảo dưỡng" ? "#B45309" : m.status === "Không thể sửa" ? "#DC2626" : "#4B5563",
                        padding: "3px 8px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700
                      }}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      {m.status !== "Hoàn tất" && m.status !== "Không thể sửa" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAcceptingMaintenance(m);
                            setActualRepairCost(m.actualCost ?? m.estimatedCost);
                            setRepairOutcome("Hoàn tất");
                            setRepairOutcomeNote(m.note || "Đã kiểm tra kỹ thuật và vệ sinh đạt chuẩn.");
                          }}
                          style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 700 }}
                        >
                          Nghiệm thu →
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Đã chốt</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 3: Nhập Hàng & Kiểm Nhận (UC7.3 - UC7.8) */}
      {subTab === "import" && (
        <div>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--color-bark)" }}>
                Quản lý nhập hàng & Kiểm nhận thực tế tại kho (UC7.3 - UC7.8)
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                Khi xe hàng tới kho, nhân viên kho mở biên bản kiểm nhận thực tế để đếm số lượng, phân loại đạt/lỗi/từ chối và chốt mã serial.
              </p>
            </div>
          </div>

          {/* Bộ lọc tìm kiếm cho nhân viên kho */}
          <div className="flex gap-3 mb-4 flex-wrap items-center" style={{ background: "white", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--color-bone)" }}>
            <input
              type="text"
              placeholder="🔍 Tìm mã phiếu, NCC, người lập..."
              value={importSearch}
              onChange={(e) => setImportSearch(e.target.value)}
              style={{ flex: 1, minWidth: 220, border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 10px", fontSize: "0.82rem" }}
            />
            <select
              value={importStatusFilter}
              onChange={(e) => setImportStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái phiếu"
              style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 10px", fontSize: "0.82rem", background: "white" }}
            >
              {["Tất cả", "Nháp", "Đã nhập kho", "Đã hủy"].map((s) => (
                <option key={s} value={s}>{s === "Tất cả" ? "Tất cả trạng thái" : s}</option>
              ))}
            </select>
            {(importSearch || importStatusFilter !== "Tất cả") && (
              <button
                type="button"
                onClick={() => { setImportSearch(""); setImportStatusFilter("Tất cả"); }}
                style={{ background: "none", border: "none", color: "#DC2626", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}
              >
                ✕ Xóa lọc
              </button>
            )}
          </div>

          <div className="responsive-table" style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
                  {["Mã phiếu", "Nhà cung cấp", "Ngày lập / Người lập", "Số lượng mặt hàng", "Trạng thái", "Thao tác"].map((h) => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {app.importReceipts
                  .slice()
                  .reverse()
                  .filter((r) => {
                    const matchStatus = importStatusFilter === "Tất cả" || r.status === importStatusFilter;
                    const q = importSearch.toLowerCase().trim();
                    const matchQ = !q ||
                      (r.displayCode ?? r.id).toLowerCase().includes(q) ||
                      r.supplierName.toLowerCase().includes(q) ||
                      r.createdBy.toLowerCase().includes(q);
                    return matchStatus && matchQ;
                  })
                  .map((r, i) => {
                    const totalQty = r.lines.reduce((s, l) => s + l.quantity, 0);
                    const supplier = app.suppliers.find((s) => s.id === r.supplierId || s.displayCode === r.supplierId);
                    return (
                      <tr key={r.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                        <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 700, color: "var(--color-forest)" }}>
                          {r.displayCode ?? r.id}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 700, fontSize: "0.86rem" }}>{r.supplierName}</div>
                          {supplier && (
                            <button
                              type="button"
                              onClick={() => setViewingSupplierProfile(supplier)}
                              style={{ background: "none", border: "none", color: "var(--color-forest)", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                            >
                              👁 Xem hồ sơ NCC (UC7.3)
                            </button>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "0.78rem", color: "#6B7280" }}>
                          <div>{r.createdAt}</div>
                          <div style={{ fontWeight: 500 }}>Bởi {r.createdBy}</div>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "0.82rem" }}>
                          <strong>{r.lines.length}</strong> dòng · <strong>{totalQty}</strong> thiết bị
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            background: r.status === "Đã nhập kho" ? "#DCFCE7" : r.status === "Đã hủy" ? "#F3F4F6" : "#FEF3C7",
                            color: r.status === "Đã nhập kho" ? "#15803D" : r.status === "Đã hủy" ? "#6B7280" : "#B45309",
                            padding: "3px 9px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700
                          }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {r.status === "Nháp" ? (
                            <button
                              type="button"
                              onClick={() => setInspectingImportReceipt(r)}
                              style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: "0.78rem", cursor: "pointer", fontWeight: 700, boxShadow: "0 2px 6px rgba(34, 197, 94, 0.25)" }}
                            >
                              📦 Kiểm nhận thực tế (UC7.7) →
                            </button>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                              {r.status === "Đã nhập kho" ? `✓ Đã nhập kho lúc ${r.confirmedAt}` : "Phiếu đã hủy"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* UC6.12: Modal Tạo Phiếu Bảo Trì */}
      {showCreateMaintenanceModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 500, width: "100%", padding: 24 }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#FEF3C7", color: "#B45309", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  UC6.12: TẠO PHIẾU BẢO TRÌ
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Lập phiếu sửa chữa thiết bị
                </h3>
              </div>
              <button type="button" onClick={() => setShowCreateMaintenanceModal(false)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Thiết bị cần bảo trì:</label>
              <select
                value={createMaintEquipId}
                onChange={(e) => setCreateMaintEquipId(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.82rem", background: "white" }}
              >
                {app.equipment.filter((e) => e.equipmentStatus !== "Ngừng sử dụng").map((e) => {
                  const p = app.products.find((prod) => prod.id === e.productId);
                  return (
                    <option key={e.id} value={e.id}>
                      {e.displayCode || e.id} - {p?.name} (Hiện tại: {e.equipmentStatus})
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Mô tả lỗi / Hư hỏng chi tiết:</label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Rách đường chỉ may bạt nóc 10cm, chốt khoá bị kẹt..."
                value={createMaintIssue}
                onChange={(e) => setCreateMaintIssue(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.82rem", resize: "vertical" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-12">
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Chi phí dự tính (đ):</label>
                <input
                  type="number"
                  value={createMaintCost}
                  onChange={(e) => setCreateMaintCost(Number(e.target.value))}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Đơn liên quan (nếu có):</label>
                <input
                  placeholder="Ví dụ: ORD-001"
                  value={createMaintOrderId}
                  onChange={(e) => setCreateMaintOrderId(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Ghi chú điều phối:</label>
              <input
                placeholder="Ví dụ: Gửi sang xưởng sửa chữa lều Q8..."
                value={createMaintNote}
                onChange={(e) => setCreateMaintNote(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateMaintenanceModal(false)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem" }}>
                Hủy
              </button>
              <button
                type="button"
                disabled={!createMaintEquipId || !createMaintIssue.trim()}
                onClick={async () => {
                  const selectedEquip = app.equipment.find((eq) => eq.id === createMaintEquipId);
                  const now = new Date().toLocaleString("vi-VN");
                  setEquipError(null);
                  setEquipSuccess(null);

                  if (app.realApi || isRealApiEnabled()) {
                    setEquipBusy(true);
                    try {
                      const equipIdNum = selectedEquip?.backendId ?? (Number(createMaintEquipId) || parseInt(createMaintEquipId.replace(/\D/g, ""), 10));
                      const orderIdNum = createMaintOrderId && !isNaN(Number(createMaintOrderId)) ? Number(createMaintOrderId) : undefined;
                      if (!equipIdNum) {
                        throw new Error("Không xác định được mã thiết bị hợp lệ.");
                      }
                      const res = await equipmentApi.lapPhieuBaoTri({
                        maThietBi: equipIdNum,
                        maDonThue: orderIdNum,
                        loaiXuLy: "SuaChua",
                        moTaLoi: createMaintIssue.trim(),
                        mucDo: "Nhe",
                        chiPhi: createMaintCost,
                        ghiChu: createMaintNote.trim(),
                      });
                      await Promise.all([app.refreshEquipment?.(), app.refreshMaintenanceReceipts?.()]);
                      setEquipSuccess(`Đã tạo phiếu bảo trì ${res?.maPhieuBaoTri ? `BT-${res.maPhieuBaoTri}` : ""} trên máy chủ.`);
                      setCreateMaintIssue("");
                      setCreateMaintNote("");
                      setShowCreateMaintenanceModal(false);
                    } catch (err) {
                      setEquipError(err instanceof Error ? err.message : "Lỗi lập phiếu bảo trì trên máy chủ.");
                    } finally {
                      setEquipBusy(false);
                    }
                    return;
                  }

                  app.saveMaintenanceReceipt({
                    id: `BT-${Date.now().toString().slice(-6)}`,
                    equipmentId: createMaintEquipId,
                    issueDescription: createMaintIssue.trim(),
                    estimatedCost: createMaintCost,
                    orderId: createMaintOrderId.trim() || undefined,
                    createdAt: now,
                    status: "Đang bảo dưỡng",
                    note: createMaintNote.trim(),
                  });
                  setEquipSuccess("Đã tạo phiếu bảo trì.");
                  setCreateMaintIssue("");
                  setCreateMaintNote("");
                  setShowCreateMaintenanceModal(false);
                }}
                style={{
                  background: (!createMaintEquipId || !createMaintIssue.trim()) ? "#9CA3AF" : "var(--color-forest)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: (!createMaintEquipId || !createMaintIssue.trim()) ? "not-allowed" : "pointer",
                }}
              >
                ✓ Tạo phiếu bảo trì
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UC6.13: Modal Nghiệm Thu Bảo Trì */}
      {acceptingMaintenance && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 480, width: "100%", padding: 24 }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span style={{ fontSize: "0.72rem", background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  UC6.13: NGHIỆM THU BẢO TRÌ
                </span>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-bark)", marginTop: 4 }}>
                  Nghiệm thu phiếu: {acceptingMaintenance.id}
                </h3>
              </div>
              <button type="button" onClick={() => setAcceptingMaintenance(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, marginBottom: 14, fontSize: "0.82rem" }}>
              <div>Thiết bị: <strong style={{ fontFamily: "var(--font-mono)" }}>{acceptingMaintenance.equipmentId}</strong></div>
              <div>Lỗi ban đầu: <strong>{acceptingMaintenance.issueDescription}</strong></div>
              <div>Dự tính: <strong>{fmt(acceptingMaintenance.estimatedCost)}</strong></div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Chi phí sửa chữa thực tế (đ):</label>
              <input
                type="number"
                value={actualRepairCost}
                onChange={(e) => setActualRepairCost(Number(e.target.value))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.95rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: 6 }}>Kết quả nghiệm thu:</label>
              <div className="flex flex-col gap-2">
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="repairOutcome"
                    checked={repairOutcome === "Hoàn tất"}
                    onChange={() => setRepairOutcome("Hoàn tất")}
                    style={{ accentColor: "var(--color-forest)" }}
                  />
                  <span>✓ <strong>Đạt chuẩn</strong> — Thiết bị hoạt động tốt, đưa về kho <strong>Sẵn sàng</strong></span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="repairOutcome"
                    checked={repairOutcome === "Không thể sửa"}
                    onChange={() => setRepairOutcome("Không thể sửa")}
                    style={{ accentColor: "#DC2626" }}
                  />
                  <span style={{ color: "#DC2626" }}>✕ <strong>Không thể sửa</strong> — Hư hỏng nặng, chuyển sang <strong>Ngừng sử dụng</strong></span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Ghi chú nghiệm thu:</label>
              <input
                value={repairOutcomeNote}
                onChange={(e) => setRepairOutcomeNote(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAcceptingMaintenance(null)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem" }}>
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  setEquipError(null);
                  setEquipSuccess(null);

                  if (app.realApi || isRealApiEnabled()) {
                    setEquipBusy(true);
                    try {
                      const maintIdNum = acceptingMaintenance.backendId ?? (Number(acceptingMaintenance.id) || parseInt(acceptingMaintenance.id.replace(/\D/g, ""), 10));
                      if (!maintIdNum) {
                        throw new Error("Không tìm thấy mã phiếu bảo trì hợp lệ.");
                      }
                      if (repairOutcome === "Hoàn tất") {
                        await equipmentApi.xacNhanHoanThanh(maintIdNum, {
                          ketQuaKiemTra: repairOutcomeNote || "Đạt chuẩn kỹ thuật",
                          chiPhi: actualRepairCost,
                          lyDo: repairOutcomeNote || "Nghiệm thu đạt chuẩn, đưa về kho Sẵn sàng",
                        });
                      } else {
                        await equipmentApi.ketThucKhongDat(maintIdNum, {
                          ketQuaKiemTra: repairOutcomeNote || "Không thể sửa",
                          chiPhi: actualRepairCost,
                          lyDo: repairOutcomeNote || "Hư hỏng nặng không thể phục hồi",
                        });
                      }
                      await Promise.all([app.refreshEquipment?.(), app.refreshMaintenanceReceipts?.()]);
                      setEquipSuccess(`Đã nghiệm thu phiếu bảo trì ${acceptingMaintenance.displayCode || acceptingMaintenance.id}.`);
                      setAcceptingMaintenance(null);
                    } catch (err) {
                      setEquipError(err instanceof Error ? err.message : "Lỗi nghiệm thu phiếu bảo trì trên máy chủ.");
                    } finally {
                      setEquipBusy(false);
                    }
                    return;
                  }

                  app.updateMaintenanceStatus(
                    acceptingMaintenance.id,
                    repairOutcome,
                    actualRepairCost,
                    repairOutcomeNote
                  );
                  setEquipSuccess(`Đã nghiệm thu phiếu bảo trì ${acceptingMaintenance.displayCode || acceptingMaintenance.id}.`);
                  setAcceptingMaintenance(null);
                }}
                style={{ background: repairOutcome === "Hoàn tất" ? "var(--color-forest)" : "#DC2626", color: "white", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}
              >
                ✓ Xác nhận nghiệm thu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UC7.7: Modal Kiểm nhận hàng thực tế cho nhân viên kho */}
      {inspectingImportReceipt && (
        <GoodsReceivingModal
          receipt={inspectingImportReceipt}
          app={app}
          onClose={() => setInspectingImportReceipt(null)}
          onSuccess={() => setInspectingImportReceipt(null)}
        />
      )}

      {/* UC7.3: Modal Hồ sơ Nhà Cung Cấp */}
      {viewingSupplierProfile && (
        <SupplierProfileModal
          supplier={viewingSupplierProfile}
          app={app}
          onClose={() => setViewingSupplierProfile(null)}
        />
      )}
    </div>
  );
}

// ─── Báo cáo ca trực & Nhật ký thao tác nhân viên (UC10.1 & UC10.4 cho Nhân viên) ────
function StaffReportsTab({ app, openOrder }: { app: ReturnType<typeof useApp>; openOrder: (id: string, tab: StaffTab) => void }) {
  const [subTab, setSubTab] = useState<"shift" | "audit">("shift");
  const [searchAudit, setSearchAudit] = useState("");
  const [opsReport, setOpsReport] = useState<BaoCaoVanHanhBackend | null>(null);
  const [stockReport, setStockReport] = useState<Record<string, unknown> | null>(null);
  const [maintReport, setMaintReport] = useState<Record<string, unknown> | null>(null);
  const [auditLogsBackend, setAuditLogsBackend] = useState<AuditLogEntryWithRef[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const now = new Date();

  // Tải báo cáo vận hành, hiện trạng kho & thống kê bảo trì (StaffOrAdmin)
  useEffect(() => {
    if (!app.realApi) return;
    let cancelled = false;
    setReportLoading(true);
    setReportError(null);
    void Promise.all([
      reportApi.layBaoCaoVanHanh(),
      reportApi.layHienTrangKho().catch(() => null),
      reportApi.layThongKeBaoTri().catch(() => null),
    ])
      .then(([ops, stock, maint]) => {
        if (cancelled) return;
        setOpsReport(ops);
        setStockReport(stock as Record<string, unknown> | null);
        setMaintReport(maint as Record<string, unknown> | null);
      })
      .catch((err) => {
        if (!cancelled) {
          setReportError(err instanceof Error ? err.message : "Không thể tải báo cáo vận hành ca trực.");
        }
      })
      .finally(() => {
        if (!cancelled) setReportLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [app.realApi]);

  // Tải nhật ký thao tác hệ thống theo từ khóa tìm kiếm (StaffOrAdmin - UC100/UC102)
  useEffect(() => {
    if (!app.realApi || subTab !== "audit") return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void auditApi
        .traCuu({ tuKhoa: searchAudit.trim() || undefined, trang: 1, soMoiTrang: 50 })
        .then((paged) => {
          if (!cancelled) {
            setAuditLogsBackend((paged.items || []).map(mapNhatKyToAuditLog));
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setReportError(err instanceof Error ? err.message : "Không thể tải nhật ký thao tác.");
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [app.realApi, subTab, searchAudit]);

  // 1. Chỉ tiêu Vận hành ca trực
  const pickupInShift = app.orders.filter((o) => ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status));
  const returnInShift = app.orders.filter((o) => o.status === "Đang thuê");
  const overdueOrders = app.orders.filter((o) => {
    if (o.status !== "Đang thuê") return false;
    const retD = new Date(o.returnTime.replace(" ", "T"));
    return !isNaN(retD.getTime()) && retD < now;
  });
  const pendingReconcile = app.orders.filter((o) => o.status === "Chờ đối soát");
  const handedOverToday = app.orders.filter((o) => o.handedOverAt);

  // Thiết bị trong kho (ưu tiên tổng quan từ báo cáo kho/vận hành nếu đã tải)
  const tongQuan = opsReport?.tongQuan;
  const readyEquip =
    typeof stockReport?.sanSang === "number"
      ? (stockReport.sanSang as number)
      : app.equipment.filter((e) => e.equipmentStatus === "Sẵn sàng").length;
  const rentingEquip =
    tongQuan?.soThietBiDangChoThue ?? app.equipment.filter((e) => e.equipmentStatus === "Đang thuê").length;
  const maintEquip =
    tongQuan?.soThietBiDangBaoTri ?? app.equipment.filter((e) => e.equipmentStatus === "Đang bảo trì").length;
  const lostEquip =
    tongQuan?.soThietBiThatLac ?? app.equipment.filter((e) => e.equipmentStatus === "Thất lạc" || e.equipmentStatus === "Ngừng sử dụng").length;

  // 2. Nhật ký thao tác (realApi lấy trực tiếp từ backend theo quyền StaffOrAdmin)
  const staffLogs: AuditLogEntryWithRef[] = app.realApi
    ? auditLogsBackend
    : app.auditLogs.filter((l) => {
        const isStaffRole = l.role === "Nhân viên" || l.actor.includes("Mai") || l.actor.includes("Kho");
        const q = searchAudit.toLowerCase();
        const matchSearch =
          l.actor.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.targetId.toLowerCase().includes(q) ||
          l.detail.toLowerCase().includes(q);
        return isStaffRole && matchSearch;
      });

  return (
    <div>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
            Báo cáo ca trực & Nhật ký nhân viên (UC10.1 & UC10.4)
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
            Theo dõi khối lượng giao nhận, thiết bị kho trong ca trực và truy vết nhật ký thao tác phục vụ công việc.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSubTab("shift")}
            style={{
              background: subTab === "shift" ? "var(--color-forest)" : "white",
              color: subTab === "shift" ? "white" : "var(--color-bark)",
              border: `1px solid ${subTab === "shift" ? "var(--color-forest)" : "var(--color-bone)"}`,
              borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer"
            }}
          >
            <span className="icon-label"><Icon name="tool" size={15} /> Chỉ tiêu ca trực</span>
          </button>
          <button
            onClick={() => setSubTab("audit")}
            style={{
              background: subTab === "audit" ? "var(--color-forest)" : "white",
              color: subTab === "audit" ? "white" : "var(--color-bark)",
              border: `1px solid ${subTab === "audit" ? "var(--color-forest)" : "var(--color-bone)"}`,
              borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer"
            }}
          >
            <span className="icon-label"><Icon name="clipboard" size={15} /> Nhật ký thao tác ({staffLogs.length})</span>
          </button>
        </div>
      </div>

      {reportError && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", fontWeight: 600 }}>
          {reportError}
        </div>
      )}

      {subTab === "shift" && (
        <div>
          {reportLoading && (
            <div style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 10 }}>
              Đang tải số liệu báo cáo vận hành từ máy chủ...
            </div>
          )}

          {/* Lưới chỉ tiêu vận hành ca trực */}
          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Đơn cần chuẩn bị & giao</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "var(--color-forest)", marginTop: 2 }}>
                {pickupInShift.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: 4 }}>Chờ đóng gói & bàn giao</div>
            </div>

            <div style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Đơn đang thuê (Chờ nhận trả)</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "#2563EB", marginTop: 2 }}>
                {returnInShift.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: 4 }}>Khách đang sử dụng</div>
            </div>

            <div style={{ background: overdueOrders.length > 0 ? "#FEF2F2" : "white", borderRadius: 10, padding: 14, border: `1px solid ${overdueOrders.length > 0 ? "#F87171" : "var(--color-bone)"}` }}>
              <div style={{ fontSize: "0.75rem", color: overdueOrders.length > 0 ? "#B91C1C" : "#6B7280", fontWeight: 600 }}>Đơn quá hạn hiện tại</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: overdueOrders.length > 0 ? "#DC2626" : "var(--color-bark)", marginTop: 2 }}>
                {overdueOrders.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: overdueOrders.length > 0 ? "#DC2626" : "#6B7280", marginTop: 4 }}>Cần gọi điện giục trả đồ</div>
            </div>

            <div style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Đơn chờ đối soát hoàn tất</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "#D97706", marginTop: 2 }}>
                {pendingReconcile.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: 4 }}>Đã nhận trả xong thiết bị</div>
            </div>

            <div style={{ background: "white", borderRadius: 10, padding: 14, border: "1px solid var(--color-bone)" }}>
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>
                {tongQuan ? "Tổng đơn thành công (Hệ thống)" : "Lượt đã giao thành công"}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "var(--color-forest)", marginTop: 2 }}>
                {tongQuan ? tongQuan.tongDonThanhCong : handedOverToday.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: 4 }}>
                {tongQuan ? `Tỷ lệ hủy: ${tongQuan.tyLeHuyDonPhanTram}% · Quay vòng: ${tongQuan.tyLeQuayVongThietBi}x` : "Biên bản bàn giao đã ký"}
              </div>
            </div>
          </div>

          {/* Trạng thái thiết bị kho */}
          <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 12, fontSize: "0.95rem" }}>
                Tình trạng khả dụng thiết bị kho hiện tại
              </h3>
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: "0.75rem", color: "#166534" }}>Sẵn sàng cho thuê</div>
                  <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", color: "#15803D" }}>{readyEquip}</strong>
                  <div style={{ fontSize: "0.7rem", color: "#166534" }}>Đã vệ sinh, kiểm tra đầy đủ</div>
                </div>
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: "0.75rem", color: "#1E40AF" }}>Đang cho khách thuê</div>
                  <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", color: "#1D4ED8" }}>{rentingEquip}</strong>
                  <div style={{ fontSize: "0.7rem", color: "#1E40AF" }}>Theo các đơn đang hiệu lực</div>
                </div>
                <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: "0.75rem", color: "#92400E" }}>Đang bảo trì / Sửa chữa</div>
                  <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", color: "#D97706" }}>{maintEquip}</strong>
                  <div style={{ fontSize: "0.7rem", color: "#92400E" }}>
                    {typeof maintReport?.soPhieuDangMo === "number"
                      ? `${maintReport.soPhieuDangMo} phiếu bảo trì đang mở`
                      : "Cần kỹ thuật kiểm tra"}
                  </div>
                </div>
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: "0.75rem", color: "#991B1B" }}>Thất lạc / Mất mát</div>
                  <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", color: "#DC2626" }}>{lostEquip}</strong>
                  <div style={{ fontSize: "0.7rem", color: "#991B1B" }}>
                    {tongQuan ? `Tỷ lệ hao mòn: ${tongQuan.tyLeHaoMonPhanTram}%` : "Đã lập biên bản bồi thường"}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid var(--color-bone)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10, fontSize: "0.95rem" }}>
                Quy định phân quyền vận hành (BR01 & UC10.1)
              </h3>
              <div style={{ fontSize: "0.82rem", color: "#4B5563", lineHeight: 1.6 }}>
                <p style={{ marginBottom: 8 }}>
                  • <strong>Phạm vi dữ liệu:</strong> Nhân viên kho và CSKH được phân quyền theo dõi tình trạng đơn thuê, điều phối giao nhận và kiểm soát thiết bị tại kho.
                </p>
                <p style={{ marginBottom: 8 }}>
                  • <strong>Bảo mật tài chính:</strong> Các số liệu dòng tiền ròng và giá vốn nhập kho được bảo vệ thuộc thẩm quyền Quản trị viên.
                </p>
                <p>
                  • <strong>Thao tác nhanh:</strong> Chuyển sang tab "Chuẩn bị & Bàn giao" hoặc "Nhận trả & Phụ phí" để xử lý trực tiếp đơn hàng tương ứng.
                </p>
              </div>
            </div>
          </div>

          {opsReport && opsReport.chiSoTheoSanPham.length > 0 && (
            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "auto" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-bone)", fontWeight: 700, fontSize: "0.9rem", color: "var(--color-bark)" }}>
                Hiệu suất xoay vòng thiết bị theo sản phẩm
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                    {["Sản phẩm", "Danh mục", "Tổng TB", "Lượt thuê", "Hỏng hóc", "Thất lạc"].map((h) => (
                      <th key={h} style={{ padding: "9px 12px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {opsReport.chiSoTheoSanPham.slice(0, 10).map((sp) => (
                    <tr key={sp.maSanPham} style={{ borderTop: "1px solid var(--color-bone)" }}>
                      <td style={{ padding: "9px 12px", fontWeight: 600 }}>{sp.tenSanPham}</td>
                      <td style={{ padding: "9px 12px", color: "#6B7280" }}>{sp.tenDanhMuc}</td>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)" }}>{sp.tongSoThietBi}</td>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{sp.soLuotThue}</td>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", color: sp.soLuotHongHoc > 0 ? "#D97706" : "#6B7280" }}>{sp.soLuotHongHoc}</td>
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", color: sp.soLuotMat > 0 ? "#DC2626" : "#6B7280" }}>{sp.soLuotMat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab === "audit" && (
        <div>
          {/* Tìm kiếm nhật ký nhân viên */}
          <div className="flex gap-3 mb-4">
            <div style={{ position: "relative", minWidth: 280, flex: 1 }}>
              <input
                type="text"
                placeholder="Tìm nhật ký thao tác theo hành động, mã đơn, thiết bị..."
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: "0.85rem", background: "white" }}
              />
              <div style={{ position: "absolute", left: 10, top: 9, color: "#9CA3AF" }}><Icon name="search" size={16} /></div>
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                  {["Thời gian", "Người thực hiện", "Hành động", "Đối tượng tác động", "Chi tiết nội dung", "Thao tác"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "30px 0", textAlign: "center", color: "#6B7280" }}>
                      Chưa có nhật ký thao tác phù hợp.
                    </td>
                  </tr>
                ) : (
                  staffLogs.map((log) => {
                    const orderMatch =
                      log.targetEntity === "DonThue" ||
                      log.targetId.startsWith("DT-") ||
                      Boolean(log.thamChieuUrl?.includes("/don-thue/"));
                    const orderIdToOpen =
                      log.thamChieuUrl?.match(/\/don-thue\/(\d+)/)?.[1] || log.targetId;
                    return (
                      <tr key={log.id} style={{ borderTop: "1px solid var(--color-bone)" }}>
                        <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#6B7280" }}>
                          {log.timestamp}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700 }}>{log.actor}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--color-forest)" }}>{log.action}</td>
                        <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)" }}>
                          <span style={{ color: "#6B7280" }}>{log.targetEntity}:</span> <strong>{log.targetId}</strong>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#374151" }}>{log.detail}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {orderMatch && orderIdToOpen && (
                            <button
                              onClick={() => openOrder(orderIdToOpen, "orders")}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                            >
                              Xem đơn
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
