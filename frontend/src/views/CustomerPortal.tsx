import { useState, useEffect } from "react";
import { useApp } from "../App";
import { fmt, statusColors } from "../store";

// ─── Cart ─────────────────────────────────────────────────────────────────────
function CartView() {
  const app = useApp();
  const [promoCode, setPromoCode] = useState(app.appliedPromoCode);
  const [promoApplied, setPromoApplied] = useState(Boolean(app.appliedPromoCode));
  const [promoError, setPromoError] = useState("");
  const days = app.getDays();

  const rental = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + p.pricePerDay * c.qty * days;
  }, 0);
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

  if (app.cart.length === 0) return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <div style={{ fontSize: "4rem", marginBottom: "12px" }}>🛒</div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-bark)", marginBottom: "8px" }}>Giỏ thuê trống</h2>
      <p style={{ color: "#9CA3AF", marginBottom: "20px" }}>Thêm sản phẩm từ danh sách để bắt đầu.</p>
      <button onClick={() => app.setPage("products")} style={{ background: "var(--color-forest)", color: "white", padding: "12px 24px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700 }}>Xem sản phẩm</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--color-bark)", marginBottom: "20px" }}>Giỏ thuê</h1>
      <div className="responsive-two-column grid gap-6" style={{ gridTemplateColumns: "1fr 340px" }}>
        <div className="flex flex-col gap-3">
          {app.cart.map((c) => {
            const p = app.products.find((p) => p.id === c.productId)!;
            return (
              <div key={c.productId} style={{ background: "white", borderRadius: "12px", padding: "16px", border: "1px solid var(--color-bone)", display: "flex", gap: "14px", alignItems: "center" }}>
                <img src={p.image} alt={p.name} style={{ width: 80, height: 60, objectFit: "cover", borderRadius: "8px", background: "var(--color-parchment)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: "2px" }}>{p.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "#9CA3AF" }}>{fmt(p.pricePerDay)}/ngày × {days} ngày</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", fontSize: "0.95rem" }}>{fmt(p.pricePerDay * days * c.qty)}</div>
                  <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Cọc: {fmt(p.deposit)} × {c.qty} = {fmt(p.deposit * c.qty)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => app.updateCartQty(c.productId, -1)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--color-bone)", background: "white", cursor: "pointer" }}>−</button>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, width: 20, textAlign: "center" }}>{c.qty}</span>
                  <button onClick={() => app.updateCartQty(c.productId, 1)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--color-bone)", background: "white", cursor: "pointer" }}>+</button>
                </div>
                <button onClick={() => app.removeFromCart(c.productId)} style={{ color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
              </div>
            );
          })}
        </div>

        <div style={{ background: "var(--color-parchment)", borderRadius: "12px", padding: "20px", border: "1px solid var(--color-bone)", alignSelf: "start", position: "sticky", top: 80 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--color-bark)", marginBottom: "14px" }}>Báo giá tạm tính</h3>
          <div style={{ fontSize: "0.85rem" }} className="flex flex-col gap-2">
            <div className="flex justify-between py-1" style={{ borderBottom: "1px dashed var(--color-bone)" }}>
              <span style={{ color: "#6B7280" }}>Thời gian thuê</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{days} ngày (Block 24h)</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: "1px dashed var(--color-bone)" }}>
              <span style={{ color: "#6B7280" }}>Tiền thuê</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{fmt(rental)}</span>
            </div>
            {promoApplied && (
              <div className="flex justify-between py-1" style={{ color: "#16A34A", borderBottom: "1px dashed var(--color-bone)" }}>
                <span>Giảm 10% (CAMPGO10)</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>−{fmt(discount)}</span>
              </div>
            )}
            <div className="flex justify-between py-1" style={{ borderBottom: "1px dashed var(--color-bone)" }}>
              <span style={{ color: "#6B7280" }}>Tiền cọc bảo đảm</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{fmt(depositTotal)}</span>
            </div>
            <div className="flex justify-between py-2" style={{ fontWeight: 700, fontSize: "1rem" }}>
              <span>Thanh toán ban đầu</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{fmt(grand)}</span>
            </div>
          </div>

          <div className="flex gap-2 my-3">
            <input placeholder="Mã giảm giá (CAMPGO10)" value={promoCode} onChange={(e) => setPromoCode(e.target.value)}
              style={{ flex: 1, border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "6px 10px", fontSize: "0.82rem", background: "white" }}
            />
            <button onClick={applyPromo} style={{ background: "var(--color-amber)", color: "white", padding: "6px 12px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}>Áp dụng</button>
          </div>
          {promoApplied && <p style={{ fontSize: "0.75rem", color: "#16A34A", marginBottom: "8px" }}>✓ Đã áp dụng — giảm 10% tiền thuê</p>}
          {promoError && <p style={{ fontSize: "0.75rem", color: "#DC2626", marginBottom: "8px" }}>{promoError}</p>}

          <p style={{ fontSize: "0.7rem", color: "#9CA3AF", marginBottom: "12px" }}>Đơn được giữ 15 phút sau khi xác nhận. Cọc hoàn khi trả đồ đạt yêu cầu.</p>
          <button onClick={() => app.setPage("checkout")}
            style={{ width: "100%", background: "var(--color-forest)", color: "white", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" }}
          >
            Tiếp tục đặt thuê →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Checkout ─────────────────────────────────────────────────────────────────
function CheckoutView() {
  const app = useApp();
  const [checkoutError, setCheckoutError] = useState("");
  const promoCode = app.appliedPromoCode;
  const days = app.getDays();
  const rental = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + p.pricePerDay * c.qty * days;
  }, 0);
  const depositTotal = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + p.deposit * c.qty;
  }, 0);
  const promoResult = promoCode ? app.evaluatePromotion(promoCode, rental, app.cart.map((item) => {
    const product = app.products.find((entry) => entry.id === item.productId)!;
    return { productId: item.productId, rental: product.pricePerDay * item.qty * days };
  })) : null;
  const discount = promoResult?.ok ? promoResult.data.discount : 0;
  const grand = rental - discount + depositTotal;

  const handleConfirm = () => {
    try {
      app.createOrder(promoCode);
      app.setPage("order-confirmed");
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Không thể tạo đơn thuê.");
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
      <button onClick={() => app.setPage("cart")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-forest)", fontWeight: 600, marginBottom: "16px" }}>← Quay lại giỏ</button>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--color-bark)", marginBottom: "20px" }}>Xác nhận đặt thuê</h1>
      <div className="responsive-two-column grid gap-6" style={{ gridTemplateColumns: "1fr 320px" }}>
        <div className="flex flex-col gap-4">
          <div style={{ background: "white", borderRadius: "12px", padding: "18px", border: "1px solid var(--color-bone)" }}>
            <h4 style={{ fontWeight: 700, marginBottom: "12px", color: "var(--color-bark)" }}>Thông tin người nhận</h4>
            <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {[
                ["Họ tên", "Nguyễn Văn An"],
                ["Số điện thoại", "0901 234 567"],
                ["Nhận đồ", `${app.pickupDate} ${app.pickupHour || "09:00"}`],
                ["Trả đồ", `${app.returnDate} ${app.returnHour || "09:00"}`],
              ].map(([l, v]) => (
                <div key={l}>
                  <label style={{ fontSize: "0.72rem", color: "var(--color-bark)", display: "block", marginBottom: "3px" }}>{l}</label>
                  <input defaultValue={v} style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "8px 10px", fontSize: "0.88rem" }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "white", borderRadius: "12px", padding: "18px", border: "1px solid var(--color-bone)" }}>
            <h4 style={{ fontWeight: 700, marginBottom: "12px", color: "var(--color-bark)" }}>Sản phẩm đặt thuê</h4>
            {app.cart.map((c) => {
              const p = app.products.find((p) => p.id === c.productId)!;
              return (
                <div key={c.productId} className="flex justify-between items-center py-2" style={{ borderBottom: "1px dashed var(--color-bone)", fontSize: "0.88rem" }}>
                  <span>{p.name} × {c.qty}</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{fmt(p.pricePerDay * c.qty * days)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ background: "#FEF3C7", borderRadius: "10px", padding: "12px 16px", border: "1px solid #FCD34D", fontSize: "0.8rem", color: "#92400E" }}>
            <strong>📌 Chính sách hủy đơn (UC07):</strong> Trước 48h hoàn 100% tiền thuê + cọc · 24–48h khấu trừ 30% tiền thuê · Dưới 24h giữ lại 100% tiền thuê. Tiền cọc bảo đảm luôn hoàn toàn bộ khi chưa bàn giao thiết bị.
          </div>
        </div>
        <div style={{ background: "var(--color-parchment)", borderRadius: "12px", padding: "18px", border: "1px solid var(--color-bone)", alignSelf: "start" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", marginBottom: "12px", color: "var(--color-bark)" }}>Tổng kết</h3>
          <div style={{ fontSize: "0.84rem" }} className="flex flex-col gap-1">
            {app.cart.map((c) => {
              const p = app.products.find((p) => p.id === c.productId)!;
              return <div key={c.productId} className="flex justify-between"><span style={{ color: "#6B7280" }}>{p.name} ×{c.qty}</span><span style={{ fontFamily: "var(--font-mono)" }}>{fmt(p.pricePerDay * c.qty * days)}</span></div>;
            })}
            <div className="flex justify-between pt-2" style={{ borderTop: "1px dashed var(--color-bone)", marginTop: "4px" }}>
              <span style={{ color: "#6B7280" }}>Tiền thuê</span><span style={{ fontFamily: "var(--font-mono)" }}>{fmt(rental)}</span>
            </div>
            {discount > 0 && <div className="flex justify-between" style={{ color: "#16A34A" }}>
              <span>Giảm giá {promoCode}</span><span style={{ fontFamily: "var(--font-mono)" }}>−{fmt(discount)}</span>
            </div>}
            <div className="flex justify-between">
              <span style={{ color: "#6B7280" }}>Tiền cọc</span><span style={{ fontFamily: "var(--font-mono)" }}>{fmt(depositTotal)}</span>
            </div>
            <div className="flex justify-between pt-2" style={{ fontWeight: 700, fontSize: "1rem", borderTop: "2px solid var(--color-bone)", marginTop: "6px" }}>
              <span>Cần thanh toán</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{fmt(grand)}</span>
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            {["Chuyển khoản ngân hàng", "Tiền mặt tại cửa hàng", "Ví MoMo / ZaloPay"].map((m) => (
              <label key={m} className="flex items-center gap-2" style={{ fontSize: "0.82rem", padding: "5px 0", cursor: "pointer" }}>
                <input type="radio" name="pay" defaultChecked={m === "Chuyển khoản ngân hàng"} style={{ accentColor: "var(--color-forest)" }} />{m}
              </label>
            ))}
          </div>
          {checkoutError && <div role="alert" style={{ background: "#FEE2E2", color: "#B91C1C", borderRadius: 8, padding: "9px 10px", fontSize: "0.78rem", marginTop: 12 }}>{checkoutError}</div>}
          <button onClick={handleConfirm}
            style={{ width: "100%", background: "var(--color-forest)", color: "white", padding: "13px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem", marginTop: "12px" }}
          >
            ✓ Xác nhận đặt thuê
          </button>
          <p style={{ fontSize: "0.68rem", color: "#9CA3AF", textAlign: "center", marginTop: "6px" }}>Đơn giữ chỗ 15 phút — cần thanh toán trước khi hết hạn</p>
        </div>
      </div>
    </div>
  );
}

// ─── Order Confirmed ───────────────────────────────────────────────────────────
function OrderConfirmedView() {
  const app = useApp();
  const [seconds, setSeconds] = useState(0);
  const [processing, setProcessing] = useState(false);
  const order = app.newOrderId ? app.orders.find((o) => o.id === app.newOrderId) : null;
  const paid = order?.status === "Đã xác nhận";
  const expired = order?.status === "Hết hạn";
  const latestPayment = order?.transactions?.filter((transaction) => transaction.type === "Thanh toán ban đầu").at(-1);

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
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "24px" }}>
      <div style={{ background: "white", borderRadius: "16px", border: "1px solid var(--color-bone)", overflow: "hidden" }}>
        <div style={{ background: paid ? "var(--color-forest)" : expired ? "#C04A3E" : "var(--color-amber)", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "8px" }}>{paid ? "✓" : expired ? "×" : "…"}</div>
          <h2 style={{ fontFamily: "var(--font-display)", color: "white", fontSize: "1.5rem", marginBottom: "4px" }}>
            {paid ? "Đơn đã được xác nhận!" : expired ? "Đơn đã hết hạn" : "Đơn chờ thanh toán"}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.85rem" }}>
            {paid ? "Nhân viên sẽ chuẩn bị thiết bị cho bạn." : expired ? "Số lượng giữ chỗ đã được giải phóng." : "Vui lòng thanh toán trong thời gian giữ chỗ."}
          </p>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <div style={{ fontSize: "0.72rem", color: "#9CA3AF", fontFamily: "var(--font-mono)" }}>Mã đơn</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem", color: "var(--color-forest)" }}>{order.id}</div>
            </div>
            <div style={{
              background: paid ? "#DCFCE7" : expired ? "#FEE2E2" : "#FEF3C7",
              color: paid ? "#15803D" : expired ? "#B91C1C" : "#B45309",
              padding: "5px 14px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 700
            }}>
              {order.status}
            </div>
          </div>

          {!paid && !expired && seconds > 0 && (
            <div style={{ background: "#FEF3C7", borderRadius: "10px", padding: "14px", textAlign: "center", marginBottom: "16px", border: "1px solid #FCD34D" }}>
              <div style={{ fontSize: "0.8rem", color: "#92400E", marginBottom: "4px" }}>Hết hạn sau</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", fontWeight: 700, color: "#B45309" }}>{mm}:{ss}</div>
            </div>
          )}
          {expired && (
            <div style={{ background: "#FEE2E2", borderRadius: "10px", padding: "14px", textAlign: "center", marginBottom: "16px", border: "1px solid #FECACA" }}>
              <div style={{ fontWeight: 700, color: "#DC2626" }}>⚠ Đơn đã Hết hạn</div>
              <div style={{ fontSize: "0.8rem", color: "#DC2626" }}>Số lượng được trả lại. Vui lòng đặt lại.</div>
            </div>
          )}

          <div className="flex flex-col gap-2 mb-4" style={{ fontSize: "0.85rem" }}>
            {order.items.map((item) => (
              <div key={item.productId} className="flex justify-between" style={{ borderBottom: "1px dashed var(--color-bone)", padding: "5px 0" }}>
                <span style={{ color: "#6B7280" }}>{item.productName} × {item.qty} ({item.days}n)</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{fmt(item.pricePerDay * item.qty * item.days)}</span>
              </div>
            ))}
            <div className="flex justify-between py-1" style={{ color: "#16A34A" }}>
              <span>Giảm giá CAMPGO10</span><span style={{ fontFamily: "var(--font-mono)" }}>−{fmt(order.discount)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span style={{ color: "#6B7280" }}>Cọc bảo đảm</span><span style={{ fontFamily: "var(--font-mono)" }}>{fmt(order.depositTotal)}</span>
            </div>
            <div className="flex justify-between pt-2" style={{ fontWeight: 700, borderTop: "2px solid var(--color-bone)" }}>
              <span>Tổng cần thanh toán</span><span style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{fmt(order.rental - order.discount + order.depositTotal)}</span>
            </div>
          </div>

          {latestPayment?.status === "Thất bại" && !paid && !expired && (
            <div role="alert" style={{ background: "#FEE2E2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: "8px", padding: "10px 12px", fontSize: "0.8rem", marginBottom: "10px" }}>
              <strong>Thanh toán thất bại.</strong> {latestPayment.note} Bạn có thể thử lại khi thời gian giữ chỗ vẫn còn.
            </div>
          )}
          {!paid && !expired && seconds > 0 && (
            <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <button disabled={processing} onClick={() => handlePay(true)}
                style={{ background: processing ? "#9CA3AF" : "var(--color-forest)", color: "white", padding: "12px", borderRadius: "10px", border: "none", cursor: processing ? "wait" : "pointer", fontWeight: 700, marginBottom: "8px" }}
              >
                {processing ? "Đang kiểm tra…" : "Thanh toán thành công"}
              </button>
              <button disabled={processing} onClick={() => handlePay(false)}
                style={{ background: "white", color: "#B91C1C", padding: "12px", borderRadius: "10px", border: "1px solid #FECACA", cursor: processing ? "wait" : "pointer", fontWeight: 700, marginBottom: "8px" }}
              >
                Mô phỏng thất bại
              </button>
            </div>
          )}
          {paid && (
            <div style={{ background: "#DCFCE7", borderRadius: "8px", padding: "12px", fontSize: "0.82rem", color: "#15803D", marginBottom: "12px" }}>
              ✓ Đơn <strong>Đã xác nhận</strong>. Nhân viên sẽ chuẩn bị thiết bị và thông báo khi sẵn sàng nhận.
              <br /><strong>Chuyển sang vai trò Nhân viên</strong> để xem đơn và tiến hành bàn giao.
            </div>
          )}
          <button onClick={() => app.setPage("my-orders")}
            style={{ width: "100%", background: "var(--color-parchment)", color: "var(--color-bark)", padding: "11px", borderRadius: "8px", border: "1px solid var(--color-bone)", cursor: "pointer", fontWeight: 600 }}
          >
            Xem đơn của tôi
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── My Orders ────────────────────────────────────────────────────────────────
function MyOrdersView() {
  const app = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const myOrders = app.orders;
  const detail = myOrders.find((o) => o.id === selected);
  const cancellationQuote = cancelling ? app.getCancellationQuote(cancelling) : null;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--color-bark)", marginBottom: "20px" }}>Đơn thuê của tôi</h1>
      <div className="responsive-detail-grid grid gap-6" style={{ gridTemplateColumns: detail ? "1fr 420px" : "1fr" }}>
        <div className="flex flex-col gap-3">
          {myOrders.map((o) => {
            const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
            return (
              <div key={o.id} onClick={() => setSelected(selected === o.id ? null : o.id)}
                style={{ background: "white", borderRadius: "12px", padding: "16px", border: `1px solid ${selected === o.id ? "var(--color-forest)" : "var(--color-bone)"}`, cursor: "pointer" }}
                className="hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--color-moss)" }}>{o.id}</div>
                    <div style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: "2px" }}>
                      {o.items.map((i) => `${i.productName} ×${i.qty}`).join(", ")}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#9CA3AF" }}>📅 {o.pickupTime} → {o.returnTime}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ background: sc.bg, color: sc.text, padding: "3px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>{o.status}</span>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{fmt(o.rental - o.discount + o.depositTotal)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {detail && (
          <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", padding: "20px", alignSelf: "start", position: "sticky", top: 80 }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--color-moss)" }}>{detail.id}</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--color-bark)" }}>Chi tiết đơn</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "1.2rem" }}>×</button>
            </div>

            <div className="flex flex-col gap-2 mb-4" style={{ fontSize: "0.84rem" }}>
              {[
                ["Khách hàng", detail.customerName],
                ["SĐT", detail.customerPhone],
                ["Nhận đồ", detail.pickupTime],
                ["Trả đồ", detail.returnTime],
                ["Tiền thuê", fmt(detail.rental)],
                ["Giảm giá", detail.discount > 0 ? `−${fmt(detail.discount)}` : "—"],
                ["Tiền cọc", fmt(detail.depositTotal)],
                ["Tổng TT", fmt(detail.rental - detail.discount + detail.depositTotal)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between" style={{ borderBottom: "1px dashed var(--color-bone)", paddingBottom: "5px" }}>
                  <span style={{ color: "#9CA3AF" }}>{k}</span>
                  <span style={{ fontWeight: 600, fontFamily: k === "Tiền thuê" || k === "Tiền cọc" || k === "Tổng TT" ? "var(--font-mono)" : "inherit", color: k === "Giảm giá" ? "#16A34A" : "var(--color-bark)" }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: "8px" }}>Lịch sử trạng thái</div>
              {detail.statusHistory.map((h, i) => {
                const sc2 = statusColors[h.status] || { bg: "#F3F4F6", text: "#374151" };
                return (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <span style={{ background: sc2.bg, color: sc2.text, padding: "2px 7px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 600, whiteSpace: "nowrap" }}>{h.status}</span>
                    <span style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>{h.at} · {h.by}</span>
                  </div>
                );
              })}
            </div>

            {detail.assignedEquipment.length > 0 && (
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: "8px" }}>Thiết bị bàn giao</div>
                {detail.assignedEquipment.map((equipment) => (
                  <div key={equipment.equipmentId} className="flex justify-between" style={{ fontSize: "0.76rem", padding: "6px 0", borderBottom: "1px dashed var(--color-bone)" }}>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{equipment.equipmentId}</span>
                    <span style={{ color: equipment.returnedAt ? "#15803D" : "#B45309", fontWeight: 600 }}>{equipment.returnedAt ? `Đã trả · ${equipment.returnCondition}` : "Chưa trả"}</span>
                  </div>
                ))}
              </div>
            )}

            {(detail.transactions?.length ?? 0) > 0 && (
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: "8px" }}>Giao dịch</div>
                {detail.transactions.map((transaction) => (
                  <div key={transaction.id} style={{ background: "var(--color-parchment)", borderRadius: "8px", padding: "9px 10px", marginBottom: "6px" }}>
                    <div className="flex justify-between" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                      <span>{transaction.type}</span>
                      <span style={{ color: transaction.status === "Thành công" ? "#15803D" : transaction.status === "Thất bại" ? "#B91C1C" : "#B45309" }}>{transaction.status}</span>
                    </div>
                    <div className="flex justify-between" style={{ color: "#6B7280", fontSize: "0.72rem", marginTop: "2px" }}>
                      <span>{transaction.id}</span><span style={{ fontFamily: "var(--font-mono)" }}>{fmt(transaction.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detail.status === "Khách hủy" && (
              <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "8px", padding: "10px 12px", fontSize: "0.78rem", marginBottom: "12px" }}>
                <div className="flex justify-between mb-1"><span>Lý do hủy:</span><strong>{detail.cancellationReason || "Khách yêu cầu hủy"}</strong></div>
                <div className="flex justify-between"><span>Phí hủy giữ lại</span><strong>{fmt(detail.cancellationFee ?? 0)}</strong></div>
                <div className="flex justify-between"><span>Đã hoàn khách</span><strong style={{ color: "#15803D" }}>{fmt(detail.cancellationRefund ?? 0)}</strong></div>
              </div>
            )}

            {(detail.status === "Chờ thanh toán" || detail.status === "Đã xác nhận") && (
              <button
                style={{ width: "100%", background: "#FEE2E2", color: "#DC2626", padding: "10px", borderRadius: "8px", border: "1px solid #FECACA", cursor: "pointer", fontWeight: 600 }}
                onClick={() => { setCancelling(detail.id); setCancelReason(""); }}
              >
                Hủy đơn
              </button>
            )}
          </div>
        )}
      </div>
      {cancelling && cancellationQuote && (
        <div role="dialog" aria-modal="true" aria-labelledby="cancel-title" style={{ position: "fixed", inset: 0, background: "rgba(23,46,35,0.55)", zIndex: 200, display: "grid", placeItems: "center", padding: "20px" }}>
          <div style={{ background: "white", width: "min(100%, 460px)", borderRadius: "16px", padding: "22px", boxShadow: "0 12px 28px rgba(23,46,35,0.18)" }}>
            <h2 id="cancel-title" style={{ fontSize: "1.25rem", color: "var(--color-bark)", marginBottom: "8px" }}>Xác nhận hủy đơn?</h2>
            <p style={{ color: "#6B7280", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "12px" }}>
              Quy tắc UC07: Trước 48h miễn phí · 24–48h giữ 30% tiền thuê · Dưới 24h giữ 100% tiền thuê. Tiền cọc hoàn 100%.
            </p>
            <div style={{ background: "var(--color-parchment)", borderRadius: "10px", padding: "12px", marginBottom: "14px" }}>
              <div className="flex justify-between py-1"><span>Phí hủy giữ lại:</span><strong style={{ color: "#B91C1C" }}>{fmt(cancellationQuote.fee)}</strong></div>
              <div className="flex justify-between py-1"><span>Số tiền hoàn dự kiến:</span><strong style={{ color: "#15803D" }}>{fmt(cancellationQuote.refund)}</strong></div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", display: "block", marginBottom: "4px" }}>
                Lý do hủy đơn <span style={{ color: "#DC2626" }}>*</span>:
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy đơn (ví dụ: bận việc đột xuất, đổi địa điểm cắm trại...)"
                rows={2}
                style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "8px 10px", fontSize: "0.85rem", resize: "none" }}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCancelling(null)} style={{ flex: 1, border: "1px solid var(--color-bone)", background: "white", borderRadius: "8px", padding: "10px", cursor: "pointer", fontWeight: 600 }}>Giữ đơn</button>
              <button
                disabled={!cancelReason.trim()}
                onClick={() => { app.cancelOrder(cancelling, cancelReason); setCancelling(null); }}
                style={{ flex: 1, border: "none", background: !cancelReason.trim() ? "#9CA3AF" : "#C04A3E", color: "white", borderRadius: "8px", padding: "10px", cursor: !cancelReason.trim() ? "not-allowed" : "pointer", fontWeight: 700 }}
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Advisor ───────────────────────────────────────────────────────────────
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

  // Thuật toán gợi ý động dựa trên sản phẩm thật trong hệ thống
  const tentProd = app.products.find((p) => p.category === "Lều trại" && p.status === "active" && (numPeople <= 2 ? p.capacity.includes("2") : p.capacity.includes("4")))
    || app.products.find((p) => p.category === "Lều trại" && p.status === "active");

  const sleepProd = app.products.find((p) => p.category === "Ngủ" && p.status === "active");
  const lightProd = app.products.find((p) => p.category === "Đèn" && p.status === "active");
  const cookProd = app.products.find((p) => p.category === "Nấu ăn" && p.status === "active");

  const suggestion = [
    tentProd && {
      productId: tentProd.id,
      name: tentProd.name,
      qty: Math.max(1, Math.ceil(numPeople / 4)),
      reason: `Đủ sức chứa cho ${numPeople} người, chống mưa tốt — phù hợp điểm đến ${destination}.`,
      rental: tentProd.pricePerDay * Math.max(1, Math.ceil(numPeople / 4)) * numNights,
      deposit: tentProd.deposit * Math.max(1, Math.ceil(numPeople / 4)),
    },
    sleepProd && {
      productId: sleepProd.id,
      name: sleepProd.name,
      qty: numPeople,
      reason: `Mỗi thành viên 1 túi ngủ dã ngoại đảm bảo giữ nhiệt và giấc ngủ thoải mái.`,
      rental: sleepProd.pricePerDay * numPeople * numNights,
      deposit: sleepProd.deposit * numPeople,
    },
    lightProd && {
      productId: lightProd.id,
      name: lightProd.name,
      qty: Math.max(1, Math.ceil(numPeople / 2)),
      reason: `Chiếu sáng lều và khu vực nấu ăn, sinh hoạt chung ban đêm.`,
      rental: lightProd.pricePerDay * Math.max(1, Math.ceil(numPeople / 2)) * numNights,
      deposit: lightProd.deposit * Math.max(1, Math.ceil(numPeople / 2)),
    },
    cookProd && {
      productId: cookProd.id,
      name: cookProd.name,
      qty: 1,
      reason: `Tiện lợi nấu ăn nhẹ và đun nước nóng tại điểm cắm trại.`,
      rental: cookProd.pricePerDay * 1 * numNights,
      deposit: cookProd.deposit * 1,
    },
  ].filter(Boolean) as { productId: string; name: string; qty: number; reason: string; rental: number; deposit: number }[];

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
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px" }}>
      <div style={{ background: "linear-gradient(135deg, var(--color-forest), var(--color-moss))", borderRadius: "14px", padding: "24px", marginBottom: "20px", color: "white" }}>
        <div className="flex items-center gap-3 mb-3">
          <span style={{ fontSize: "2rem" }}>🤖</span>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginBottom: "2px" }}>Tư vấn bộ đồ bằng AI (UC09)</h1>
            <p style={{ color: "var(--color-sage)", fontSize: "0.82rem" }}>Gợi ý combo sản phẩm theo điểm đến, số người và ngân sách thực tế.</p>
          </div>
        </div>
      </div>

      {!sent ? (
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", padding: "20px" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--color-bark)", marginBottom: "16px" }}>Cho AI biết chuyến đi của bạn</h3>
          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {[
              { label: "Điểm đến", val: destination, set: setDestination, placeholder: "VD: Đà Lạt, Mộc Châu, Ba Vì" },
              { label: "Số người", val: people, set: setPeople, placeholder: "VD: 4" },
              { label: "Số ngày thuê (Block 24h)", val: nights, set: setNights, placeholder: "VD: 2" },
              { label: "Ngân sách thuê dự kiến (đ)", val: budget, set: setBudget, placeholder: "VD: 1500000" },
            ].map((f) => (
              <div key={f.label}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-bark)", display: "block", marginBottom: "4px" }}>{f.label}</label>
                <input value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder}
                  style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "9px 12px", fontSize: "0.9rem" }}
                />
              </div>
            ))}
          </div>
          <button onClick={() => setSent(true)}
            style={{ marginTop: "16px", background: "var(--color-forest)", color: "white", padding: "12px 28px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" }}
          >
            🤖 Tạo gợi ý combo tối ưu →
          </button>
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", padding: "20px" }}>
          <div style={{ background: "var(--color-parchment)", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "0.88rem", color: "var(--color-bark)" }}>
            🤖 Dựa trên chuyến đi <strong>{destination}</strong> · {people} người · {nights} ngày · ngân sách {parseInt(budget).toLocaleString("vi-VN")}đ, combo phù hợp nhất gồm:
          </div>
          <div className="flex flex-col gap-3 mb-4">
            {suggestion.map((s) => (
              <div key={s.productId} style={{ border: "1px solid var(--color-bone)", borderRadius: "10px", padding: "12px 16px", display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: "2px" }}>{s.name} × {s.qty} chiếc</div>
                  <div style={{ fontSize: "0.78rem", color: "#6B7280", marginBottom: "4px" }}>{s.reason}</div>
                  <div style={{ fontSize: "0.78rem" }}>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontWeight: 600 }}>Thuê: {fmt(s.rental)}</span>
                    <span style={{ color: "#9CA3AF", marginLeft: "10px" }}>Cọc: {fmt(s.deposit)}</span>
                  </div>
                </div>
                <button onClick={() => app.addToCart(s.productId, s.qty)}
                  style={{ background: "var(--color-forest)", color: "white", padding: "7px 14px", borderRadius: "7px", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                >
                  + Giỏ
                </button>
              </div>
            ))}
          </div>

          {totalRental > targetBudget && (
            <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", color: "#92400E", borderRadius: "8px", padding: "9px 12px", fontSize: "0.8rem", marginBottom: "12px" }}>
              ⚠ Tổng tiền thuê dự kiến vượt ngân sách ban đầu khoảng {fmt(totalRental - targetBudget)}. Bạn có thể điều chỉnh bớt số lượng hoặc đổi sản phẩm.
            </div>
          )}

          <div style={{ background: "var(--color-parchment)", borderRadius: "8px", padding: "12px 16px", marginBottom: "14px" }}>
            <div className="flex justify-between"><span style={{ fontWeight: 700 }}>Tổng tiền thuê ({numNights} ngày)</span><span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{fmt(totalRental)}</span></div>
            <div className="flex justify-between"><span style={{ color: "#6B7280", fontSize: "0.82rem" }}>Tiền cọc bảo đảm (hoàn khi trả)</span><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{fmt(totalDeposit)}</span></div>
            <div className="flex justify-between pt-1" style={{ borderTop: "1px dashed var(--color-bone)", marginTop: "4px" }}><span style={{ fontWeight: 700 }}>Thanh toán ban đầu</span><span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-amber)" }}>{fmt(totalRental + totalDeposit)}</span></div>
          </div>

          {addedAllNotice && (
            <div role="status" style={{ background: "#DCFCE7", color: "#15803D", borderRadius: "8px", padding: "10px", fontSize: "0.82rem", fontWeight: 600, textAlign: "center", marginBottom: "12px" }}>
              ✓ Đã thêm toàn bộ combo vào giỏ thuê thành công!
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleAddAll}
              style={{ flex: 1, background: "var(--color-amber)", color: "white", padding: "11px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700 }}
            >
              + Thêm toàn bộ combo vào giỏ
            </button>
            <button onClick={() => app.setPage("cart")}
              style={{ flex: 1, background: "var(--color-forest)", color: "white", padding: "11px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700 }}
            >
              Xem giỏ thuê →
            </button>
            <button onClick={() => setSent(false)}
              style={{ background: "white", color: "var(--color-bark)", padding: "11px 16px", borderRadius: "8px", border: "1px solid var(--color-bone)", cursor: "pointer", fontWeight: 600 }}
            >
              Thay đổi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profile & reviews ───────────────────────────────────────────────────────
function ProfileView() {
  const app = useApp();
  const [section, setSection] = useState<"profile" | "reviews">("profile");
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("geargo-demo-customer-profile");
      return saved ? JSON.parse(saved) as { name: string; phone: string; email: string; address: string } : {
        name: "Nguyễn Văn An",
        phone: "0901 234 567",
        email: "an.nguyen@example.com",
        address: "Quận 3, TP. Hồ Chí Minh",
      };
    } catch {
      return { name: "Nguyễn Văn An", phone: "0901 234 567", email: "an.nguyen@example.com", address: "Quận 3, TP. Hồ Chí Minh" };
    }
  });
  const [saved, setSaved] = useState(false);
  const [reviewingTarget, setReviewingTarget] = useState<{ orderId: string; productId: string; productName: string } | null>(null);
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
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 24px 56px" }}>
      <div className="mobile-stack flex justify-between items-center gap-4 mb-5">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--color-bark)", marginBottom: "4px" }}>Tài khoản của tôi</h1>
          <p style={{ color: "#6B7280", fontSize: "0.86rem" }}>Quản lý thông tin liên hệ và đánh giá sản phẩm sau chuyến đi (UC08).</p>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Nội dung tài khoản">
          {[
            { key: "profile" as const, label: "Hồ sơ" },
            { key: "reviews" as const, label: "Đánh giá sản phẩm" },
          ].map((item) => (
            <button key={item.key} role="tab" aria-selected={section === item.key} onClick={() => setSection(item.key)}
              style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "8px 14px", background: section === item.key ? "var(--color-forest)" : "white", color: section === item.key ? "white" : "var(--color-bark)", cursor: "pointer", fontWeight: 600 }}
            >{item.label}</button>
          ))}
        </div>
      </div>

      {section === "profile" ? (
        <form onSubmit={(event) => { event.preventDefault(); saveProfile(); }}
          style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: "14px", padding: "22px" }}>
          <div className="responsive-two-column grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {[
              { key: "name" as const, label: "Họ và tên", type: "text" },
              { key: "phone" as const, label: "Số điện thoại", type: "tel" },
              { key: "email" as const, label: "Email", type: "email" },
              { key: "address" as const, label: "Địa chỉ", type: "text" },
            ].map((field) => (
              <label key={field.key} style={{ display: "grid", gap: "6px", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-bark)" }}>
                {field.label}
                <input required type={field.type} value={profile[field.key]} onChange={(event) => { setProfile({ ...profile, [field.key]: event.target.value }); setSaved(false); }}
                  style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "10px 12px", background: "white" }} />
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button type="submit" style={{ border: "none", borderRadius: "8px", padding: "10px 18px", background: "var(--color-forest)", color: "white", cursor: "pointer", fontWeight: 700 }}>Lưu thay đổi</button>
            {saved && <span role="status" style={{ color: "#15803D", fontSize: "0.82rem", fontWeight: 600 }}>Đã lưu hồ sơ trên trình duyệt này.</span>}
          </div>
        </form>
      ) : (
        <div style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: "14px", padding: "22px" }}>
          <h2 style={{ fontSize: "1.05rem", color: "var(--color-bark)", marginBottom: "6px" }}>Đánh giá sản phẩm theo đơn đã hoàn tất</h2>
          <p style={{ color: "#6B7280", fontSize: "0.82rem", marginBottom: "18px" }}>
            Theo quy tắc UC08: Mỗi sản phẩm trong một đơn hoàn tất chỉ được đánh giá 1 lần duy nhất để bảo đảm tính xác thực.
          </p>
          {completedOrders.length === 0 ? (
            <div style={{ background: "var(--color-parchment)", borderRadius: "10px", padding: "20px", textAlign: "center", color: "#6B7280" }}>
              Chưa có đơn thuê nào ở trạng thái <strong>Hoàn tất</strong> để gửi đánh giá.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {completedOrders.map((order) => (
                <div key={order.id} style={{ border: "1px solid var(--color-bone)", borderRadius: "10px", padding: "16px" }}>
                  <div className="flex justify-between items-center mb-3 pb-2" style={{ borderBottom: "1px dashed var(--color-bone)" }}>
                    <div>
                      <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{order.id}</strong>
                      <span style={{ color: "#6B7280", fontSize: "0.78rem", marginLeft: "10px" }}>Hoàn tất ngày: {order.reconciledAt || order.createdAt}</span>
                    </div>
                    <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: "0.72rem", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>Đã hoàn tất</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {order.items.map((item) => {
                      const existing = app.reviews.find((r) => r.orderId === order.id && r.productId === item.productId);
                      const isCurrentReviewing = reviewingTarget?.orderId === order.id && reviewingTarget?.productId === item.productId;

                      return (
                        <div key={item.productId} style={{ background: "var(--color-parchment)", borderRadius: "8px", padding: "12px" }}>
                          <div className="flex justify-between items-center">
                            <div>
                              <div style={{ fontWeight: 700, color: "var(--color-bark)" }}>{item.productName}</div>
                              <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>Số lượng thuê: {item.qty} chiếc · {item.days} ngày</div>
                            </div>
                            {existing ? (
                              <div style={{ textAlign: "right" }}>
                                <span style={{ color: "#F59E0B", fontWeight: 700, fontSize: "0.88rem" }}>{"★".repeat(existing.rating)}</span>
                                <div style={{ fontSize: "0.72rem", color: "#15803D", fontWeight: 600 }}>✓ Đã đánh giá</div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setReviewingTarget({ orderId: order.id, productId: item.productId, productName: item.productName }); setReviewError(""); }}
                                style={{ border: "1px solid var(--color-forest)", borderRadius: "6px", padding: "6px 12px", background: "white", color: "var(--color-forest)", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}
                              >
                                Viết đánh giá
                              </button>
                            )}
                          </div>

                          {existing && (
                            <div style={{ marginTop: "8px", background: "white", borderRadius: "6px", padding: "8px 12px", fontSize: "0.82rem", color: "#4B5563" }}>
                              <p style={{ fontStyle: "italic", margin: 0 }}>"{existing.comment}"</p>
                              <div style={{ fontSize: "0.7rem", color: "#9CA3AF", marginTop: "4px" }}>Gửi lúc: {existing.createdAt}</div>
                            </div>
                          )}

                          {isCurrentReviewing && (
                            <form onSubmit={handleSendReview} style={{ marginTop: "12px", background: "white", borderRadius: "8px", padding: "14px", border: "1px solid var(--color-bone)" }}>
                              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "8px" }}>Đánh giá cho {reviewingTarget.productName}</h4>
                              <label style={{ display: "grid", gap: "4px", fontSize: "0.8rem", fontWeight: 600, marginBottom: "8px" }}>
                                Đánh giá số sao
                                <select value={rating} onChange={(event) => setRating(Number(event.target.value))} style={{ maxWidth: 160, border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "6px 8px", background: "white" }}>
                                  {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} sao {"★".repeat(value)}</option>)}
                                </select>
                              </label>
                              <label style={{ display: "grid", gap: "4px", fontSize: "0.8rem", fontWeight: 600 }}>
                                Nhận xét trải nghiệm thực tế
                                <textarea required value={comment} onChange={(event) => setComment(event.target.value)} rows={3} placeholder="Đồ dùng có bền không, chống mưa tốt không, phụ kiện đầy đủ không..."
                                  style={{ border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "8px 10px", resize: "vertical", fontSize: "0.85rem" }} />
                              </label>
                              {reviewError && <p style={{ color: "#DC2626", fontSize: "0.75rem", marginTop: "6px" }}>{reviewError}</p>}
                              <div className="flex gap-2 mt-3">
                                <button type="submit" style={{ border: "none", borderRadius: "6px", padding: "8px 16px", background: "var(--color-forest)", color: "white", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
                                  Gửi đánh giá {rating} sao
                                </button>
                                <button type="button" onClick={() => setReviewingTarget(null)} style={{ border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "8px 14px", background: "white", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
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

// ─── Router ───────────────────────────────────────────────────────────────────
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
