import { fmt, type Order, type Surcharge } from "../../../store";

interface DisputeCenterPanelProps {
  pendingSurcharges: Array<{ order: Order; surcharge: Surcharge }>;
  onResolveClick: (order: Order, surcharge: Surcharge) => void;
}

/**
 * UC5.3: Trung tâm xử lý tranh chấp & Duyệt phụ phí trên Dashboard Quản trị viên.
 */
export function DisputeCenterPanel({ pendingSurcharges, onResolveClick }: DisputeCenterPanelProps) {
  return (
    <div className="card-panel p-0 overflow-hidden mb-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-parchment p-3 px-4 border-b border-bone">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="adm-pill is-forest shrink-0">
              UC5.3
            </span>
            <strong className="text-sm text-bark">Trung tâm xử lý tranh chấp & Duyệt phụ phí</strong>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Đối chiếu chứng cứ bàn giao (BBBG) vs nhận trả (PNT), xem phản hồi khiếu nại của khách để kết luận mức phí hợp lệ.
          </div>
        </div>
        <span className={`badge shrink-0 self-start sm:self-center whitespace-nowrap ${pendingSurcharges.length ? "badge-warning" : "badge-success"}`}>
          {pendingSurcharges.length} khoản cần xử lý
        </span>
      </div>

      {pendingSurcharges.length === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm">✓ Tất cả phụ phí đã được duyệt hoặc xử lý tranh chấp xong.</div>
      ) : (
        pendingSurcharges.map(({ order, surcharge }) => {
          // Làm nổi bật các khoản đang bị khách hàng khiếu nại để ưu tiên xử lý
          const isDisputed = surcharge.status === "Tranh chấp";
          return (
            <div
              key={surcharge.id}
              className={`flex items-center gap-3 flex-wrap p-3 px-4 border-t border-bone adm-dispute-row ${isDisputed ? "is-disputed" : ""}`}
            >
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{surcharge.type} · {surcharge.equipmentId}</span>
                  <span className={`adm-pill adm-pill--xs ${isDisputed ? "is-danger" : "is-warning"}`}>
                    {isDisputed ? "⚠️ Khách đang khiếu nại" : "Chờ duyệt"}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Đơn {order.id} · Khách: {order.customerName} ({order.customerPhone}) · Lý do: {surcharge.reason}
                </div>
                {surcharge.customerResponse && (
                  <div className="adm-dispute-reply">
                    <strong>Ý kiến khách:</strong> "{surcharge.customerResponse}"
                  </div>
                )}
              </div>
              <strong className="text-red-600 font-mono">+{fmt(surcharge.amount)}</strong>
              <button
                type="button"
                onClick={() => onResolveClick(order, surcharge)}
                className="btn btn-primary btn-sm font-bold"
              >
                ⚖️ Xem chứng cứ & Kết luận (UC5.3)
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
