import { useState, useEffect } from "react";
import { useApp } from "../App";
import {
  fmt,
  statusColors,
  Order,
  AssignedEquipment,
  Surcharge,
  ReturnReceipt,
  ReturnReceiptItem,
  HandoverRecord,
  MaintenanceReceipt,
  Equipment,
  ImportReceipt,
  Supplier,
} from "../store";
import Icon, { type IconName } from "../components/Icon";
import ReconciliationSheet from "./ReconciliationSheet";
import EquipmentLifecycleModal from "../components/EquipmentLifecycleModal";
import InventoryAuditModal from "../components/InventoryAuditModal";
import SupplierProfileModal from "../components/SupplierProfileModal";
import GoodsReceivingModal from "../components/GoodsReceivingModal";

type StaffTab = "overview" | "orders" | "handover" | "return" | "equipment" | "reports";

export default function StaffView() {
  const app = useApp();
  const [tab, setTab] = useState<StaffTab>("overview");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs: { key: StaffTab; label: string; icon: IconName }[] = [
    { key: "overview", label: "Tổng quan", icon: "grid" },
    { key: "orders", label: "Đơn thuê", icon: "clipboard" },
    { key: "handover", label: "Chuẩn bị & Bàn giao", icon: "arrow-up" },
    { key: "return", label: "Nhận trả & Phụ phí", icon: "arrow-down" },
    { key: "equipment", label: "Kho & Bảo trì", icon: "tool" },
    { key: "reports", label: "Báo cáo ca & Nhật ký", icon: "chart" },
  ];

  const selectedOrder = (selectedOrderId ? app.orders.find((o) => o.id === selectedOrderId) : null) ?? null;

  const openOrder = (id: string, goTab: StaffTab) => {
    setSelectedOrderId(id);
    setTab(goTab);
  };

  return (
    <div className="internal-shell">
      <button className={`drawer-backdrop ${menuOpen ? "is-open" : ""}`} aria-label="Đóng menu nhân viên" onClick={() => setMenuOpen(false)} />
      {/* Tab bar */}
      <aside className={`internal-nav ${menuOpen ? "is-open" : ""}`} aria-label="Điều hướng nhân viên">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setMenuOpen(false); }}
            style={{
              minHeight: 44, padding: "11px 12px", border: "none", borderRadius: "9px",
              background: tab === t.key ? "var(--color-forest)" : "transparent",
              color: tab === t.key ? "white" : "var(--color-bark)",
              fontWeight: tab === t.key ? 700 : 500, cursor: "pointer", fontSize: "0.85rem",
              textAlign: "left", whiteSpace: "nowrap"
            }}
          >
            <span className="icon-label"><Icon name={t.icon} size={18} /> {t.label}</span>
          </button>
        ))}
      </aside>

      <div className="internal-content">
        <div className="internal-topbar">
          <div>
            <div style={{ fontSize: "0.72rem", color: "#6B7280", marginBottom: 2 }}>Cổng Vận Hành Kho & Khách Hàng</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-bark)" }}>
              {tabs.find((item) => item.key === tab)?.label}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "0.75rem", background: "var(--color-parchment)", padding: "5px 12px", borderRadius: 8, border: "1px solid var(--color-bone)", color: "var(--color-bark)", fontWeight: 600 }}>
              👤 NV Kho Mai
            </span>
            <button className="internal-menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Mở menu nhân viên" style={{ width: 42, height: 42, placeItems: "center", border: "1px solid var(--color-bone)", borderRadius: 9, background: "white" }}>
              <Icon name="menu" />
            </button>
          </div>
        </div>

        {tab === "overview" && <OverviewTab app={app} openOrder={openOrder} />}
        {tab === "orders" && <OrdersTab app={app} selectedOrderId={selectedOrderId} setSelectedOrderId={setSelectedOrderId} openOrder={openOrder} />}
        {tab === "handover" && <HandoverTab app={app} selectedOrder={selectedOrder} setSelectedOrderId={setSelectedOrderId} />}
        {tab === "return" && <ReturnTab app={app} selectedOrder={selectedOrder} setSelectedOrderId={setSelectedOrderId} />}
        {tab === "equipment" && <EquipmentTab app={app} />}
        {tab === "reports" && <StaffReportsTab app={app} openOrder={openOrder} />}
      </div>
    </div>
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
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#DC2626" }}>{o.id}</span> — <strong>{o.customerName}</strong> ({o.customerPhone})
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
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--color-forest)", fontWeight: 700 }}>{o.id}</span>
                  <span style={{ background: sc.bg, color: sc.text, padding: "2px 8px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 600 }}>{o.status}</span>
                  {isPartial && (
                    <span style={{ background: "#FFF7ED", color: "#C2410C", padding: "2px 8px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 700 }}>
                      Đã trả {returnedCnt}/{o.assignedEquipment.length} món
                    </span>
                  )}
                  {isOverdue && (
                    <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "2px 8px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 700 }}>
                      Quá hạn
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-bark)" }}>{o.customerName} · {o.customerPhone}</div>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                  {o.items.map((i) => `${i.productName} ×${i.qty}`).join(", ")}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Hẹn nhận: {o.pickupTime}</div>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>Hẹn trả: {o.returnTime}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", marginTop: 2 }}>{fmt(o.rental - o.discount + o.depositTotal)}</div>
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
function OrdersTab({ app, selectedOrderId, setSelectedOrderId, openOrder }: { app: ReturnType<typeof useApp>; selectedOrderId: string | null; setSelectedOrderId: (id: string | null) => void; openOrder: (id: string, tab: StaffTab) => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tất cả");
  const [quickFilter, setQuickFilter] = useState<"all" | "delivery_today" | "pickup_today" | "overdue" | "partial">("all");
  const [viewingDetailOrder, setViewingDetailOrder] = useState<Order | null>(null);
  const statuses = ["Tất cả", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận", "Đang thuê", "Trả một phần", "Quá hạn", "Chờ đối soát", "Hoàn tất"];

  // Đếm nhanh số lượng theo nghiệp vụ vận hành (UC4.5)
  const deliveryTodayCount = app.orders.filter((o) => ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status)).length;
  const pickupTodayCount = app.orders.filter((o) => ["Đang thuê", "Quá hạn"].includes(o.status)).length;
  const overdueCount = app.orders.filter((o) => app.checkOrderOverdue(o).isOverdue).length;
  const partialCount = app.orders.filter((o) => {
    if (o.status !== "Đang thuê") return false;
    const returnedCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
    return returnedCnt > 0 && returnedCnt < o.assignedEquipment.length;
  }).length;

  const handleReportNoShow = (order: Order) => {
    const note = prompt(`Nhập ghi chú liên hệ khách ${order.customerName} không đến nhận đồ đúng giờ cam kết:`, "Đã gọi điện nhắc 2 lần nhưng không nghe máy / Khách không đến quầy");
    if (!note) return;
    const res = app.reportCustomerNoShow(order.id, note, "NV Kho Mai");
    if (res.ok) {
      alert(`Đã ghi nhận khách không đến nhận cho đơn #${order.id}. Quản trị viên đã nhận cảnh báo để xử lý theo UC3.4.`);
    } else {
      alert(res.message);
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

    const matchSearch = o.id.includes(search) || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.customerPhone.includes(search);
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
                    <button onClick={() => setViewingDetailOrder(o)} style={{ background: "none", border: "none", padding: 0, color: "var(--color-forest)", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
                      {o.id}
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
                    {o.items.map((it) => `${it.productName.split("–")[0].trim()} ×${it.qty}`).join(", ")}
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
                        onClick={() => setViewingDetailOrder(o)}
                        style={{ background: "#F3F4F6", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "5px 8px", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}
                      >
                        Hồ sơ
                      </button>

                      {canReportNoShow && !o.noShowReported && (
                        <button
                          type="button"
                          onClick={() => handleReportNoShow(o)}
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
                  Chi tiết đơn #{viewingDetailOrder.id} — {viewingDetailOrder.customerName}
                </h3>
                <div style={{ fontSize: "0.82rem", color: "#6B7280" }}>
                  SĐT: <strong>{viewingDetailOrder.customerPhone}</strong> · Trạng thái: <strong>{viewingDetailOrder.status}</strong>
                </div>
              </div>
              <button onClick={() => setViewingDetailOrder(null)} style={{ border: "none", background: "none", fontSize: "1.3rem", cursor: "pointer" }}>✕</button>
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
                        <strong className="font-mono text-forest">{ae.equipmentId}</strong> (Gán lúc: {ae.assignedAt})
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
                  setViewingDetailOrder(null);
                }}
                className="btn btn-primary btn-sm"
              >
                Chuyển đến màn hình thao tác →
              </button>
              <button onClick={() => setViewingDetailOrder(null)} className="btn btn-secondary btn-sm">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Handover Tab (UC4.1 Chuẩn bị kho & Phân công serial | UC4.2 Tiếp khách & Bàn giao tại quầy) ──────
function HandoverTab({ app, selectedOrder, setSelectedOrderId }: { app: ReturnType<typeof useApp>; selectedOrder: Order | null; setSelectedOrderId: (id: string | null) => void }) {
  const [subTab, setSubTab] = useState<"prep" | "handover">("prep");
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
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

  // Đồng bộ trạng thái đơn và khôi phục serial đã phân công
  useEffect(() => {
    if (selectedOrder) {
      if (selectedOrder.status === "Sẵn sàng nhận") {
        setSubTab("handover");
      } else if (["Đã xác nhận", "Đang chuẩn bị"].includes(selectedOrder.status)) {
        setSubTab("prep");
      }

      // Khôi phục serial đã lưu nếu có
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

      // Điền thông tin người nhận mặc định
      setReceiverName(selectedOrder.customerName);
      setReceiverPhone(selectedOrder.customerPhone);
      setReceiverIdCard(`07920100${selectedOrder.id.replace(/\D/g, "").slice(-4)}`);
    }
  }, [selectedOrder?.id]);

  const pickEquipment = (productId: string, idx: number, equipId: string) => {
    setAssignments((prev) => {
      const arr = [...(prev[productId] || [])];
      arr[idx] = equipId;
      return { ...prev, [productId]: arr };
    });
  };

  const handleSwapEquipment = (productId: string, oldId: string, newId: string) => {
    if (!order) return;
    const res = app.changeAssignedEquipment(order.id, oldId, newId);
    if (!res.ok) {
      alert(res.message);
      return;
    }
    setAssignments((prev) => {
      const arr = (prev[productId] || []).map((id) => (id === oldId ? newId : id));
      return { ...prev, [productId]: arr };
    });
    setChangingEquip(null);
  };

  // UC4.1: Hoàn tất chuẩn bị kho & Lưu vĩnh viễn phân công serial
  const handleCompletePreparation = () => {
    if (!order) return;
    const itemsArr: { productId: string; equipmentId: string }[] = [];
    for (const item of order.items) {
      const assignedIds = assignments[item.productId] || [];
      if (assignedIds.filter(Boolean).length < item.qty) {
        alert(`Vui lòng chọn đủ ${item.qty} mã thiết bị cho "${item.productName}"!`);
        return;
      }
      assignedIds.forEach((eid) => {
        if (eid) itemsArr.push({ productId: item.productId, equipmentId: eid });
      });
    }

    const res = app.completePreparation(order.id, itemsArr, "NV Kho Mai");
    if (res.ok) {
      alert(`Đã hoàn tất chuẩn bị và chuyển đơn ${order.id} sang "Sẵn sàng nhận"! Khách hàng đã được gửi thông báo nhận đồ.`);
      setSubTab("handover");
    } else {
      alert(res.message);
    }
  };

  // UC4.1: Báo thiếu thiết bị
  const handleReportShortage = () => {
    if (!order || !shortageNote.trim()) {
      alert("Vui lòng nhập lý do thiếu thiết bị để báo Quản trị viên!");
      return;
    }
    const res = app.reportEquipmentShortage(order.id, shortageNote, "NV Kho Mai");
    if (res.ok) {
      alert(`Đã gửi cảnh báo thiếu hàng cho Quản trị viên xử lý với khách đơn ${order.id}!`);
      setShowShortageModal(false);
      setShortageNote("");
    } else {
      alert(res.message);
    }
  };

  // UC4.2: Chốt Bàn giao tại quầy & Ký BBBG
  const handleCompleteHandover = () => {
    if (!order) return;
    if (!receiverName.trim() || !receiverPhone.trim()) {
      alert("Vui lòng nhập đầy đủ họ tên và số điện thoại người nhận thực tế tại quầy!");
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
      staffName: "NV Kho Mai",
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
      alert(res.message);
    }
  };

  const handleQrSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCodeSearch.trim()) return;
    const term = qrCodeSearch.trim().toLowerCase();
    const found = app.orders.find((o) =>
      o.id.toLowerCase().includes(term) ||
      o.customerPhone.includes(term) ||
      o.customerName.toLowerCase().includes(term)
    );
    if (found) {
      setSelectedOrderId(found.id);
      setQrCodeSearch("");
    } else {
      alert(`Không tìm thấy đơn hàng nào khớp với mã/QR "${qrCodeSearch}"!`);
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
                      {o.id}
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
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--color-moss)", fontWeight: 700 }}>{order.id}</div>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{order.customerName} · {order.customerPhone}</div>
                    <div style={{ fontSize: "0.82rem", color: "#6B7280" }}>📤 Hẹn nhận: <strong>{order.pickupTime}</strong> → 📥 Hẹn trả: <strong>{order.returnTime}</strong></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ background: "var(--color-forest)", color: "white", padding: "4px 10px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 700 }}>
                      {order.status}
                    </span>
                    {order.status === "Đã xác nhận" && (
                      <button onClick={() => app.advanceOrderStatus(order.id, "Đang chuẩn bị", "NV Kho Mai")} style={{ background: "var(--color-amber)", color: "white", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                        Nhận soạn hàng →
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
                const avail = app.equipment.filter((e) => e.productId === item.productId && e.equipmentStatus === "Sẵn sàng");
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
                              <option key={e.id} value={e.id}>{e.id} ({e.condition} · đã thuê {e.rentCount} lần)</option>
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
                  <strong style={{ color: "#92400E", fontSize: "0.85rem" }}>Đổi serial thiết bị {changingEquip.oldId} trước khi giao:</strong>
                  <div className="flex gap-2 mt-2">
                    <select id="swapSelect" style={{ flex: 1, border: "1px solid #FCD34D", borderRadius: 6, padding: "6px 10px", background: "white", fontSize: "0.85rem" }}>
                      {app.equipment.filter((e) => e.productId === changingEquip.productId && e.equipmentStatus === "Sẵn sàng" && e.id !== changingEquip.oldId).map((e) => (
                        <option key={e.id} value={e.id}>{e.id} ({e.condition})</option>
                      ))}
                    </select>
                    <button onClick={() => {
                      const sel = (document.getElementById("swapSelect") as HTMLSelectElement)?.value;
                      if (sel) handleSwapEquipment(changingEquip.productId, changingEquip.oldId, sel);
                    }} style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 700, cursor: "pointer" }}>
                      Xác nhận đổi
                    </button>
                    <button onClick={() => setChangingEquip(null)} style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  disabled={!allAssigned}
                  onClick={handleCompletePreparation}
                  style={{
                    background: allAssigned ? "var(--color-forest)" : "#9CA3AF",
                    color: "white", padding: "10px 24px", borderRadius: 8, border: "none",
                    cursor: allAssigned ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.95rem"
                  }}
                >
                  ✓ Hoàn tất chuẩn bị & Chuyển "Sẵn sàng nhận" (UC4.1)
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
                      Đơn #{order.id} — {order.customerName}
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
                  {order.items.flatMap((i) => (assignments[i.productId] || []).map((code) => ({ code, item: i }))).map(({ code, item }) => (
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
                onClick={handleCompleteHandover}
                style={{
                  background: "var(--color-forest)",
                  color: "white", padding: "12px 28px", borderRadius: 8, border: "none",
                  cursor: "pointer", fontWeight: 700, fontSize: "0.95rem", width: "100%"
                }}
              >
                ✓ Bàn giao thiết bị cho khách & Lập Biên bản (BBBG)
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
                      Biên bản Bàn giao BBBG-{order.id}
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
                    <div><strong>Nhân viên bàn giao:</strong> NV Kho Mai</div>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <strong style={{ fontSize: "0.82rem", color: "var(--color-bark)" }}>Danh sách thiết bị giao:</strong>
                  <div className="flex flex-col gap-1 mt-1">
                    {order.items.flatMap((i) => assignments[i.productId] || []).map((code) => (
                      <div key={code} style={{ fontSize: "0.8rem", color: "#374151", background: "#F3F4F6", padding: "4px 8px", borderRadius: 6 }}>
                        • Mã thiết bị: <strong style={{ color: "var(--color-forest)" }}>{code}</strong> (Tình trạng: Tốt, hoạt động chuẩn)
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
function ReturnTab({ app, selectedOrder, setSelectedOrderId }: { app: ReturnType<typeof useApp>; selectedOrder: Order | null; setSelectedOrderId: (id: string | null) => void }) {
  const [selectedItemsToReturn, setSelectedItemsToReturn] = useState<Record<string, boolean>>({});
  const [itemConditions, setItemConditions] = useState<Record<string, ReturnReceiptItem["condition"]>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [itemSurcharges, setItemSurcharges] = useState<Record<string, number>>({});
  const [returnStaffNote, setReturnStaffNote] = useState("");
  const [viewingReceipt, setViewingReceipt] = useState<ReturnReceipt | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "completed" | "all">("active");

  // State UC4.4: Nhật ký liên hệ quá hạn & Xung đột lịch
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactOutcome, setContactOutcome] = useState<"Hẹn giờ trả mới" | "Xin gia hạn thêm" | "Không nghe máy" | "Khách báo mất">("Hẹn giờ trả mới");
  const [contactNote, setContactNote] = useState("");
  const [newExpectedTime, setNewExpectedTime] = useState("");

  // State UC4.3: Ảnh bằng chứng hư hại
  const [damagePhotos, setDamagePhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=200&auto=format&fit=crop&q=60"
  ]);

  // Lọc đơn theo trạng thái: Đang xử lý, Đã hoàn tất hoặc Tất cả
  const eligibleOrders = app.orders.filter((o) => {
    if (statusFilter === "active") return ["Đang thuê", "Đã nhận trả", "Chờ đối soát"].includes(o.status);
    if (statusFilter === "completed") return o.status === "Hoàn tất";
    return ["Đang thuê", "Đã nhận trả", "Chờ đối soát", "Hoàn tất"].includes(o.status);
  });
  const order = selectedOrder;

  // Tính toán quá hạn
  const overdueInfo = order ? app.checkOrderOverdue(order) : { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };
  const overdueConflicts = order ? app.getOverdueConflicts(order.id) : [];

  // Danh sách thiết bị còn nợ (chưa có returnedAt)
  const debtEquipment = order?.assignedEquipment.filter((ae) => !ae.returnedAt) || [];
  const returnedEquipment = order?.assignedEquipment.filter((ae) => ae.returnedAt) || [];
  const currentReturnRound = (order?.returnReceipts?.length || 0) + 1;

  const defaultFee = (cond: ReturnReceiptItem["condition"], compensation: number) => {
    if (cond === "Cần vệ sinh") return 50000;
    if (cond === "Hỏng nhẹ") return Math.round(compensation * 0.1);
    if (cond === "Hỏng nặng") return Math.round(compensation * 0.4);
    if (cond === "Thiếu phụ kiện") return 80000;
    if (cond === "Mất thiết bị") return compensation;
    return 0;
  };

  const handleToggleSelect = (equipId: string, compensation: number) => {
    setSelectedItemsToReturn((prev) => {
      const next = !prev[equipId];
      if (next && !itemConditions[equipId]) {
        setItemConditions((c) => ({ ...c, [equipId]: "Bình thường" }));
        setItemSurcharges((s) => ({ ...s, [equipId]: 0 }));
      }
      return { ...prev, [equipId]: next };
    });
  };

  const handleConditionChange = (equipId: string, cond: ReturnReceiptItem["condition"], compensation: number) => {
    setItemConditions((prev) => ({ ...prev, [equipId]: cond }));
    const fee = defaultFee(cond, compensation);
    setItemSurcharges((prev) => ({ ...prev, [equipId]: fee }));
  };

  const handleCreateReceipt = () => {
    if (!order) return;
    const selectedIds = Object.keys(selectedItemsToReturn).filter((id) => selectedItemsToReturn[id]);
    if (selectedIds.length === 0) {
      alert("Vui lòng tick chọn ít nhất 1 thiết bị khách mang đến trả đợt này!");
      return;
    }

    const returnItems: ReturnReceiptItem[] = selectedIds.map((eid) => {
      const ae = order.assignedEquipment.find((a) => a.equipmentId === eid)!;
      const cond = itemConditions[eid] || "Bình thường";
      const surcharge = itemSurcharges[eid] || 0;
      const note = itemNotes[eid] || "";
      return {
        equipmentId: eid,
        productId: ae.productId,
        condition: cond,
        surchargeAmount: surcharge,
        note,
        lostApproved: false, // Mặc định chờ quản trị viên duyệt nếu là mất đồ
      };
    });

    const res = app.createReturnReceipt(order.id, {
      returnItems,
      staffName: "NV Kho Mai",
      note: returnStaffNote || `Nhận trả đợt ${currentReturnRound} (${returnItems.length} thiết bị)`,
      photoUrls: damagePhotos,
    });

    if (res.ok) {
      setViewingReceipt(res.data);
      setSelectedItemsToReturn({});
      setItemNotes({});
      setReturnStaffNote("");
    } else {
      alert(res.message);
    }
  };

  const handleApplyOverdueFee = () => {
    if (!order || !overdueInfo.isOverdue) return;
    app.addSurcharge(order.id, {
      id: `PC-OVERDUE-${order.id}-${Date.now()}`,
      type: "Quá hạn",
      equipmentId: "TẤT CẢ",
      amount: overdueInfo.surcharge,
      reason: `Quá hạn trả ${overdueInfo.overdueDays} ngày (${overdueInfo.overdueHours} giờ) × 150% tiền thuê ngày`,
      status: "Chờ duyệt",
      createdBy: "Hệ thống tự động",
    });
    alert(`Đã thêm phụ phí quá hạn ${fmt(overdueInfo.surcharge)} vào đơn!`);
  };

  const handleSaveContactLog = () => {
    if (!order || !contactNote.trim()) {
      alert("Vui lòng nhập ghi chú nội dung cuộc gọi nhắc khách!");
      return;
    }
    const res = app.addContactLog(order.id, {
      staffName: "NV Kho Mai",
      outcome: contactOutcome,
      note: contactNote,
      newExpectedTime: newExpectedTime || undefined,
    });
    if (res.ok) {
      alert("Đã lưu nhật ký liên hệ khách hàng thành công!");
      setContactNote("");
      setShowContactModal(false);
    } else {
      alert(res.message);
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
          {eligibleOrders.map((o) => {
            const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
            const isOd = app.checkOrderOverdue(o).isOverdue;
            const retCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
            const isPart = o.status === "Đang thuê" && retCnt > 0 && retCnt < o.assignedEquipment.length;

            return (
              <button key={o.id} onClick={() => { setSelectedOrderId(o.id); setSelectedItemsToReturn({}); }}
                style={{ background: selectedOrder?.id === o.id ? "var(--color-forest)" : "white", color: selectedOrder?.id === o.id ? "white" : "var(--color-bark)", borderRadius: "10px", padding: "12px 14px", border: `1px solid ${selectedOrder?.id === o.id ? "var(--color-forest)" : "var(--color-bone)"}`, cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", opacity: 0.8 }}>{o.id}</div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{o.customerName}</div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  <span style={{ background: selectedOrder?.id === o.id ? "rgba(255,255,255,0.2)" : sc.bg, color: selectedOrder?.id === o.id ? "white" : sc.text, padding: "2px 7px", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 600 }}>{o.status}</span>
                  {isPart && <span style={{ background: "#FFF7ED", color: "#C2410C", padding: "2px 6px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700 }}>Trả 1 phần</span>}
                  {isOd && <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "2px 6px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700 }}>Quá hạn</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cột phải: Xử lý nhận trả từng đợt & Đối soát */}
      <div>
        {!order ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#9CA3AF", background: "white", borderRadius: 12, border: "1px solid var(--color-bone)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "8px" }}>📥</div>
            <p>Chọn một đơn thuê ở bên trái để lập phiếu nhận trả hoặc đối soát cọc</p>
          </div>
        ) : order.status === "Hoàn tất" ? (
          <div>
            {/* UC5.4 Dòng 7: Xem kết quả chốt & Khóa đối soát */}
            <ReconciliationSheet order={order} app={app} userRole="staff" />
          </div>
        ) : (
          <div>
            {/* Header info đơn */}
            <div style={{ background: "var(--color-parchment)", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", border: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between items-start">
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--color-moss)", fontWeight: 700 }}>{order.id}</div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{order.customerName} · {order.customerPhone}</div>
                  <div style={{ fontSize: "0.82rem", color: "#6B7280" }}>Hẹn trả dự kiến: <strong style={{ color: overdueInfo.isOverdue ? "#DC2626" : "inherit" }}>{order.returnTime}</strong></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>Tổng thiết bị đã giao: <strong>{order.assignedEquipment.length}</strong></div>
                  <div style={{ fontSize: "0.78rem", color: "#15803D" }}>Đã trả: <strong>{returnedEquipment.length}</strong></div>
                  <div style={{ fontSize: "0.85rem", color: debtEquipment.length > 0 ? "#DC2626" : "#15803D", fontWeight: 700 }}>
                    Còn nợ: {debtEquipment.length} chiếc
                  </div>
                </div>
              </div>
            </div>

            {/* UC13 & UC4.4: Banner Cảnh báo quá hạn & Quản trị rủi ro xoay vòng */}
            {overdueInfo.isOverdue && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
                <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight: 700, color: "#DC2626", fontSize: "0.95rem" }}>
                        ⚠️ ĐƠN THUÊ QUÁ HẠN: Trễ {overdueInfo.overdueDays} ngày ({overdueInfo.overdueHours} giờ)
                      </span>
                      {overdueConflicts.length > 0 && (
                        <span style={{ background: "#DC2626", color: "white", padding: "1px 6px", borderRadius: 4, fontSize: "0.68rem", fontWeight: 700 }}>
                          ẢNH HƯỞNG {overdueConflicts.length} ĐƠN SAU
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#991B1B", marginTop: 2 }}>
                      Phạt trễ 150% đơn giá ngày theo block 24h = <strong>+{fmt(overdueInfo.surcharge)}</strong>.
                    </div>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <button
                      onClick={() => setShowContactModal(true)}
                      style={{ background: "#1E40AF", color: "white", border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      📞 Nhật ký gọi & Xung đột lịch ({order.contactLogs?.length || 0})
                    </button>
                    <button
                      onClick={handleApplyOverdueFee}
                      style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      + Lập phụ phí trễ
                    </button>
                  </div>
                </div>

                {/* Xung đột lịch kế tiếp nếu có */}
                {overdueConflicts.length > 0 && (
                  <div style={{ background: "white", border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px", marginTop: 8 }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#B91C1C", marginBottom: 4 }}>
                      ⚠️ CẢNH BÁO KẸT THIẾT BỊ ĐƠN TIẾP THEO (UC4.4 Dòng 802):
                    </div>
                    {overdueConflicts.map((c, idx) => (
                      <div key={idx} style={{ fontSize: "0.75rem", color: "#374151", marginBottom: 2 }}>
                        • Thiết bị <strong style={{ color: "var(--color-forest)" }}>{c.equipmentId}</strong> đang bị trễ cho đơn kế tiếp: <strong>#{c.nextOrderId}</strong> ({c.nextCustomerName} - Hẹn nhận: {c.nextPickupTime}).
                        {c.availableSubstitutes.length > 0 ? (
                          <span style={{ color: "#15803D", marginLeft: 6 }}>
                            Gợi ý mã thay thế: <strong>{c.availableSubstitutes.slice(0, 3).join(", ")}</strong>
                          </span>
                        ) : (
                          <span style={{ color: "#DC2626", marginLeft: 6, fontWeight: 700 }}>
                            (Kho không còn mã thay thế! Báo Quản trị viên xử lý)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* UC12: Form Lập Phiếu Nhận Trả Từng Đợt (Chỉ khi còn thiết bị nợ) */}
            {debtEquipment.length > 0 && (
              <div style={{ background: "white", borderRadius: 12, border: "2px solid var(--color-forest)", padding: "18px", marginBottom: 20 }}>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span style={{ background: "var(--color-forest)", color: "white", padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>
                      ĐỢT TRẢ SỐ {currentReturnRound}
                    </span>
                    <h4 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--color-bark)", margin: "4px 0 0" }}>
                      Lập Phiếu Nhận Trả: PNT-{order.id}-{currentReturnRound}
                    </h4>
                  </div>
                  <button onClick={() => {
                    const allSel: Record<string, boolean> = {};
                    debtEquipment.forEach((ae) => { allSel[ae.equipmentId] = true; });
                    setSelectedItemsToReturn(allSel);
                  }} style={{ background: "var(--color-parchment)", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}>
                    Chọn tất cả {debtEquipment.length} món nợ
                  </button>
                </div>

                <p style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 12 }}>
                  Tick chọn những thiết bị khách mang đến trả lần này. Những món khách giữ lại sẽ tiếp tục ghi nhận nợ.
                </p>

                <div className="flex flex-col gap-3">
                  {debtEquipment.map((ae) => {
                    const p = app.products.find((prod) => prod.id === ae.productId);
                    const isSelected = !!selectedItemsToReturn[ae.equipmentId];
                    const cond = itemConditions[ae.equipmentId] || "Bình thường";
                    const fee = itemSurcharges[ae.equipmentId] || 0;

                    return (
                      <div key={ae.equipmentId} style={{ background: isSelected ? "#F0FDF4" : "#F9FAFB", border: `1px solid ${isSelected ? "#86EFAC" : "var(--color-bone)"}`, borderRadius: 10, padding: "12px 14px" }}>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(ae.equipmentId, p?.compensation || 1000000)} style={{ width: 18, height: 18, accentColor: "var(--color-forest)", cursor: "pointer" }} />
                          <div style={{ flex: 1 }}>
                            <div className="flex items-center gap-2">
                              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", fontSize: "0.85rem" }}>{ae.equipmentId}</span>
                              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p?.name}</span>
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Giá trị bồi thường tối đa: {fmt(p?.compensation || 0)}</div>
                          </div>
                        </div>

                        {isSelected && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #CBD5E1" }}>
                            <div className="flex flex-wrap gap-2 items-center mb-2">
                              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>Tình trạng nhận lại:</span>
                              {(["Bình thường", "Cần vệ sinh", "Hỏng nhẹ", "Hỏng nặng", "Thiếu phụ kiện", "Mất thiết bị"] as ReturnReceiptItem["condition"][]).map((c) => (
                                <button key={c} onClick={() => handleConditionChange(ae.equipmentId, c, p?.compensation || 1000000)}
                                  style={{
                                    border: "1px solid",
                                    borderColor: cond === c ? "var(--color-forest)" : "var(--color-bone)",
                                    background: cond === c ? "var(--color-forest)" : "white",
                                    color: cond === c ? "white" : "var(--color-bark)",
                                    borderRadius: 6, padding: "3px 8px", fontSize: "0.72rem", cursor: "pointer", fontWeight: cond === c ? 700 : 500
                                  }}>
                                  {c}
                                </button>
                              ))}
                            </div>

                            <div className="flex gap-2 items-center flex-wrap">
                              <input placeholder="Ghi chú chi tiết lỗi/hư hỏng..." value={itemNotes[ae.equipmentId] || ""} onChange={(e) => setItemNotes((prev) => ({ ...prev, [ae.equipmentId]: e.target.value }))}
                                style={{ flex: 1, minWidth: 200, border: "1px solid var(--color-bone)", borderRadius: 6, padding: "5px 8px", fontSize: "0.8rem", background: "white" }}
                              />
                              <div className="flex items-center gap-1">
                                <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>Phụ phí:</span>
                                <input type="number" value={fee} onChange={(e) => setItemSurcharges((prev) => ({ ...prev, [ae.equipmentId]: Number(e.target.value) }))}
                                  style={{ width: 100, border: "1px solid var(--color-bone)", borderRadius: 6, padding: "5px 8px", fontSize: "0.8rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: fee > 0 ? "#DC2626" : "inherit" }}
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

                {/* Dự báo nghiệp vụ (Partial hay Final) */}
                {(() => {
                  const selCount = Object.values(selectedItemsToReturn).filter(Boolean).length;
                  const remainAfter = debtEquipment.length - selCount;
                  return (
                    <div style={{ marginTop: 14, background: remainAfter > 0 ? "#FFF7ED" : "#DCFCE7", border: `1px solid ${remainAfter > 0 ? "#FFEDD5" : "#BBF7D0"}`, borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem", color: remainAfter > 0 ? "#C2410C" : "#15803D" }}>
                      {remainAfter > 0 ? (
                        <>
                          <strong>📌 Nhận trả một phần:</strong> Khách trả {selCount} món, còn nợ lại <strong>{remainAfter} món</strong>. Sau khi tạo phiếu, đơn hàng vẫn tiếp tục ở trạng thái <strong>Đang thuê (Trả một phần)</strong>.
                        </>
                      ) : (
                        <>
                          <strong>✓ Hoàn tất nhận trả (Lần trả cuối):</strong> Tất cả {debtEquipment.length} thiết bị còn lại sẽ được thu hồi / ghi nhận mất. Đơn hàng sẽ tự động chuyển sang <strong>Đã nhận trả → Chờ đối soát</strong>.
                        </>
                      )}
                    </div>
                  );
                })()}

                <button onClick={handleCreateReceipt}
                  style={{ marginTop: 14, background: "var(--color-forest)", color: "white", padding: "10px 22px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}>
                  ✓ Xác nhận lập Phiếu Nhận Trả PNT-{order.id}-{currentReturnRound}
                </button>
              </div>
            )}

            {/* Lịch sử các đợt nhận trả đã lập (Phiếu PNT) */}
            {(order.returnReceipts?.length || 0) > 0 && (
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
            {order.surcharges.length > 0 && (
              <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: 16, marginBottom: 20 }}>
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10 }}>Phụ phí bồi thường & trễ hạn</h4>
                {order.surcharges.map((s) => (
                  <div key={s.id} style={{ background: "#FFF7ED", borderRadius: 8, padding: "10px 14px", border: "1px solid #FED7AA", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{s.type} — {s.equipmentId}</div>
                      <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>{s.reason}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#DC2626" }}>+{fmt(s.amount)}</span>
                      <span style={{ background: s.status === "Đã duyệt" ? "#DCFCE7" : s.status === "Từ chối" ? "#FEE2E2" : "#FEF3C7", color: s.status === "Đã duyệt" ? "#15803D" : s.status === "Từ chối" ? "#B91C1C" : "#B45309", padding: "3px 8px", borderRadius: 8, fontSize: "0.7rem", fontWeight: 600 }}>
                        {s.status}
                      </span>
                      {s.status === "Chờ duyệt" && (
                        <button onClick={() => app.approveSurcharge(order.id, s.id)} style={{ background: "#15803D", color: "white", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: "0.7rem", cursor: "pointer", fontWeight: 700 }}>
                          Duyệt
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Nút chuyển sang Chờ đối soát khi tất cả đã trả */}
            {order.status === "Đã nhận trả" && (
              <div style={{ background: "#EFF6FF", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", border: "1px solid #BFDBFE" }}>
                <div style={{ fontWeight: 700, color: "#1D4ED8", marginBottom: "4px" }}>✓ Toàn bộ thiết bị đã nhận trả xong</div>
                <div style={{ fontSize: "0.82rem", color: "#1E40AF", marginBottom: "10px" }}>Chuyển đơn sang Chờ đối soát để lập lệnh hoàn cọc hoặc thu thêm.</div>
                <button onClick={() => app.advanceOrderStatus(order.id, "Chờ đối soát")}
                  style={{ background: "#1D4ED8", color: "white", padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>
                  Chuyển sang Chờ đối soát →
                </button>
              </div>
            )}

            {/* UC5.4: Bảng Đối Soát Cọc & Hoàn Tất Đơn */}
            {order.status === "Chờ đối soát" && (
              <div style={{ marginTop: 20 }}>
                <ReconciliationSheet order={order} app={app} userRole="staff" />
              </div>
            )}
          </div>
        )}

        {/* Modal xem chi tiết Phiếu Nhận Trả PNT-... */}
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
                              alert(`Đã duyệt kết luận mất cho thiết bị ${it.equipmentId}!`);
                              setViewingReceipt((prev) => prev ? {
                                ...prev,
                                items: prev.items.map((x) => x.equipmentId === it.equipmentId ? { ...x, lostApproved: true } : x)
                              } : null);
                            }
                          }}
                          style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 4, padding: "2px 8px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          Duyệt mất (UC4.3 Dòng 814)
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
                  🖨 In phiếu
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
                    Nhật ký liên hệ đơn #{order.id}
                  </h3>
                  <div style={{ fontSize: "0.82rem", color: "#4B5563" }}>
                    Khách hàng: <strong>{order.customerName}</strong> ({order.customerPhone})
                  </div>
                </div>
                <button onClick={() => setShowContactModal(false)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
              </div>

              {/* Lịch sử các cuộc gọi trước */}
              <div style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--color-bark)" }}>
                  Lịch sử các lần liên hệ ({order.contactLogs?.length || 0} lần):
                </strong>
                <div className="flex flex-col gap-2 mt-2" style={{ maxHeight: 180, overflowY: "auto" }}>
                  {(order.contactLogs?.length || 0) === 0 ? (
                    <div style={{ fontSize: "0.8rem", color: "#9CA3AF", fontStyle: "italic", background: "#F9FAFB", padding: "8px 12px", borderRadius: 6 }}>
                      Chưa có lịch sử liên hệ nào. Vui lòng ghi lại kết quả cuộc gọi đầu tiên bên dưới.
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
                            🕒 Khách hẹn trả mới: <strong>{log.newExpectedTime}</strong>
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

  const handleTransfer = () => {
    if (!transferModal || !targetProductId) return;
    const res = app.transferEquipment(transferModal.id, targetProductId);
    if (res.ok) {
      alert(`Đã chuyển thiết bị ${transferModal.id} sang sản phẩm đích thành công!`);
      setTransferModal(null);
    } else {
      alert(res.message);
    }
  };

  return (
    <div>
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
                      <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-forest)" }}>{e.id}</td>
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
                  Chuyển loại thiết bị: {transferModal.id}
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
                {app.maintenanceReceipts.map((m, i) => (
                  <tr key={m.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-forest)" }}>{m.id}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{m.equipmentId}</td>
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
                          Nghiệm thu (UC6.13) →
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Đã chốt</span>
                      )}
                    </td>
                  </tr>
                ))}
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
                      {e.id} - {p?.name} (Hiện tại: {e.equipmentStatus})
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
                onClick={() => {
                  const newId = `BT-${Date.now().toString().slice(-6)}`;
                  const now = new Date().toLocaleString("vi-VN");
                  app.saveMaintenanceReceipt({
                    id: newId,
                    equipmentId: createMaintEquipId,
                    issueDescription: createMaintIssue.trim(),
                    estimatedCost: createMaintCost,
                    orderId: createMaintOrderId.trim() || undefined,
                    createdAt: now,
                    status: "Đang bảo dưỡng",
                    note: createMaintNote.trim(),
                  });
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
                onClick={() => {
                  app.updateMaintenanceStatus(
                    acceptingMaintenance.id,
                    repairOutcome,
                    actualRepairCost,
                    repairOutcomeNote
                  );
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
  const now = new Date();

  // 1. Chỉ tiêu Vận hành ca trực (UC10.1 - Giới hạn phạm vi quyền của Nhân viên)
  const pickupInShift = app.orders.filter((o) => ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status));
  const returnInShift = app.orders.filter((o) => o.status === "Đang thuê");
  const overdueOrders = app.orders.filter((o) => {
    if (o.status !== "Đang thuê") return false;
    const retD = new Date(o.returnTime.replace(" ", "T"));
    return !isNaN(retD.getTime()) && retD < now;
  });
  const pendingReconcile = app.orders.filter((o) => o.status === "Chờ đối soát");
  const handedOverToday = app.orders.filter((o) => o.handedOverAt);

  // Thiết bị trong kho
  const readyEquip = app.equipment.filter((e) => e.equipmentStatus === "Sẵn sàng").length;
  const rentingEquip = app.equipment.filter((e) => e.equipmentStatus === "Đang thuê").length;
  const maintEquip = app.equipment.filter((e) => e.equipmentStatus === "Đang bảo trì").length;
  const lostEquip = app.equipment.filter((e) => e.equipmentStatus === "Thất lạc" || e.equipmentStatus === "Ngừng sử dụng").length;

  // 2. Nhật ký thao tác nhân viên (UC10.4 & UC10.4.1: Nhân viên chỉ xem lịch sử phục vụ công việc)
  const staffLogs = app.auditLogs.filter((l) => {
    const isStaffRole = l.role === "Nhân viên" || l.actor.includes("Mai") || l.actor.includes("Kho");
    const matchSearch =
      l.actor.toLowerCase().includes(searchAudit.toLowerCase()) ||
      l.action.toLowerCase().includes(searchAudit.toLowerCase()) ||
      l.targetId.toLowerCase().includes(searchAudit.toLowerCase()) ||
      l.detail.toLowerCase().includes(searchAudit.toLowerCase());
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

      {subTab === "shift" && (
        <div>
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
              <div style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 600 }}>Lượt đã giao thành công</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.7rem", fontWeight: 800, color: "var(--color-forest)", marginTop: 2 }}>
                {handedOverToday.length}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: 4 }}>Biên bản bàn giao đã ký</div>
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
                  <div style={{ fontSize: "0.7rem", color: "#92400E" }}>Cần kỹ thuật kiểm tra</div>
                </div>
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: "0.75rem", color: "#991B1B" }}>Thất lạc / Mất mát</div>
                  <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.6rem", color: "#DC2626" }}>{lostEquip}</strong>
                  <div style={{ fontSize: "0.7rem", color: "#991B1B" }}>Đã lập biên bản bồi thường</div>
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
                  • <strong>Bảo mật tài chính:</strong> Các số liệu doanh thu, dòng tiền ròng và báo cáo nhập hàng giá vốn được bảo vệ thuộc thẩm quyền Quản trị viên (UC10.1 Dòng phụ 4.1).
                </p>
                <p>
                  • <strong>Thao tác nhanh:</strong> Chuyển sang tab "Chuẩn bị & Bàn giao" hoặc "Nhận trả & Phụ phí" để xử lý trực tiếp đơn hàng tương ứng.
                </p>
              </div>
            </div>
          </div>
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

          <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", textAlign: "left" }}>
                  {["Thời gian", "Người thực hiện", "Hành động", "Đối tượng tác động (UC10.4.2)", "Chi tiết nội dung", "Thao tác"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "30px 0", textAlign: "center", color: "#6B7280" }}>
                      Chưa có nhật ký thao tác nào của nhân viên kho.
                    </td>
                  </tr>
                ) : (
                  staffLogs.map((log) => (
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
                        {log.targetId.startsWith("DT-") && (
                          <button
                            onClick={() => openOrder(log.targetId, "orders")}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                          >
                            Xem đơn
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
