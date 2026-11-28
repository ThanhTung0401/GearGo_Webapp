import { useOrderConfirmed } from "./orderConfirmed/useOrderConfirmed";
import { OrderConfirmedQrBox } from "./orderConfirmed/OrderConfirmedQrBox";
import { OrderConfirmedItemsAndReceipt } from "./orderConfirmed/OrderConfirmedItemsAndReceipt";

/**
 * Trang Đơn đã xác nhận & Cổng thanh toán VietQR kèm đếm ngược giữ chỗ 15 phút (UC3.2 & UC5.1).
 */
export function OrderConfirmedView() {
  const vm = useOrderConfirmed();
  const { app, order, paid, cancelled, expired, seconds, latestPayment, displayOrderCode, totalAmount } = vm;

  if (!order) return null;

  // Tính thời gian giữ chỗ thực tế của đơn (ưu tiên expiresAt - createdAt, fallback chính sách hiện hành)
  const holdMinutes = (() => {
    if (order.expiresAt && order.createdAt) {
      const diffMin = Math.round((new Date(order.expiresAt).getTime() - new Date(order.createdAt).getTime()) / 60000);
      if (Number.isFinite(diffMin) && diffMin > 0) return diffMin;
    }
    return app.policies?.holdMinutes ?? 15;
  })();

  const isPendingActive = !paid && !cancelled && !expired && seconds > 0;

  return (
    <div className="confirmed-wrap cp-confirmed-wrap">
      <div className="card-panel text-left overflow-hidden p-0 cp-confirmed-card">
        {/* Banner trạng thái */}
        <div
          className={`p-6 text-center text-white cp-confirmed-banner ${vm.bannerStateClass} ${
            paid ? "bg-forest" : cancelled || expired ? "bg-clay" : "bg-amber"
          }`}
        >
          <div className="text-4xl mb-2">{paid ? "✓" : cancelled || expired ? "×" : "⏳"}</div>
          <h2 className="text-xl font-bold font-display cp-confirmed-banner-title">
            {paid
              ? "Đơn thuê đã được thanh toán & xác nhận!"
              : cancelled
              ? "Đơn thuê đã hủy & hoàn thiết bị về kho"
              : expired
              ? "Đơn thuê đã hết thời hạn giữ chỗ"
              : `Đơn thuê đang chờ thanh toán (Giữ chỗ ${holdMinutes} phút)`}
          </h2>
          <p className="text-sm opacity-90 mt-1 cp-confirmed-banner-desc">
            {paid
              ? "Cửa hàng đã nhận thanh toán, giữ chỗ bảo đảm và nhân viên đang soạn đồ."
              : cancelled
              ? "Đơn thuê đã được hủy và toàn bộ thiết bị giữ chỗ đã được giải phóng ngay về kho."
              : expired
              ? `Đã hết ${holdMinutes} phút chờ thanh toán, thiết bị đã được tự động hoàn về kho cho khách khác.`
              : "Vui lòng quét mã QR chuyển khoản hoặc thanh toán trước khi hết thời gian giữ chỗ."}
          </p>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-bone">
            <div>
              <div className="text-xs text-gray-400 font-mono">MÃ ĐƠN THUÊ</div>
              <div className="font-mono font-bold text-forest text-lg">{displayOrderCode}</div>
            </div>
            <span
              className={`badge cp-confirmed-badge ${
                paid ? "badge-success" : expired ? "badge-danger" : "badge-warning"
              }`}
            >
              {order.status}
            </span>
          </div>

          {isPendingActive && (
            <OrderConfirmedQrBox
              mm={vm.mm}
              ss={vm.ss}
              totalAmount={totalAmount}
              displayOrderCode={displayOrderCode}
            />
          )}

          <OrderConfirmedItemsAndReceipt
            order={order}
            paid={paid}
            totalAmount={totalAmount}
            displayOrderCode={displayOrderCode}
            latestPayment={latestPayment}
          />

          {latestPayment?.status === "Thất bại" && !paid && !expired && (
            <div role="alert" className="form-error-msg bg-red-50 p-3 rounded mb-3 text-red-700 text-xs border border-red-200">
              <strong>Thanh toán không thành công:</strong> {latestPayment.note}
            </div>
          )}

          {vm.payError && (
            <div role="alert" className="form-error-msg bg-red-50 p-3 rounded mb-3 text-red-700 text-xs border border-red-200">
              {vm.payError}
            </div>
          )}

          {/* Dòng phụ 4.1: Kiểm tra đối chiếu với cổng thanh toán */}
          {isPendingActive && (
            <div className="cp-gateway-wrap">
              <button
                type="button"
                disabled={vm.checkingGateway}
                onClick={() => void vm.handleCheckGateway()}
                className="btn btn-secondary btn-sm cp-gateway-btn"
              >
                {vm.checkingGateway ? "Đang đối chiếu cổng thanh toán..." : "Kiểm tra trạng thái giao dịch ngân hàng (Dòng 4.1)"}
              </button>
              {vm.gatewayMessage && (
                <div className="cp-gateway-msg">
                  {vm.gatewayMessage}
                </div>
              )}
            </div>
          )}

          {/* Nút xác nhận thanh toán / mô phỏng cho demo */}
          {isPendingActive && (
            <div className={app.realApi ? "my-4" : "grid grid-cols-2 gap-3 my-4 cp-confirmed-actions"}>
              <button
                disabled={vm.processing}
                onClick={() => void vm.handlePay(true)}
                className="btn btn-primary btn-md w-full cp-confirmed-pay-btn"
              >
                {vm.processing
                  ? "Đang xử lý thanh toán..."
                  : app.realApi
                  ? "Xác nhận đã thanh toán VietQR"
                  : "✓ Xác nhận thanh toán (Mô phỏng)"}
              </button>
              {!app.realApi && (
                <button
                  disabled={vm.processing}
                  onClick={() => void vm.handlePay(false)}
                  className="btn btn-secondary btn-md text-red-600 border-red-200 cp-confirmed-fail-btn"
                >
                  Mô phỏng lỗi thanh toán
                </button>
              )}
            </div>
          )}

          {isPendingActive && (
            <button
              type="button"
              disabled={vm.processing || vm.cancelling}
              onClick={() => void vm.handleCancelOrder()}
              className="btn btn-secondary btn-md btn-full text-red-600 border-red-200 mb-3"
            >
              {vm.cancelling ? "Đang hủy đơn & giải phóng thiết bị..." : "Hủy thanh toán & hoàn thiết bị về kho"}
            </button>
          )}

          <button
            onClick={() => app.setPage("my-orders")}
            className="btn btn-secondary btn-md btn-full mt-3 cp-confirmed-orders-btn"
          >
            Quản lý danh sách đơn thuê của tôi →
          </button>
        </div>
      </div>
    </div>
  );
}
