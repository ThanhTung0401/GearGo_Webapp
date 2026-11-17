import { useApp } from "../../../context/AppContext";

import { fmt, statusColors } from "../../../store";
import Icon, { type IconName } from "../../../components/Icon";

import { type StaffTab } from "../returnMapping";
export function OverviewTab({ app, openOrder }: { app: ReturnType<typeof useApp>; openOrder: (id: string, tab: StaffTab) => void }) {
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
