import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../App";
import { fmt } from "../../store";
import Icon from "../../components/Icon";

import { orderApi, paymentApi } from "../../services/api";
import { mapDonChiTietToOrder } from "../../services/mappers";

export function OrderConfirmedView() {
  const app = useApp();
  const [seconds, setSeconds] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [checkingGateway, setCheckingGateway] = useState(false);
  const [gatewayMessage, setGatewayMessage] = useState("");
  const [payError, setPayError] = useState("");
  const order = app.newOrderId ? app.orders.find((o) => o.id === app.newOrderId) : null;
  const paid = order?.status === "Đã xác nhận";
  const expired = order?.status === "Hết hạn" || (Boolean(order?.expiresAt) && seconds === 0 && !paid && order?.status === "Chờ thanh toán" && new Date(order.expiresAt!).getTime() <= Date.now());
  const latestPayment = order?.transactions?.filter((transaction) => transaction.type === "Thanh toán ban đầu").at(-1);
  const displayOrderCode = order?.displayCode || order?.id || "";

  // Khi mở trang xác nhận ở chế độ API thật, tải full chi tiết đơn hàng từ backend
  useEffect(() => {
    if (!app.realApi || !app.newOrderId) return;
    const numericId = Number(app.newOrderId);
    if (!Number.isFinite(numericId)) return;
    void orderApi
      .layChiTietDon(numericId)
      .then((dto) => {
        app.upsertOrder?.(
          mapDonChiTietToOrder(dto, {
            customerId: app.currentUser?.id,
            customerName: app.currentUser?.name,
          })
        );
      })
      .catch(() => {});
  }, [app.realApi, app.newOrderId]);

  // Bộ đếm ngược thời gian giữ chỗ thanh toán 15 phút (UC3.2)
  useEffect(() => {
    if (!order?.expiresAt || paid || order?.status === "Hết hạn") return;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((new Date(order.expiresAt!).getTime() - Date.now()) / 1000));
      setSeconds(remaining);
      // Tự động làm mới trạng thái từ backend khi hết giờ giữ chỗ
      if (remaining === 0 && app.realApi) {
        void orderApi
          .layChiTietDon(Number(order.backendId ?? order.id))
          .then((dto) => app.upsertOrder?.(mapDonChiTietToOrder(dto, { customerId: app.currentUser?.id, customerName: app.currentUser?.name })))
          .catch(() => {});
      }
    };
    updateCountdown();
    const t = setInterval(updateCountdown, 1000);
    return () => clearInterval(t);
  }, [paid, order?.status, order?.expiresAt, app.realApi]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  if (!order) return null;

  const totalAmount = order.rental - order.discount + order.depositTotal;

  const refreshOrderDetail = async () => {
    const dto = await orderApi.layChiTietDon(Number(order.backendId ?? order.id));
    const mapped = mapDonChiTietToOrder(dto, {
      customerId: app.currentUser?.id,
      customerName: app.currentUser?.name,
    });
    app.upsertOrder?.(mapped);
    return mapped;
  };

  const handlePay = async (succeed: boolean) => {
    if (app.realApi) {
      setProcessing(true);
      setPayError("");
      try {
        await paymentApi.xacNhanThanhToan({
          maDonThue: Number(order.backendId ?? order.id),
          phuongThucThanhToan: "VietQR",
          soTienDaTra: totalAmount,
        });
        await refreshOrderDetail();
        void app.refreshCatalog?.();
      } catch (err) {
        setPayError(err instanceof Error ? err.message : "Xác nhận thanh toán thất bại.");
      } finally {
        setProcessing(false);
      }
      return;
    }

    setProcessing(true);
    window.setTimeout(() => {
      app.payOrder(order.id, succeed);
      setProcessing(false);
    }, 650);
  };

  const handleCheckGateway = async () => {
    setCheckingGateway(true);
    setGatewayMessage("");
    setPayError("");
    if (app.realApi) {
      try {
        const updated = await refreshOrderDetail();
        if (updated.status === "Đã xác nhận") {
          setGatewayMessage("Hệ thống đã ghi nhận giao dịch thành công và xác nhận giữ chỗ cho đơn của bạn.");
        } else if (updated.status === "Hết hạn") {
          setGatewayMessage("Đơn hàng đã hết thời hạn giữ chỗ 15 phút.");
        } else {
          setGatewayMessage("Đơn hàng đang chờ thanh toán. Nếu bạn vừa chuyển khoản xong, vui lòng đợi vài giây hoặc bấm xác nhận bên dưới.");
        }
      } catch (err) {
        setPayError(err instanceof Error ? err.message : "Không thể kiểm tra trạng thái giao dịch.");
      } finally {
        setCheckingGateway(false);
      }
      return;
    }
    setTimeout(() => {
      setCheckingGateway(false);
      setGatewayMessage("Hệ thống đang đối chiếu tự động với cổng MB Bank. Nếu bạn vừa chuyển tiền, trạng thái sẽ cập nhật trong vài giây.");
    }, 800);
  };

  // Ánh xạ 3 trạng thái thanh toán của đơn sang lớp banner tương ứng
  const bannerStateClass = paid ? "is-paid" : expired ? "is-expired" : "is-pending";

  return (
    <div className="confirmed-wrap cp-confirmed-wrap">
      <div className="card-panel text-left overflow-hidden p-0 cp-confirmed-card">
        {/* Banner trạng thái */}
        <div
          className={`p-6 text-center text-white cp-confirmed-banner ${bannerStateClass} ${
            paid ? "bg-forest" : expired ? "bg-clay" : "bg-amber"
          }`}
        >
          <div className="text-4xl mb-2">{paid ? "✓" : expired ? "×" : "⏳"}</div>
          <h2 className="text-xl font-bold font-display cp-confirmed-banner-title">
            {paid ? "Đơn thuê đã được thanh toán & xác nhận!" : expired ? "Đơn thuê đã hết thời hạn giữ chỗ" : "Đơn thuê đang chờ thanh toán (Giữ chỗ 15 phút)"}
          </h2>
          <p className="text-sm opacity-90 mt-1 cp-confirmed-banner-desc">
            {paid
              ? "Cửa hàng đã nhận thanh toán, giữ chỗ bảo đảm và nhân viên đang soạn đồ."
              : expired
              ? "Đã hết 15 phút chờ thanh toán, thiết bị đã được tự động hoàn về kho cho khách khác."
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

          {/* Đồng hồ đếm ngược 15 phút giữ chỗ */}
          {!paid && !expired && seconds > 0 && (
            <div className="text-center my-4">
              <div className="timer-pill cp-timer-pill">
                <Icon name="clock" size={18} /> Thời hạn giữ chỗ còn lại: <span className="cp-timer-pill-value">{mm}:{ss}</span>
              </div>
            </div>
          )}

          {/* Khung mã VietQR chuyển khoản trực tiếp (UC5.1) */}
          {!paid && !expired && seconds > 0 && (
            <div className="cp-qr-box">
              <div className="cp-qr-title">
                MÃ QR THANH TOÁN TỰ ĐỘNG 24/7 (VIETQR)
              </div>

              {/* QR Image */}
              <div className="cp-qr-img-frame">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=2|99|0901234567|CONG%20TY%20GEARGO||0|0|${totalAmount}|${encodeURIComponent(displayOrderCode)}|transfer_myqr`}
                  alt="Mã QR Chuyển khoản VietQR"
                  className="cp-qr-img"
                />
              </div>

              <div className="cp-qr-info-card">
                <div>Ngân hàng: <strong>MB Bank (Quân Đội)</strong></div>
                <div>Số tài khoản: <strong className="cp-qr-mono-forest">0901 234 567</strong></div>
                <div>Chủ tài khoản: <strong>CONG TY TNHH GEARGO OUTDOOR</strong></div>
                <div>Số tiền chuyển: <strong className="cp-qr-mono-forest">{fmt(totalAmount)}</strong></div>
                <div>Nội dung chuyển khoản: <strong className="cp-qr-code-pill">{displayOrderCode}</strong></div>
              </div>

              <div className="cp-qr-hint">
                💡 <em>Hệ thống sẽ tự động kích hoạt trạng thái "Đã xác nhận" ngay khi tiền vào tài khoản.</em>
              </div>
            </div>
          )}

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

          {latestPayment?.status === "Thất bại" && !paid && !expired && (
            <div role="alert" className="form-error-msg bg-red-50 p-3 rounded mb-3 text-red-700 text-xs border border-red-200">
              <strong>Thanh toán không thành công:</strong> {latestPayment.note}
            </div>
          )}

          {payError && (
            <div role="alert" className="form-error-msg bg-red-50 p-3 rounded mb-3 text-red-700 text-xs border border-red-200">
              {payError}
            </div>
          )}

          {/* Dòng phụ 4.1: Kiểm tra đối chiếu với cổng thanh toán */}
          {!paid && !expired && seconds > 0 && (
            <div className="cp-gateway-wrap">
              <button
                type="button"
                disabled={checkingGateway}
                onClick={() => void handleCheckGateway()}
                className="btn btn-secondary btn-sm cp-gateway-btn"
              >
                {checkingGateway ? "Đang đối chiếu cổng thanh toán..." : "Kiểm tra trạng thái giao dịch ngân hàng (Dòng 4.1)"}
              </button>
              {gatewayMessage && (
                <div className="cp-gateway-msg">
                  {gatewayMessage}
                </div>
              )}
            </div>
          )}

          {/* Nút xác nhận thanh toán / mô phỏng cho demo */}
          {!paid && !expired && seconds > 0 && (
            <div className={app.realApi ? "my-4" : "grid grid-cols-2 gap-3 my-4 cp-confirmed-actions"}>
              <button
                disabled={processing}
                onClick={() => void handlePay(true)}
                className="btn btn-primary btn-md w-full cp-confirmed-pay-btn"
              >
                {processing
                  ? "Đang xử lý thanh toán..."
                  : app.realApi
                  ? "Xác nhận đã thanh toán VietQR"
                  : "✓ Xác nhận thanh toán (Mô phỏng)"}
              </button>
              {!app.realApi && (
                <button
                  disabled={processing}
                  onClick={() => void handlePay(false)}
                  className="btn btn-secondary btn-md text-red-600 border-red-200 cp-confirmed-fail-btn"
                >
                  Mô phỏng lỗi thanh toán
                </button>
              )}
            </div>
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

// ─── Danh sách đơn của tôi (MyOrdersView - UC3.3 & UC3.4) ────────────────────
