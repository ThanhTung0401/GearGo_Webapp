import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../App";
import { fmt } from "../../store";
import Icon from "../../components/Icon";

import { rentalCartApi, type GioThueBackend } from "../../services/api";
import { toIsoDateTime } from "./customerUtils";
export function CartView() {
  const app = useApp();
  const [promoCode, setPromoCode] = useState(app.appliedPromoCode);
  const [promoApplied, setPromoApplied] = useState(Boolean(app.appliedPromoCode));
  const [promoError, setPromoError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [backendCart, setBackendCart] = useState<GioThueBackend | null>(null);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartApiError, setCartApiError] = useState("");

  // Đồng bộ giỏ thuê & báo giá thật từ backend khi đang ở chế độ realApi và đã đăng nhập
  const loadBackendCart = useCallback(async () => {
    if (!app.realApi || !app.currentUser) {
      setBackendCart(null);
      return;
    }
    try {
      const res = await rentalCartApi.layGio();
      setBackendCart(res);
      app.setCartItems?.(
        res.chiTiet.map((item) => ({
          productId: String(item.maSanPham),
          qty: item.soLuong,
        }))
      );
      if (res.maKhuyenMaiApDung) {
        setPromoCode(res.maKhuyenMaiApDung);
        setPromoApplied(true);
        app.setAppliedPromoCode(res.maKhuyenMaiApDung);
      } else {
        setPromoApplied(false);
      }
      setCartApiError("");
    } catch (err) {
      setCartApiError(err instanceof Error ? err.message : "Không thể tải giỏ thuê từ máy chủ.");
    }
  }, [app.realApi, app.currentUser?.id]);

  useEffect(() => {
    void loadBackendCart();
  }, [loadBackendCart]);

  const localDays = app.getDays();
  const days = app.realApi && backendCart?.baoGia ? backendCart.baoGia.soNgayThue : localDays;
  const datesValid = app.hasValidRentalPeriod();

  // Tính tổng tiền thuê theo số ngày và số lượng (UC3.1.1: block 24h)
  const localRental = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + (p ? p.pricePerDay * c.qty * localDays : 0);
  }, 0);

  // Tính tổng tiền cọc bảo đảm (UC3.1.1: cọc tách riêng không phụ thuộc ngày thuê)
  const localDepositTotal = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + (p ? p.deposit * c.qty : 0);
  }, 0);

  const promotionItems = app.cart.map((item) => {
    const product = app.products.find((entry) => entry.id === item.productId)!;
    return { productId: item.productId, rental: product ? product.pricePerDay * item.qty * localDays : 0 };
  });

  // Đánh giá mã ưu đãi (UC3.1.2: Chỉ giảm trên tiền thuê, không giảm tiền cọc)
  const promoResult = !app.realApi && promoApplied ? app.evaluatePromotion(promoCode, localRental, promotionItems) : null;
  const rental = app.realApi && backendCart?.baoGia ? Number(backendCart.baoGia.tongTienThueTruocGiam) : localRental;
  const depositTotal = app.realApi && backendCart?.baoGia ? Number(backendCart.baoGia.tongTienCoc) : localDepositTotal;
  const discount = app.realApi && backendCart?.baoGia ? Number(backendCart.baoGia.tongTienGiam) : (promoResult?.ok ? promoResult.data.discount : 0);
  const grand = Math.max(0, rental - discount) + depositTotal;

  // Cập nhật khung giờ nhận/trả và đồng bộ báo giá backend
  const handleScheduleChange = async (
    nextPickupDate: string,
    nextPickupHour: string,
    nextReturnDate: string,
    nextReturnHour: string
  ) => {
    app.setPickupDate(nextPickupDate);
    app.setPickupHour(nextPickupHour);
    app.setReturnDate(nextReturnDate);
    app.setReturnHour(nextReturnHour);
    if (!app.realApi) return;

    const gioNhan = toIsoDateTime(nextPickupDate, nextPickupHour);
    const gioTra = toIsoDateTime(nextReturnDate, nextReturnHour);
    void app.refreshCatalog?.({ gioNhan, gioTra });
    if (app.currentUser && new Date(gioTra).getTime() > new Date(gioNhan).getTime()) {
      setCartBusy(true);
      try {
        await rentalCartApi.datThoiGian(gioNhan, gioTra);
        await loadBackendCart();
      } catch (err) {
        setCartApiError(err instanceof Error ? err.message : "Không thể cập nhật lịch thuê.");
      } finally {
        setCartBusy(false);
      }
    }
  };

  // Điều chỉnh số lượng món trong giỏ
  const handleQtyDelta = async (productId: string, delta: number) => {
    if (!app.realApi || !app.currentUser) {
      app.updateCartQty(productId, delta);
      return;
    }
    const line = backendCart?.chiTiet.find((item) => String(item.maSanPham) === productId);
    setCartBusy(true);
    setCartApiError("");
    try {
      if (!line) {
        if (delta > 0) await rentalCartApi.themVaoGio(Number(productId), delta);
      } else {
        const nextQty = line.soLuong + delta;
        if (nextQty <= 0) {
          await rentalCartApi.xoaChiTiet(line.maChiTietGio);
        } else {
          await rentalCartApi.capNhatSoLuong(line.maChiTietGio, nextQty);
        }
      }
      await loadBackendCart();
    } catch (err) {
      setCartApiError(err instanceof Error ? err.message : "Không thể cập nhật số lượng thiết bị.");
    } finally {
      setCartBusy(false);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (!app.realApi || !app.currentUser) {
      app.removeFromCart(productId);
      return;
    }
    const line = backendCart?.chiTiet.find((item) => String(item.maSanPham) === productId);
    if (!line) {
      app.removeFromCart(productId);
      return;
    }
    setCartBusy(true);
    try {
      await rentalCartApi.xoaChiTiet(line.maChiTietGio);
      await loadBackendCart();
    } catch (err) {
      setCartApiError(err instanceof Error ? err.message : "Không thể xóa thiết bị khỏi giỏ.");
    } finally {
      setCartBusy(false);
    }
  };

  // Áp dụng / Gỡ bỏ mã khuyến mãi
  const applyPromo = async () => {
    const cleanCode = promoCode.trim().toUpperCase();
    if (!cleanCode) {
      setPromoError("Vui lòng nhập mã khuyến mãi.");
      return;
    }
    if (app.realApi) {
      if (!app.currentUser) {
        setShowAuthModal(true);
        return;
      }
      setCartBusy(true);
      setPromoError("");
      try {
        await rentalCartApi.apMaKhuyenMai(cleanCode);
        await loadBackendCart();
        setPromoCode(cleanCode);
        setPromoApplied(true);
        app.setAppliedPromoCode(cleanCode);
      } catch (err) {
        setPromoApplied(false);
        app.setAppliedPromoCode("");
        setPromoError(err instanceof Error ? err.message : "Mã khuyến mãi không hợp lệ hoặc chưa đạt điều kiện.");
      } finally {
        setCartBusy(false);
      }
      return;
    }

    const result = app.evaluatePromotion(cleanCode, localRental, promotionItems);
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

  const removePromo = async () => {
    if (app.realApi && app.currentUser) {
      setCartBusy(true);
      try {
        await rentalCartApi.boMaKhuyenMai();
        await loadBackendCart();
      } catch (err) {
        setPromoError(err instanceof Error ? err.message : "Không thể gỡ mã khuyến mãi.");
      } finally {
        setCartBusy(false);
      }
    }
    setPromoApplied(false);
    setPromoCode("");
    setPromoError("");
    app.setAppliedPromoCode("");
  };

  // Kiểm tra khả dụng tồn kho từng dòng cho lịch thuê đã chọn (UC3.1 dòng 3, dòng phụ 2.1)
  const cartAvailability = app.cart.map((c) => {
    const serverLine = backendCart?.chiTiet.find((item) => String(item.maSanPham) === c.productId);
    const avail = serverLine ? serverLine.soLuongKhaDung : app.getAvailable(c.productId);
    const isOver = c.qty > avail;
    const isOutOfStock = avail <= 0 || Boolean(serverLine?.ngungKinhDoanh);
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
    <div className="customer-container cp-container cp-container--1100">
      {/* Header Giỏ hàng */}
      <div className="customer-page-header cp-page-header">
        <h1 className="customer-page-title">Giỏ thiết bị thuê & Báo giá (UC3.1)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lập danh mục, đối chiếu khả dụng và chốt dự tính chi phí trước khi tạo đơn.
        </p>
      </div>

      {/* Thanh chỉnh sửa lịch thuê trực tiếp tại Giỏ hàng (UC3.1 Dòng sự kiện 2) */}
      <div className="cp-cart-schedule-box">
        <div className="cp-cart-schedule-header">
          <span>📅 Lịch trình thuê đồ (Block 24h làm tròn lên):</span>
          <span className={`cp-cart-duration-pill ${datesValid ? "is-valid" : "is-invalid"}`}>
            {datesValid ? `Tổng thời gian: ${days} ngày` : "Thời gian chưa hợp lệ"}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="cp-cart-date-label">Ngày & Giờ nhận đồ</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={app.pickupDate}
                onChange={(e) => void handleScheduleChange(e.target.value, app.pickupHour || "09:00", app.returnDate, app.returnHour || "09:00")}
                className="cp-cart-date-input"
              />
              <select
                value={app.pickupHour || "09:00"}
                onChange={(e) => void handleScheduleChange(app.pickupDate, e.target.value, app.returnDate, app.returnHour || "09:00")}
                className="cp-cart-hour-select"
              >
                {["08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <span className="cp-cart-arrow">→</span>

          <div>
            <label className="cp-cart-date-label">Ngày & Giờ trả đồ</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={app.returnDate}
                onChange={(e) => void handleScheduleChange(app.pickupDate, app.pickupHour || "09:00", e.target.value, app.returnHour || "09:00")}
                className="cp-cart-date-input"
              />
              <select
                value={app.returnHour || "09:00"}
                onChange={(e) => void handleScheduleChange(app.pickupDate, app.pickupHour || "09:00", app.returnDate, e.target.value)}
                className="cp-cart-hour-select"
              >
                {["08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="cp-cart-schedule-hint">
            💡 <em>Đổi lịch thuê sẽ tự động kiểm tra lại tồn kho khả dụng và tính toán lại toàn bộ báo giá.</em>
          </div>
        </div>
        {cartApiError && (
          <div role="alert" className="cp-alert-error mt-2.5">
            {cartApiError}
          </div>
        )}
      </div>

      <div className="cart-grid cp-cart-grid">
        {/* Danh sách thiết bị trong giỏ */}
        <div className="flex flex-col gap-3">
          {app.cart.map((c) => {
            const p = app.products.find((p) => p.id === c.productId);
            if (!p) return null;
            const stockInfo = cartAvailability.find((item) => item.productId === c.productId);
            // Đánh dấu viền đỏ khi số lượng chọn vượt tồn kho hoặc sản phẩm đã hết hàng
            const isError = stockInfo?.isOver || stockInfo?.isOutOfStock;

            return (
              <div
                key={c.productId}
                className={`cart-item-card cp-cart-item-card ${isError ? "is-error" : ""}`}
              >
                <img
                  src={p.image}
                  alt={p.name}
                  className="cp-cart-item-thumb"
                />

                <div className="cp-cart-item-body">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="cp-cart-item-cat">
                      {p.category}
                    </span>
                    <strong className="cp-cart-item-title">{p.name}</strong>
                  </div>

                  <div className="cp-cart-item-price-row">
                    Đơn giá: {fmt(p.pricePerDay)}/ngày × {days} ngày = <strong className="cp-cart-item-price-val">{fmt(p.pricePerDay * days * c.qty)}</strong>
                  </div>

                  <div className="cp-cart-item-deposit-row">
                    Cọc bảo đảm: {fmt(p.deposit)} × {c.qty} chiếc = <strong className="cp-cart-item-deposit-val">{fmt(p.deposit * c.qty)}</strong> (Hoàn 100% khi trả đồ)
                  </div>

                  {/* Trạng thái tồn kho khả dụng theo UC2.3 / UC3.1 */}
                  <div className="cp-cart-stock-wrap">
                    {stockInfo?.isOutOfStock ? (
                      <span className="cp-cart-stock-pill cp-cart-stock-pill--out">
                        ✗ Hết hàng trong khoảng ngày đã chọn (Tồn kho: 0)
                      </span>
                    ) : stockInfo?.isOver ? (
                      <span className="cp-cart-stock-pill cp-cart-stock-pill--over">
                        ⚠ Vượt tồn kho: Kho chỉ còn {stockInfo.avail} chiếc (Đang chọn {c.qty})
                      </span>
                    ) : (
                      <span className="cp-cart-stock-pill cp-cart-stock-pill--ok">
                        ✓ Khả dụng (Kho sẵn sàng: {stockInfo?.avail} chiếc)
                      </span>
                    )}
                  </div>
                </div>

                {/* Bộ điều chỉnh số lượng (+ / −) */}
                <div className="qty-stepper cp-qty-stepper">
                  <button
                    disabled={cartBusy}
                    onClick={() => void handleQtyDelta(c.productId, -1)}
                    className={`qty-btn cp-qty-btn ${cartBusy ? "is-busy" : ""}`}
                    aria-label="Giảm số lượng"
                  >
                    −
                  </button>
                  <span className="cp-qty-val">
                    {c.qty}
                  </span>
                  <button
                    disabled={cartBusy}
                    onClick={() => void handleQtyDelta(c.productId, 1)}
                    className={`qty-btn cp-qty-btn ${cartBusy ? "is-busy" : ""}`}
                    aria-label="Tăng số lượng"
                  >
                    +
                  </button>
                </div>

                {/* Nút xóa khỏi giỏ */}
                <button
                  disabled={cartBusy}
                  onClick={() => void handleRemoveItem(c.productId)}
                  className={`cp-cart-remove-btn ${cartBusy ? "is-busy" : ""}`}
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
        <div className="summary-card cp-summary-card">
          <h3 className="summary-title cp-summary-title">
            Báo giá thuê dự tính (UC3.1.1)
          </h3>

          <div className="cp-summary-list">
            <div className="summary-row cp-summary-row">
              <span className="cp-summary-label">Tiền thuê thiết bị ({days} ngày)</span>
              <span className="cp-summary-val">{fmt(rental)}</span>
            </div>

            <div className="summary-row cp-summary-row">
              <span className="cp-summary-label">Tiền cọc bảo đảm (Hoàn lại 100%)</span>
              <span className="cp-summary-val">{fmt(depositTotal)}</span>
            </div>

            {discount > 0 && (
              <div className="summary-row cp-summary-row cp-summary-row--discount text-emerald-600">
                <span>Ưu đãi áp dụng ({promoCode})</span>
                <span className="cp-summary-val--mono">−{fmt(discount)}</span>
              </div>
            )}
          </div>

          {/* Ô nhập mã ưu đãi (UC3.1.2) */}
          <div className="cp-promo-panel">
            <div className="cp-promo-label">
              Mã khuyến mãi giảm giá thuê (UC3.1.2)
            </div>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="VD: CAMPGO10"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="cp-promo-input"
              />
              <button
                type="button"
                disabled={cartBusy}
                onClick={() => void applyPromo()}
                className="btn btn-secondary btn-sm cp-promo-apply-btn"
              >
                {cartBusy ? "..." : "Áp dụng"}
              </button>
              {promoApplied && (
                <button
                  type="button"
                  disabled={cartBusy}
                  onClick={() => void removePromo()}
                  className="btn btn-ghost btn-sm cp-promo-remove-btn"
                >
                  Bỏ mã
                </button>
              )}
            </div>
            {promoError && <div className="cp-promo-error">{promoError}</div>}
            <div className="cp-promo-note">
              * Giảm giá chỉ áp dụng trên tiền thuê đủ điều kiện, không áp dụng cho tiền cọc.
            </div>
          </div>

          {/* Tổng thanh toán ban đầu */}
          <div className="cp-cart-total-box">
            <div className="cp-cart-total-row">
              <span className="cp-cart-total-label">Tổng thanh toán ban đầu</span>
              <span className="cp-cart-total-price">
                {fmt(grand)}
              </span>
            </div>
            <div className="cp-cart-total-sub">
              Bao gồm: {fmt(rental - discount)} (Thuê) + {fmt(depositTotal)} (Cọc hoàn lại khi trả đồ).
            </div>
          </div>

          {/* Cảnh báo lỗi tồn kho (UC3.1 Dòng phụ 2.1) */}
          {hasStockError && (
            <div className="cp-cart-stock-alert">
              <strong>⚠ Không đủ hàng:</strong> Có thiết bị vượt quá số lượng khả dụng trong khoảng thời gian đã chọn. Quý khách vui lòng giảm số lượng hoặc bỏ món lỗi để tiếp tục.
            </div>
          )}

          {!datesValid && (
            <div className="cp-cart-date-alert">
              ⚠ Ngày trả phải sau ngày nhận. Vui lòng chọn lại lịch thuê hợp lệ.
            </div>
          )}

          <button
            onClick={handleProceedToCheckout}
            disabled={hasStockError || !datesValid}
            className="btn btn-primary btn-lg btn-full cp-btn-checkout"
          >
            Tiến hành xác nhận thuê →
          </button>

          <p className="cp-cart-hold-note">
            Giỏ thuê chỉ lưu tạm thời, hệ thống sẽ chính thức giữ chỗ 15 phút ở bước tạo đơn.
          </p>
        </div>
      </div>

      {/* Modal Yêu cầu đăng nhập đối với Khách vãng lai */}
      {showAuthModal && (
        <div className="cp-modal-overlay">
          <div className="cp-modal-box cp-modal-box--sm">
            <div className="cp-modal-auth-icon">
              <Icon name="user" size={24} />
            </div>
            <h3 className="cp-modal-auth-title">
              Đăng nhập để đặt thuê thiết bị
            </h3>
            <p className="cp-modal-auth-desc">
              Để lưu đơn thuê, giữ chỗ thiết bị 15 phút và bảo đảm quyền lợi hoàn cọc, quý khách vui lòng đăng nhập hoặc tạo tài khoản GearGo.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowAuthModal(false); app.setPage("login"); }}
                className="btn btn-primary cp-modal-btn-primary"
              >
                Đăng nhập / Đăng ký ngay →
              </button>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="btn btn-secondary cp-modal-btn-secondary"
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
