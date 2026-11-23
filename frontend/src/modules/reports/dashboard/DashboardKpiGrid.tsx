import type { useApp } from "../../../context/AppContext";
import { fmt, statusColors } from "../../../store";
import Icon, { type IconName } from "../../../components/Icon";

interface DashboardKpiGridProps {
  currentMonthNum: number;
  displayRevenue: number;
  displayCompletedCount: number;
  processingOrdersCount: number;
  displayRentedCount: number;
  displayTotalEquip: number;
  displayHeldDeposit: number;
}

/**
 * Lưới 4 thẻ KPI tổng quan hệ thống (doanh thu, đơn xử lý, thiết bị thuê, cọc giữ).
 */
export function DashboardKpiGrid({
  currentMonthNum,
  displayRevenue,
  displayCompletedCount,
  processingOrdersCount,
  displayRentedCount,
  displayTotalEquip,
  displayHeldDeposit,
}: DashboardKpiGridProps) {
  const kpis: { label: string; value: string; sub: string; icon: IconName; color: string }[] = [
    {
      label: `Doanh thu tháng ${currentMonthNum}`,
      value: fmt(displayRevenue),
      sub: `${displayCompletedCount} đơn hoàn tất`,
      icon: "wallet",
      color: "var(--color-forest)",
    },
    {
      label: "Đơn đang xử lý",
      value: processingOrdersCount.toString(),
      sub: "Chưa hoàn tất",
      icon: "clipboard",
      color: "var(--color-amber)",
    },
    {
      label: "Thiết bị đang thuê",
      value: String(displayRentedCount),
      sub: `/ ${displayTotalEquip} tổng cộng`,
      icon: "tent",
      color: "#1D4ED8",
    },
    {
      label: "Cọc đang giữ",
      value: fmt(displayHeldDeposit),
      sub: "Không phải doanh thu",
      icon: "shield",
      color: "#6B7280",
    },
  ];

  return (
    <div className="admin-stats-grid">
      {kpis.map((k) => (
        <div key={k.label} className="kpi-card">
          {/* Màu nhấn KPI lấy động theo cấu hình từng thẻ trong mảng dữ liệu */}
          <div style={{ color: k.color }}><Icon name={k.icon} size={22} /></div>
          <div className="kpi-value adm-kpi-value" style={{ color: k.color }}>{k.value}</div>
          <div className="kpi-label">{k.label}</div>
          <div className="kpi-sub">{k.sub}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Khối 2 cột: 5 đơn thuê gần nhất và mức độ khả dụng thiết bị theo sản phẩm.
 */
export function DashboardOverviewGrid({ app }: { app: ReturnType<typeof useApp> }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="adm-card">
        <div className="adm-card-header">Đơn thuê gần đây</div>
        {app.orders.slice(-5).reverse().map((o) => {
          const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
          return (
            <div key={o.id} className="adm-avail-row flex gap-2.5 items-center">
              <div className="flex-1 min-w-0">
                <div className="adm-cell-title">{o.customerName}</div>
                {/* [DB-02] Hiển thị displayCode (DT-...) thay vì id số thô */}
                <div className="adm-cell-mono text-[0.7rem] text-[#9CA3AF]">{o.displayCode || o.id}</div>
              </div>
              <div className="adm-cell-right">
                <div className="adm-cell-mono text-[0.82rem] font-semibold">{fmt(o.rental - o.discount + o.depositTotal)}</div>
                {/* Huy hiệu trạng thái đơn thuê lấy màu động theo statusColors */}
                <span className="adm-pill adm-pill--round adm-pill--xs" style={{ background: sc.bg, color: sc.text }}>{o.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="adm-card">
        <div className="adm-card-header">Khả dụng thiết bị</div>
        {app.products.map((p) => {
          // [DB-08] Mẫu số total phải là tổng thiết bị của sản phẩm (trừ "Ngừng sử dụng"),
          // không phải chỉ đếm số đang "Sẵn sàng" (dẫn tới hiển thị 1/1 = 100%).
          const total = app.equipment.filter((e) => e.productId === p.id && e.equipmentStatus !== "Ngừng sử dụng").length;
          const readyCount = app.equipment.filter((e) => e.productId === p.id && e.equipmentStatus === "Sẵn sàng").length;
          const avail = app.equipment.length > 0 ? readyCount : app.getAvailable(p.id);
          const ratio = total > 0 ? Math.min(1, Math.max(0, avail / total)) : 0;
          return (
            <div key={p.id} className="adm-avail-row">
              <div className="flex justify-between mb-1">
                <span className="text-[0.82rem] font-semibold">{p.name}</span>
                <span className={`adm-avail-count ${avail > 1 ? "is-ok" : ""}`}>{avail} / {total}</span>
              </div>
              <div className="adm-progress-track">
                {/* Chiều rộng thanh khả dụng tính động theo tỷ lệ thiết bị sẵn sàng */}
                <div
                  className={`adm-progress-fill ${ratio > 0.5 ? "" : avail > 0 ? "is-mid" : "is-low"}`}
                  style={{ width: total > 0 ? `${ratio * 100}%` : "0%" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
