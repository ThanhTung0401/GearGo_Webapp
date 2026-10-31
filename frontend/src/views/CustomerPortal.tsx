import { useState, useEffect } from "react";
import { useApp } from "../App";
import { fmt, statusColors } from "../store";
import Icon from "../components/Icon";

// ─── Giỏ hàng (CartView) ──────────────────────────────────────────────────────
// ─── Giỏ hàng (CartView - UC3.1, UC3.1.1, UC3.1.2) ───────────────────────────
function CartView() {
  const app = useApp();
  const [promoCode, setPromoCode] = useState(app.appliedPromoCode);
  const [promoApplied, setPromoApplied] = useState(Boolean(app.appliedPromoCode));
  const [promoError, setPromoError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const days = app.getDays();
  const datesValid = app.hasValidRentalPeriod();

  // Tính tổng tiền thuê theo số ngày và số lượng (UC3.1.1: block 24h)
  const rental = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + (p ? p.pricePerDay * c.qty * days : 0);
  }, 0);

  // Tính tổng tiền cọc bảo đảm (UC3.1.1: cọc tách riêng không phụ thuộc ngày thuê)
  const depositTotal = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + (p ? p.deposit * c.qty : 0);
  }, 0);

  const promotionItems = app.cart.map((item) => {
    const product = app.products.find((entry) => entry.id === item.productId)!;
    return { productId: item.productId, rental: product ? product.pricePerDay * item.qty * days : 0 };
  });

  // Đánh giá mã ưu đãi (UC3.1.2: Chỉ giảm trên tiền thuê, không giảm tiền cọc)
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

  // Kiểm tra khả dụng tồn kho từng dòng cho lịch thuê đã chọn (UC3.1 dòng 3, dòng phụ 2.1)
  const cartAvailability = app.cart.map((c) => {
    const avail = app.getAvailable(c.productId);
    const isOver = c.qty > avail;
    const isOutOfStock = avail <= 0;
    return {
      productId: c.productId,
      avail,
      isOver,
      isOutOfStock,
    };
  });

  const hasStockError = cartAvailability.some((item) => item.isOver || item.isOutOfStock);

  const handleProceedToCheckout = () => {
    if (!app.currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (hasStockError || !datesValid) return;
    app.setPage("checkout");
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
    <div className="customer-container" style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
      {/* Header Giỏ hàng */}
      <div className="customer-page-header" style={{ marginBottom: 20 }}>
        <h1 className="customer-page-title">Giỏ thiết bị thuê & Báo giá (UC3.1)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lập danh mục, đối chiếu khả dụng và chốt dự tính chi phí trước khi tạo đơn.
        </p>
      </div>

      {/* Thanh chỉnh sửa lịch thuê trực tiếp tại Giỏ hàng (UC3.1 Dòng sự kiện 2) */}
      <div style={{ background: "white", borderRadius: 14, padding: "16px 20px", marginBottom: 24, border: "1px solid var(--color-bone)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span>📅 Lịch trình thuê đồ (Block 24h làm tròn lên):</span>
          <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 6, background: datesValid ? "#ECFDF5" : "#FEF2F2", color: datesValid ? "#065F46" : "#DC2626", fontWeight: 700 }}>
            {datesValid ? `Tổng thời gian: ${days} ngày` : "Thời gian chưa hợp lệ"}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label style={{ fontSize: "0.72rem", color: "#6B7280", display: "block", marginBottom: 4 }}>Ngày & Giờ nhận đồ</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={app.pickupDate}
                onChange={(e) => app.setPickupDate(e.target.value)}
                style={{ padding: "8px 10px", borderRadius: "8px 0 0 8px", border: "1px solid var(--color-bone)", fontSize: "0.85rem" }}
              />
              <select
                value={app.pickupHour || "09:00"}
                onChange={(e) => app.setPickupHour(e.target.value)}
                style={{ padding: "8px 8px", borderRadius: "0 8px 8px 0", border: "1px solid var(--color-bone)", borderLeft: "none", background: "var(--color-parchment)", fontSize: "0.82rem" }}
              >
                {["08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <span style={{ color: "#9CA3AF", paddingBottom: 10, fontSize: "1.1rem" }}>→</span>

          <div>
            <label style={{ fontSize: "0.72rem", color: "#6B7280", display: "block", marginBottom: 4 }}>Ngày & Giờ trả đồ</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={app.returnDate}
                onChange={(e) => app.setReturnDate(e.target.value)}
                style={{ padding: "8px 10px", borderRadius: "8px 0 0 8px", border: "1px solid var(--color-bone)", fontSize: "0.85rem" }}
              />
              <select
                value={app.returnHour || "09:00"}
                onChange={(e) => app.setReturnHour(e.target.value)}
                style={{ padding: "8px 8px", borderRadius: "0 8px 8px 0", border: "1px solid var(--color-bone)", borderLeft: "none", background: "var(--color-parchment)", fontSize: "0.82rem" }}
              >
                {["08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 200, fontSize: "0.78rem", color: "#6B7280", alignSelf: "center", lineHeight: 1.4 }}>
            💡 <em>Đổi lịch thuê sẽ tự động kiểm tra lại tồn kho khả dụng và tính toán lại toàn bộ báo giá.</em>
          </div>
        </div>
      </div>

      <div className="cart-grid" style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
        {/* Danh sách thiết bị trong giỏ */}
        <div className="flex flex-col gap-3">
          {app.cart.map((c) => {
            const p = app.products.find((p) => p.id === c.productId);
            if (!p) return null;
            const stockInfo = cartAvailability.find((item) => item.productId === c.productId);
            const isError = stockInfo?.isOver || stockInfo?.isOutOfStock;

            return (
              <div
                key={c.productId}
                className="cart-item-card"
                style={{
                  background: "white",
                  borderRadius: 14,
                  padding: "16px 18px",
                  border: isError ? "2px solid #EF4444" : "1px solid var(--color-bone)",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  boxShadow: isError ? "0 4px 12px rgba(239,68,68,0.1)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <img
                  src={p.image}
                  alt={p.name}
                  style={{ width: 84, height: 72, objectFit: "cover", borderRadius: 10, background: "var(--color-parchment)" }}
                />

                <div style={{ flex: 1, minWidth: 200 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: 4, background: "var(--color-parchment)", color: "var(--color-moss)", fontWeight: 700 }}>
                      {p.category}
                    </span>
                    <strong style={{ fontSize: "0.95rem", color: "var(--color-bark)" }}>{p.name}</strong>
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: 3 }}>
                    Đơn giá: {fmt(p.pricePerDay)}/ngày × {days} ngày = <strong style={{ color: "var(--color-forest)" }}>{fmt(p.pricePerDay * days * c.qty)}</strong>
                  </div>

                  <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                    Cọc bảo đảm: {fmt(p.deposit)} × {c.qty} chiếc = <strong style={{ color: "#4B5563" }}>{fmt(p.deposit * c.qty)}</strong> (Hoàn 100% khi trả đồ)
                  </div>

                  {/* Trạng thái tồn kho khả dụng theo UC2.3 / UC3.1 */}
                  <div style={{ marginTop: 6 }}>
                    {stockInfo?.isOutOfStock ? (
                      <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 6, background: "#FEE2E2", color: "#B91C1C", fontWeight: 700 }}>
                        ✗ Hết hàng trong khoảng ngày đã chọn (Tồn kho: 0)
                      </span>
                    ) : stockInfo?.isOver ? (
                      <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 6, background: "#FEF3C7", color: "#B45309", fontWeight: 700 }}>
                        ⚠ Vượt tồn kho: Kho chỉ còn {stockInfo.avail} chiếc (Đang chọn {c.qty})
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 6, background: "#ECFDF5", color: "#065F46", fontWeight: 600 }}>
                        ✓ Khả dụng (Kho sẵn sàng: {stockInfo?.avail} chiếc)
                      </span>
                    )}
                  </div>
                </div>

                {/* Bộ điều chỉnh số lượng (+ / −) */}
                <div className="qty-stepper" style={{ display: "flex", alignItems: "center", gap: 3, background: "var(--color-parchment)", padding: 4, borderRadius: 8, border: "1px solid var(--color-bone)" }}>
                  <button
                    onClick={() => app.updateCartQty(c.productId, -1)}
                    className="qty-btn"
                    style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "white", cursor: "pointer", fontWeight: 700 }}
                    aria-label="Giảm số lượng"
                  >
                    −
                  </button>
                  <span style={{ width: 32, textAlign: "center", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>
                    {c.qty}
                  </span>
                  <button
                    onClick={() => app.updateCartQty(c.productId, 1)}
                    className="qty-btn"
                    style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "white", cursor: "pointer", fontWeight: 700 }}
                    aria-label="Tăng số lượng"
                  >
                    +
                  </button>
                </div>

                {/* Nút xóa khỏi giỏ */}
                <button
                  onClick={() => app.removeFromCart(c.productId)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 6, borderRadius: 6 }}
                  title="Xóa thiết bị khỏi giỏ"
                  aria-label="Xóa sản phẩm"
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Tóm tắt báo giá Sticky (UC3.1.1 & UC3.1.2) */}
        <div className="summary-card" style={{ background: "white", borderRadius: 16, padding: 22, border: "1px solid var(--color-bone)", position: "sticky", top: 24, boxShadow: "0 4px 15px rgba(0,0,0,0.04)" }}>
          <h3 className="summary-title" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 16 }}>
            Báo giá thuê dự tính (UC3.1.1)
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.85rem", marginBottom: 16 }}>
            <div className="summary-row" style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280" }}>Tiền thuê thiết bị ({days} ngày)</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-bark)" }}>{fmt(rental)}</span>
            </div>

            <div className="summary-row" style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280" }}>Tiền cọc bảo đảm (Hoàn lại 100%)</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-bark)" }}>{fmt(depositTotal)}</span>
            </div>

            {discount > 0 && (
              <div className="summary-row text-emerald-600" style={{ display: "flex", justifyContent: "space-between", color: "#059669", fontWeight: 700 }}>
                <span>Ưu đãi áp dụng ({promoCode})</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>−{fmt(discount)}</span>
              </div>
            )}
          </div>

          {/* Ô nhập mã ưu đãi (UC3.1.2) */}
          <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, marginBottom: 16, border: "1px solid var(--color-bone)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 6 }}>
              Mã khuyến mãi giảm giá thuê (UC3.1.2)
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="VD: CAMPGO10"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-bone)", fontSize: "0.82rem", background: "white" }}
              />
              <button
                type="button"
                onClick={applyPromo}
                className="btn btn-secondary btn-sm"
                style={{ padding: "8px 14px", borderRadius: 6, fontWeight: 700, fontSize: "0.8rem" }}
              >
                Áp dụng
              </button>
            </div>
            {promoError && <div style={{ fontSize: "0.74rem", color: "#DC2626", marginTop: 4 }}>{promoError}</div>}
            <div style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: 4 }}>
              * Giảm giá chỉ áp dụng trên tiền thuê đủ điều kiện, không áp dụng cho tiền cọc.
            </div>
          </div>

          {/* Tổng thanh toán ban đầu */}
          <div style={{ borderTop: "2px solid var(--color-bone)", paddingTop: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: "var(--color-bark)", fontSize: "0.95rem" }}>Tổng thanh toán ban đầu</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: "var(--color-forest)", fontSize: "1.3rem" }}>
                {fmt(grand)}
              </span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: 4, lineHeight: 1.4 }}>
              Bao gồm: {fmt(rental - discount)} (Thuê) + {fmt(depositTotal)} (Cọc hoàn lại khi trả đồ).
            </div>
          </div>

          {/* Cảnh báo lỗi tồn kho (UC3.1 Dòng phụ 2.1) */}
          {hasStockError && (
            <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8, padding: 10, fontSize: "0.76rem", color: "#B91C1C", marginBottom: 14, lineHeight: 1.4 }}>
              <strong>⚠ Không đủ hàng:</strong> Có thiết bị vượt quá số lượng khả dụng trong khoảng thời gian đã chọn. Quý khách vui lòng giảm số lượng hoặc bỏ món lỗi để tiếp tục.
            </div>
          )}

          {!datesValid && (
            <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, padding: 10, fontSize: "0.76rem", color: "#92400E", marginBottom: 14 }}>
              ⚠ Ngày trả phải sau ngày nhận. Vui lòng chọn lại lịch thuê hợp lệ.
            </div>
          )}

          <button
            onClick={handleProceedToCheckout}
            disabled={hasStockError || !datesValid}
            className="btn btn-primary btn-lg btn-full"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: "0.95rem",
              background: hasStockError || !datesValid ? "#9CA3AF" : "var(--color-forest)",
              cursor: hasStockError || !datesValid ? "not-allowed" : "pointer",
            }}
          >
            Tiến hành xác nhận thuê →
          </button>

          <p style={{ fontSize: "0.72rem", color: "#9CA3AF", textAlign: "center", marginTop: 8 }}>
            Giỏ thuê chỉ lưu tạm thời, hệ thống sẽ chính thức giữ chỗ 15 phút ở bước tạo đơn.
          </p>
        </div>
      </div>

      {/* Modal Yêu cầu đăng nhập đối với Khách vãng lai */}
      {showAuthModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.6)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 }}>
          <div style={{ background: "white", borderRadius: 18, maxWidth: 440, width: "100%", padding: 26, border: "1px solid var(--color-bone)", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EFF6FF", color: "#1D4ED8", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
              <Icon name="user" size={24} />
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--color-bark)", textAlign: "center", margin: "0 0 6px" }}>
              Đăng nhập để đặt thuê thiết bị
            </h3>
            <p style={{ fontSize: "0.84rem", color: "#4B5563", textAlign: "center", lineHeight: 1.5, margin: "0 0 18px" }}>
              Để lưu đơn thuê, giữ chỗ thiết bị 15 phút và bảo đảm quyền lợi hoàn cọc, quý khách vui lòng đăng nhập hoặc tạo tài khoản GearGo.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowAuthModal(false); app.setPage("auth"); }}
                className="btn btn-primary"
                style={{ flex: 1, padding: "11px", borderRadius: 8, fontWeight: 700 }}
              >
                Đăng nhập / Đăng ký ngay →
              </button>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="btn btn-secondary"
                style={{ padding: "11px 16px", borderRadius: 8 }}
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Xác nhận đặt thuê (CheckoutView - UC3.2, UC3.2.1) ─────────────────────────
function CheckoutView() {
  const app = useApp();
  const [checkoutError, setCheckoutError] = useState("");
  const [receiverName, setReceiverName] = useState(app.currentUser?.name || "Nguyễn Văn An");
  const [receiverPhone, setReceiverPhone] = useState(app.currentUser?.phone || "0901 234 567");
  const [receiverEmail, setReceiverEmail] = useState(app.currentUser?.email || "customer@geargo.vn");
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "store" | "wallet">("qr");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const days = app.getDays();

  const rental = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + (p ? p.pricePerDay * c.qty * days : 0);
  }, 0);
  const depositTotal = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + (p ? p.deposit * c.qty : 0);
  }, 0);

  const promoCode = app.appliedPromoCode;
  const promoResult = promoCode
    ? app.evaluatePromotion(
        promoCode,
        rental,
        app.cart.map((item) => {
          const product = app.products.find((entry) => entry.id === item.productId)!;
          return { productId: item.productId, rental: product ? product.pricePerDay * item.qty * days : 0 };
        })
      )
    : null;
  const discount = promoResult?.ok ? promoResult.data.discount : 0;
  const grand = rental - discount + depositTotal;

  // Thực hiện đặt đơn (UC3.2: Khởi tạo giữ chỗ 15 phút)
  const handleConfirm = () => {
    if (!agreedTerms) {
      setCheckoutError("Quý khách vui lòng xác nhận đồng ý với điều khoản thuê và chính sách hoàn cọc của GearGo.");
      return;
    }

    try {
      app.createOrder(promoCode);
      app.setPage("order-confirmed");
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Không thể tạo đơn thuê.");
    }
  };

  return (
    <div className="customer-container" style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 20px" }}>
      <button
        onClick={() => app.setPage("cart")}
        className="btn btn-ghost btn-sm mb-4"
        style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-forest)", fontWeight: 600 }}
      >
        ← Quay lại giỏ hàng
      </button>

      <div className="customer-page-header" style={{ marginBottom: 20 }}>
        <h1 className="customer-page-title">Xác nhận thông tin đặt thuê & Giữ chỗ (UC3.2)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Hệ thống sẽ ghi nhận đơn và kích hoạt đồng hồ giữ chỗ 15 phút để bạn hoàn tất thanh toán.
        </p>
      </div>

      <div className="cart-grid" style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
        <div className="flex flex-col gap-5">
          {/* Thông tin người nhận thiết bị */}
          <div className="card-panel" style={{ background: "white", padding: 22, borderRadius: 16, border: "1px solid var(--color-bone)" }}>
            <h4 className="font-bold text-bark text-base mb-3 flex items-center gap-2">
              <Icon name="user" size={18} /> Thông tin người nhận thiết bị (Tự động cập nhật)
            </h4>
            <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Họ và tên người nhận *</label>
                <input
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-bone)" }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Số điện thoại liên hệ *</label>
                <input
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-bone)" }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Email nhận biên lai điện tử</label>
                <input
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-bone)" }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Địa điểm nhận & nghiệm thu đồ</label>
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--color-parchment)", fontSize: "0.82rem", color: "var(--color-bark)", fontWeight: 600 }}>
                  📍 128 Nguyễn Đình Chiểu, P. Võ Thị Sáu, Q.3, TP.HCM
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--color-bone)", display: "flex", gap: 16, fontSize: "0.82rem", color: "#6B7280" }}>
              <span>🕒 <strong>Nhận đồ:</strong> {app.pickupDate} ({app.pickupHour || "09:00"})</span>
              <span>→</span>
              <span>🕒 <strong>Trả đồ:</strong> {app.returnDate} ({app.returnHour || "09:00"})</span>
            </div>
          </div>

          {/* Danh sách thiết bị thuê */}
          <div className="card-panel" style={{ background: "white", padding: 22, borderRadius: 16, border: "1px solid var(--color-bone)" }}>
            <h4 className="font-bold text-bark text-base mb-3 flex items-center gap-2">
              <Icon name="tent" size={18} /> Danh sách thiết bị chốt đặt ({app.cart.length} món · {days} ngày)
            </h4>
            <div className="flex flex-col gap-2">
              {app.cart.map((c) => {
                const p = app.products.find((p) => p.id === c.productId)!;
                if (!p) return null;
                return (
                  <div
                    key={c.productId}
                    className="flex justify-between items-center py-2.5 border-b border-dashed border-bone text-sm"
                  >
                    <div>
                      <span className="font-semibold text-bark">{p.name}</span>
                      <strong className="text-forest ml-2">× {c.qty}</strong>
                      <div className="text-xs text-gray-500">
                        Thuê: {fmt(p.pricePerDay)}/ngày · Cọc: {fmt(p.deposit * c.qty)} (hoàn trả)
                      </div>
                    </div>
                    <span className="font-mono font-bold text-forest">
                      {fmt(p.pricePerDay * c.qty * days)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chính sách hủy & bảo đảm cọc */}
          <div className="policy-banner" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 14, padding: "16px 18px", fontSize: "0.82rem", color: "#1E3A8A" }}>
            <strong>🛡️ Cam kết hoàn cọc & Quy định hủy đơn (BR22):</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
              <li><strong>Hoàn cọc 100%:</strong> Tự động chuyển khoản hoàn cọc trong 5–15 phút sau khi nghiệm thu đồ nguyên vẹn.</li>
              <li><strong>Hủy đơn trước 48 giờ:</strong> Hoàn 100% tiền thuê và 100% tiền cọc.</li>
              <li><strong>Hủy đơn trong 24–48 giờ:</strong> Giữ 30% tiền thuê làm phí hủy, hoàn 70% tiền thuê + 100% tiền cọc.</li>
              <li><strong>Hủy đơn dưới 24 giờ:</strong> Giữ 100% tiền thuê, hoàn lại 100% tiền cọc bảo đảm.</li>
            </ul>
          </div>
        </div>

        {/* Cột Tổng kết & Thanh toán */}
        <div className="summary-card" style={{ background: "white", borderRadius: 16, padding: 22, border: "1px solid var(--color-bone)", position: "sticky", top: 24, boxShadow: "0 4px 15px rgba(0,0,0,0.04)" }}>
          <h3 className="summary-title" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 14 }}>
            Tổng kết đơn thuê (UC3.2.1)
          </h3>

          <div className="flex flex-col gap-2.5 text-sm mb-4">
            <div className="summary-row flex justify-between">
              <span className="text-gray-500">Tiền thuê ({days} ngày)</span>
              <span className="font-mono font-bold text-bark">{fmt(rental)}</span>
            </div>
            {discount > 0 && (
              <div className="summary-row text-emerald-600 font-bold flex justify-between">
                <span>Ưu đãi áp dụng ({promoCode})</span>
                <span className="font-mono">−{fmt(discount)}</span>
              </div>
            )}
            <div className="summary-row flex justify-between">
              <span className="text-gray-500">Tiền cọc bảo đảm (hoàn lại)</span>
              <span className="font-mono font-bold text-bark">{fmt(depositTotal)}</span>
            </div>
            <div className="summary-row summary-row-total flex justify-between pt-3 border-t-2 border-bone">
              <span className="font-bold text-bark">Tổng cần thanh toán</span>
              <span className="summary-total-price font-mono font-extrabold text-forest text-xl">{fmt(grand)}</span>
            </div>
          </div>

          {/* Chọn phương thức thanh toán */}
          <div className="mt-4 pt-3 border-t border-bone">
            <div className="text-xs font-bold text-bark mb-2">Phương thức thanh toán:</div>
            <div className="flex flex-col gap-1.5">
              {[
                { id: "qr" as const, name: "Chuyển khoản QR ngân hàng (VietQR 24/7)", badge: "Khuyên dùng" },
                { id: "store" as const, name: "Thanh toán tiền mặt / Thẻ tại cửa hàng", badge: "Tại quầy" },
                { id: "wallet" as const, name: "Ví điện tử MoMo / ZaloPay", badge: "Ví điện tử" },
              ].map((m) => (
                <label
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: paymentMethod === m.id ? "1.5px solid var(--color-forest)" : "1px solid var(--color-bone)",
                    background: paymentMethod === m.id ? "#F0FDF4" : "white",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="pay"
                      checked={paymentMethod === m.id}
                      onChange={() => setPaymentMethod(m.id)}
                      className="accent-forest"
                    />
                    <span style={{ fontWeight: paymentMethod === m.id ? 700 : 500 }}>{m.name}</span>
                  </div>
                  <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: 4, background: "var(--color-parchment)", color: "var(--color-moss)", fontWeight: 700 }}>
                    {m.badge}
                  </span>
                </label>
              ))}
            </div>

            {/* Khung minh họa VietQR sinh động */}
            {paymentMethod === "qr" && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "var(--color-parchment)", border: "1px solid var(--color-bone)", textAlign: "center" }}>
                <div style={{ fontSize: "0.72rem", color: "#065F46", fontWeight: 700, marginBottom: 4 }}>
                  ⚡ Cổng thanh toán VietQR tự động
                </div>
                <div style={{ fontSize: "0.74rem", color: "#4B5563" }}>
                  Mã QR chuyển khoản ngân hàng sẽ được tạo lập ngay ở bước kế tiếp kèm đồng hồ giữ chỗ 15 phút.
                </div>
              </div>
            )}
          </div>

          {/* Checkbox cam kết điều khoản bắt buộc */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--color-bone)" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: "0.78rem", color: "var(--color-bark)", lineHeight: 1.4 }}>
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                style={{ marginTop: 2 }}
                className="accent-forest"
              />
              <span>
                Tôi đã đọc và đồng ý với <strong>Quy chế thuê đồ</strong>, cam kết hoàn cọc 100% và <strong>Quy định hủy đơn</strong> của GearGo.
              </span>
            </label>
          </div>

          {checkoutError && (
            <div role="alert" className="form-error-msg mt-3 bg-red-50 p-2.5 rounded text-xs text-red-600 border border-red-200">
              {checkoutError}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={!agreedTerms}
            className="btn btn-primary btn-lg btn-full mt-4"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: "0.95rem",
              background: !agreedTerms ? "#9CA3AF" : "var(--color-forest)",
              cursor: !agreedTerms ? "not-allowed" : "pointer",
            }}
          >
            ✓ Xác nhận đặt thuê & Giữ chỗ 15 phút
          </button>

          <p style={{ fontSize: "0.72rem", color: "#9CA3AF", textAlign: "center", marginTop: 8 }}>
            🔒 Cam kết giữ chỗ toàn bộ danh mục thiết bị trong 15 phút
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Đơn đã xác nhận & Thanh toán VietQR (OrderConfirmedView - UC3.2 & UC5.1) ──
function OrderConfirmedView() {
  const app = useApp();
  const [seconds, setSeconds] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [checkingGateway, setCheckingGateway] = useState(false);
  const [gatewayMessage, setGatewayMessage] = useState("");
  const order = app.newOrderId ? app.orders.find((o) => o.id === app.newOrderId) : null;
  const paid = order?.status === "Đã xác nhận";
  const expired = order?.status === "Hết hạn";
  const latestPayment = order?.transactions?.filter((transaction) => transaction.type === "Thanh toán ban đầu").at(-1);

  // Bộ đếm ngược thời gian giữ chỗ thanh toán 15 phút (UC3.2)
  useEffect(() => {
    if (!order?.expiresAt || paid || expired) return;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((new Date(order.expiresAt!).getTime() - Date.now()) / 1000));
      setSeconds(remaining);
      // Tự động hết hạn khi chạm 0s
      if (remaining === 0 && !paid && !expired) {
        order.status = "Hết hạn";
      }
    };
    updateCountdown();
    const t = setInterval(updateCountdown, 1000);
    return () => clearInterval(t);
  }, [paid, expired, order?.expiresAt]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  if (!order) return null;

  const totalAmount = order.rental - order.discount + order.depositTotal;

  const handlePay = (succeed: boolean) => {
    setProcessing(true);
    window.setTimeout(() => {
      app.payOrder(order.id, succeed);
      setProcessing(false);
    }, 650);
  };

  return (
    <div className="confirmed-wrap" style={{ maxWidth: 640, margin: "24px auto", padding: "0 16px" }}>
      <div className="card-panel text-left overflow-hidden p-0" style={{ background: "white", borderRadius: 20, border: "1px solid var(--color-bone)", boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}>
        {/* Banner trạng thái */}
        <div
          className={`p-6 text-center text-white ${
            paid ? "bg-forest" : expired ? "bg-clay" : "bg-amber"
          }`}
          style={{ background: paid ? "var(--color-forest)" : expired ? "#DC2626" : "linear-gradient(135deg, #D97706 0%, #B45309 100%)" }}
        >
          <div className="text-4xl mb-2">{paid ? "✓" : expired ? "×" : "⏳"}</div>
          <h2 className="text-xl font-bold font-display" style={{ margin: 0, color: "white" }}>
            {paid ? "Đơn thuê đã được thanh toán & xác nhận!" : expired ? "Đơn thuê đã hết thời hạn giữ chỗ" : "Đơn thuê đang chờ thanh toán (Giữ chỗ 15 phút)"}
          </h2>
          <p className="text-sm opacity-90 mt-1" style={{ maxWidth: 480, margin: "6px auto 0", color: "#FEF3C7" }}>
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
              <div className="font-mono font-bold text-forest text-lg">{order.id}</div>
            </div>
            <span
              className={`badge ${
                paid ? "badge-success" : expired ? "badge-danger" : "badge-warning"
              }`}
              style={{ fontSize: "0.82rem", padding: "4px 12px" }}
            >
              {order.status}
            </span>
          </div>

          {/* Đồng hồ đếm ngược 15 phút giữ chỗ */}
          {!paid && !expired && seconds > 0 && (
            <div className="text-center my-4">
              <div
                className="timer-pill"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 18px",
                  borderRadius: 99,
                  background: "#FEF3C7",
                  color: "#92400E",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  border: "1px solid #FCD34D",
                }}
              >
                <Icon name="clock" size={18} /> Thời hạn giữ chỗ còn lại: <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem" }}>{mm}:{ss}</span>
              </div>
            </div>
          )}

          {/* Khung mã VietQR chuyển khoản trực tiếp (UC5.1) */}
          {!paid && !expired && seconds > 0 && (
            <div style={{ background: "var(--color-parchment)", borderRadius: 14, padding: 20, border: "1px solid var(--color-bone)", margin: "16px 0", textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-forest)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                MÃ QR THANH TOÁN TỰ ĐỘNG 24/7 (VIETQR)
              </div>

              {/* QR Image */}
              <div style={{ background: "white", padding: 12, borderRadius: 12, display: "inline-block", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", marginBottom: 12 }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=2|99|0901234567|CONG%20TY%20GEARGO||0|0|${totalAmount}|${order.id}|transfer_myqr`}
                  alt="Mã QR Chuyển khoản VietQR"
                  style={{ width: 170, height: 170, display: "block" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.82rem", color: "var(--color-bark)", textAlign: "left", maxWidth: 360, margin: "0 auto", background: "white", padding: "12px 16px", borderRadius: 10, border: "1px solid var(--color-bone)" }}>
                <div>Ngân hàng: <strong>MB Bank (Quân Đội)</strong></div>
                <div>Số tài khoản: <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>0901 234 567</strong></div>
                <div>Chủ tài khoản: <strong>CONG TY TNHH GEARGO OUTDOOR</strong></div>
                <div>Số tiền chuyển: <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{fmt(totalAmount)}</strong></div>
                <div>Nội dung chuyển khoản: <strong style={{ fontFamily: "var(--font-mono)", color: "#D97706", background: "#FEF3C7", padding: "1px 6px", borderRadius: 4 }}>{order.id}</strong></div>
              </div>

              <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: 8 }}>
                💡 <em>Hệ thống sẽ tự động kích hoạt trạng thái "Đã xác nhận" ngay khi tiền vào tài khoản.</em>
              </div>
            </div>
          )}

          {/* Danh sách thiết bị và chi phí */}
          <div className="flex flex-col gap-2 my-4 text-sm" style={{ background: "#F9FAFB", padding: 14, borderRadius: 12, border: "1px solid var(--color-bone)" }}>
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
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 14, padding: "16px 20px", margin: "18px 0" }}>
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontSize: "1.2rem", color: "#16A34A" }}>🧾</span>
                <strong style={{ color: "#15803D", fontSize: "0.95rem" }}>Biên Lai Giao Dịch Điện Tử VietQR (UC5.1)</strong>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: "0.82rem", color: "#374151" }}>
                <div className="flex justify-between items-center">
                  <span>Mã tham chiếu ngân hàng:</span>
                  <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", background: "#DCFCE7", padding: "2px 8px", borderRadius: 4 }}>
                    {latestPayment?.referenceCode || `FT${order.id.replace(/\D/g, "")}889`}
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
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{fmt(order.rental - order.discount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tiền cọc bảo đảm:</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{fmt(order.depositTotal)} (Được đối soát hoàn 100%)</span>
                </div>
              </div>
            </div>
          )}

          {latestPayment?.status === "Thất bại" && !paid && !expired && (
            <div role="alert" className="form-error-msg bg-red-50 p-3 rounded mb-3 text-red-700 text-xs border border-red-200">
              <strong>Thanh toán không thành công:</strong> {latestPayment.note}
            </div>
          )}

          {/* Dòng phụ 4.1: Kiểm tra đối chiếu với cổng thanh toán */}
          {!paid && !expired && seconds > 0 && (
            <div style={{ margin: "14px 0" }}>
              <button
                type="button"
                disabled={checkingGateway}
                onClick={() => {
                  setCheckingGateway(true);
                  setGatewayMessage("");
                  setTimeout(() => {
                    setCheckingGateway(false);
                    setGatewayMessage("Hệ thống đang đối chiếu tự động với cổng MB Bank. Nếu bạn vừa chuyển tiền, trạng thái sẽ cập nhật trong vài giây.");
                  }, 800);
                }}
                className="btn btn-secondary btn-sm"
                style={{ width: "100%", padding: "9px", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                {checkingGateway ? "⏳ Đang đối chiếu cổng thanh toán..." : "🔄 Kiểm tra trạng thái giao dịch ngân hàng (Dòng 4.1)"}
              </button>
              {gatewayMessage && (
                <div style={{ marginTop: 8, fontSize: "0.76rem", color: "#B45309", background: "#FEF3C7", padding: "8px 12px", borderRadius: 8, border: "1px solid #FCD34D" }}>
                  💡 {gatewayMessage}
                </div>
              )}
            </div>
          )}

          {/* Nút mô phỏng thanh toán (Test) */}
          {!paid && !expired && seconds > 0 && (
            <div className="grid grid-cols-2 gap-3 my-4">
              <button
                disabled={processing}
                onClick={() => handlePay(true)}
                className="btn btn-primary btn-md"
                style={{ padding: "12px", fontWeight: 700 }}
              >
                {processing ? "Đang xử lý..." : "✓ Xác nhận thanh toán (Mô phỏng)"}
              </button>
              <button
                disabled={processing}
                onClick={() => handlePay(false)}
                className="btn btn-secondary btn-md text-red-600 border-red-200"
                style={{ padding: "12px" }}
              >
                Mô phỏng lỗi thanh toán
              </button>
            </div>
          )}

          <button
            onClick={() => app.setPage("my-orders")}
            className="btn btn-secondary btn-md btn-full mt-3"
            style={{ width: "100%", padding: "12px", fontWeight: 600 }}
          >
            Quản lý danh sách đơn thuê của tôi →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Danh sách đơn của tôi (MyOrdersView - UC3.3 & UC3.4) ────────────────────
function MyOrdersView() {
  const app = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [statusTab, setStatusTab] = useState<string>("Tất cả");
  const [viewingRecord, setViewingRecord] = useState<"bbbg" | "pnt" | "reconciliation" | null>(null);
  // UC5.2 Dòng 5.1: Khiếu nại phụ phí
  const [disputeSurchargeTarget, setDisputeSurchargeTarget] = useState<import("../store").Surcharge | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  // Tab lọc đầy đủ trạng thái theo quy trình vòng đời đơn (UC3.3)
  const statusOptions = ["Tất cả", "Chờ thanh toán", "Đã xác nhận", "Đang thuê", "Hoàn tất", "Hết hạn", "Đã hủy"];

  const myOrders = app.orders.filter((o) => {
    if (statusTab === "Tất cả") return true;
    if (statusTab === "Đã hủy") return o.status === "Khách hủy" || o.status === "Cửa hàng hủy";
    return o.status === statusTab;
  });

  const detail = app.orders.find((o) => o.id === selected);
  const cancellationQuote = cancelling ? app.getCancellationQuote(cancelling) : null;
  const cancellingOrder = cancelling ? app.orders.find((o) => o.id === cancelling) : null;

  return (
    <div className="customer-container" style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
      <div className="customer-page-header" style={{ marginBottom: 20 }}>
        <h1 className="customer-page-title">Đơn thuê của tôi (UC3.3)</h1>
        <p className="text-sm text-gray-500">
          Theo dõi tiến độ đơn, thời gian giữ chỗ 15 phút, tra cứu biên bản bàn giao BBBG, phiếu nhận trả PNT và bảng đối soát cọc.
        </p>
      </div>

      {/* Tabs lọc trạng thái đơn hàng (UC3.3) */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {statusOptions.map((st) => {
          const count = st === "Tất cả"
            ? app.orders.length
            : st === "Đã hủy"
            ? app.orders.filter((o) => o.status === "Khách hủy" || o.status === "Cửa hàng hủy").length
            : app.orders.filter((o) => o.status === st).length;
          return (
            <button
              key={st}
              onClick={() => setStatusTab(st)}
              style={{
                background: statusTab === st ? "var(--color-forest)" : "white",
                color: statusTab === st ? "white" : "var(--color-bark)",
                border: `1px solid ${statusTab === st ? "var(--color-forest)" : "var(--color-bone)"}`,
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: "0.82rem",
                fontWeight: statusTab === st ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {st} ({count})
            </button>
          );
        })}
      </div>

      <div className="responsive-detail-grid grid gap-6" style={{ gridTemplateColumns: detail ? "1fr 440px" : "1fr", alignItems: "start" }}>
        {/* Cột danh sách các đơn */}
        <div className="flex flex-col gap-3">
          {myOrders.length === 0 ? (
            <div className="card-panel text-center py-12 text-gray-500 text-sm" style={{ background: "white", borderRadius: 14, border: "1px solid var(--color-bone)" }}>
              Không có đơn thuê nào ở trạng thái "{statusTab}".
            </div>
          ) : (
            myOrders.map((o) => {
              const sc = statusColors[o.status] || { bg: "#F3F4F6", text: "#374151" };
              const isSelected = selected === o.id;

              return (
                <div
                  key={o.id}
                  onClick={() => setSelected(isSelected ? null : o.id)}
                  className={`order-card cursor-pointer`}
                  style={{
                    background: "white",
                    borderRadius: 14,
                    padding: "16px 20px",
                    border: isSelected ? "2px solid var(--color-forest)" : "1px solid var(--color-bone)",
                    boxShadow: isSelected ? "0 6px 16px rgba(27,63,47,0.08)" : "0 1px 3px rgba(0,0,0,0.03)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-moss font-bold">{o.id}</span>
                        <span style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>· Tạo lúc: {o.createdAt}</span>
                      </div>
                      <div className="font-bold text-bark my-1 text-sm">
                        {o.items.map((i) => `${i.productName} ×${i.qty}`).join(", ")}
                      </div>
                      <div className="text-xs text-gray-500">
                        📅 Lịch nhận - trả: <strong>{o.pickupTime}</strong> → <strong>{o.returnTime}</strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        style={{ background: sc.bg, color: sc.text, fontSize: "0.75rem", padding: "3px 10px", borderRadius: 99, fontWeight: 700, display: "inline-block" }}
                        className="badge mb-1"
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
                            app.setNewOrderId(o.id);
                            app.setPage("order-confirmed");
                          }}
                          style={{
                            marginTop: 6,
                            fontSize: "0.72rem",
                            padding: "3px 10px",
                            borderRadius: 6,
                            background: "#FEF3C7",
                            color: "#92400E",
                            border: "1px solid #FCD34D",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          💳 Tiếp tục thanh toán (15p) →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Panel Chi tiết đơn thuê (UC3.3) */}
        {detail && (
          <div className="card-panel self-start sticky top-24" style={{ background: "white", borderRadius: 16, padding: 22, border: "1px solid var(--color-bone)", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-bone">
              <div>
                <div className="font-mono text-xs text-moss font-bold">{detail.id}</div>
                <h3 className="font-display font-bold text-base text-bark" style={{ margin: "2px 0 0" }}>Chi tiết đơn thuê & Chứng từ</h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="btn btn-ghost btn-sm text-gray-400"
                style={{ fontSize: "1.2rem", padding: "0 6px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Bảng kê thiết bị trong đơn */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 6 }}>
                📦 Danh sách thiết bị ({detail.items.length} món):
              </div>
              <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                {detail.items.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem" }}>
                    <span>{item.productName} <strong>× {item.qty}</strong></span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{fmt(item.pricePerDay * item.qty * item.days)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bảng kê chi phí */}
            <div className="flex flex-col gap-2 mb-4 text-xs">
              {[
                ["Khách hàng nhận", detail.customerName],
                ["SĐT liên hệ", detail.customerPhone],
                ["Thời gian nhận đồ", detail.pickupTime],
                ["Thời gian trả đồ", detail.returnTime],
                ["Tiền thuê thiết bị", fmt(detail.rental)],
                ["Giảm giá ưu đãi", detail.discount > 0 ? `−${fmt(detail.discount)}` : "—"],
                ["Tiền cọc bảo đảm (Hoàn trả)", fmt(detail.depositTotal)],
                ["Tổng ban đầu", fmt(detail.rental - detail.discount + detail.depositTotal)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-dashed border-bone">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-semibold text-bark">{v}</span>
                </div>
              ))}
            </div>

            {/* UC5.2 & UC5.3: Khối phụ phí & bồi thường phát sinh */}
            {detail.surcharges && detail.surcharges.length > 0 && (
              <div style={{ marginBottom: 16, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: 12 }}>
                <div className="flex justify-between items-center mb-2">
                  <strong style={{ fontSize: "0.8rem", color: "#B91C1C" }}>
                    ⚠️ Khoản phụ phí phát sinh ({detail.surcharges.length} mục):
                  </strong>
                  <span style={{ fontSize: "0.7rem", background: "#FEE2E2", color: "#991B1B", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                    UC5.2 / UC5.3
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {detail.surcharges.map((sc) => {
                    const statusBadge =
                      sc.status === "Đã duyệt"
                        ? { bg: "#DCFCE7", text: "#15803D", label: "Đã duyệt" }
                        : sc.status === "Tranh chấp"
                        ? { bg: "#FEF3C7", text: "#B45309", label: "Đang khiếu nại" }
                        : sc.status === "Từ chối"
                        ? { bg: "#F3F4F6", text: "#6B7280", label: "Đã hủy bỏ" }
                        : { bg: "#FEF3C7", text: "#D97706", label: "Chờ duyệt" };

                    return (
                      <div key={sc.id} style={{ background: "white", borderRadius: 8, padding: "8px 10px", border: "1px solid #FCA5A5", fontSize: "0.76rem" }}>
                        <div className="flex justify-between items-start">
                          <div>
                            <strong>{sc.type}</strong> ({sc.equipmentId})
                            <div style={{ color: "#6B7280", marginTop: 2 }}>{sc.reason}</div>
                          </div>
                          <div className="text-right">
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#DC2626", fontSize: "0.82rem" }}>
                              +{fmt(sc.amount)}
                            </span>
                            {sc.originalAmount && sc.originalAmount > sc.amount && (
                              <div style={{ fontSize: "0.68rem", color: "#15803D", textDecoration: "line-through" }}>
                                {fmt(sc.originalAmount)}
                              </div>
                            )}
                            <div>
                              <span style={{ background: statusBadge.bg, color: statusBadge.text, fontSize: "0.68rem", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                                {statusBadge.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Phản hồi khiếu nại của khách */}
                        {sc.customerResponse && (
                          <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #FCA5A5", color: "#9A3412", fontSize: "0.74rem" }}>
                            <strong>Ý kiến của bạn:</strong> "{sc.customerResponse}"
                          </div>
                        )}

                        {/* Kết luận của Quản trị viên */}
                        {sc.resolutionNote && (
                          <div style={{ marginTop: 4, color: "#15803D", fontSize: "0.74rem" }}>
                            <strong>Quyết định QTV:</strong> {sc.resolutionNote}
                          </div>
                        )}

                        {/* Nút Khiếu nại phụ phí (Dòng 5.1 UC5.2) */}
                        {(sc.status === "Chờ duyệt" || sc.status === "Đã duyệt") && (
                          <div className="mt-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setDisputeSurchargeTarget(sc);
                                setDisputeReason("");
                              }}
                              style={{
                                background: "#FFFBEB",
                                border: "1px solid #FCD34D",
                                color: "#B45309",
                                borderRadius: 6,
                                padding: "4px 8px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              ⚖️ Gửi khiếu nại mức phí này (Dòng phụ 5.1)
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Các nút xem chứng từ liên quan (BBBG - UC4.2, PNT - UC4.3, Đối soát - UC5.4) */}
            <div className="flex flex-col gap-2 mb-4">
              {detail.status === "Chờ thanh toán" && (
                <button
                  type="button"
                  onClick={() => {
                    app.setNewOrderId(detail.id);
                    app.setPage("order-confirmed");
                  }}
                  style={{
                    background: "#FEF3C7",
                    border: "1px solid #FCD34D",
                    color: "#92400E",
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  💳 Mở cổng VietQR thanh toán ngay (Thời hạn 15 phút) →
                </button>
              )}

              {detail.handoverRecord && (
                <button
                  onClick={() => setViewingRecord("bbbg")}
                  style={{
                    background: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    color: "#1D4ED8",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  📋 Xem Biên bản bàn giao (BBBG - UC4.2)
                </button>
              )}

              {detail.returnReceipts && detail.returnReceipts.length > 0 && (
                <button
                  onClick={() => setViewingRecord("pnt")}
                  style={{
                    background: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    color: "#15803D",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  📦 Xem Phiếu nhận trả ({detail.returnReceipts.length} đợt - UC4.3)
                </button>
              )}

              {/* Nút xem Bảng đối soát cọc và hoàn tất đơn (UC5.4) */}
              {(detail.reconciliation || detail.status === "Hoàn tất") && (
                <button
                  onClick={() => setViewingRecord("reconciliation")}
                  style={{
                    background: "#FAF5FF",
                    border: "1px solid #E9D5FF",
                    color: "#7E22CE",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  📑 Xem Bảng đối soát cọc & Hoàn tất đơn (UC5.4)
                </button>
              )}

              {/* Nút tắt viết đánh giá sản phẩm (UC9.1) */}
              {detail.status === "Hoàn tất" && (
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem("geargo_profile_section", "reviews");
                    setSelected(null);
                    app.setPage("profile");
                  }}
                  style={{
                    background: "#FEF3C7",
                    border: "1px solid #FCD34D",
                    color: "#92400E",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  ⭐ Viết đánh giá trải nghiệm sản phẩm (UC9.1) →
                </button>
              )}
            </div>

            {/* Lịch sử trạng thái */}
            <div className="mb-4">
              <div className="text-xs font-bold text-bark mb-2">Lịch sử tiến trình đơn</div>
              <div style={{ maxHeight: 120, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {detail.statusHistory.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="badge badge-neutral text-xs" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>{h.status}</span>
                    <span className="text-gray-400 text-xs">{h.at} · {h.by}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nút Hủy đơn cho mọi trạng thái trước bàn giao (UC3.4) */}
            {["Chờ thanh toán", "Đã xác nhận", "Đang chuẩn bị", "Sẵn sàng nhận"].includes(detail.status) && (
              <button
                onClick={() => {
                  setCancelling(detail.id);
                  setCancelReason("");
                }}
                className="btn btn-danger btn-sm btn-full"
                style={{ width: "100%", padding: "10px", borderRadius: 8, fontWeight: 700 }}
              >
                Yêu cầu hủy đơn thuê (UC3.4)
              </button>
            )}

            {detail.status === "Hoàn tất" && (
              <button
                onClick={() => {
                  app.setPage("profile");
                }}
                className="btn btn-primary btn-sm btn-full"
                style={{ width: "100%", background: "#D97706", borderColor: "#D97706", color: "#FFFFFF", padding: "10px", borderRadius: 8, fontWeight: 700, marginTop: 6 }}
              >
                ⭐ Viết đánh giá trải nghiệm (UC9.1)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal Khiếu nại phụ phí (UC5.2 Dòng sự kiện phụ 5.1) */}
      {disputeSurchargeTarget && detail && (
        <div role="dialog" aria-modal="true" className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 }}>
          <div className="modal-container" style={{ background: "white", borderRadius: 16, maxWidth: 500, width: "100%", padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
            <div className="modal-header flex justify-between items-center mb-3">
              <h3 className="modal-title font-bold text-base" style={{ color: "#B91C1C", margin: 0 }}>
                ⚖️ Khiếu nại phụ phí phát sinh (Dòng 5.1)
              </h3>
              <button onClick={() => setDisputeSurchargeTarget(null)} className="btn btn-ghost btn-sm text-lg" style={{ border: "none", background: "none", cursor: "pointer" }}>×</button>
            </div>
            <div className="text-xs text-gray-600 mb-4">
              Nếu bạn không đồng thuận với lý do hoặc mức phí nhân viên cửa hàng lập, bạn có quyền gửi phản hồi. Quản trị viên sẽ đối chiếu biên bản bàn giao, phiếu nhận trả và làm việc lại với bạn.
            </div>

            <div style={{ background: "#FEF2F2", borderRadius: 8, padding: 12, marginBottom: 14, fontSize: "0.8rem", border: "1px solid #FECACA" }}>
              <div>Khoản phí: <strong>{disputeSurchargeTarget.type}</strong></div>
              <div>Thiết bị: <strong>{disputeSurchargeTarget.equipmentId}</strong></div>
              <div>Số tiền yêu cầu: <strong style={{ color: "#DC2626", fontFamily: "var(--font-mono)" }}>{fmt(disputeSurchargeTarget.amount)}</strong></div>
              <div style={{ marginTop: 4, color: "#6B7280" }}>Lý do của nhân viên: <em>"{disputeSurchargeTarget.reason}"</em></div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!disputeReason.trim()) return;
                app.disputeSurcharge(detail.id, disputeSurchargeTarget.id, disputeReason);
                setDisputeSurchargeTarget(null);
                setDisputeReason("");
              }}
              className="flex flex-col gap-3"
            >
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                  Lý do bạn không đồng ý với mức phụ phí này: *
                </label>
                <textarea
                  required
                  rows={4}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Ví dụ: Vết trầy xước này đã có từ trước khi nhận đồ, tôi có chụp ảnh lưu lúc kiểm tra tại quầy..."
                  className="form-textarea"
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
                />
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setDisputeSurchargeTarget(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ background: "#B91C1C", borderColor: "#B91C1C", color: "white", fontWeight: 700 }}
                >
                  Gửi khiếu nại (Chuyển Quản trị viên)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem BBBG (UC4.2) */}
      {viewingRecord === "bbbg" && detail && detail.handoverRecord && (
        <div role="dialog" aria-modal="true" className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 }}>
          <div className="modal-container" style={{ background: "white", borderRadius: 16, maxWidth: 540, width: "100%", padding: 24 }}>
            <div className="modal-header flex justify-between items-center mb-4">
              <h3 className="modal-title font-bold text-base">Biên bản bàn giao thiết bị ({detail.handoverRecord.id})</h3>
              <button onClick={() => setViewingRecord(null)} className="btn btn-ghost btn-sm text-lg" style={{ border: "none", background: "none", cursor: "pointer" }}>×</button>
            </div>
            <div className="modal-body text-xs flex flex-col gap-3">
              <div style={{ background: "var(--color-parchment)", borderRadius: 8, padding: 12 }}>
                <div>Thời gian bàn giao: <strong>{detail.handoverRecord.handoverAt}</strong></div>
                <div>Nhân viên giao: <strong>{detail.handoverRecord.staffName}</strong></div>
                <div>Khách nhận: <strong>{detail.handoverRecord.customerName}</strong></div>
              </div>

              <div>
                <strong>Danh sách thiết bị cá thể & phụ kiện:</strong>
                <div className="flex flex-col gap-1.5 mt-2">
                  {detail.handoverRecord.items.map((it) => (
                    <div key={it.equipmentId} style={{ padding: "6px 10px", background: "#F9FAFB", borderRadius: 6, border: "1px solid var(--color-bone)" }}>
                      Mã serial: <strong>{it.equipmentId}</strong> · Tình trạng: {it.condition} · Phụ kiện: {it.accessoriesOk ? "✓ Đầy đủ" : "Thiếu"}
                    </div>
                  ))}
                </div>
              </div>

              {detail.handoverRecord.accessoriesChecklist && (
                <div>
                  <strong>Checklist phụ kiện đi kèm:</strong>
                  <div className="flex flex-col gap-1 mt-1">
                    {detail.handoverRecord.accessoriesChecklist.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span>{c.checked ? "☑" : "☐"}</span>
                        <span>{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.handoverRecord.initialNotes && (
                <div>Ghi chú ban đầu: <em>"{detail.handoverRecord.initialNotes}"</em></div>
              )}

              <div style={{ padding: 10, background: "#DCFCE7", borderRadius: 8, color: "#15803D", fontWeight: 700 }}>
                ✓ Đã ký xác nhận bàn giao đầy đủ tại quầy
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Phiếu Nhận Trả PNT (UC4.3) */}
      {viewingRecord === "pnt" && detail && detail.returnReceipts && (
        <div role="dialog" aria-modal="true" className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 }}>
          <div className="modal-container" style={{ background: "white", borderRadius: 16, maxWidth: 540, width: "100%", padding: 24 }}>
            <div className="modal-header flex justify-between items-center mb-4">
              <h3 className="modal-title font-bold text-base">Phiếu nhận trả thiết bị (PNT)</h3>
              <button onClick={() => setViewingRecord(null)} className="btn btn-ghost btn-sm text-lg" style={{ border: "none", background: "none", cursor: "pointer" }}>×</button>
            </div>
            <div className="modal-body text-xs flex flex-col gap-4">
              {detail.returnReceipts.map((rc, idx) => (
                <div key={rc.id || idx} style={{ border: "1px solid var(--color-bone)", borderRadius: 10, padding: 12, background: "var(--color-cream)" }}>
                  <div className="flex justify-between items-center mb-2">
                    <strong style={{ color: "var(--color-forest)" }}>{rc.id} (Đợt {rc.returnRound})</strong>
                    <span>Thời gian: {rc.returnedAt}</span>
                  </div>
                  <div>Nhân viên tiếp nhận: <strong>{rc.staffName}</strong> · Lần trả cuối: {rc.isFinalReturn ? "Có" : "Không"}</div>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {rc.items.map((item, itemIdx) => (
                      <div key={itemIdx} style={{ padding: "6px 10px", background: "white", borderRadius: 6, border: "1px solid var(--color-bone)" }}>
                        Thiết bị: <strong>{item.equipmentId}</strong> · Tình trạng nhận lại: <strong style={{ color: item.condition === "Bình thường" ? "#15803D" : "#DC2626" }}>{item.condition}</strong>
                        {item.surchargeAmount > 0 && <span style={{ color: "#DC2626", marginLeft: 8 }}>(Phụ phí: +{fmt(item.surchargeAmount)})</span>}
                        {item.note && <div style={{ color: "#6B7280", marginTop: 2 }}>Ghi chú: {item.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Bảng Đối Soát Cọc & Hoàn Tất Đơn (UC5.4) */}
      {viewingRecord === "reconciliation" && detail && (
        <div role="dialog" aria-modal="true" className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 }}>
          <div className="modal-container" style={{ background: "white", borderRadius: 16, maxWidth: 520, width: "100%", padding: 24 }}>
            <div className="modal-header flex justify-between items-center mb-4 pb-2 border-b border-bone">
              <div>
                <span style={{ fontSize: "0.72rem", color: "#7E22CE", fontWeight: 700, textTransform: "uppercase" }}>Biên bản quyết toán (UC5.4)</span>
                <h3 className="modal-title font-bold text-base" style={{ margin: "2px 0 0" }}>Bảng đối soát cọc & Hoàn tất đơn</h3>
              </div>
              <button onClick={() => setViewingRecord(null)} className="btn btn-ghost btn-sm text-lg" style={{ border: "none", background: "none", cursor: "pointer" }}>×</button>
            </div>

            <div className="modal-body text-xs flex flex-col gap-3">
              <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14 }}>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Tiền cọc thực thu ban đầu:</span>
                  <strong className="font-mono text-sm">{fmt(detail.reconciliation?.depositCollected ?? detail.depositTotal)}</strong>
                </div>
                <div className="flex justify-between py-1 text-red-600">
                  <span>Tổng phụ phí bồi thường / quá hạn đã duyệt:</span>
                  <strong className="font-mono">−{fmt(detail.reconciliation?.totalApprovedSurcharges ?? 0)}</strong>
                </div>
                <div style={{ borderTop: "1px dashed var(--color-bone)", marginTop: 8, paddingTop: 8 }} className="flex justify-between font-bold text-sm text-forest">
                  <span>Số tiền cọc thực hoàn lại cho khách (UC5.6):</span>
                  <span className="font-mono text-base">{fmt(detail.reconciliation?.netDifference ?? detail.depositTotal)}</span>
                </div>
              </div>

              <div style={{ padding: 12, background: "#F0FDF4", borderRadius: 8, border: "1px solid #BBF7D0", color: "#166534" }}>
                <div>✓ <strong>Quyết toán:</strong> Hoàn cọc 100% qua tài khoản ngân hàng của quý khách.</div>
                <div style={{ marginTop: 4, fontSize: "0.72rem", color: "#4B5563" }}>
                  Người xác nhận: <strong>{detail.reconciliation?.confirmedBy || "NV Mai"}</strong> · Đã khóa biên bản hoàn tất đơn.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy Đơn Thuê & Dự Toán Hoàn Tiền (UC3.4) */}
      {cancelling && cancellationQuote && cancellingOrder && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 }}>
          <div className="modal-container max-w-md" style={{ background: "white", borderRadius: 18, maxWidth: 480, width: "100%", padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div className="modal-header flex justify-between items-center mb-3">
              <h2 className="modal-title font-bold text-base text-bark" style={{ margin: 0 }}>
                Xác nhận hủy đơn thuê? (UC3.4)
              </h2>
              <button onClick={() => setCancelling(null)} className="btn btn-ghost btn-sm" style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
            </div>

            <div className="modal-body text-xs">
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: 12, marginBottom: 14, color: "#1E40AF" }}>
                <strong>📌 Chính sách hủy đơn tiêu chuẩn (BR22):</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 16, lineHeight: 1.5 }}>
                  <li>Trước &gt;48h: Miễn phí 100% · Hoàn toàn bộ tiền thuê + cọc.</li>
                  <li>24h – 48h: Giữ 30% tiền thuê · Hoàn 70% tiền thuê + 100% cọc.</li>
                  <li>Dưới &lt;24h: Giữ 100% tiền thuê · Hoàn 100% tiền cọc bảo đảm.</li>
                  <li>Chưa thanh toán: Hủy miễn phí ngay lập tức.</li>
                </ul>
              </div>

              {/* Bảng kê chi tiết các khoản hoàn trả minh bạch (UC3.4 bước 3) */}
              <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: 8, fontSize: "0.82rem" }}>
                  Bảng dự tính hoàn tiền & phí giữ lại:
                </div>
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Tiền thuê ban đầu:</span>
                  <span className="font-mono">{fmt(cancellingOrder.rental - cancellingOrder.discount)}</span>
                </div>
                <div className="flex justify-between py-1 text-red-600">
                  <span>Phí hủy giữ lại (theo quy chế):</span>
                  <strong className="font-mono">−{fmt(cancellationQuote.fee)}</strong>
                </div>
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Tiền thuê được hoàn:</span>
                  <span className="font-mono">{fmt(Math.max(0, cancellingOrder.rental - cancellingOrder.discount - cancellationQuote.fee))}</span>
                </div>
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Tiền cọc hoàn trả 100%:</span>
                  <span className="font-mono">{fmt(cancellingOrder.depositTotal)}</span>
                </div>
                <div style={{ borderTop: "1px dashed var(--color-bone)", marginTop: 8, paddingTop: 8 }} className="flex justify-between font-bold text-sm text-forest">
                  <span>Tổng tiền thực tế hoàn trả cho bạn:</span>
                  <span className="font-mono text-base">{fmt(cancellationQuote.refund)}</span>
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label" style={{ fontWeight: 700, marginBottom: 4, display: "block" }}>Lý do hủy đơn *</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Vui lòng nhập lý do hủy đơn của bạn..."
                  rows={2}
                  className="form-textarea"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
                />
              </div>
            </div>

            <div className="modal-footer flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setCancelling(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: "8px 16px", borderRadius: 8 }}
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim()}
                onClick={() => {
                  app.cancelOrder(cancelling, cancelReason);
                  setCancelling(null);
                }}
                className="btn btn-danger btn-sm"
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  fontWeight: 700,
                  background: !cancelReason.trim() ? "#D1D5DB" : "#DC2626",
                  color: "white",
                  border: "none",
                  cursor: !cancelReason.trim() ? "not-allowed" : "pointer",
                }}
              >
                Xác nhận hủy đơn thuê
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Advisor (Tư vấn bộ đồ thông minh & Combo mẫu - UC2.4, UC2.4.1, UC2.4.2) ───
interface SuggestedItem {
  productId: string;
  name: string;
  category: string;
  image?: string;
  qty: number;
  reason: string;
  pricePerDay: number;
  deposit: number;
}

function AIAdvisorView() {
  const app = useApp();
  const [advisorMode, setAdvisorMode] = useState<"ai" | "presets">("ai");
  const [sent, setSent] = useState(false);
  const [destination, setDestination] = useState("Đà Lạt (Thời tiết lạnh, nhiều sương mù)");
  const [tripTerrain, setTripTerrain] = useState<"lake" | "mountain" | "glamping">("lake");
  const [people, setPeople] = useState("4");
  const [nights, setNights] = useState("2");
  const [budget, setBudget] = useState("1500000");

  // State điều khiển phân tích AI
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  // State danh sách các món trong combo hiện tại (người dùng có thể chỉnh sửa số lượng / xóa bớt món theo UC2.4 bước 5)
  const [customItems, setCustomItems] = useState<SuggestedItem[]>([]);
  const [addedAllNotice, setAddedAllNotice] = useState(false);

  // State modal yêu cầu đăng nhập đối với Khách vãng lai (UC2.4.2)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddMoreModal, setShowAddMoreModal] = useState(false);

  const numPeople = Math.max(1, parseInt(people) || 2);
  const numNights = Math.max(1, parseInt(nights) || 1);
  const targetBudget = Math.max(100000, parseInt(budget) || 1000000);

  // Helper tìm sản phẩm trong kho GearGo
  const getProduct = (categoryName: string, capacityMatch?: string) => {
    return (
      app.products.find(
        (p) =>
          p.category === categoryName &&
          p.status === "active" &&
          (capacityMatch ? p.capacity.includes(capacityMatch) : true)
      ) || app.products.find((p) => p.category === categoryName && p.status === "active")
    );
  };

  // 1. Tạo danh sách combo gợi ý từ AI thông minh
  const generateAISuggestion = (): SuggestedItem[] => {
    const tentProd =
      numPeople <= 2
        ? getProduct("Lều trại", "2") || getProduct("Lều trại")
        : getProduct("Lều trại", "4") || getProduct("Lều trại");
    const sleepProd = getProduct("Ngủ");
    const lightProd = getProduct("Đèn");
    const cookProd = getProduct("Nấu ăn");
    const tableProd = getProduct("Bàn ghế");

    const list: SuggestedItem[] = [];

    if (tentProd) {
      list.push({
        productId: tentProd.id,
        name: tentProd.name,
        category: tentProd.category,
        image: tentProd.image,
        qty: Math.max(1, Math.ceil(numPeople / (tentProd.capacity.includes("2") ? 2 : 4))),
        reason: `Lều vòm chống mưa PU 3000mm, sức chứa phù hợp đoàn ${numPeople} người tại ${destination.split(" ")[0]}.`,
        pricePerDay: tentProd.pricePerDay,
        deposit: tentProd.deposit,
      });
    }

    if (sleepProd) {
      list.push({
        productId: sleepProd.id,
        name: sleepProd.name,
        category: sleepProd.category,
        image: sleepProd.image,
        qty: numPeople,
        reason: `Túi ngủ / đệm cá nhân giữ ấm thân nhiệt ban đêm (${numPeople} người).`,
        pricePerDay: sleepProd.pricePerDay,
        deposit: sleepProd.deposit,
      });
    }

    if (lightProd) {
      list.push({
        productId: lightProd.id,
        name: lightProd.name,
        category: lightProd.category,
        image: lightProd.image,
        qty: Math.max(1, Math.ceil(numPeople / 2)),
        reason: `Đèn bão chiếu sáng sinh hoạt khu trại và đi lại ban đêm an toàn.`,
        pricePerDay: lightProd.pricePerDay,
        deposit: lightProd.deposit,
      });
    }

    if (cookProd) {
      list.push({
        productId: cookProd.id,
        name: cookProd.name,
        category: cookProd.category,
        image: cookProd.image,
        qty: 1,
        reason: `Bếp và bộ nồi nấu ăn dã ngoại đun nước, pha cà phê ngắm bình minh.`,
        pricePerDay: cookProd.pricePerDay,
        deposit: cookProd.deposit,
      });
    }

    if (tableProd && (tripTerrain === "lake" || tripTerrain === "glamping")) {
      list.push({
        productId: tableProd.id,
        name: tableProd.name,
        category: tableProd.category,
        image: tableProd.image,
        qty: 1,
        reason: `Bàn ghế gấp gọn thư giãn ngắm cảnh bên bờ hồ / bãi trại.`,
        pricePerDay: tableProd.pricePerDay,
        deposit: tableProd.deposit,
      });
    }

    return list;
  };

  // 2. Danh mục các bộ Combo mẫu có sẵn (Preset Combos - Fallback UC2.4.1)
  const presetCombos = [
    {
      id: "preset-tri-an",
      name: "Combo Hồ Trị An Thảnh Thơi (Chill Ven Hồ)",
      tag: "Phổ biến nhất",
      suitableFor: "2 - 4 người · 2 ngày 1 đêm",
      description: "Trọn bộ thư giãn bên bờ hồ lộng gió: lều vòm thoáng mát, bàn ghế dã ngoại xếp gọn, bếp nướng và đèn bão cổ điển.",
      items: [
        { cat: "Lều trại", qty: 1, reason: "Lều vòm 4 người chống ẩm sương đêm" },
        { cat: "Bàn ghế", qty: 1, reason: "Bộ bàn ghế xếp ngắm hoàng hôn ven hồ" },
        { cat: "Đèn", qty: 2, reason: "Đèn bão ánh sáng vàng ấm áp" },
        { cat: "Nấu ăn", qty: 1, reason: "Bếp nướng BBQ dã ngoại" },
      ],
    },
    {
      id: "preset-ta-nang",
      name: "Combo Trekking Tà Năng - Phan Dũng",
      tag: "Chuyên dụng leo núi",
      suitableFor: "2 - 4 người · Băng rừng siêu nhẹ",
      description: "Thiết kế tối ưu trọng lượng hành lý: lều nhôm chịu gió giật, túi ngủ nhiệt, đèn pin chống nước và bộ nồi siêu nhẹ.",
      items: [
        { cat: "Lều trại", qty: 1, reason: "Lều siêu nhẹ khung nhôm chịu gió giật" },
        { cat: "Ngủ", qty: 2, reason: "Túi ngủ giữ nhiệt chống rét ban đêm" },
        { cat: "Đèn", qty: 2, reason: "Đèn đeo trán cơ động xuyên rừng" },
        { cat: "Nấu ăn", qty: 1, reason: "Bộ nồi nhôm anode siêu nhẹ" },
      ],
    },
    {
      id: "preset-family-glamping",
      name: "Combo Family Glamping Sang Trọng",
      tag: "Gia đình tiện nghi",
      suitableFor: "4 - 6 người · Nghỉ dưỡng cuối tuần",
      description: "Tiện nghi tối đa như ở nhà: không gian rộng rãi, đệm êm ái, đầy đủ dụng cụ nấu nướng và dây đèn trang trí lung linh.",
      items: [
        { cat: "Lều trại", qty: 1, reason: "Lều không gian lớn thông thoáng cho cả nhà" },
        { cat: "Ngủ", qty: 4, reason: "Đệm hơi êm ái cho giấc ngủ thoải mái" },
        { cat: "Bàn ghế", qty: 1, reason: "Bàn nhôm rộng kèm ghế tựa lưng thoải mái" },
        { cat: "Nấu ăn", qty: 1, reason: "Trọn bộ dụng cụ nấu nướng gia đình" },
        { cat: "Đèn", qty: 2, reason: "Dây đèn LED & đèn treo trần lều ấm cúng" },
      ],
    },
  ];

  // Kích hoạt phân tích AI với hiệu ứng sinh động (UC2.4 & UC2.4.1)
  const handleStartAIAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisStep(0);

    const timer1 = setTimeout(() => setAnalysisStep(1), 400);
    const timer2 = setTimeout(() => setAnalysisStep(2), 850);
    const timer3 = setTimeout(() => {
      const generated = generateAISuggestion();
      setCustomItems(generated);
      setIsAnalyzing(false);
      setSent(true);
    }, 1300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  // Chọn bộ combo mẫu có sẵn (UC2.4.1)
  const handleSelectPreset = (preset: (typeof presetCombos)[0]) => {
    const list: SuggestedItem[] = [];
    preset.items.forEach((item) => {
      const p = getProduct(item.cat);
      if (p) {
        list.push({
          productId: p.id,
          name: p.name,
          category: p.category,
          image: p.image,
          qty: item.qty,
          reason: item.reason,
          pricePerDay: p.pricePerDay,
          deposit: p.deposit,
        });
      }
    });

    setCustomItems(list);
    setSent(true);
  };

  // Tăng giảm số lượng sản phẩm trong bộ gợi ý (UC2.4 bước 5)
  const handleUpdateQty = (productId: string, delta: number) => {
    setCustomItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const newQty = Math.max(1, item.qty + delta);
          return { ...item, qty: newQty };
        }
        return item;
      })
    );
  };

  // Xóa bỏ một món không cần thiết khỏi bộ gợi ý (UC2.4 bước 5)
  const handleRemoveItem = (productId: string) => {
    setCustomItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Thêm một thiết bị bất kỳ từ kho vào bộ gợi ý
  const handleAddExtraProduct = (prodId: string) => {
    const p = app.products.find((prod) => prod.id === prodId);
    if (!p) return;
    const existing = customItems.find((item) => item.productId === prodId);
    if (existing) {
      handleUpdateQty(prodId, 1);
    } else {
      setCustomItems((prev) => [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          category: p.category,
          image: p.image,
          qty: 1,
          reason: "Thiết bị bổ sung thêm theo nhu cầu riêng của quý khách.",
          pricePerDay: p.pricePerDay,
          deposit: p.deposit,
        },
      ]);
    }
    setShowAddMoreModal(false);
  };

  // Tính toán tài chính thời gian thực theo số lượng đã chỉnh sửa
  const totalRental = customItems.reduce((sum, item) => sum + item.pricePerDay * item.qty * numNights, 0);
  const totalDeposit = customItems.reduce((sum, item) => sum + item.deposit * item.qty, 0);
  const totalInitial = totalRental + totalDeposit;

  // Xử lý đưa vào giỏ thuê (UC2.4.2 - Bắt buộc kiểm tra đăng nhập đối với Khách vãng lai)
  const handleAddAllToCart = () => {
    if (!app.currentUser) {
      // Khách vãng lai chưa đăng nhập -> mở modal yêu cầu đăng nhập theo UC2.4.2
      setShowAuthModal(true);
      return;
    }

    if (customItems.length === 0) return;

    // Đưa từng món với số lượng đã chỉnh sửa vào giỏ thuê
    customItems.forEach((item) => {
      app.addToCart(item.productId, item.qty);
    });

    setAddedAllNotice(true);
    setTimeout(() => setAddedAllNotice(false), 3500);
  };

  return (
    <div className="customer-container" style={{ maxWidth: 980, margin: "0 auto", padding: "28px 20px" }}>
      {/* Hero Header */}
      <div className="advisor-hero" style={{ background: "linear-gradient(135deg, #1B3F2F 0%, #2D5A43 100%)", color: "white", padding: "32px 28px", borderRadius: 20, marginBottom: 28, boxShadow: "0 10px 25px rgba(27,63,47,0.18)" }}>
        <div className="flex items-center gap-3 mb-2">
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center" }}>
            <Icon name="tent" size={26} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#A7F3D0", fontWeight: 700 }}>
              GearGo Smart Gear Planner · UC2.4 & UC2.4.1
            </div>
            <h1 className="font-display font-bold text-2xl md:text-3xl" style={{ margin: 0, color: "white" }}>
              Trợ lý AI tư vấn bộ đồ cắm trại & Combo mẫu
            </h1>
          </div>
        </div>
        <p style={{ margin: "8px 0 0", color: "#E2E8F0", fontSize: "0.92rem", lineHeight: 1.6, maxWidth: 680 }}>
          Đề xuất danh mục thiết bị tối ưu theo điểm đến, quy mô đoàn và ngân sách dự kiến của bạn. Bạn hoàn toàn có thể tùy chỉnh thêm bớt từng món trước khi đưa vào giỏ thuê.
        </p>

        {/* Tab chuyển đổi chế độ tư vấn (AI vs Presets - UC2.4.1) */}
        <div className="flex gap-2 mt-5" style={{ background: "rgba(0,0,0,0.22)", padding: 4, borderRadius: 12, width: "fit-content" }}>
          <button
            type="button"
            onClick={() => { setAdvisorMode("ai"); setSent(false); }}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: advisorMode === "ai" ? "white" : "transparent",
              color: advisorMode === "ai" ? "var(--color-forest)" : "#D1D5DB",
            }}
          >
            🤖 AI tư vấn thông minh
          </button>
          <button
            type="button"
            onClick={() => { setAdvisorMode("presets"); setSent(false); }}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: advisorMode === "presets" ? "white" : "transparent",
              color: advisorMode === "presets" ? "var(--color-forest)" : "#D1D5DB",
            }}
          >
            📦 Bộ combo mẫu có sẵn (UC2.4.1)
          </button>
        </div>
      </div>

      {/* ─── CHẾ ĐỘ 1: AI TƯ VẤN THÔNG MINH ─── */}
      {advisorMode === "ai" && !sent && (
        <div className="card-panel" style={{ background: "white", padding: 28, borderRadius: 18, border: "1px solid var(--color-bone)", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
            <div>
              <h3 className="font-display font-bold text-lg text-bark" style={{ margin: 0 }}>
                Nhập thông tin chuyến đi của bạn
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#6B7280" }}>
                AI sẽ căn cứ vào địa hình, số lượng người và số ngày để lọc thiết bị tối ưu.
              </p>
            </div>
            <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 99, background: "#ECFDF5", color: "#065F46", fontWeight: 700 }}>
              Kho đồ thật 100%
            </span>
          </div>

          {/* Chọn phong cách / Địa hình chuyến đi */}
          <div style={{ marginBottom: 20 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 8, display: "block" }}>
              Phong cách cắm trại & địa hình:
            </label>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {[
                { id: "lake" as const, title: "🌊 Ven hồ / Bãi sông chill", desc: "Thư giãn, thoáng mát, cần bàn ghế và đèn bão ngắm hoàng hôn." },
                { id: "mountain" as const, title: "⛰️ Rừng núi / Trekking leo đồi", desc: "Gọn nhẹ, chống gió lạnh, cần túi ngủ ấm và đèn đeo trán." },
                { id: "glamping" as const, title: "🏕️ Khu sinh thái / Family Glamping", desc: "Đầy đủ tiện nghi, đệm êm, bếp BBQ gia đình thoải mái." },
              ].map((t) => (
                <div
                  key={t.id}
                  onClick={() => setTripTerrain(t.id)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: tripTerrain === t.id ? "2px solid var(--color-forest)" : "1px solid var(--color-bone)",
                    background: tripTerrain === t.id ? "#F0FDF4" : "var(--color-parchment)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--color-bark)", marginBottom: 4 }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "#6B7280", lineHeight: 1.4 }}>
                    {t.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.82rem" }}>Điểm đến dự kiến</label>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="VD: Đà Lạt, Hồ Trị An, Mộc Châu, Ba Vì..."
                className="form-input"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-bone)" }}
              />
              <div className="flex gap-1 mt-2 flex-wrap">
                {["Đà Lạt", "Hồ Trị An", "Núi Bà Đen", "Mộc Châu", "Tà Năng"].map((place) => (
                  <button
                    key={place}
                    type="button"
                    onClick={() => setDestination(place)}
                    style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 6, background: "var(--color-parchment)", border: "1px solid var(--color-bone)", cursor: "pointer", color: "#4B5563" }}
                  >
                    {place}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.82rem" }}>Số lượng thành viên</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={people}
                  onChange={(e) => setPeople(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-bone)" }}
                />
                <span style={{ fontSize: "0.82rem", color: "#6B7280", whiteSpace: "nowrap" }}>người</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.82rem" }}>Thời gian thuê (Tính theo block 24h)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={nights}
                  onChange={(e) => setNights(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-bone)" }}
                />
                <span style={{ fontSize: "0.82rem", color: "#6B7280", whiteSpace: "nowrap" }}>ngày (24h/ngày)</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.82rem" }}>Ngân sách dự kiến (đ)</label>
              <input
                type="number"
                step="50000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="form-input"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-bone)" }}
              />
              <span style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: 4, display: "block" }}>
                Tương đương: {parseInt(budget || "0").toLocaleString("vi-VN")} đ
              </span>
            </div>
          </div>

          {/* Nút kích hoạt AI với trạng thái Loading */}
          <div style={{ marginTop: 24, textAlign: "right" }}>
            {isAnalyzing ? (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", padding: "16px 20px", borderRadius: 12, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 24, height: 24, border: "3px solid #16A34A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#166534" }}>
                    {analysisStep === 0 && "🤖 Đang khởi tạo mô hình tư vấn AI..."}
                    {analysisStep === 1 && `🌤️ Phân tích thời tiết & địa hình tại ${destination}...`}
                    {analysisStep === 2 && "🎒 Chọn lọc danh mục thiết bị phù hợp trong kho GearGo..."}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#4B5563" }}>
                    Tự động tối ưu chi phí và sức chứa theo đoàn {numPeople} người.
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartAIAnalysis}
                className="btn btn-primary"
                style={{ padding: "14px 28px", fontSize: "0.95rem", fontWeight: 700, borderRadius: 10 }}
              >
                🤖 Phân tích & Tạo gợi ý combo tối ưu →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── CHẾ ĐỘ 2: BỘ COMBO MẪU CÓ SẴN (PRESET COMBOS - FALLBACK UC2.4.1) ─── */}
      {advisorMode === "presets" && !sent && (
        <div className="card-panel" style={{ background: "white", padding: 28, borderRadius: 18, border: "1px solid var(--color-bone)" }}>
          <div className="mb-5 pb-3 border-b border-gray-100">
            <h3 className="font-display font-bold text-lg text-bark" style={{ margin: 0 }}>
              Bộ combo mẫu tuyển chọn sẵn (Preset Combos)
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "#6B7280" }}>
              Giải pháp đóng gói sẵn theo các kịch bản dã ngoại thực tế, không cần chờ AI suy nghĩ. Quý khách có thể chọn và chỉnh sửa số lượng tùy ý.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {presetCombos.map((preset) => (
              <div
                key={preset.id}
                style={{
                  border: "1px solid var(--color-bone)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  background: "var(--color-parchment)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 6, background: "var(--color-forest)", color: "white", fontWeight: 700 }}>
                        {preset.tag}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#6B7280", fontWeight: 600 }}>
                        {preset.suitableFor}
                      </span>
                    </div>
                    <h4 style={{ margin: "6px 0 0", fontSize: "1.1rem", color: "var(--color-bark)", fontWeight: 700 }}>
                      {preset.name}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="btn btn-primary btn-sm"
                    style={{ padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem" }}
                  >
                    Chọn bộ này & Chỉnh sửa →
                  </button>
                </div>

                <p style={{ margin: 0, fontSize: "0.84rem", color: "#4B5563", lineHeight: 1.5 }}>
                  {preset.description}
                </p>

                <div className="flex gap-2 flex-wrap">
                  {preset.items.map((it, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: "0.75rem",
                        padding: "3px 10px",
                        borderRadius: 6,
                        background: "white",
                        border: "1px solid var(--color-bone)",
                        color: "var(--color-bark)",
                      }}
                    >
                      ✓ {it.cat}: <strong>{it.qty} chiếc</strong> ({it.reason})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── KẾT QUẢ ĐỀ XUẤT (CÓ THỂ CHỈNH SỬA TRỰC TIẾP - UC2.4 BƯỚC 5) ─── */}
      {sent && (
        <div className="card-panel" style={{ background: "white", padding: 28, borderRadius: 18, border: "1px solid var(--color-bone)", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}>
          {/* Header kết quả */}
          <div className="card-panel-muted" style={{ padding: "16px 20px", borderRadius: 12, marginBottom: 20, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div style={{ fontSize: "0.88rem", color: "#166534" }}>
                <strong>
                  {advisorMode === "ai" ? "🤖 Gợi ý từ trợ lý AI GearGo" : "📦 Combo mẫu đã chọn"}
                </strong>
                : Chuyến đi <strong>{destination}</strong> ({people} người, {numNights} ngày thuê).
              </div>
              <span style={{ fontSize: "0.75rem", padding: "3px 10px", borderRadius: 99, background: "#DCFCE7", color: "#15803D", fontWeight: 700 }}>
                ✓ Đã đối chiếu kho đồ sẵn có
              </span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "#166534", marginTop: 4 }}>
              💡 <em>Quý khách có thể tăng/giảm số lượng hoặc xóa món không cần thiết ở danh sách bên dưới.</em>
            </div>
          </div>

          {/* Danh sách các món trong combo (Interactive Stepper & Remove - UC2.4 bước 5) */}
          <div className="flex flex-col gap-3 mb-5">
            {customItems.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", background: "var(--color-parchment)", borderRadius: 12, color: "#6B7280" }}>
                <p style={{ margin: "0 0 12px", fontSize: "0.9rem" }}>Quý khách đã xóa hết thiết bị khỏi bộ gợi ý.</p>
                <button
                  type="button"
                  onClick={() => setCustomItems(generateAISuggestion())}
                  className="btn btn-secondary btn-sm"
                >
                  ↺ Khôi phục combo gợi ý ban đầu
                </button>
              </div>
            ) : (
              customItems.map((item) => {
                const itemRental = item.pricePerDay * item.qty * numNights;
                const itemDeposit = item.deposit * item.qty;

                return (
                  <div
                    key={item.productId}
                    className="cart-item-card"
                    style={{
                      background: "white",
                      border: "1px solid var(--color-bone)",
                      borderRadius: 12,
                      padding: "14px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Thông tin món & Lý do chọn */}
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: "0.7rem", padding: "1px 7px", borderRadius: 4, background: "var(--color-parchment)", color: "var(--color-moss)", fontWeight: 700 }}>
                          {item.category}
                        </span>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-bark)" }}>
                          {item.name}
                        </div>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#4B5563", margin: "4px 0" }}>
                        ✨ {item.reason}
                      </div>
                      <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#6B7280" }}>
                        Đơn giá: {fmt(item.pricePerDay)}/ngày · Cọc: {fmt(item.deposit)}/chiếc
                      </div>
                    </div>

                    {/* Bộ chỉnh số lượng (+ / −) & Thành tiền */}
                    <div className="flex items-center gap-5">
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-forest)", fontFamily: "var(--font-mono)" }}>
                          Thuê: {fmt(itemRental)}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#9CA3AF", fontFamily: "var(--font-mono)" }}>
                          Cọc: {fmt(itemDeposit)}
                        </div>
                      </div>

                      {/* Stepper (+ / −) */}
                      <div className="flex items-center gap-1" style={{ background: "var(--color-parchment)", padding: "2px 6px", borderRadius: 8, border: "1px solid var(--color-bone)" }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.productId, -1)}
                          disabled={item.qty <= 1}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            border: "none",
                            background: "white",
                            cursor: item.qty <= 1 ? "not-allowed" : "pointer",
                            fontWeight: 700,
                            color: item.qty <= 1 ? "#D1D5DB" : "var(--color-bark)",
                          }}
                        >
                          −
                        </button>
                        <span style={{ width: 28, textAlign: "center", fontWeight: 700, fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.productId, 1)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            border: "none",
                            background: "white",
                            cursor: "pointer",
                            fontWeight: 700,
                            color: "var(--color-bark)",
                          }}
                        >
                          +
                        </button>
                      </div>

                      {/* Nút xóa khỏi combo */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.productId)}
                        title="Xóa món này khỏi combo"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#EF4444",
                          padding: "6px",
                          borderRadius: 6,
                          fontSize: "0.85rem",
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Nút bổ sung thêm thiết bị ngoài vào combo */}
          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => setShowAddMoreModal(!showAddMoreModal)}
              style={{
                background: "none",
                border: "1px dashed var(--color-forest)",
                color: "var(--color-forest)",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              ➕ Thêm thiết bị khác từ kho GearGo vào combo này
            </button>

            {/* Menu phụ thêm đồ */}
            {showAddMoreModal && (
              <div style={{ marginTop: 10, padding: 14, background: "var(--color-parchment)", borderRadius: 10, border: "1px solid var(--color-bone)" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 8 }}>
                  Chọn thiết bị sẵn có trong kho:
                </div>
                <div className="flex gap-2 flex-wrap">
                  {app.products
                    .filter((p) => !customItems.some((ci) => ci.productId === p.id) && p.status === "active")
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddExtraProduct(p.id)}
                        style={{
                          fontSize: "0.78rem",
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "white",
                          border: "1px solid var(--color-bone)",
                          cursor: "pointer",
                        }}
                      >
                        + {p.name} ({fmt(p.pricePerDay)}/ngày)
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Cảnh báo ngân sách (nếu vượt) hoặc thông báo tiết kiệm */}
          {totalRental > targetBudget ? (
            <div className="policy-banner mb-4" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", padding: "12px 16px", borderRadius: 10, fontSize: "0.82rem", color: "#92400E" }}>
              ⚠ Tổng tiền thuê dự kiến vượt ngân sách khoảng <strong>{fmt(totalRental - targetBudget)}</strong>. Bạn có thể bấm nút giảm số lượng hoặc xóa bớt thiết bị phụ.
            </div>
          ) : (
            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", color: "#065F46", marginBottom: 16 }}>
              ✓ Chi phí thuê nằm trọn vẹn trong ngân sách dự kiến (Tiết kiệm được {fmt(targetBudget - totalRental)}).
            </div>
          )}

          {/* Bảng tổng hợp chi phí dự kiến */}
          <div className="card-panel-muted" style={{ padding: "18px 20px", borderRadius: 12, background: "var(--color-parchment)", border: "1px solid var(--color-bone)", marginBottom: 20 }}>
            <div className="flex justify-between items-center font-bold text-sm mb-2">
              <span style={{ color: "var(--color-bark)" }}>Tổng tiền thuê dự kiến ({numNights} ngày · {customItems.reduce((s, i) => s + i.qty, 0)} món)</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)", fontSize: "1.1rem" }}>{fmt(totalRental)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
              <span>Tiền cọc bảo đảm (Hoàn lại 100% khi trả đồ)</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{fmt(totalDeposit)}</span>
            </div>
            <div style={{ borderTop: "1px dashed var(--color-bone)", paddingTop: 8, marginTop: 8 }} className="flex justify-between items-center font-bold text-sm">
              <span style={{ color: "var(--color-bark)" }}>Tổng chi phí ban đầu cần chuẩn bị</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-amber)", fontSize: "1.15rem" }}>{fmt(totalInitial)}</span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#6B7280", marginTop: 8, lineHeight: 1.4 }}>
              📌 <em>Lưu ý: Báo giá tham khảo; tồn kho thực tế sẽ được xác nhận và giữ chỗ chính xác khi chuyển vào Giỏ thuê và chọn khung giờ nhận/trả.</em>
            </div>
          </div>

          {/* Banner thông báo thêm thành công */}
          {addedAllNotice && (
            <div className="badge badge-success p-3 rounded-lg text-center w-full mb-4" style={{ background: "#DCFCE7", color: "#166534", border: "1px solid #86EFAC", fontWeight: 700 }}>
              ✓ Đã thêm toàn bộ {customItems.length} thiết bị vào giỏ thuê thành công!
            </div>
          )}

          {/* Nhóm nút hành động */}
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleAddAllToCart}
              disabled={customItems.length === 0}
              className="btn btn-accent btn-md"
              style={{
                flex: 1,
                minWidth: 200,
                padding: "13px 20px",
                fontWeight: 700,
                borderRadius: 10,
                background: "var(--color-forest)",
                color: "white",
                border: "none",
                cursor: customItems.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              + Thêm toàn bộ vào giỏ thuê ({customItems.reduce((s, i) => s + i.qty, 0)} món)
            </button>
            <button
              type="button"
              onClick={() => app.setPage("cart")}
              className="btn btn-primary btn-md"
              style={{ padding: "13px 20px", fontWeight: 700, borderRadius: 10 }}
            >
              Xem giỏ thuê →
            </button>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="btn btn-secondary btn-md"
              style={{ padding: "13px 18px", borderRadius: 10 }}
            >
              ← Nhập lại nhu cầu
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL YÊU CẦU ĐĂNG NHẬP ĐỐI VỚI KHÁCH VÃNG LAI (UC2.4.2) ─── */}
      {showAuthModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.6)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 20,
              maxWidth: 460,
              width: "100%",
              padding: 28,
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: "1px solid var(--color-bone)",
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#EFF6FF", color: "#1D4ED8", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
              <Icon name="user" size={26} />
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--color-bark)", textAlign: "center", margin: "0 0 8px" }}>
              Yêu cầu đăng nhập tài khoản
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#4B5563", textAlign: "center", lineHeight: 1.5, margin: "0 0 20px" }}>
              Theo quy định <strong>UC2.4.2</strong>, khách vãng lai cần đăng nhập để lưu danh mục thiết bị gợi ý vào giỏ thuê cá nhân và đồng bộ lịch trình.
            </p>

            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, marginBottom: 20, fontSize: "0.78rem", color: "#6B7280" }}>
              💡 <em>Đăng nhập chỉ mất 10 giây. Toàn bộ {customItems.length} món bạn đã tùy chỉnh sẽ được lưu giữ nguyên vẹn.</em>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  app.setPage("auth");
                }}
                className="btn btn-primary"
                style={{ flex: 1, padding: "12px", borderRadius: 10, fontWeight: 700 }}
              >
                Đăng nhập / Đăng ký ngay →
              </button>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="btn btn-secondary"
                style={{ padding: "12px 16px", borderRadius: 10 }}
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hồ sơ cá nhân & Đổi mật khẩu & Đánh giá (ProfileView - UC1.5, UC1.6, UC1.12, UC9.1) ─
function ProfileView() {
  const app = useApp();
  const [section, setSection] = useState<"profile" | "security" | "reviews">(() => {
    const pref = sessionStorage.getItem("geargo_profile_section");
    if (pref === "reviews" || pref === "security" || pref === "profile") {
      sessionStorage.removeItem("geargo_profile_section");
      return pref as "profile" | "security" | "reviews";
    }
    return "profile";
  });

  const defaultProfile = {
    name: "Nguyễn Văn An",
    phone: "0901 234 567",
    email: "an.nguyen@example.com",
    address: "142 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
    birthDate: "1995-08-15",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
  };

  const [savedProfile, setSavedProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("geargo-demo-customer-profile");
      return saved ? (JSON.parse(saved) as typeof defaultProfile) : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

  const [profile, setProfile] = useState(savedProfile);
  const [saved, setSaved] = useState(false);

  // Đổi mật khẩu state (UC1.12)
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [reviewingTarget, setReviewingTarget] = useState<{
    orderId: string;
    productId: string;
    productName: string;
  } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewImage, setReviewImage] = useState("");
  const [reviewError, setReviewError] = useState("");
  const completedOrders = app.orders.filter((order) => order.status === "Hoàn tất");

  const saveProfile = () => {
    localStorage.setItem("geargo-demo-customer-profile", JSON.stringify(profile));
    setSavedProfile(profile);
    setSaved(true);
    app.addAuditLog({ actor: profile.name, role: "Khách hàng", action: "Cập nhật hồ sơ (UC1.6)", targetEntity: "CustomerProfile", targetId: profile.phone, detail: "Cập nhật thông tin liên hệ và hồ sơ cá nhân" });
  };

  const handleCancelProfileChanges = () => {
    setProfile(savedProfile);
    setSaved(false);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMsg("");

    if (!oldPassword) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Mật khẩu mới phải có tối thiểu 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu mới và xác nhận mật khẩu không khớp");
      return;
    }

    setPasswordMsg("✓ Đổi mật khẩu thành công! Vui lòng dùng mật khẩu mới cho các lần đăng nhập sau.");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    app.addAuditLog({ actor: profile.name, role: "Khách hàng", action: "Đổi mật khẩu (UC1.12)", targetEntity: "CustomerAccount", targetId: profile.email, detail: "Người dùng đổi mật khẩu bảo mật cá nhân" });
  };

  const handleSendReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingTarget) return;
    const res = app.addReview({
      orderId: reviewingTarget.orderId,
      productId: reviewingTarget.productId,
      rating,
      comment,
      images: reviewImage.trim() ? [reviewImage.trim()] : undefined,
    });
    if (res.ok) {
      setReviewingTarget(null);
      setComment("");
      setRating(5);
      setReviewImage("");
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
          <p className="text-sm text-gray-500">Quản lý hồ sơ, đổi mật khẩu và đánh giá sản phẩm sau chuyến đi</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSection("profile")}
            className={`btn btn-sm ${section === "profile" ? "btn-primary" : "btn-secondary"}`}
          >
            Hồ sơ cá nhân (UC1.6)
          </button>
          <button
            onClick={() => setSection("security")}
            className={`btn btn-sm ${section === "security" ? "btn-primary" : "btn-secondary"}`}
          >
            Đổi mật khẩu (UC1.12)
          </button>
          <button
            onClick={() => setSection("reviews")}
            className={`btn btn-sm ${section === "reviews" ? "btn-primary" : "btn-secondary"}`}
          >
            Đánh giá sản phẩm ({completedOrders.length})
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
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-display font-bold text-lg text-bark">Hồ sơ cá nhân & Thông tin liên hệ (UC1.6)</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                * Chuẩn thực thể KHACH_HANG & TAI_KHOAN: GearGo nhận và trả thiết bị trực tiếp tại cửa hàng (128 Nguyễn Đình Chiểu, Q.3).
              </p>
            </div>
            {profile.avatarUrl && (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--color-forest)" }}
              />
            )}
          </div>
          <div className="form-grid-2">
            {[
              { key: "name" as const, label: "Họ và tên", type: "text" },
              { key: "phone" as const, label: "Số điện thoại", type: "tel" },
              { key: "email" as const, label: "Email", type: "email" },
              { key: "birthDate" as const, label: "Ngày sinh (KHACH_HANG.ngay_sinh)", type: "date" },
              { key: "address" as const, label: "Địa chỉ thường trú / liên hệ", type: "text" },
              { key: "avatarUrl" as const, label: "Ảnh đại diện (URL)", type: "url" },
            ].map((field) => (
              <div key={field.key} className="form-group">
                <label className="form-label">{field.label}</label>
                <input
                  type={field.type}
                  value={profile[field.key] ?? ""}
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
            <button
              type="button"
              onClick={handleCancelProfileChanges}
              className="btn btn-secondary btn-md"
            >
              Hủy thay đổi
            </button>
            {saved && (
              <span className="badge badge-success">✓ Đã lưu hồ sơ thành công</span>
            )}
          </div>
        </form>
      ) : section === "security" ? (
        <form onSubmit={handleChangePassword} className="card-panel max-w-lg">
          <h2 className="font-display font-bold text-lg text-bark mb-2">Đổi mật khẩu tài khoản</h2>
          <p className="text-xs text-gray-500 mb-4">Mật khẩu mới cần dài tối thiểu 6 ký tự để bảo mật tài khoản thuê thiết bị.</p>

          <div className="form-group mb-3">
            <label className="form-label">Mật khẩu hiện tại *</label>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group mb-3">
            <label className="form-label">Mật khẩu mới *</label>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Xác nhận mật khẩu mới *</label>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
            />
          </div>

          {passwordError && (
            <div className="form-error-msg mb-3">{passwordError}</div>
          )}

          {passwordMsg && (
            <div className="badge badge-success p-2.5 rounded-lg mb-3 block text-center font-bold">
              {passwordMsg}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-md">
            Cập nhật mật khẩu mới
          </button>
        </form>
      ) : (
        <div className="card-panel">
          <h2 className="font-display font-bold text-lg text-bark mb-1">
            Đánh giá sản phẩm theo đơn đã hoàn tất
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Lưu ý: Mỗi sản phẩm trong một đơn hoàn tất chỉ được đánh giá một lần duy nhất.
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
                                <span className="text-amber font-bold text-sm">
                                  {"★".repeat(existing.rating)}{"☆".repeat(5 - existing.rating)}
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
                                  setRating(5);
                                  setComment("");
                                  setReviewImage("");
                                }}
                                className="btn btn-secondary btn-sm"
                              >
                                Viết đánh giá
                              </button>
                            )}
                          </div>

                          {existing && (
                            <div className="mt-2.5 flex flex-col gap-2">
                              <div className="bg-white p-2.5 rounded-lg border border-bone text-xs text-gray-700 italic">
                                "{existing.comment}"
                              </div>
                              {/* Hiển thị ảnh đính kèm thực tế UC9.1.2 */}
                              {existing.images && existing.images.length > 0 && (
                                <div className="flex gap-2 items-center flex-wrap">
                                  <span className="text-xs text-gray-500 font-medium">Ảnh thực tế:</span>
                                  {existing.images.map((img, idx) => (
                                    <img
                                      key={idx}
                                      src={img}
                                      alt="Ảnh dã ngoại thực tế"
                                      style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid #CBD5E1", cursor: "pointer" }}
                                      onClick={() => window.open(img, "_blank")}
                                      title="Xem ảnh gốc"
                                    />
                                  ))}
                                </div>
                              )}
                              {/* Phản hồi chính thức từ GearGo (UC9.2) */}
                              {(existing.storeResponse || existing.response) && (
                                <div style={{ background: "#F0FDF4", borderLeft: "3px solid #16A34A", borderRadius: "0 6px 6px 0", padding: "8px 12px" }}>
                                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#166534", display: "flex", justifyContent: "space-between" }}>
                                    <span>💬 Phản hồi từ GearGo ({existing.storeResponse?.respondedBy || "Cửa hàng"})</span>
                                    <span style={{ fontWeight: 400, color: "#64748B" }}>{existing.storeResponse?.respondedAt}</span>
                                  </div>
                                  <div style={{ fontSize: "0.78rem", color: "#14532D", marginTop: 4, lineHeight: 1.45 }}>
                                    {existing.storeResponse?.response || existing.response}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {isCurrentReviewing && (
                            <form onSubmit={handleSendReview} className="mt-3 bg-white p-4 rounded-lg border border-bone shadow-sm">
                              <div className="flex justify-between items-center mb-3 border-b border-bone pb-2">
                                <h4 className="font-bold text-sm text-bark">Đánh giá trải nghiệm: {reviewingTarget.productName}</h4>
                                <span className="badge badge-neutral text-xs">Mã đơn #{reviewingTarget.orderId}</span>
                              </div>

                              {/* Bộ chọn sao tương tác */}
                              <div className="mb-3">
                                <label className="form-label mb-1">Mức độ hài lòng của bạn</label>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => setRating(s)}
                                      style={{
                                        background: rating >= s ? "#FEF3C7" : "#F3F4F6",
                                        border: `1px solid ${rating >= s ? "#F59E0B" : "#E5E7EB"}`,
                                        color: rating >= s ? "#D97706" : "#9CA3AF",
                                        borderRadius: 8,
                                        padding: "6px 10px",
                                        cursor: "pointer",
                                        fontSize: "0.8rem",
                                        fontWeight: 700,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                        transition: "all 0.15s ease"
                                      }}
                                    >
                                      <span>★</span> {s} {s === 5 ? "Rất tốt" : s === 4 ? "Tốt" : s === 3 ? "Bình thường" : s === 2 ? "Chưa tốt" : "Tệ"}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="form-group mb-3">
                                <label className="form-label">Nhận xét chi tiết chuyến đi</label>
                                <textarea
                                  required
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  rows={3}
                                  placeholder="Chia sẻ trải nghiệm thực tế: độ bền, độ sạch sẽ, khả năng chống mưa nắng của thiết bị..."
                                  className="form-textarea"
                                />
                              </div>

                              {/* Đính kèm ảnh dã ngoại (UC9.1.2) */}
                              <div className="mb-3">
                                <label className="form-label mb-1">Ảnh thực tế từ chuyến dã ngoại (UC9.1.2)</label>
                                <div className="flex gap-2 mb-2">
                                  <input
                                    type="url"
                                    placeholder="Dán URL ảnh dã ngoại (https://...)"
                                    value={reviewImage}
                                    onChange={(e) => setReviewImage(e.target.value)}
                                    className="form-input flex-1"
                                    style={{ fontSize: "0.82rem" }}
                                  />
                                  {reviewImage && (
                                    <button
                                      type="button"
                                      onClick={() => setReviewImage("")}
                                      className="btn btn-secondary btn-sm"
                                    >
                                      Xóa ảnh
                                    </button>
                                  )}
                                </div>

                                {/* Gợi ý chọn nhanh ảnh mẫu */}
                                <div className="text-xs text-gray-500 mb-1.5">Gợi ý chọn nhanh ảnh dã ngoại mẫu:</div>
                                <div className="flex gap-2 flex-wrap">
                                  {[
                                    { label: "🏕️ Cắm trại bờ hồ", url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&auto=format&fit=crop" },
                                    { label: "🌄 Lều hoàng hôn", url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=600&auto=format&fit=crop" },
                                    { label: "☕ Bếp dã ngoại", url: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=600&auto=format&fit=crop" },
                                  ].map((sample, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setReviewImage(sample.url)}
                                      className="btn btn-ghost btn-sm"
                                      style={{ fontSize: "0.72rem", border: "1px dashed #CBD5E1", padding: "3px 8px" }}
                                    >
                                      {sample.label}
                                    </button>
                                  ))}
                                </div>

                                {reviewImage && (
                                  <div className="mt-2 p-1 bg-parchment rounded-lg border border-bone inline-block">
                                    <img
                                      src={reviewImage}
                                      alt="Xem trước ảnh đánh giá"
                                      style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6 }}
                                    />
                                  </div>
                                )}
                              </div>

                              {reviewError && (
                                <div className="form-error-msg mb-2">{reviewError}</div>
                              )}
                              <div className="flex gap-2">
                                <button type="submit" className="btn btn-primary btn-sm">
                                  ✓ Gửi đánh giá ngay
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewingTarget(null)}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Hủy bỏ
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
