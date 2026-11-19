import { useApp } from "../../../context/AppContext";
import { fmt, statusColors, Order } from "../../../store";
import { type StaffTab } from "../returnMapping";
import { ORDER_STATUS_FILTERS, type OrdersQuickFilter } from "./useOrdersTab";

interface OrdersTableProps {
  app: ReturnType<typeof useApp>;
  search: string;
  setSearch: (v: string) => void;
  filter: string;
  setFilter: (v: string) => void;
  quickFilter: OrdersQuickFilter;
  setQuickFilter: (v: OrdersQuickFilter) => void;
  deliveryTodayCount: number;
  pickupTodayCount: number;
  overdueCount: number;
  partialCount: number;
  filtered: Order[];
  openOrder: (id: string, tab: StaffTab) => void;
  handleOpenDetail: (order: Order) => void;
  handleOpenNoShow: (order: Order) => void;
}

// Thanh lọc nhanh ca trực, tìm kiếm và bảng danh sách đơn thuê cho nhân viên (UC4.5)
export function OrdersTable({
  app,
  search,
  setSearch,
  filter,
  setFilter,
  quickFilter,
  setQuickFilter,
  deliveryTodayCount,
  pickupTodayCount,
  overdueCount,
  partialCount,
  filtered,
  openOrder,
  handleOpenDetail,
  handleOpenNoShow,
}: OrdersTableProps) {
  return (
    <>
      {/* UC4.5: Thanh lọc nhanh vận hành trong ca */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span className="so-filter-label">Bộ lọc ca trực:</span>
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
            onClick={() => {
              setQuickFilter(btn.key as OrdersQuickFilter);
              setFilter("Tất cả");
            }}
            /* Kích hoạt trạng thái lọc nhanh hiện tại qua modifier .is-active */
            className={`so-pill-btn ${quickFilter === btn.key ? "is-active" : ""}`}
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
          onChange={(e) => {
            setFilter(e.target.value);
            setQuickFilter("all");
          }}
          aria-label="Lọc trạng thái đơn"
          className="form-select max-w-[200px]"
        >
          {ORDER_STATUS_FILTERS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Bọc bảng bằng .responsive-table bên trong .staff-table-wrap để cuộn ngang mượt trên màn hình 390px */}
      <div className="staff-table-wrap">
        <div className="responsive-table">
          <table className="staff-table so-zebra-table so-table-compact">
            <thead>
              <tr>
                {["Mã đơn", "Khách hàng", "Sản phẩm", "Lịch thuê", "Tổng thu", "Trạng thái", "Thao tác"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
                const isOverdue = app.checkOrderOverdue(o).isOverdue;
                const returnedCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
                const isPartial = o.status === "Đang thuê" && returnedCnt > 0 && returnedCnt < o.assignedEquipment.length;
                const canReportNoShow = ["Sẵn sàng nhận", "Đang chuẩn bị", "Đã xác nhận"].includes(o.status);

                return (
                  <tr key={o.id}>
                    <td className="so-td-mono">
                      <button onClick={() => handleOpenDetail(o)} className="so-link-btn">
                        {o.displayCode || o.id}
                      </button>
                      {o.noShowReported && <div className="so-noshow-tag">⚠️ Khách vắng mặt</div>}
                    </td>
                    <td>
                      <div className="so-customer-name">{o.customerName}</div>
                      <div className="so-customer-phone">{o.customerPhone}</div>
                    </td>
                    <td className="so-td-muted">
                      {/* Bảo vệ an toàn khi API chi tiết chưa trả về tên sản phẩm trên dòng đơn */}
                      {o.items.length > 0
                        ? o.items.map((it) => `${(it.productName || "Thiết bị").split("–")[0].trim()} ×${it.qty}`).join(", ")
                        : `${o.assignedEquipment.length} thiết bị đã gán`}
                    </td>
                    <td className="so-td-schedule">
                      <div>📤 {o.pickupTime ? o.pickupTime.replace("T", " ").slice(0, 16) : "—"}</div>
                      <div className={`so-schedule-return ${isOverdue ? "is-overdue" : ""}`}>
                        📥 {o.returnTime ? o.returnTime.replace("T", " ").slice(0, 16) : "—"}
                      </div>
                    </td>
                    <td className="so-td-amount">{fmt(o.rental - o.discount + o.depositTotal)}</td>
                    <td>
                      <div className="flex flex-col gap-1 items-start">
                        {/* Màu trạng thái lấy động từ statusColors */}
                        <span className="so-status-pill" style={{ background: sc.bg, color: sc.text }}>
                          {o.status}
                        </span>
                        {isPartial && (
                          <span className="so-badge-partial-sm">
                            Trả {returnedCnt}/{o.assignedEquipment.length} món
                          </span>
                        )}
                        {isOverdue && <span className="so-badge-overdue-sm">Quá hạn</span>}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() =>
                            openOrder(o.id, o.status === "Đang thuê" || o.status === "Chờ đối soát" ? "return" : "handover")
                          }
                          className="btn btn-primary btn-sm"
                        >
                          {o.status === "Đang thuê"
                            ? "Nhận trả"
                            : o.status === "Chờ đối soát"
                            ? "Đối soát"
                            : o.status === "Sẵn sàng nhận"
                            ? "Bàn giao"
                            : "Chuẩn bị"}
                        </button>

                        <button type="button" onClick={() => handleOpenDetail(o)} className="so-btn-soft">
                          Hồ sơ
                        </button>

                        {canReportNoShow && !o.noShowReported && (
                          <button
                            type="button"
                            onClick={() => handleOpenNoShow(o)}
                            className="so-btn-noshow"
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
      </div>
    </>
  );
}
