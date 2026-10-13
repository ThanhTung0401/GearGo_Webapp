import { useState, useEffect } from "react";
import { useApp } from "../App";
import { fmt, statusColors } from "../store";
import Icon from "../components/Icon";

// ─── Giỏ hàng (CartView) ──────────────────────────────────────────────────────
function CartView() {
  const app = useApp();
  const [promoCode, setPromoCode] = useState(app.appliedPromoCode);
  const [promoApplied, setPromoApplied] = useState(Boolean(app.appliedPromoCode));
  const [promoError, setPromoError] = useState("");
  const days = app.getDays();

  // Tính tổng tiền thuê theo số ngày và số lượng
  const rental = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + p.pricePerDay * c.qty * days;
  }, 0);

  // Tính tổng tiền cọc bảo đảm
  const depositTotal = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + p.deposit * c.qty;
  }, 0);

  const promotionItems = app.cart.map((item) => {
    const product = app.products.find((entry) => entry.id === item.productId)!;
    return { productId: item.productId, rental: product.pricePerDay * item.qty * days };
  });

  const promoResult = promoApplied ? app.evaluatePromotion(promoCode, rental, promotionItems) : null;
  const discount = promoResult?.ok ? promoResult.data.discount : 0;
  const grand = rental - discount + depositTotal;

  // Áp dụng mã khuyến mãi
  const applyPromo = () => {
    const result = app.evaluatePromotion(promoCode, rental, promotionItems);
    if (result.ok) {
      setPromoApplied(true);
      app.setAppliedPromoCode(result.data.promotion.code);
      setPromoCode(result.data.promotion.code);
      setPromoError("");
    } else {
      setPromoApplied(false);
      app.setAppliedPromoCode("");
      setPromoError(result.message);
    }
  };

  if (app.cart.length === 0) {
    return (
      <div className="customer-container text-center py-24">
        <div className="w-20 h-20 rounded-full bg-parchment flex items-center justify-center mx-auto mb-4 text-3xl">
          <Icon name="cart" size={36} />
        </div>
        <h2 className="customer-page-title mb-2">Giỏ thuê của bạn đang trống</h2>
        <p className="text-gray-500 mb-6 text-sm max-w-sm mx-auto">
          Khám phá danh mục trang thiết bị cắm trại và dã ngoại chất lượng cao để lên đường.
        </p>
        <button onClick={() => app.setPage("products")} className="btn btn-primary btn-md">
          Khám phá thiết bị ngay
        </button>
      </div>
    );
  }

  return (
    <div className="customer-container">
      <div className="customer-page-header">
        <h1 className="customer-page-title">Giỏ thiết bị thuê</h1>
        <p className="text-sm text-gray-500 mt-1">
          Thời gian thuê: {days} ngày ({app.pickupDate} → {app.returnDate})
        </p>
      </div>

      <div className="cart-grid">
        <div className="flex flex-col gap-3">
          {app.cart.map((c) => {
            const p = app.products.find((p) => p.id === c.productId)!;
            return (
              <div key={c.productId} className="cart-item-card">
                <img src={p.image} alt={p.name} className="cart-item-thumb" />
                <div className="cart-item-details">
                  <div className="cart-item-name">{p.name}</div>
                  <div className="cart-item-meta">
                    {fmt(p.pricePerDay)}/ngày × {days} ngày
                  </div>
                  <div className="cart-item-price">
                    {fmt(p.pricePerDay * days * c.qty)}
                  </div>
                  <div className="cart-item-deposit">
                    Tiền cọc: {fmt(p.deposit)} × {c.qty} = {fmt(p.deposit * c.qty)} (hoàn khi trả đồ)
                  </div>
                </div>

                <div className="qty-stepper">
                  <button
                    onClick={() => app.updateCartQty(c.productId, -1)}
                    className="qty-btn"
                    aria-label="Giảm số lượng"
                  >
                    −
                  </button>
                  <span className="qty-val">{c.qty}</span>
                  <button
                    onClick={() => app.updateCartQty(c.productId, 1)}
                    className="qty-btn"
                    aria-label="Tăng số lượng"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => app.removeFromCart(c.productId)}
                  className="cart-remove-btn"
                  title="Xóa khỏi giỏ"
                  aria-label="Xóa sản phẩm"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Tóm tắt thanh toán Sticky */}
        <div className="summary-card">
          <h3 className="summary-title">Báo giá tạm tính</h3>

          <div className="summary-row">
            <span>Tiền thuê thiết bị ({days} ngày)</span>
            <span className="font-mono font-semibold">{fmt(rental)}</span>
          </div>

          <div className="summary-row">
            <span>Tiền cọc bảo đảm (hoàn lại)</span>
            <span className="font-mono font-semibold">{fmt(depositTotal)}</span>
          </div>

          {discount > 0 && (
            <div className="summary-row text-emerald-600 font-semibold">
              <span>Khuyến mãi ({promoCode})</span>
              <span className="font-mono">−{fmt(discount)}</span>
            </div>
          )}

          {/* Ô nhập mã ưu đãi */}
          <div className="promo-box">
            <input
              type="text"
              placeholder="Mã giảm giá (VD: CAMPGO10)"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="form-input text-xs"
            />
            <button onClick={applyPromo} className="btn btn-secondary btn-sm">
              Áp dụng
            </button>
          </div>
          {promoError && <div className="form-error-msg mb-2">{promoError}</div>}

          <div className="summary-row summary-row-total">
            <span>Tổng thanh toán ban đầu</span>
            <span className="summary-total-price">{fmt(grand)}</span>
          </div>

          <p className="text-xs text-gray-400 mt-2 mb-4 leading-relaxed">
            * Tiền cọc sẽ được hoàn lại 100% khi khách hoàn trả thiết bị nguyên vẹn.
          </p>

          <button
            onClick={() => app.setPage("checkout")}
            className="btn btn-primary btn-lg btn-full"
          >
            Tiến hành xác nhận thuê →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Xác nhận đặt thuê (CheckoutView) ─────────────────────────────────────────
function CheckoutView() {
  const app = useApp();
  const [checkoutError, setCheckoutError] = useState("");
  const days = app.getDays();

  const rental = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + p.pricePerDay * c.qty * days;
  }, 0);
  const depositTotal = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + p.deposit * c.qty;
  }, 0);

  const promoCode = app.appliedPromoCode;
  const promoResult = promoCode
    ? app.evaluatePromotion(
        promoCode,
        rental,
        app.cart.map((item) => {
          const product = app.products.find((entry) => entry.id === item.productId)!;
          return { productId: item.productId, rental: product.pricePerDay * item.qty * days };
        })
      )
    : null;
  const discount = promoResult?.ok ? promoResult.data.discount : 0;
  const grand = rental - discount + depositTotal;

  // Thực hiện đặt đơn
  const handleConfirm = () => {
    try {
      app.createOrder(promoCode);
      app.setPage("order-confirmed");
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Không thể tạo đơn thuê.");
    }
  };

  return (
    <div className="customer-container max-w-4xl">
      <button
        onClick={() => app.setPage("cart")}
        className="btn btn-ghost btn-sm mb-4"
      >
        ← Quay lại giỏ hàng
      </button>

      <div className="customer-page-header">
        <h1 className="customer-page-title">Xác nhận thông tin đặt thuê</h1>
      </div>

      <div className="cart-grid">
        <div className="flex flex-col gap-5">
          <div className="card-panel">
            <h4 className="font-bold text-bark text-base mb-3 flex items-center gap-2">
              <Icon name="user" size={18} /> Thông tin người nhận thiết bị
            </h4>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Họ và tên</label>
                <input defaultValue="Nguyễn Văn An" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input defaultValue="0901 234 567" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Thời gian nhận đồ tại cửa hàng</label>
                <input
                  defaultValue={`${app.pickupDate} ${app.pickupHour || "09:00"}`}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Thời gian trả đồ</label>
                <input
                  defaultValue={`${app.returnDate} ${app.returnHour || "09:00"}`}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="card-panel">
            <h4 className="font-bold text-bark text-base mb-3 flex items-center gap-2">
              <Icon name="tent" size={18} /> Danh sách thiết bị ({app.cart.length} món)
            </h4>
            <div className="flex flex-col gap-2">
              {app.cart.map((c) => {
                const p = app.products.find((p) => p.id === c.productId)!;
                return (
                  <div
                    key={c.productId}
                    className="flex justify-between items-center py-2 border-b border-dashed border-bone text-sm"
                  >
                    <span>
                      {p.name} <strong className="text-forest">× {c.qty}</strong>
                    </span>
                    <span className="font-mono font-semibold">
                      {fmt(p.pricePerDay * c.qty * days)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="policy-banner">
            <strong>📌 Chính sách hủy đơn tiêu chuẩn (UC07):</strong>
            <p className="mt-1">
              - Trước 48h: Hoàn 100% tiền thuê + tiền cọc.
              <br />
              - Trong 24h–48h: Giữ 30% tiền thuê làm phí hủy, hoàn lại 70% + 100% cọc.
              <br />
              - Dưới 24h: Giữ 100% tiền thuê, hoàn lại 100% tiền cọc bảo đảm.
            </p>
          </div>
        </div>

        {/* Cột Tổng kết & Thanh toán */}
        <div className="summary-card">
          <h3 className="summary-title">Tổng kết đơn thuê</h3>
          <div className="flex flex-col gap-1 text-sm">
            <div className="summary-row">
              <span className="text-gray-500">Tiền thuê ({days} ngày)</span>
              <span className="font-mono font-semibold">{fmt(rental)}</span>
            </div>
            {discount > 0 && (
              <div className="summary-row text-emerald-600 font-semibold">
                <span>Ưu đãi {promoCode}</span>
                <span className="font-mono">−{fmt(discount)}</span>
              </div>
            )}
            <div className="summary-row">
              <span className="text-gray-500">Tiền cọc bảo đảm</span>
              <span className="font-mono font-semibold">{fmt(depositTotal)}</span>
            </div>
            <div className="summary-row summary-row-total">
              <span>Cần thanh toán</span>
              <span className="summary-total-price">{fmt(grand)}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-bone">
            <div className="text-xs font-bold text-bark mb-2">Phương thức thanh toán:</div>
            {["Chuyển khoản QR ngân hàng", "Tiền mặt tại cửa hàng", "Ví MoMo / ZaloPay"].map((m) => (
              <label key={m} className="flex items-center gap-2 text-xs py-1 cursor-pointer">
                <input
                  type="radio"
                  name="pay"
                  defaultChecked={m === "Chuyển khoản QR ngân hàng"}
                  className="accent-forest"
                />
                {m}
              </label>
            ))}
          </div>

          {checkoutError && (
            <div role="alert" className="form-error-msg mt-3 bg-red-50 p-2 rounded">
              {checkoutError}
            </div>
          )}

          <button onClick={handleConfirm} className="btn btn-primary btn-lg btn-full mt-4">
            ✓ Xác nhận đặt thuê
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Đơn được giữ chỗ trong 15 phút để hoàn tất thanh toán
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Đơn đã xác nhận (OrderConfirmedView) ─────────────────────────────────────
function OrderConfirmedView() {
  const app = useApp();
  const [seconds, setSeconds] = useState(0);
  const [processing, setProcessing] = useState(false);
  const order = app.newOrderId ? app.orders.find((o) => o.id === app.newOrderId) : null;
  const paid = order?.status === "Đã xác nhận";
  const expired = order?.status === "Hết hạn";
  const latestPayment = order?.transactions?.filter((transaction) => transaction.type === "Thanh toán ban đầu").at(-1);

  // Bộ đếm ngược thời gian giữ chỗ thanh toán
  useEffect(() => {
    if (!order?.expiresAt || paid || expired) return;
    const updateCountdown = () => {
      setSeconds(Math.max(0, Math.ceil((new Date(order.expiresAt!).getTime() - Date.now()) / 1000)));
    };
    updateCountdown();
    const t = setInterval(updateCountdown, 1000);
    return () => clearInterval(t);
  }, [paid, expired, order?.expiresAt]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  if (!order) return null;

  const handlePay = (succeed: boolean) => {
    setProcessing(true);
    window.setTimeout(() => {
      app.payOrder(order.id, succeed);
      setProcessing(false);
    }, 650);
  };

  return (
    <div className="confirmed-wrap">
      <div className="card-panel text-left overflow-hidden p-0">
        <div
          className={`p-6 text-center text-white ${
            paid ? "bg-forest" : expired ? "bg-clay" : "bg-amber"
          }`}
        >
          <div className="text-4xl mb-2">{paid ? "✓" : expired ? "×" : "⏳"}</div>
          <h2 className="text-xl font-bold font-display">
            {paid ? "Đơn thuê đã được xác nhận!" : expired ? "Đơn thuê đã hết hạn" : "Đơn thuê đang chờ thanh toán"}
          </h2>
          <p className="text-sm opacity-90 mt-1">
            {paid
              ? "Cửa hàng đã nhận đơn và nhân viên đang soạn đồ."
              : expired
              ? "Thời gian giữ chỗ đã hết, trang thiết bị đã được hoàn về kho."
              : "Vui lòng hoàn tất thanh toán trước khi thời gian giữ chỗ kết thúc."}
          </p>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-bone">
            <div>
              <div className="text-xs text-gray-400 font-mono">Mã đơn đặt</div>
              <div className="font-mono font-bold text-forest text-base">{order.id}</div>
            </div>
            <span
              className={`badge ${
                paid ? "badge-success" : expired ? "badge-danger" : "badge-warning"
              }`}
            >
              {order.status}
            </span>
          </div>

          {!paid && !expired && seconds > 0 && (
            <div className="text-center my-4">
              <div className="timer-pill">
                <Icon name="clock" size={16} /> Thời gian giữ chỗ còn: <span>{mm}:{ss}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 my-4 text-sm">
            {order.items.map((item) => (
              <div
                key={item.productId}
                className="flex justify-between py-1 border-b border-dashed border-bone"
              >
                <span className="text-gray-600">
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
            <div className="flex justify-between">
              <span className="text-gray-600">Cọc bảo đảm</span>
              <span className="font-mono">{fmt(order.depositTotal)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t-2 border-bone font-bold text-base">
              <span>Tổng thanh toán</span>
              <span className="font-mono text-forest">
                {fmt(order.rental - order.discount + order.depositTotal)}
              </span>
            </div>
          </div>

          {latestPayment?.status === "Thất bại" && !paid && !expired && (
            <div role="alert" className="form-error-msg bg-red-50 p-3 rounded mb-3">
              <strong>Thanh toán không thành công:</strong> {latestPayment.note}
            </div>
          )}

          {!paid && !expired && seconds > 0 && (
            <div className="grid grid-cols-2 gap-3 my-4">
              <button
                disabled={processing}
                onClick={() => handlePay(true)}
                className="btn btn-primary btn-md"
              >
                {processing ? "Đang xử lý..." : "Thanh toán thành công (Test)"}
              </button>
              <button
                disabled={processing}
                onClick={() => handlePay(false)}
                className="btn btn-secondary btn-md text-red-600 border-red-200"
              >
                Mô phỏng thất bại
              </button>
            </div>
          )}

          <button
            onClick={() => app.setPage("my-orders")}
            className="btn btn-secondary btn-md btn-full mt-3"
          >
            Quản lý danh sách đơn thuê của tôi
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Danh sách đơn của tôi (MyOrdersView) ────────────────────────────────────
function MyOrdersView() {
  const app = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const myOrders = app.orders;
  const detail = myOrders.find((o) => o.id === selected);
  const cancellationQuote = cancelling ? app.getCancellationQuote(cancelling) : null;

  return (
    <div className="customer-container">
      <div className="customer-page-header">
        <h1 className="customer-page-title">Đơn thuê của tôi</h1>
        <p className="text-sm text-gray-500">Xem tiến độ nhận trả và trạng thái các đơn thuê</p>
      </div>

      <div className="responsive-detail-grid grid gap-6" style={{ gridTemplateColumns: detail ? "1fr 420px" : "1fr" }}>
        <div className="flex flex-col gap-3">
          {myOrders.map((o) => {
            const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
            return (
              <div
                key={o.id}
                onClick={() => setSelected(selected === o.id ? null : o.id)}
                className={`order-card cursor-pointer ${
                  selected === o.id ? "border-forest shadow-md" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-mono text-xs text-moss font-bold">{o.id}</div>
                    <div className="font-bold text-bark my-1">
                      {o.items.map((i) => `${i.productName} ×${i.qty}`).join(", ")}
                    </div>
                    <div className="text-xs text-gray-500">
                      📅 {o.pickupTime} → {o.returnTime}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      style={{ background: sc.bg, color: sc.text }}
                      className="badge mb-1"
                    >
                      {o.status}
                    </span>
                    <div className="font-mono font-bold text-forest text-sm">
                      {fmt(o.rental - o.discount + o.depositTotal)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {detail && (
          <div className="card-panel self-start sticky top-24">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="font-mono text-xs text-moss">{detail.id}</div>
                <h3 className="font-display font-bold text-base text-bark">Chi tiết đơn thuê</h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="btn btn-ghost btn-sm text-gray-400"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2 mb-4 text-xs">
              {[
                ["Khách hàng", detail.customerName],
                ["SĐT liên hệ", detail.customerPhone],
                ["Nhận thiết bị", detail.pickupTime],
                ["Trả thiết bị", detail.returnTime],
                ["Tiền thuê", fmt(detail.rental)],
                ["Giảm giá", detail.discount > 0 ? `−${fmt(detail.discount)}` : "—"],
                ["Tiền cọc", fmt(detail.depositTotal)],
                ["Tổng ban đầu", fmt(detail.rental - detail.discount + detail.depositTotal)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-dashed border-bone">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-semibold text-bark">{v}</span>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <div className="text-xs font-bold text-bark mb-2">Lịch sử trạng thái</div>
              {detail.statusHistory.map((h, i) => (
                <div key={i} className="flex items-center gap-2 mb-1 text-xs">
                  <span className="badge badge-neutral text-xs">{h.status}</span>
                  <span className="text-gray-400 text-xs">{h.at} · {h.by}</span>
                </div>
              ))}
            </div>

            {(detail.status === "Chờ thanh toán" || detail.status === "Đã xác nhận") && (
              <button
                onClick={() => {
                  setCancelling(detail.id);
                  setCancelReason("");
                }}
                className="btn btn-danger btn-sm btn-full"
              >
                Yêu cầu hủy đơn
              </button>
            )}
          </div>
        )}
      </div>

      {cancelling && cancellationQuote && (
        <div className="modal-overlay">
          <div className="modal-container max-w-md">
            <div className="modal-header">
              <h2 className="modal-title">Xác nhận hủy đơn thuê?</h2>
              <button onClick={() => setCancelling(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <div className="modal-body">
              <p className="text-xs text-gray-600 mb-3">
                Chính sách UC07: Miễn phí trước 48h · Giữ 30% tiền thuê từ 24–48h · Giữ 100% tiền thuê dưới 24h. Hoàn 100% tiền cọc.
              </p>
              <div className="card-panel-muted p-3 mb-3 text-xs">
                <div className="flex justify-between py-1">
                  <span>Phí hủy giữ lại:</span>
                  <strong className="text-red-600">{fmt(cancellationQuote.fee)}</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Tiền hoàn trả:</span>
                  <strong className="text-emerald-700">{fmt(cancellationQuote.refund)}</strong>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Lý do hủy đơn *</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do hủy..."
                  rows={2}
                  className="form-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setCancelling(null)} className="btn btn-secondary btn-sm">
                Đóng
              </button>
              <button
                disabled={!cancelReason.trim()}
                onClick={() => {
                  app.cancelOrder(cancelling, cancelReason);
                  setCancelling(null);
                }}
                className="btn btn-danger btn-sm"
              >
                Xác nhận hủy đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Advisor (Tư vấn bộ đồ thông minh) ────────────────────────────────────
function AIAdvisorView() {
  const app = useApp();
  const [sent, setSent] = useState(false);
  const [destination, setDestination] = useState("Đà Lạt");
  const [people, setPeople] = useState("4");
  const [nights, setNights] = useState("2");
  const [budget, setBudget] = useState("1500000");
  const [addedAllNotice, setAddedAllNotice] = useState(false);

  const numPeople = Math.max(1, parseInt(people) || 2);
  const numNights = Math.max(1, parseInt(nights) || 1);
  const targetBudget = Math.max(100000, parseInt(budget) || 1000000);

  // Tìm sản phẩm phù hợp cho combo
  const tentProd =
    app.products.find(
      (p) =>
        p.category === "Lều trại" &&
        p.status === "active" &&
        (numPeople <= 2 ? p.capacity.includes("2") : p.capacity.includes("4"))
    ) || app.products.find((p) => p.category === "Lều trại" && p.status === "active");

  const sleepProd = app.products.find((p) => p.category === "Ngủ" && p.status === "active");
  const lightProd = app.products.find((p) => p.category === "Đèn" && p.status === "active");
  const cookProd = app.products.find((p) => p.category === "Nấu ăn" && p.status === "active");

  const suggestion = [
    tentProd && {
      productId: tentProd.id,
      name: tentProd.name,
      qty: Math.max(1, Math.ceil(numPeople / 4)),
      reason: `Sức chứa ${numPeople} người, chống mưa tốt tại ${destination}.`,
      rental: tentProd.pricePerDay * Math.max(1, Math.ceil(numPeople / 4)) * numNights,
      deposit: tentProd.deposit * Math.max(1, Math.ceil(numPeople / 4)),
    },
    sleepProd && {
      productId: sleepProd.id,
      name: sleepProd.name,
      qty: numPeople,
      reason: `Túi ngủ giữ ấm cho mỗi thành viên trong đoàn.`,
      rental: sleepProd.pricePerDay * numPeople * numNights,
      deposit: sleepProd.deposit * numPeople,
    },
    lightProd && {
      productId: lightProd.id,
      name: lightProd.name,
      qty: Math.max(1, Math.ceil(numPeople / 2)),
      reason: `Chiếu sáng khu trại ban đêm an toàn.`,
      rental: lightProd.pricePerDay * Math.max(1, Math.ceil(numPeople / 2)) * numNights,
      deposit: lightProd.deposit * Math.max(1, Math.ceil(numPeople / 2)),
    },
    cookProd && {
      productId: cookProd.id,
      name: cookProd.name,
      qty: 1,
      reason: `Nấu ăn nhẹ và đun nước nóng tiện lợi.`,
      rental: cookProd.pricePerDay * 1 * numNights,
      deposit: cookProd.deposit * 1,
    },
  ].filter(Boolean) as {
    productId: string;
    name: string;
    qty: number;
    reason: string;
    rental: number;
    deposit: number;
  }[];

  const totalRental = suggestion.reduce((s, i) => s + i.rental, 0);
  const totalDeposit = suggestion.reduce((s, i) => s + i.deposit, 0);

  const handleAddAll = () => {
    suggestion.forEach((item) => {
      app.addToCart(item.productId, item.qty);
    });
    setAddedAllNotice(true);
    setTimeout(() => setAddedAllNotice(false), 3000);
  };

  return (
    <div className="customer-container max-w-3xl">
      <div className="advisor-hero">
        <div className="flex items-center gap-3 mb-2">
          <Icon name="tent" size={32} />
          <h1 className="font-display font-bold text-2xl">Trợ lý AI tư vấn bộ đồ cắm trại</h1>
        </div>
        <p>Gợi ý danh mục thiết bị tối ưu theo điểm đến, quy mô đoàn và ngân sách dự kiến của bạn.</p>
      </div>

      {!sent ? (
        <div className="card-panel">
          <h3 className="font-display font-bold text-lg mb-4 text-bark">Thông tin chuyến đi của bạn</h3>
          <div className="form-grid-2">
            {[
              { label: "Điểm đến", val: destination, set: setDestination, placeholder: "VD: Đà Lạt, Mộc Châu" },
              { label: "Số lượng người", val: people, set: setPeople, placeholder: "VD: 4" },
              { label: "Số ngày thuê (24h/ngày)", val: nights, set: setNights, placeholder: "VD: 2" },
              { label: "Ngân sách thuê dự kiến (đ)", val: budget, set: setBudget, placeholder: "VD: 1500000" },
            ].map((f) => (
              <div key={f.label} className="form-group">
                <label className="form-label">{f.label}</label>
                <input
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className="form-input"
                />
              </div>
            ))}
          </div>
          <button onClick={() => setSent(true)} className="btn btn-primary btn-md mt-5">
            🤖 Tạo gợi ý combo tối ưu →
          </button>
        </div>
      ) : (
        <div className="card-panel">
          <div className="card-panel-muted p-4 mb-4 text-sm">
            🤖 Dựa trên chuyến đi <strong>{destination}</strong> ({people} người, {nights} ngày, ngân sách {parseInt(budget).toLocaleString("vi-VN")}đ), đây là combo được AI tối ưu:
          </div>

          <div className="flex flex-col gap-3 mb-4">
            {suggestion.map((s) => (
              <div key={s.productId} className="cart-item-card justify-between">
                <div>
                  <div className="font-bold text-bark">{s.name} × {s.qty} chiếc</div>
                  <div className="text-xs text-gray-500 my-1">{s.reason}</div>
                  <div className="text-xs font-mono text-forest font-semibold">
                    Thuê: {fmt(s.rental)} · Cọc: {fmt(s.deposit)}
                  </div>
                </div>
                <button
                  onClick={() => app.addToCart(s.productId, s.qty)}
                  className="btn btn-secondary btn-sm"
                >
                  + Giỏ
                </button>
              </div>
            ))}
          </div>

          {totalRental > targetBudget && (
            <div className="policy-banner mb-4">
              ⚠ Tổng tiền thuê dự kiến vượt ngân sách khoảng {fmt(totalRental - targetBudget)}. Bạn có thể giảm bớt số lượng hoặc đổi sản phẩm.
            </div>
          )}

          <div className="card-panel-muted p-4 mb-4">
            <div className="flex justify-between font-bold text-sm">
              <span>Tổng tiền thuê ({numNights} ngày)</span>
              <span className="font-mono text-forest">{fmt(totalRental)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Cọc bảo đảm (hoàn lại)</span>
              <span className="font-mono">{fmt(totalDeposit)}</span>
            </div>
          </div>

          {addedAllNotice && (
            <div className="badge badge-success p-3 rounded-lg text-center w-full mb-3">
              ✓ Đã thêm toàn bộ combo vào giỏ thuê thành công!
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleAddAll} className="btn btn-accent btn-md flex-1">
              + Thêm toàn bộ vào giỏ
            </button>
            <button onClick={() => app.setPage("cart")} className="btn btn-primary btn-md flex-1">
              Xem giỏ thuê →
            </button>
            <button onClick={() => setSent(false)} className="btn btn-secondary btn-md">
              Chỉnh sửa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hồ sơ cá nhân & Đánh giá (ProfileView) ──────────────────────────────────
function ProfileView() {
  const app = useApp();
  const [section, setSection] = useState<"profile" | "reviews">("profile");
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("geargo-demo-customer-profile");
      return saved
        ? (JSON.parse(saved) as { name: string; phone: string; email: string; address: string })
        : {
            name: "Nguyễn Văn An",
            phone: "0901 234 567",
            email: "an.nguyen@example.com",
            address: "Quận 3, TP. Hồ Chí Minh",
          };
    } catch {
      return {
        name: "Nguyễn Văn An",
        phone: "0901 234 567",
        email: "an.nguyen@example.com",
        address: "Quận 3, TP. Hồ Chí Minh",
      };
    }
  });
  const [saved, setSaved] = useState(false);
  const [reviewingTarget, setReviewingTarget] = useState<{
    orderId: string;
    productId: string;
    productName: string;
  } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const completedOrders = app.orders.filter((order) => order.status === "Hoàn tất");

  const saveProfile = () => {
    localStorage.setItem("geargo-demo-customer-profile", JSON.stringify(profile));
    setSaved(true);
  };

  const handleSendReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingTarget) return;
    const res = app.addReview({
      orderId: reviewingTarget.orderId,
      productId: reviewingTarget.productId,
      rating,
      comment,
    });
    if (res.ok) {
      setReviewingTarget(null);
      setComment("");
      setRating(5);
      setReviewError("");
    } else {
      setReviewError(res.message);
    }
  };

  return (
    <div className="customer-container max-w-4xl">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="customer-page-title">Tài khoản cá nhân</h1>
          <p className="text-sm text-gray-500">Quản lý hồ sơ và đánh giá sản phẩm sau chuyến đi</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSection("profile")}
            className={`btn btn-sm ${section === "profile" ? "btn-primary" : "btn-secondary"}`}
          >
            Hồ sơ cá nhân
          </button>
          <button
            onClick={() => setSection("reviews")}
            className={`btn btn-sm ${section === "reviews" ? "btn-primary" : "btn-secondary"}`}
          >
            Đánh giá sản phẩm
          </button>
        </div>
      </div>

      {section === "profile" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile();
          }}
          className="card-panel"
        >
          <div className="form-grid-2">
            {[
              { key: "name" as const, label: "Họ và tên", type: "text" },
              { key: "phone" as const, label: "Số điện thoại", type: "tel" },
              { key: "email" as const, label: "Email", type: "email" },
              { key: "address" as const, label: "Địa chỉ nhận / trả", type: "text" },
            ].map((field) => (
              <div key={field.key} className="form-group">
                <label className="form-label">{field.label}</label>
                <input
                  required
                  type={field.type}
                  value={profile[field.key]}
                  onChange={(e) => {
                    setProfile({ ...profile, [field.key]: e.target.value });
                    setSaved(false);
                  }}
                  className="form-input"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button type="submit" className="btn btn-primary btn-md">
              Lưu thay đổi
            </button>
            {saved && (
              <span className="badge badge-success">✓ Đã lưu hồ sơ thành công</span>
            )}
          </div>
        </form>
      ) : (
        <div className="card-panel">
          <h2 className="font-display font-bold text-lg text-bark mb-1">
            Đánh giá sản phẩm theo đơn đã hoàn tất
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Quy tắc UC08: Mỗi sản phẩm trong một đơn hoàn tất chỉ được đánh giá một lần duy nhất.
          </p>

          {completedOrders.length === 0 ? (
            <div className="card-panel-muted text-center py-8 text-gray-500 text-sm">
              Chưa có đơn thuê nào hoàn tất để gửi đánh giá.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {completedOrders.map((order) => (
                <div key={order.id} className="border border-bone rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-dashed border-bone">
                    <div>
                      <strong className="font-mono text-forest">{order.id}</strong>
                      <span className="text-xs text-gray-400 ml-3">
                        Hoàn tất: {order.reconciledAt || order.createdAt}
                      </span>
                    </div>
                    <span className="badge badge-success">Đã hoàn tất</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {order.items.map((item) => {
                      const existing = app.reviews.find(
                        (r) => r.orderId === order.id && r.productId === item.productId
                      );
                      const isCurrentReviewing =
                        reviewingTarget?.orderId === order.id &&
                        reviewingTarget?.productId === item.productId;

                      return (
                        <div key={item.productId} className="card-panel-muted p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-bold text-bark text-sm">{item.productName}</div>
                              <div className="text-xs text-gray-500">
                                Thuê: {item.qty} chiếc · {item.days} ngày
                              </div>
                            </div>
                            {existing ? (
                              <div className="text-right">
                                <span className="text-amber font-bold">
                                  {"★".repeat(existing.rating)}
                                </span>
                                <div className="text-xs text-emerald-600 font-semibold">
                                  ✓ Đã đánh giá
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setReviewingTarget({
                                    orderId: order.id,
                                    productId: item.productId,
                                    productName: item.productName,
                                  });
                                  setReviewError("");
                                }}
                                className="btn btn-secondary btn-sm"
                              >
                                Viết đánh giá
                              </button>
                            )}
                          </div>

                          {existing && (
                            <div className="mt-2 bg-white p-2 rounded text-xs text-gray-600 italic">
                              "{existing.comment}"
                            </div>
                          )}

                          {isCurrentReviewing && (
                            <form onSubmit={handleSendReview} className="mt-3 bg-white p-3 rounded-lg border border-bone">
                              <h4 className="font-bold text-xs mb-2">Đánh giá cho {reviewingTarget.productName}</h4>
                              <div className="form-group mb-2">
                                <label className="form-label">Số sao</label>
                                <select
                                  value={rating}
                                  onChange={(e) => setRating(Number(e.target.value))}
                                  className="form-select max-w-xs"
                                >
                                  {[5, 4, 3, 2, 1].map((v) => (
                                    <option key={v} value={v}>
                                      {v} sao {"★".repeat(v)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-group mb-2">
                                <label className="form-label">Nhận xét trải nghiệm</label>
                                <textarea
                                  required
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  rows={2}
                                  placeholder="Đồ dùng thực tế có tốt không..."
                                  className="form-textarea"
                                />
                              </div>
                              {reviewError && (
                                <div className="form-error-msg mb-2">{reviewError}</div>
                              )}
                              <div className="flex gap-2">
                                <button type="submit" className="btn btn-primary btn-sm">
                                  Gửi đánh giá
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewingTarget(null)}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Hủy
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CustomerPortal Router ────────────────────────────────────────────────────
export default function CustomerPortal() {
  const app = useApp();
  if (app.page === "cart") return <CartView />;
  if (app.page === "checkout") return <CheckoutView />;
  if (app.page === "order-confirmed") return <OrderConfirmedView />;
  if (app.page === "my-orders") return <MyOrdersView />;
  if (app.page === "profile") return <ProfileView />;
  if (app.page === "ai-advisor") return <AIAdvisorView />;
  return null;
}
