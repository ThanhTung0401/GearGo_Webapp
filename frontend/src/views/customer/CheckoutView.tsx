import { useState, useEffect, useCallback } from "react";
import { useApp } from "../../App";
import { fmt } from "../../store";
import Icon from "../../components/Icon";
import { ApiError } from "../../services/apiClient";
import { rentalCartApi, orderApi, type GioThueBackend, type BaoGiaThayDoiDetail } from "../../services/api";
import { mapDonChiTietToOrder } from "../../services/mappers";
import { toIsoDateTime } from "./customerUtils";
export function CheckoutView() {
  const app = useApp();
  const [checkoutError, setCheckoutError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [backendQuote, setBackendQuote] = useState<GioThueBackend | null>(null);
  const [receiverName, setReceiverName] = useState(app.currentUser?.name || (app.realApi ? "" : "Nguyễn Văn An"));
  const [receiverPhone, setReceiverPhone] = useState(app.currentUser?.phone || (app.realApi ? "" : "0901 234 567"));
  const [receiverEmail, setReceiverEmail] = useState(app.currentUser?.email || (app.realApi ? "" : "customer@geargo.vn"));
  const [orderNote, setOrderNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "store" | "wallet">("qr");
  const [agreedTerms, setAgreedTerms] = useState(false);
  // Khóa chống tạo đơn trùng (IdempotencyKey) cố định cho phiên checkout hiện tại
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `ck-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
  // Modal xác nhận khi báo giá/khuyến mãi thay đổi trước lúc đặt đơn (UC3.2.2)
  const [quoteChangeModal, setQuoteChangeModal] = useState<{
    message: string;
    oldTotal: number;
    newTotal: number;
    newRental: number;
    newDiscount: number;
    newDeposit: number;
  } | null>(null);

  // Đồng bộ thông tin người nhận từ tài khoản hiện hành và lấy báo giá chốt mới nhất từ backend
  useEffect(() => {
    if (app.currentUser) {
      setReceiverName((prev) => prev || app.currentUser?.name || "");
      setReceiverPhone((prev) => prev || app.currentUser?.phone || "");
      setReceiverEmail((prev) => prev || app.currentUser?.email || "");
    }
    if (app.realApi && app.currentUser) {
      void rentalCartApi.layGio().then(setBackendQuote).catch(() => {});
    }
  }, [app.realApi, app.currentUser?.id]);

  const localDays = app.getDays();
  const days = app.realApi && backendQuote?.baoGia ? backendQuote.baoGia.soNgayThue : localDays;

  const localRental = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + (p ? p.pricePerDay * c.qty * localDays : 0);
  }, 0);
  const localDepositTotal = app.cart.reduce((s, c) => {
    const p = app.products.find((p) => p.id === c.productId)!;
    return s + (p ? p.deposit * c.qty : 0);
  }, 0);

  const promoCode = backendQuote?.maKhuyenMaiApDung || app.appliedPromoCode;
  const promoResult = !app.realApi && promoCode
    ? app.evaluatePromotion(
        promoCode,
        localRental,
        app.cart.map((item) => {
          const product = app.products.find((entry) => entry.id === item.productId)!;
          return { productId: item.productId, rental: product ? product.pricePerDay * item.qty * localDays : 0 };
        })
      )
    : null;
  const rental = app.realApi && backendQuote?.baoGia ? Number(backendQuote.baoGia.tongTienThueTruocGiam) : localRental;
  const depositTotal = app.realApi && backendQuote?.baoGia ? Number(backendQuote.baoGia.tongTienCoc) : localDepositTotal;
  const discount = app.realApi && backendQuote?.baoGia ? Number(backendQuote.baoGia.tongTienGiam) : (promoResult?.ok ? promoResult.data.discount : 0);
  const grand = Math.max(0, rental - discount) + depositTotal;

  // Thực hiện đặt đơn (UC3.2: Khởi tạo giữ chỗ & kiểm tra biến động báo giá UC3.2.2)
  const handleConfirm = async (dongYThayDoiGia = false) => {
    if (!agreedTerms) {
      setCheckoutError("Quý khách vui lòng xác nhận đồng ý với điều khoản thuê và chính sách hoàn cọc của GearGo.");
      return;
    }
    if (!receiverName.trim() || !receiverPhone.trim()) {
      setCheckoutError("Vui lòng nhập đầy đủ họ tên và số điện thoại người nhận.");
      return;
    }

    if (app.realApi) {
      setSubmitting(true);
      setCheckoutError("");
      try {
        const created = await orderApi.taoDon({
          gioNhanDuKien: toIsoDateTime(app.pickupDate, app.pickupHour),
          gioTraDuKien: toIsoDateTime(app.returnDate, app.returnHour),
          tenNguoiNhan: receiverName.trim(),
          soDienThoaiNguoiNhan: receiverPhone.trim(),
          emailLienHe: receiverEmail.trim() || app.currentUser?.email || "",
          ghiChu: orderNote.trim() || undefined,
          maKhuyenMai: promoCode || undefined,
          idempotencyKey,
          giaTamTinhKyVong: grand,
          dongYThayDoiGia,
          chiTiet: app.cart.map((c) => ({
            maSanPham: Number(c.productId),
            soLuong: c.qty,
          })),
        });
        setQuoteChangeModal(null);
        // Tải full chi tiết đơn hàng vừa tạo để đồng bộ vào state dùng chung
        const fullDto = await orderApi.layChiTietDon(created.maDonThue);
        const mappedOrder = mapDonChiTietToOrder(fullDto, {
          customerId: app.currentUser?.id,
          customerName: app.currentUser?.name,
          ghiChu: orderNote.trim() || undefined,
        });
        app.upsertOrder?.(mappedOrder);
        app.setCartItems?.([]);
        app.setAppliedPromoCode("");
        app.setNewOrderId(mappedOrder.id);
        void app.refreshCatalog?.();
        app.setPage("order-confirmed");
      } catch (error) {
        if (error instanceof ApiError && error.code === "BAO_GIA_THAY_DOI") {
          const detailQuote =
            error.detail && typeof error.detail === "object"
              ? (error.detail as Partial<BaoGiaThayDoiDetail>)
              : undefined;

          if (detailQuote && typeof detailQuote.tongThanhToanDuKien === "number") {
            const newRental = Number(detailQuote.tongTienThueTruocGiam ?? rental);
            const newDiscount = Number(detailQuote.tongTienGiam ?? 0);
            const newDeposit = Number(detailQuote.tongTienCoc ?? depositTotal);
            const newTotal = Number(detailQuote.tongThanhToanDuKien);
            setQuoteChangeModal({
              message: error.message,
              oldTotal: grand,
              newTotal,
              newRental,
              newDiscount,
              newDeposit,
            });
          } else {
            // Dự phòng tải lại báo giá mới nhất từ giỏ thuê nếu backend không trả chi tiết
            try {
              const refreshed = await rentalCartApi.layGio();
              setBackendQuote(refreshed);
              const newRental = Number(refreshed.baoGia?.tongTienThueTruocGiam ?? rental);
              const newDiscount = Number(refreshed.baoGia?.tongTienGiam ?? 0);
              const newDeposit = Number(refreshed.baoGia?.tongTienCoc ?? depositTotal);
              const newTotal = Math.max(0, newRental - newDiscount) + newDeposit;
              setQuoteChangeModal({
                message: error.message,
                oldTotal: grand,
                newTotal,
                newRental,
                newDiscount,
                newDeposit,
              });
            } catch {
              setQuoteChangeModal({
                message: error.message,
                oldTotal: grand,
                newTotal: grand,
                newRental: rental,
                newDiscount: discount,
                newDeposit: depositTotal,
              });
            }
          }
        } else {
          setCheckoutError(error instanceof Error ? error.message : "Không thể tạo đơn thuê trên máy chủ.");
        }
      } finally {
        setSubmitting(false);
      }
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

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--color-bone)", display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.82rem", color: "#6B7280" }}>
              <span>🕒 <strong>Nhận đồ:</strong> {app.pickupDate} ({app.pickupHour || "09:00"})</span>
              <span>→</span>
              <span>🕒 <strong>Trả đồ:</strong> {app.returnDate} ({app.returnHour || "09:00"})</span>
            </div>

            <div className="form-group mt-3">
              <label className="form-label" style={{ fontSize: "0.78rem", fontWeight: 600 }}>Ghi chú cho cửa hàng (tùy chọn)</label>
              <input
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="VD: Nhận sớm hơn 15 phút, cần hỗ trợ kiểm tra gậy lều..."
                className="form-input"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-bone)", fontSize: "0.82rem" }}
              />
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
            onClick={() => void handleConfirm()}
            disabled={!agreedTerms || submitting}
            className="btn btn-primary btn-lg btn-full mt-4"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: "0.95rem",
              background: !agreedTerms || submitting ? "#9CA3AF" : "var(--color-forest)",
              cursor: !agreedTerms || submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Đang tạo đơn & giữ chỗ 15 phút..." : "✓ Xác nhận đặt thuê & Giữ chỗ 15 phút"}
          </button>

          <p style={{ fontSize: "0.72rem", color: "#9CA3AF", textAlign: "center", marginTop: 8 }}>
            🔒 Cam kết giữ chỗ toàn bộ danh mục thiết bị trong 15 phút
          </p>
        </div>
      </div>

      {/* Modal xác nhận báo giá thay đổi (UC3.2.2) */}
      {quoteChangeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "grid", placeItems: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 460, width: "100%", padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700, color: "#B45309", margin: "0 0 8px" }}>
              ⚠️ Báo giá đơn thuê vừa thay đổi (UC3.2.2)
            </h3>
            <p style={{ fontSize: "0.84rem", color: "#4B5563", margin: "0 0 14px", lineHeight: 1.5 }}>
              {quoteChangeModal.message}
            </p>
            <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: 12, fontSize: "0.82rem", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>Tổng trước đó:</span>
                <span style={{ fontFamily: "var(--font-mono)", textDecoration: "line-through", color: "#6B7280" }}>
                  {fmt(quoteChangeModal.oldTotal)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>Tiền thuê mới:</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{fmt(quoteChangeModal.newRental)}</span>
              </div>
              {quoteChangeModal.newDiscount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#059669" }}>
                  <span>Ưu đãi mới:</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>−{fmt(quoteChangeModal.newDiscount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Tiền cọc:</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{fmt(quoteChangeModal.newDeposit)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px dashed #CBD5E1", fontWeight: 700, color: "var(--color-forest)" }}>
                <span>Tổng thanh toán mới:</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{fmt(quoteChangeModal.newTotal)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleConfirm(true)}
                className="btn btn-primary"
                style={{ flex: 1, padding: "10px 14px", borderRadius: 8, fontWeight: 700 }}
              >
                {submitting ? "Đang đặt đơn..." : "Đồng ý giá mới & Đặt đơn"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setQuoteChangeModal(null)}
                className="btn btn-secondary"
                style={{ padding: "10px 16px", borderRadius: 8 }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Đơn đã xác nhận & Thanh toán VietQR (OrderConfirmedView - UC3.2 & UC5.1) ──
