import { fmt } from "../../../store";
import type { QuoteChangeModalState } from "./useCheckoutFlow";

interface CheckoutQuoteModalProps {
  modal: QuoteChangeModalState;
  submitting: boolean;
  onAcceptNewQuote: () => Promise<void>;
  onClose: () => void;
}

/**
 * Modal xác nhận khi báo giá hoặc khuyến mãi thay đổi ngay trước khi tạo đơn (UC3.2.2).
 */
export function CheckoutQuoteModal({
  modal,
  submitting,
  onAcceptNewQuote,
  onClose,
}: CheckoutQuoteModalProps) {
  return (
    <div className="cp-modal-overlay cp-modal-overlay--light">
      <div className="cp-modal-box cp-modal-box--460">
        <h3 className="cp-quote-modal-title">
          ⚠️ Báo giá đơn thuê vừa thay đổi (UC3.2.2)
        </h3>
        <p className="cp-quote-modal-desc">
          {modal.message}
        </p>
        <div className="cp-quote-modal-box">
          <div className="cp-quote-row">
            <span>Tổng trước đó:</span>
            <span className="cp-quote-old-price">
              {fmt(modal.oldTotal)}
            </span>
          </div>
          <div className="cp-quote-row">
            <span>Tiền thuê mới:</span>
            <span className="cp-quote-val">{fmt(modal.newRental)}</span>
          </div>
          {modal.newDiscount > 0 && (
            <div className="cp-quote-row cp-quote-row--discount">
              <span>Ưu đãi mới:</span>
              <span className="cp-quote-val">−{fmt(modal.newDiscount)}</span>
            </div>
          )}
          <div className="cp-quote-row cp-quote-row--deposit">
            <span>Tiền cọc:</span>
            <span className="cp-quote-val">{fmt(modal.newDeposit)}</span>
          </div>
          <div className="cp-quote-row--total">
            <span>Tổng thanh toán mới:</span>
            <span className="cp-summary-val--mono">{fmt(modal.newTotal)}</span>
          </div>
        </div>
        {/* Cho phép nút xác nhận báo giá mới xuống dòng gọn trên mobile 390px */}
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void onAcceptNewQuote()}
            className="btn btn-primary cp-quote-btn-confirm"
          >
            {submitting ? "Đang đặt đơn..." : "Đồng ý giá mới & Đặt đơn"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="btn btn-secondary cp-quote-btn-cancel"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
