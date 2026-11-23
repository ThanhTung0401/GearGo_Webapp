import { fmt, formatDateTimeVi, statusColors, type Order } from "../../../store";

const ORDER_FLOW_STEPS = [
  "Chờ thanh toán",
  "Đã xác nhận",
  "Đang chuẩn bị",
  "Sẵn sàng nhận",
  "Đang thuê",
  "Đã nhận trả",
  "Chờ đối soát",
  "Hoàn tất",
];

interface OrderStatusFlowPanelProps {
  orders: Order[];
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
  onOpenStoreCancel: (order: Order) => void;
  onOpenReconciliation: (order: Order) => void;
}

/**
 * Sơ đồ luồng trạng thái đơn thuê & danh sách đơn lọc theo trạng thái (UC5.4 & UC3.4).
 */
export function OrderStatusFlowPanel({
  orders,
  statusFilter,
  onStatusFilterChange,
  onOpenStoreCancel,
  onOpenReconciliation,
}: OrderStatusFlowPanelProps) {
  const filteredOrders = statusFilter ? orders.filter((o) => o.status === statusFilter) : [];

  return (
    <div className="adm-card adm-card--padded-sm mt-4.5">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div>
          <h3 className="adm-section-heading m-0">
            Luồng trạng thái đơn thuê & Giám sát đối soát (UC5.4)
          </h3>
          <div className="adm-hint-text">Click vào một trạng thái để xem danh sách đơn hoặc thực hiện đối soát cọc</div>
        </div>
        {statusFilter && (
          <button onClick={() => onStatusFilterChange(null)} className="adm-btn-link adm-hint-text underline">
            Bỏ chọn lọc
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {ORDER_FLOW_STEPS.map((s, i, arr) => {
          const sc = statusColors[s] || { bg: "#F3F4F6", text: "#374151" };
          const cnt = orders.filter((o) => o.status === s).length;
          const isSelected = statusFilter === s;
          return (
            <div key={s} className="flex items-center gap-2">
              {/* Màu nền/chữ bước trạng thái theo statusColors; khi isSelected sẽ ưu tiên lớp .is-selected */}
              <button
                type="button"
                onClick={() => onStatusFilterChange(isSelected ? null : s)}
                className={`adm-flow-step ${isSelected ? "is-selected" : ""}`}
                style={{ background: sc.bg }}
              >
                <div className="adm-flow-step-count" style={{ color: sc.text }}>{cnt}</div>
                <div className="adm-flow-step-label" style={{ color: sc.text }}>{s}</div>
              </button>
              {i < arr.length - 1 && <span className="adm-flow-arrow">→</span>}
            </div>
          );
        })}
      </div>

      {/* Danh sách đơn theo trạng thái đang chọn */}
      {statusFilter && (
        <div className="adm-flow-list-wrap">
          <div className="flex justify-between items-center mb-2">
            <strong className="adm-cell-title">
              Danh sách đơn: {statusFilter} ({filteredOrders.length} đơn)
            </strong>
          </div>

          <div className="flex flex-col gap-2">
            {filteredOrders.length === 0 ? (
              <div className="adm-empty-box p-4 text-[0.8rem] border-none bg-[#F9FAFB]">
                Không có đơn hàng nào ở trạng thái {statusFilter}.
              </div>
            ) : (
              filteredOrders.map((o) => (
                <div key={o.id} className="adm-flow-order-row">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* [DB-02] Hiển thị mã hiển thị (DT-...) thay vì id số thô */}
                      <strong className="adm-cell-code text-[0.88rem]">{o.displayCode || o.id}</strong>
                      <span className="adm-cell-title">{o.customerName}</span>
                      <span className="adm-hint-text">({o.customerPhone})</span>
                    </div>
                    <div className="adm-hint-text mt-0.5">
                      {/* [DB-03] Dùng formatDateTimeVi để chuẩn hóa ISO sang dd/MM/yyyy HH:mm */}
                      Tiền thuê: {fmt(o.rental - o.discount)} · Tiền cọc: {fmt(o.depositTotal)} · Hẹn trả: {formatDateTimeVi(o.returnTime)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* [DB-01] Dùng đúng chuỗi trạng thái "Sẵn sàng nhận" theo ORDER_FLOW_STEPS */}
                    {["Chờ thanh toán", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(o.status) && (
                      <button
                        type="button"
                        onClick={() => onOpenStoreCancel(o)}
                        className="adm-btn-danger-soft px-3 py-1.5 font-bold"
                      >
                        Cửa hàng hủy (UC3.4)
                      </button>
                    )}
                    {(o.status === "Chờ đối soát" || o.status === "Hoàn tất") && (
                      <button
                        type="button"
                        onClick={() => onOpenReconciliation(o)}
                        className={
                          o.status === "Chờ đối soát"
                            ? "adm-btn-forest-solid px-3.5 py-1.5"
                            : "adm-btn-outline px-3.5 py-1.5 font-bold"
                        }
                      >
                        {o.status === "Chờ đối soát" ? "📝 Mở bảng đối soát (UC5.4)" : "🔍 Xem đối soát đã khóa"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
