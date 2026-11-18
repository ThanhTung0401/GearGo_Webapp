import { fmt } from "../../../store";

interface CartSummaryPanelProps {
  days: number;
  rental: number;
  depositTotal: number;
  discount: number;
  grand: number;
  promoCode: string;
  setPromoCode: (v: string) => void;
  promoApplied: boolean;
  promoError: string;
  cartBusy: boolean;
  hasStockError: boolean;
  datesValid: boolean;
  onApplyPromo: () => Promise<void>;
  onRemovePromo: () => Promise<void>;
  onProceedToCheckout: () => void;
}

/**
 * Panel báo giá thuê dự tính sticky, ô áp dụng mã khuyến mãi và nút chuyển sang xác nhận đặt thuê (UC3.1.1 & UC3.1.2).
 */
export function CartSummaryPanel({
  days,
  rental,
  depositTotal,
  discount,
  grand,
  promoCode,
  setPromoCode,
  promoApplied,
  promoError,
  cartBusy,
  hasStockError,
  datesValid,
  onApplyPromo,
  onRemovePromo,
  onProceedToCheckout,
}: CartSummaryPanelProps) {
  return (
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
            onClick={() => void onApplyPromo()}
            className="btn btn-secondary btn-sm cp-promo-apply-btn"
          >
            {cartBusy ? "..." : "Áp dụng"}
          </button>
          {promoApplied && (
            <button
              type="button"
              disabled={cartBusy}
              onClick={() => void onRemovePromo()}
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
        onClick={onProceedToCheckout}
        disabled={hasStockError || !datesValid}
        className="btn btn-primary btn-lg btn-full cp-btn-checkout"
      >
        Tiến hành xác nhận thuê →
      </button>

      <p className="cp-cart-hold-note">
        Giỏ thuê chỉ lưu tạm thời, hệ thống sẽ chính thức giữ chỗ 15 phút ở bước tạo đơn.
      </p>
    </div>
  );
}
