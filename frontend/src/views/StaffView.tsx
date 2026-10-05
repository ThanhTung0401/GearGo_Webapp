import { useState } from "react";
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
} from "../store";
import Icon, { type IconName } from "../components/Icon";

type StaffTab = "overview" | "orders" | "handover" | "return" | "equipment";

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
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: "16px" }}>Tổng quan ca làm việc</h2>
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {[
          { label: "Cần chuẩn bị", value: preparing.length, color: "#B45309", bg: "#FEF3C7", icon: "settings" as IconName, tab: "handover" as StaffTab },
          { label: "Sẵn sàng giao", value: readyToHandover.length, color: "#15803D", bg: "#DCFCE7", icon: "arrow-up" as IconName, tab: "handover" as StaffTab },
          { label: "Đang thuê", value: inRent.length, color: "#1D4ED8", bg: "#DBEAFE", icon: "tent" as IconName, tab: "orders" as StaffTab },
          { label: "Trả một phần", value: partialReturned.length, color: "#C2410C", bg: "#FFF7ED", icon: "arrow-down" as IconName, tab: "return" as StaffTab },
          { label: "Quá hạn hẹn trả", value: overdueOrders.length, color: "#DC2626", bg: "#FEE2E2", icon: "alert-circle" as IconName, tab: "return" as StaffTab },
          { label: "Chờ đối soát", value: reconcile.length, color: "#374151", bg: "#F3F4F6", icon: "wallet" as IconName, tab: "return" as StaffTab },
          { label: "Cần bảo trì", value: maintenanceCount, color: "#7C3AED", bg: "#F5F3FF", icon: "tool" as IconName, tab: "equipment" as StaffTab },
        ].map((s) => (
          <div key={s.label} style={{ background: s.bg, borderRadius: "12px", padding: "16px", border: "1px solid var(--color-bone)" }}>
            <div style={{ color: s.color, marginBottom: "6px" }}><Icon name={s.icon} size={22} /></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.8rem", fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.78rem", color: s.color, fontWeight: 600 }}>{s.label}</div>
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

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab({ app, selectedOrderId, setSelectedOrderId, openOrder }: { app: ReturnType<typeof useApp>; selectedOrderId: string | null; setSelectedOrderId: (id: string | null) => void; openOrder: (id: string, tab: StaffTab) => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tất cả");
  const statuses = ["Tất cả", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận", "Đang thuê", "Trả một phần", "Quá hạn", "Chờ đối soát", "Hoàn tất"];

  const filtered = app.orders.filter((o) => {
    const isOverdue = app.checkOrderOverdue(o).isOverdue;
    const returnedCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
    const isPartial = o.status === "Đang thuê" && returnedCnt > 0 && returnedCnt < o.assignedEquipment.length;

    let matchStatus = filter === "Tất cả" || o.status === filter;
    if (filter === "Quá hạn") matchStatus = isOverdue;
    if (filter === "Trả một phần") matchStatus = isPartial;

    const matchSearch = o.id.includes(search) || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.customerPhone.includes(search);
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <input placeholder="🔍 Tìm mã đơn, tên khách, SĐT..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "8px 14px", fontSize: "0.85rem", flex: 1, minWidth: 220 }}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          aria-label="Lọc trạng thái đơn"
          style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "8px 14px", fontSize: "0.85rem", background: "white" }}
        >
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--color-parchment)", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>
              {["Mã đơn", "Khách hàng", "Sản phẩm", "Lịch thuê", "Tổng thu", "Trạng thái", "Thao tác"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => {
              const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
              const isOverdue = app.checkOrderOverdue(o).isOverdue;
              const returnedCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
              const isPartial = o.status === "Đang thuê" && returnedCnt > 0 && returnedCnt < o.assignedEquipment.length;

              return (
                <tr key={o.id} style={{ borderTop: "1px solid var(--color-bone)", background: i % 2 === 0 ? "white" : "var(--color-cream)" }}>
                  <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--color-forest)", fontWeight: 700 }}>
                    {o.id}
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
                    <button onClick={() => openOrder(o.id, o.status === "Đang thuê" || o.status === "Chờ đối soát" ? "return" : "handover")}
                      style={{ background: "var(--color-forest)", color: "white", border: "none", borderRadius: "6px", padding: "5px 12px", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}
                    >
                      {o.status === "Đang thuê" ? "Nhận trả" : o.status === "Chờ đối soát" ? "Đối soát" : "Chuẩn bị"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Handover Tab (UC10 & UC11) ───────────────────────────────────────────────
function HandoverTab({ app, selectedOrder, setSelectedOrderId }: { app: ReturnType<typeof useApp>; selectedOrder: Order | null; setSelectedOrderId: (id: string | null) => void }) {
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

  const eligible = app.orders.filter((o) => ["Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status));
  const order = selectedOrder;

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

  const handleCompleteHandover = () => {
    if (!order) return;
    const itemsCheck = order.items.flatMap((item) => {
      const assignedIds = assignments[item.productId] || [];
      return assignedIds.map((eid) => ({
        equipmentId: eid,
        productId: item.productId,
        condition: "Tốt",
        accessoriesOk: true,
        note: handoverNote,
      }));
    });

    const checklistArr = Object.entries(checklist).map(([name, checked]) => ({ name, checked }));

    const res = app.createHandoverRecord(order.id, {
      orderId: order.id,
      staffName: "NV Kho Mai",
      customerName: order.customerName,
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

  const allAssigned = order ? order.items.every((item) => {
    const arr = assignments[item.productId] || [];
    return arr.filter(Boolean).length >= item.qty;
  }) : false;

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: "280px 1fr" }}>
      {/* Left: order picker */}
      <div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--color-bark)", marginBottom: "10px" }}>Đơn cần chuẩn bị & bàn giao</h3>
        <div className="flex flex-col gap-2">
          {eligible.map((o) => {
            const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
            return (
              <button key={o.id} onClick={() => { setSelectedOrderId(o.id); setAssignments({}); setShowHandoverModal(false); }}
                style={{ background: selectedOrder?.id === o.id ? "var(--color-forest)" : "white", color: selectedOrder?.id === o.id ? "white" : "var(--color-bark)", borderRadius: "10px", padding: "12px 14px", border: `1px solid ${selectedOrder?.id === o.id ? "var(--color-forest)" : "var(--color-bone)"}`, cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", opacity: 0.8 }}>{o.id}</div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{o.customerName}</div>
                <span style={{ background: selectedOrder?.id === o.id ? "rgba(255,255,255,0.2)" : sc.bg, color: selectedOrder?.id === o.id ? "white" : sc.text, padding: "2px 7px", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 600 }}>{o.status}</span>
              </button>
            );
          })}
          {eligible.length === 0 && <p style={{ fontSize: "0.85rem", color: "#9CA3AF" }}>Hiện không có đơn nào chờ chuẩn bị.</p>}
        </div>
      </div>

      {/* Right: equipment assignment & handover */}
      <div>
        {!order ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#9CA3AF", background: "white", borderRadius: 12, border: "1px solid var(--color-bone)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "8px" }}>📦</div>
            <p>Chọn đơn ở danh sách bên trái để bắt đầu gán serial và lập biên bản bàn giao</p>
          </div>
        ) : (
          <div>
            <div style={{ background: "var(--color-parchment)", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", border: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between items-start">
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--color-moss)", fontWeight: 700 }}>{order.id}</div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{order.customerName} · {order.customerPhone}</div>
                  <div style={{ fontSize: "0.82rem", color: "#6B7280" }}>📤 Hẹn nhận: {order.pickupTime} → 📥 Hẹn trả: {order.returnTime}</div>
                </div>
                <span style={{ background: "var(--color-forest)", color: "white", padding: "4px 10px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 700 }}>
                  {order.status}
                </span>
              </div>
            </div>

            {/* UC10: Gán serial & Đổi serial */}
            <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10 }}>1. Phân công mã thiết bị (Serial)</h4>
            {order.items.map((item) => {
              const avail = app.equipment.filter((e) => e.productId === item.productId && e.equipmentStatus === "Sẵn sàng");
              return (
                <div key={item.productId} style={{ background: "white", borderRadius: "10px", border: "1px solid var(--color-bone)", padding: "14px 16px", marginBottom: "12px" }}>
                  <div style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: "8px" }}>
                    {item.productName} — Yêu cầu: <span style={{ color: "var(--color-forest)" }}>{item.qty} chiếc</span>
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
                            <span style={{ color: "#15803D", fontSize: "0.85rem", fontWeight: 700 }}>✓ Đã chọn</span>
                            <button onClick={() => setChangingEquip({ productId: item.productId, oldId: currentChosen })}
                              style={{ background: "#F3F4F6", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "4px 8px", fontSize: "0.72rem", cursor: "pointer" }}>
                              Đổi serial khác
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {avail.length < item.qty && (
                    <div style={{ background: "#FEE2E2", borderRadius: "6px", padding: "8px 12px", fontSize: "0.78rem", color: "#DC2626", marginTop: "6px" }}>
                      ⚠ Kho chỉ còn {avail.length} chiếc sẵn sàng cho sản phẩm này!
                    </div>
                  )}
                </div>
              );
            })}

            {/* Modal đổi serial nếu thiết bị lỗi trước khi bàn giao */}
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

            {/* UC11: Checklist phụ kiện & Tình trạng bàn giao */}
            <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--color-bone)", padding: "16px", marginBottom: 16 }}>
              <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 10 }}>2. Checklist phụ kiện & Biên bản bàn giao</h4>
              <div className="flex flex-col gap-2 mb-3">
                {Object.entries(checklist).map(([name, checked]) => (
                  <label key={name} className="flex items-center gap-2" style={{ fontSize: "0.85rem", cursor: "pointer", color: "var(--color-bark)" }}>
                    <input type="checkbox" checked={checked} onChange={(e) => setChecklist((prev) => ({ ...prev, [name]: e.target.checked }))} style={{ accentColor: "var(--color-forest)", width: 16, height: 16 }} />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 4 }}>
                Ghi chú tình trạng lúc giao / Ảnh chụp hiện trạng:
              </label>
              <textarea placeholder="Ghi nhận tình trạng ngoại quan, số lượng cọc lều, pin đầy đủ..." value={handoverNote} onChange={(e) => setHandoverNote(e.target.value)} rows={2}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", resize: "none" }}
              />
            </div>

            <div className="flex gap-3">
              {order.status === "Đã xác nhận" && (
                <button onClick={() => app.advanceOrderStatus(order.id, "Đang chuẩn bị")}
                  style={{ background: "var(--color-amber)", color: "white", padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>
                  Chuyển sang "Đang chuẩn bị"
                </button>
              )}
              {order.status === "Đang chuẩn bị" && (
                <button onClick={() => app.advanceOrderStatus(order.id, "Sẵn sàng nhận")}
                  style={{ background: "#15803D", color: "white", padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>
                  Đánh dấu "Sẵn sàng nhận"
                </button>
              )}
              <button
                disabled={!allAssigned}
                onClick={handleCompleteHandover}
                style={{
                  background: allAssigned ? "var(--color-forest)" : "#9CA3AF",
                  color: "white", padding: "10px 24px", borderRadius: 8, border: "none",
                  cursor: allAssigned ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.95rem"
                }}
              >
                ✓ Bàn giao đồ & Lập Biên bản (BBBG)
              </button>
            </div>
          </div>
        )}

        {/* Modal xem Biên bản bàn giao vừa tạo */}
        {showHandoverModal && order && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
            <div style={{ background: "white", borderRadius: 16, maxWidth: 600, width: "100%", padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
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
                <div><strong>Khách hàng:</strong> {order.customerName} ({order.customerPhone})</div>
                <div><strong>Thời gian bàn giao:</strong> {new Date().toLocaleString("vi-VN")}</div>
                <div><strong>Nhân viên bàn giao:</strong> NV Kho Mai</div>
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
                <strong>Checklist đã kiểm:</strong> Tất cả 4 hạng mục an toàn, vệ sinh và phụ kiện đã được xác nhận đạt chuẩn.
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
  );
}

// ─── Return Tab (UC12 Nhận trả nhiều đợt & Trả 1 phần, UC13 Quá hạn, UC15 Đối soát) ───
function ReturnTab({ app, selectedOrder, setSelectedOrderId }: { app: ReturnType<typeof useApp>; selectedOrder: Order | null; setSelectedOrderId: (id: string | null) => void }) {
  const [selectedItemsToReturn, setSelectedItemsToReturn] = useState<Record<string, boolean>>({});
  const [itemConditions, setItemConditions] = useState<Record<string, ReturnReceiptItem["condition"]>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [itemSurcharges, setItemSurcharges] = useState<Record<string, number>>({});
  const [returnStaffNote, setReturnStaffNote] = useState("");
  const [reconciled, setReconciled] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<ReturnReceipt | null>(null);

  const eligibleOrders = app.orders.filter((o) => ["Đang thuê", "Đã nhận trả", "Chờ đối soát"].includes(o.status));
  const order = selectedOrder;

  // Tính toán quá hạn
  const overdueInfo = order ? app.checkOrderOverdue(order) : { isOverdue: false, overdueHours: 0, overdueDays: 0, surcharge: 0 };

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
      };
    });

    const res = app.createReturnReceipt(order.id, {
      returnItems,
      staffName: "NV Kho Mai",
      note: returnStaffNote || `Nhận trả đợt ${currentReturnRound} (${returnItems.length} thiết bị)`,
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

  // Đối soát
  const approvedSurcharges = order?.surcharges.filter((s) => s.status === "Đã duyệt") || [];
  const depositUsed = approvedSurcharges.reduce((s, c) => s + c.amount, 0);
  const refund = Math.max(0, (order?.depositTotal || 0) - depositUsed);
  const extra = Math.max(0, depositUsed - (order?.depositTotal || 0));

  return (
    <div className="responsive-staff-grid grid gap-6" style={{ gridTemplateColumns: "280px 1fr" }}>
      {/* Cột trái: Danh sách đơn */}
      <div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--color-bark)", marginBottom: "10px" }}>
          Đơn nhận trả & đối soát
        </h3>
        <div className="flex flex-col gap-2">
          {eligibleOrders.map((o) => {
            const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
            const isOd = app.checkOrderOverdue(o).isOverdue;
            const retCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
            const isPart = o.status === "Đang thuê" && retCnt > 0 && retCnt < o.assignedEquipment.length;

            return (
              <button key={o.id} onClick={() => { setSelectedOrderId(o.id); setReconciled(false); setSelectedItemsToReturn({}); }}
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
        ) : reconciled ? (
          <div style={{ background: "#DCFCE7", borderRadius: "12px", padding: "30px", border: "1px solid #A7F3D0", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "8px" }}>🎉</div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-forest)", marginBottom: "8px" }}>
              Đơn hàng Hoàn tất!
            </h3>
            <p style={{ fontSize: "0.95rem", color: "#15803D" }}>
              Đã hoàn tất toàn bộ chu trình thuê và đối soát cọc cho đơn <strong>{order.id}</strong>.
            </p>
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

            {/* UC13: Banner Cảnh báo quá hạn */}
            {overdueInfo.isOverdue && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#DC2626", fontSize: "0.9rem" }}>
                    ⚠️ Đơn thuê đã quá hạn {overdueInfo.overdueDays} ngày ({overdueInfo.overdueHours} giờ)!
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#991B1B" }}>
                    Chính sách quá hạn: Phạt 150% tiền thuê ngày cho mỗi block 24h trễ = +{fmt(overdueInfo.surcharge)}.
                  </div>
                </div>
                <button onClick={handleApplyOverdueFee} style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                  + Lập phụ phí trễ
                </button>
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

            {/* UC15: Đối soát tiền cọc */}
            {order.status === "Chờ đối soát" && (
              <div style={{ background: "var(--color-parchment)", borderRadius: "10px", padding: "16px 20px", border: "1px solid var(--color-bone)" }}>
                <h4 style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: "10px" }}>Đối soát tiền cọc & Quyết toán</h4>
                <div className="flex flex-col gap-2" style={{ fontSize: "0.85rem", marginBottom: "12px" }}>
                  <div className="flex justify-between"><span style={{ color: "#6B7280" }}>Cọc đã thu ban đầu:</span><span style={{ fontFamily: "var(--font-mono)" }}>{fmt(order.depositTotal)}</span></div>
                  <div className="flex justify-between" style={{ color: "#DC2626" }}><span>Tổng phụ phí đã duyệt:</span><span style={{ fontFamily: "var(--font-mono)" }}>−{fmt(depositUsed)}</span></div>
                  <div className="flex justify-between" style={{ fontWeight: 700, borderTop: "1px dashed var(--color-bone)", paddingTop: "8px" }}>
                    <span>{refund > 0 ? "Số tiền hoàn cọc cho khách:" : "Khách cần thanh toán thêm:"}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", color: refund > 0 ? "var(--color-forest)" : "#DC2626" }}>
                      {fmt(refund > 0 ? refund : extra)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => { app.settleOrder(order.id, true); setReconciled(true); }}
                    style={{ background: "var(--color-forest)", color: "white", padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>
                    Xác nhận {refund > 0 ? "hoàn cọc" : "thu thêm"} thành công → Hoàn tất
                  </button>
                  <button onClick={() => { app.settleOrder(order.id, false); }}
                    style={{ background: "white", color: "#B91C1C", padding: "10px 16px", borderRadius: 8, border: "1px solid #FECACA", cursor: "pointer", fontWeight: 700 }}>
                    Mô phỏng lỗi GD
                  </button>
                </div>
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
                    {it.surchargeAmount > 0 && (
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#DC2626", fontSize: "0.85rem" }}>
                        +{fmt(it.surchargeAmount)}
                      </span>
                    )}
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
      </div>
    </div>
  );
}

// ─── Equipment & Maintenance Tab (UC16) ───────────────────────────────────────
function EquipmentTab({ app }: { app: ReturnType<typeof useApp> }) {
  const [subTab, setSubTab] = useState<"inventory" | "maintenance">("inventory");
  const [filter, setFilter] = useState("Tất cả");
  const [productFilter, setProductFilter] = useState("Tất cả");
  const [transferModal, setTransferModal] = useState<Equipment | null>(null);
  const [targetProductId, setTargetProductId] = useState("");

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
      {/* Sub tabs: Kho / Phiếu bảo trì */}
      <div className="flex gap-2 mb-4 border-b border-bone pb-2">
        <button onClick={() => setSubTab("inventory")}
          style={{ background: subTab === "inventory" ? "var(--color-forest)" : "white", color: subTab === "inventory" ? "white" : "var(--color-bark)", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
          📦 Danh sách kho ({app.equipment.length} thiết bị)
        </button>
        <button onClick={() => setSubTab("maintenance")}
          style={{ background: subTab === "maintenance" ? "var(--color-forest)" : "white", color: subTab === "maintenance" ? "white" : "var(--color-bark)", border: "1px solid var(--color-bone)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
          🛠 Phiếu bảo trì & sửa chữa ({app.maintenanceReceipts.length} phiếu)
        </button>
      </div>

      {subTab === "inventory" ? (
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
                        {e.equipmentStatus === "Sẵn sàng" && (
                          <button onClick={() => { setTransferModal(e); setTargetProductId(""); }}
                            style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: 6, padding: "3px 8px", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}>
                            Chuyển loại
                          </button>
                        )}
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
        </div>
      ) : (
        /* Tab Phiếu bảo trì (UC16) */
        <div>
          <div className="responsive-table" style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-parchment)", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-bark)" }}>
                  {["Mã phiếu", "Mã thiết bị", "Mô tả lỗi / Hư hỏng", "Đơn liên quan", "Ngày tạo", "Chi phí dự tính", "Trạng thái", "Thao tác"].map((h) => (
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
                      {m.status !== "Hoàn tất" && m.status !== "Không thể sửa" && (
                        <div className="flex gap-1">
                          <button onClick={() => app.updateMaintenanceStatus(m.id, "Hoàn tất")}
                            style={{ background: "#15803D", color: "white", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: "0.72rem", cursor: "pointer", fontWeight: 700 }}>
                            Đã sửa xong → Sẵn sàng
                          </button>
                          <button onClick={() => app.updateMaintenanceStatus(m.id, "Không thể sửa")}
                            style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 6, padding: "3px 6px", fontSize: "0.72rem", cursor: "pointer" }}>
                            Hỏng hẳn
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
