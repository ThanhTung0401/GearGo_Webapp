import { fmt, type MoneyTransaction, type Order } from "../../../store";

interface OrderConfirmedItemsAndReceiptProps {
  order: Order;
  paid: boolean;
  totalAmount: number;
  displayOrderCode: string;
  latestPayment: MoneyTransaction | undefined;
}

/**
 * Bảng kê thiết bị, tổng thanh toán và biên lai điện tử VietQR sau khi xác nhận thanh toán (UC5.1).
 */
export function OrderConfirmedItemsAndReceipt({
  order,
  paid,
  totalAmount,
  displayOrderCode,
  latestPayment,
}: OrderConfirmedItemsAndReceiptProps) {
  return (
    <>
      {/* Danh sách thiết bị và chi phí */}
      <div className="flex flex-col gap-2 my-4 text-sm cp-confirmed-items-box">
        {order.items.map((item) => (
          <div
            key={item.productId}
            className="flex justify-between py-1 border-b border-dashed border-bone"
          >
            <span className="text-gray-700">
              {item.productName} × {item.qty} ({item.days} ngày)
            </span>
            <span className="font-mono font-semibold">
              {fmt(item.pricePerDay * item.qty * item.days)}
            </span>
          </div>
        ))}
        {order.discount > 0 && (
          <div className="flex justify-between text-emerald-600 font-semibold">
            <span>Khuyến mãi</span>
            <span className="font-mono">−{fmt(order.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-700">
          <span>Cọc bảo đảm (Hoàn lại 100%)</span>
          <span className="font-mono font-semibold">{fmt(order.depositTotal)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t-2 border-bone font-bold text-base">
          <span>Tổng thanh toán</span>
          <span className="font-mono text-forest">
            {fmt(totalAmount)}
          </span>
        </div>
      </div>

      {/* UC5.1: Biên lai điện tử xác nhận thanh toán thành công */}
      {paid && (
        <div className="cp-receipt-card">
          <div className="flex items-center gap-2 mb-3">
            <span className="cp-receipt-icon">🧾</span>
            <strong className="cp-receipt-title">Biên Lai Giao Dịch Điện Tử VietQR (UC5.1)</strong>
          </div>
          <div className="cp-receipt-rows">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <span>Mã tham chiếu ngân hàng:</span>
              <strong className="cp-receipt-ref">
                {latestPayment?.referenceCode || `FT${displayOrderCode.replace(/\D/g, "")}889`}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Kênh thanh toán:</span>
              <span className="font-semibold">{latestPayment?.method || "VietQR 24/7 (MB Bank)"}</span>
            </div>
            <div className="flex justify-between">
              <span>Thời gian ghi nhận:</span>
              <span>{order.paidAt || latestPayment?.createdAt}</span>
            </div>
            <div className="flex justify-between">
              <span>Tiền thuê thực nhận:</span>
              <span className="cp-receipt-amount">{fmt(order.rental - order.discount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tiền cọc bảo đảm:</span>
              <span className="cp-receipt-deposit">{fmt(order.depositTotal)} (Được đối soát hoàn 100%)</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
