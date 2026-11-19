import { useApp } from "../../../context/AppContext";
import { isRealApiEnabled } from "../../../services/apiClient";
import type { DonQuaHanBackend } from "../../../services/api";
import { statusColors, Order } from "../../../store";
import type { ReturnStatusFilter } from "./returnTypes";

interface ReturnQueuePanelProps {
  app: ReturnType<typeof useApp>;
  selectedOrder: Order | null;
  statusFilter: ReturnStatusFilter;
  setStatusFilter: (f: ReturnStatusFilter) => void;
  eligibleOrders: Order[];
  overdueOrdersBackend: DonQuaHanBackend[];
  scanningOverdue: boolean;
  onScanOverdue: () => Promise<void>;
  onSelectOrder: (orderId: string) => void;
}

// Cột trái tab Nhận trả: Thanh quét quá hạn, bộ lọc trạng thái và hàng đợi đơn cần xử lý
export function ReturnQueuePanel({
  app,
  selectedOrder,
  statusFilter,
  setStatusFilter,
  eligibleOrders,
  overdueOrdersBackend,
  scanningOverdue,
  onScanOverdue,
  onSelectOrder,
}: ReturnQueuePanelProps) {
  return (
    <div>
      <h3 className="so-queue-title-lg">Đơn nhận trả & đối soát</h3>

      {(app.realApi || isRealApiEnabled()) && (
        <div className="so-overdue-scan-bar">
          <span className="so-overdue-scan-text">
            ⏰ Quá hạn hệ thống: <strong>{overdueOrdersBackend.length}</strong> đơn
          </span>
          <button
            type="button"
            disabled={scanningOverdue}
            onClick={() => void onScanOverdue()}
            className="so-overdue-scan-btn"
          >
            {scanningOverdue ? "Đang quét..." : "Quét nhắc"}
          </button>
        </div>
      )}

      {/* Bộ lọc trạng thái đơn */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {[
          {
            key: "active",
            label: "Đang xử lý",
            count: app.orders.filter((o) => ["Đang thuê", "Đã nhận trả", "Chờ đối soát"].includes(o.status)).length,
          },
          {
            key: "completed",
            label: "Hoàn tất",
            count: app.orders.filter((o) => o.status === "Hoàn tất").length,
          },
          {
            key: "all",
            label: "Tất cả",
            count: app.orders.filter((o) => ["Đang thuê", "Đã nhận trả", "Chờ đối soát", "Hoàn tất"].includes(o.status)).length,
          },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key as ReturnStatusFilter)}
            className={`so-filter-tab-btn ${statusFilter === f.key ? "is-active" : ""}`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {eligibleOrders.length === 0 ? (
          <div className="so-queue-empty-box">Không có đơn nào trong nhóm lọc này.</div>
        ) : (
          eligibleOrders.map((o) => {
            const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
            const isOd = app.checkOrderOverdue(o).isOverdue;
            const retCnt = o.assignedEquipment.filter((ae) => ae.returnedAt).length;
            const isPart = o.status === "Đang thuê" && retCnt > 0 && retCnt < o.assignedEquipment.length;
            const isSelected = selectedOrder?.id === o.id;

            return (
              <button
                key={o.id}
                onClick={() => onSelectOrder(o.id)}
                /* Đánh dấu đơn đang chọn bằng .is-selected */
                className={`so-queue-card ${isSelected ? "is-selected" : ""}`}
              >
                <div className="so-queue-code-plain">{o.displayCode || o.id}</div>
                <div className="so-queue-name">{o.customerName}</div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {/* Màu badge lấy động từ statusColors khi chưa chọn; khi đang chọn dùng CSS .is-selected */}
                  <span
                    className="so-queue-badge"
                    style={isSelected ? undefined : { background: sc.bg, color: sc.text }}
                  >
                    {o.status}
                  </span>
                  {isPart && <span className="so-badge-partial-sm">Trả 1 phần</span>}
                  {isOd && <span className="so-badge-overdue-sm">Quá hạn</span>}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
