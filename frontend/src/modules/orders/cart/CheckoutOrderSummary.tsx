import { fmt } from "../../../store";
import type { CheckoutPaymentMethod } from "./useCheckoutFlow";

interface CheckoutOrderSummaryProps {
  days: number;
  rental: number;
  discount: number;
  promoCode: string;
  depositTotal: number;
  grand: number;
  paymentMethod: CheckoutPaymentMethod;
  setPaymentMethod: (v: CheckoutPaymentMethod) => void;
  agreedTerms: boolean;
  setAgreedTerms: (v: boolean) => void;
  checkoutError: string;
  submitting: boolean;
  onConfirm: () => Promise<void>;
}

const PAYMENT_METHODS: { id: CheckoutPaymentMethod; name: string; badge: string }[] = [
  { id: "qr", name: "Chuyển khoản QR ngân hàng (VietQR 24/7)", badge: "Khuyên dùng" },
  { id: "store", name: "Thanh toán tiền mặt / Thẻ tại cửa hàng", badge: "Tại quầy" },
  { id: "wallet", name: "Ví điện tử MoMo / ZaloPay", badge: "Ví điện tử" },
];

/**
 * Cột phải trang Checkout: tổng kết chi phí, chọn phương thức thanh toán, điều khoản và nút chốt đơn (UC3.2.1).
 */
export function CheckoutOrderSummary({
  days,
  rental,
  discount,
  promoCode,
  depositTotal,
  grand,
  paymentMethod,
  setPaymentMethod,
  agreedTerms,
  setAgreedTerms,
  checkoutError,
  submitting,
  onConfirm,
}: CheckoutOrderSummaryProps) {
  return (
    <div className="summary-card cp-summary-card">
      <h3 className="summary-title cp-summary-title cp-checkout-summary-title">
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
          {PAYMENT_METHODS.map((m) => (
            <label
              key={m.id}
              onClick={() => setPaymentMethod(m.id)}
              className={`cp-pay-option ${paymentMethod === m.id ? "is-selected" : ""}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pay"
                  checked={paymentMethod === m.id}
                  onChange={() => setPaymentMethod(m.id)}
                  className="accent-forest"
                />
                <span className="cp-pay-option-name">{m.name}</span>
              </div>
              <span className="cp-pay-option-badge">
                {m.badge}
              </span>
            </label>
          ))}
        </div>

        {/* Khung minh họa VietQR sinh động */}
        {paymentMethod === "qr" && (
          <div className="cp-vietqr-note">
            <div className="cp-vietqr-note-title">
              ⚡ Cổng thanh toán VietQR tự động
            </div>
            <div className="cp-vietqr-note-desc">
              Mã QR chuyển khoản ngân hàng sẽ được tạo lập ngay ở bước kế tiếp kèm đồng hồ giữ chỗ 15 phút.
            </div>
          </div>
        )}
      </div>

      {/* Checkbox cam kết điều khoản bắt buộc */}
      <div className="cp-terms-wrap">
        <label className="cp-terms-label">
          <input
            type="checkbox"
            checked={agreedTerms}
            onChange={(e) => setAgreedTerms(e.target.checked)}
            className="accent-forest cp-terms-checkbox"
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
        onClick={() => void onConfirm()}
        disabled={!agreedTerms || submitting}
        className="btn btn-primary btn-lg btn-full mt-4 cp-btn-checkout"
      >
        {submitting ? "Đang tạo đơn & giữ chỗ 15 phút..." : "✓ Xác nhận đặt thuê & Giữ chỗ 15 phút"}
      </button>

      <p className="cp-cart-hold-note">
        🔒 Cam kết giữ chỗ toàn bộ danh mục thiết bị trong 15 phút
      </p>
    </div>
  );
}
