import { useApp } from "../../context/AppContext";

import { fmt, statusColors } from "../../store";
import Icon, { type IconName } from "../../components/Icon";

import { type StaffTab } from "../orders/returnMapping";
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
        <div className="so-overdue-banner-overview">
          <div className="flex items-center gap-2 mb-2 so-overdue-title">
            <Icon name="alert-circle" size={20} />
            <span>CẢNH BÁO: Có {overdueOrders.length} đơn thuê quá hạn hẹn trả</span>
          </div>
          <p className="so-overdue-desc">
            Thiết bị chưa được trả đúng hạn cam kết. Nhân viên vui lòng gọi điện nhắc khách hoặc áp dụng phụ phí trễ hạn (150% giá ngày theo block 24h).
          </p>
          <div className="flex flex-col gap-2">
            {overdueOrders.map((o) => {
              const od = app.checkOrderOverdue(o);
              return (
                <div key={o.id} className="so-alert-item">
                  <div>
                    <span className="so-alert-item-code">{o.displayCode || o.id}</span> — <strong>{o.customerName}</strong> ({o.customerPhone})
                    <div className="so-alert-item-meta">
                      Hạn trả: {o.returnTime} · <strong className="so-alert-item-late">Trễ {od.overdueDays} ngày ({od.overdueHours} giờ)</strong>
                    </div>
                  </div>
                  <div className="so-alert-item-actions">
                    <span className="so-alert-item-fee">
                      +{fmt(od.surcharge)} (150%)
                    </span>
                    <button onClick={() => openOrder(o.id, "return")} className="so-btn-danger-sm">
                      Nhận trả / Xử lý trễ →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h3 className="so-section-heading">
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
              className="so-overview-order-row hover:shadow-md transition-shadow"
            >
              <div className="so-flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="so-overview-order-code">{o.displayCode || o.id}</span>
                  {/* Màu trạng thái lấy động từ bảng ánh xạ statusColors */}
                  <span className="so-status-pill" style={{ background: sc.bg, color: sc.text }}>{o.status}</span>
                  {isPartial && (
                    <span className="so-badge-partial">
                      Đã trả {returnedCnt}/{o.assignedEquipment.length} món
                    </span>
                  )}
                  {isOverdue && (
                    <span className="so-badge-overdue">
                      Quá hạn
                    </span>
                  )}
                </div>
                <div className="so-overview-order-name">{o.customerName} · {o.customerPhone}</div>
                <div className="so-overview-order-items">
                  {o.items.length > 0 ? o.items.map((i) => `${i.productName || "Thiết bị"} ×${i.qty}`).join(", ") : `Đã gán ${o.assignedEquipment.length} thiết bị`}
                </div>
              </div>
              <div className="so-overview-order-meta">
                <div className="so-overview-order-items">Hẹn nhận: {o.pickupTime ? o.pickupTime.replace("T", " ").slice(0, 16) : "—"}</div>
                <div className="so-overview-order-items">Hẹn trả: {o.returnTime ? o.returnTime.replace("T", " ").slice(0, 16) : "—"}</div>
                {o.total !== undefined && <div className="so-overview-order-total">{fmt(o.rental - o.discount + o.depositTotal)}</div>}
              </div>
              <span className="so-overview-order-arrow">→</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Orders Tab (UC4.5: Bộ lọc vận hành & Tra cứu hồ sơ đơn) ────────────────────────────────────
