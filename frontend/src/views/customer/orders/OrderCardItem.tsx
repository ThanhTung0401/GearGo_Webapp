import { fmt, statusColors, type Order } from "../../../store";

interface OrderCardItemProps {
  order: Order;
  isSelected: boolean;
  onSelect: (orderId: string) => void;
  onContinuePayment: (orderId: string) => void;
}

/**
 * Thẻ tóm tắt một đơn thuê trong cột danh sách (UC3.3).
 */
export function OrderCardItem({
  order: o,
  isSelected,
  onSelect,
  onContinuePayment,
}: OrderCardItemProps) {
  const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };

  return (
    <div
      onClick={() => onSelect(o.id)}
      className={`order-card cursor-pointer cp-order-card ${isSelected ? "is-selected" : ""}`}
    >
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-moss font-bold">{o.displayCode || o.id}</span>
            <span className="cp-order-created">· Tạo lúc: {o.createdAt}</span>
          </div>
          <div className="font-bold text-bark my-1 text-sm">
            {o.items.length > 0 ? o.items.map((i) => `${i.productName} ×${i.qty}`).join(", ") : `Đơn thuê ${o.displayCode || o.id}`}
          </div>
          <div className="text-xs text-gray-500">
            📅 Lịch nhận - trả: <strong>{o.pickupTime}</strong> → <strong>{o.returnTime}</strong>
          </div>
        </div>

        <div className="text-right">
          <span
            style={{ background: sc.bg, color: sc.text }}
            className="badge mb-1 cp-order-status-badge"
          >
            {o.status}
          </span>
          <div className="font-mono font-bold text-forest text-sm">
            {fmt(o.rental - o.discount + o.depositTotal)}
          </div>

          {/* Nút hành động nhanh cho đơn Chờ thanh toán */}
          {o.status === "Chờ thanh toán" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onContinuePayment(o.id);
              }}
              className="cp-order-pay-now-btn"
            >
              💳 Tiếp tục thanh toán (15p) →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
