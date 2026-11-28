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
              : "Vui lòng thanh toán qua VNPay Sandbox hoặc tiền mặt trước khi hết thời gian giữ chỗ."}
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

          {/* Nút xác nhận thanh toán: hỗ trợ VNPay Sandbox thật và Tiền mặt (chọn Thành công / Fail) */}
          {isPendingActive && (
            <div className="my-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => vm.setPaymentChannel("vnpay")}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                    vm.paymentChannel === "vnpay"
                      ? "bg-[#1B3F2F] text-white border-[#1B3F2F]"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  🏦 Cổng VNPay Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => vm.setPaymentChannel("cash")}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                    vm.paymentChannel === "cash"
                      ? "bg-[#1B3F2F] text-white border-[#1B3F2F]"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  💵 Tiền mặt tại quầy
                </button>
              </div>

              {vm.paymentChannel === "vnpay" ? (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex flex-col gap-2">
                  <div>
                    <strong>VNPay Sandbox (v2.1.0):</strong> Chuyển hướng sang <code>sandbox.vnpayment.vn</code> để thanh toán.
                  </div>
                  <div className="text-[0.72rem] text-blue-800">
                    Thẻ test NCB: <strong>9704198526191432198</strong> · Chủ thẻ: <strong>NGUYEN VAN A</strong> · Ngày PH: <strong>07/15</strong> · OTP: <strong>123456</strong>
                  </div>
                  <button
                    type="button"
                    disabled={vm.processing}
                    onClick={() => void vm.handlePayWithVnPay()}
                    className="btn btn-primary btn-md w-full cp-confirmed-pay-btn mt-1"
                  >
                    {vm.processing ? "Đang chuyển hướng sang VNPay Sandbox..." : "🏦 Thanh toán qua VNPay Sandbox →"}
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs flex flex-col gap-2.5">
                  <div className="font-semibold text-amber-900">Chọn kết quả thanh toán tiền mặt:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => vm.setCashOutcome("success")}
                      className={`px-3 py-2 rounded-md text-xs font-bold border cursor-pointer ${
                        vm.cashOutcome === "success"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-gray-700 border-gray-300"
                      }`}
                    >
                      ✓ Thành công
                    </button>
                    <button
                      type="button"
                      onClick={() => vm.setCashOutcome("fail")}
                      className={`px-3 py-2 rounded-md text-xs font-bold border cursor-pointer ${
                        vm.cashOutcome === "fail"
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white text-gray-700 border-gray-300"
                      }`}
                    >
                      ✕ Thất bại (Fail)
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={vm.processing}
                    onClick={() => void vm.handlePay(vm.cashOutcome === "success")}
                    className="btn btn-primary btn-md w-full cp-confirmed-pay-btn"
                  >
                    {vm.processing
                      ? "Đang xử lý thanh toán..."
                      : vm.cashOutcome === "success"
                      ? "✓ Xác nhận thanh toán tiền mặt (Thành công)"
                      : "✕ Ghi nhận thanh toán tiền mặt thất bại (Fail)"}
                  </button>
                </div>
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
