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
                onChange={(e) => void handleScheduleChange(e.target.value, app.pickupHour || "09:00", app.returnDate, app.returnHour || "09:00")}
                style={{ padding: "8px 10px", borderRadius: "8px 0 0 8px", border: "1px solid var(--color-bone)", fontSize: "0.85rem" }}
              />
              <select
                value={app.pickupHour || "09:00"}
                onChange={(e) => void handleScheduleChange(app.pickupDate, e.target.value, app.returnDate, app.returnHour || "09:00")}
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
                onChange={(e) => void handleScheduleChange(app.pickupDate, app.pickupHour || "09:00", e.target.value, app.returnHour || "09:00")}
                style={{ padding: "8px 10px", borderRadius: "8px 0 0 8px", border: "1px solid var(--color-bone)", fontSize: "0.85rem" }}
              />
              <select
                value={app.returnHour || "09:00"}
                onChange={(e) => void handleScheduleChange(app.pickupDate, app.pickupHour || "09:00", app.returnDate, e.target.value)}
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
        {cartApiError && (
          <div role="alert" style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#FEF2F2", color: "#B91C1C", fontSize: "0.78rem", border: "1px solid #FECACA" }}>
            {cartApiError}
          </div>
        )}
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
                    disabled={cartBusy}
                    onClick={() => void handleQtyDelta(c.productId, -1)}
                    className="qty-btn"
                    style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "white", cursor: cartBusy ? "wait" : "pointer", fontWeight: 700 }}
                    aria-label="Giảm số lượng"
                  >
                    −
                  </button>
                  <span style={{ width: 32, textAlign: "center", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>
                    {c.qty}
                  </span>
                  <button
                    disabled={cartBusy}
                    onClick={() => void handleQtyDelta(c.productId, 1)}
                    className="qty-btn"
                    style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "white", cursor: cartBusy ? "wait" : "pointer", fontWeight: 700 }}
                    aria-label="Tăng số lượng"
                  >
                    +
                  </button>
                </div>

                {/* Nút xóa khỏi giỏ */}
                <button
                  disabled={cartBusy}
                  onClick={() => void handleRemoveItem(c.productId)}
                  style={{ background: "none", border: "none", cursor: cartBusy ? "wait" : "pointer", color: "#9CA3AF", padding: 6, borderRadius: 6 }}
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
                disabled={cartBusy}
                onClick={() => void applyPromo()}
                className="btn btn-secondary btn-sm"
                style={{ padding: "8px 14px", borderRadius: 6, fontWeight: 700, fontSize: "0.8rem" }}
              >
                {cartBusy ? "..." : "Áp dụng"}
              </button>
              {promoApplied && (
                <button
                  type="button"
                  disabled={cartBusy}
                  onClick={() => void removePromo()}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "8px 10px", borderRadius: 6, fontSize: "0.78rem", color: "#B91C1C" }}
                >
                  Bỏ mã
                </button>
              )}
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
                onClick={() => { setShowAuthModal(false); app.setPage("login"); }}
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
