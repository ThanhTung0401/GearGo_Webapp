import { useCheckoutFlow } from "./cart/useCheckoutFlow";
import { CheckoutReceiverSection } from "./cart/CheckoutReceiverSection";
import { CheckoutOrderSummary } from "./cart/CheckoutOrderSummary";
import { CheckoutQuoteModal } from "./cart/CheckoutQuoteModal";

/**
 * Trang Xác nhận thông tin đặt thuê & Giữ chỗ 15 phút (UC3.2, UC3.2.1, UC3.2.2).
 */
export function CheckoutView() {
  const vm = useCheckoutFlow();
  const { app } = vm;
  const holdMinutes = app.policies?.holdMinutes ?? 15;

  return (
    <div className="customer-container cp-container cp-container--1040">
      <button
        onClick={() => app.setPage("cart")}
        className="btn btn-ghost btn-sm mb-4 cp-checkout-back-btn"
      >
        ← Quay lại giỏ hàng
      </button>

      <div className="customer-page-header cp-page-header">
        <h1 className="customer-page-title">Xác nhận thông tin đặt thuê & Giữ chỗ (UC3.2)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Hệ thống sẽ ghi nhận đơn và kích hoạt đồng hồ giữ chỗ {holdMinutes} phút để bạn hoàn tất thanh toán.
        </p>
      </div>

      <div className="cart-grid cp-cart-grid">
        <CheckoutReceiverSection
          receiverName={vm.receiverName}
          setReceiverName={vm.setReceiverName}
          receiverPhone={vm.receiverPhone}
          setReceiverPhone={vm.setReceiverPhone}
          receiverEmail={vm.receiverEmail}
          setReceiverEmail={vm.setReceiverEmail}
          orderNote={vm.orderNote}
          setOrderNote={vm.setOrderNote}
          pickupDate={app.pickupDate}
          pickupHour={app.pickupHour}
          returnDate={app.returnDate}
          returnHour={app.returnHour}
          cart={app.cart}
          products={app.products}
          days={vm.days}
        />

        <CheckoutOrderSummary
          days={vm.days}
          rental={vm.rental}
          discount={vm.discount}
          promoCode={vm.promoCode}
          depositTotal={vm.depositTotal}
          grand={vm.grand}
          paymentMethod={vm.paymentMethod}
          setPaymentMethod={vm.setPaymentMethod}
          agreedTerms={vm.agreedTerms}
          setAgreedTerms={vm.setAgreedTerms}
          checkoutError={vm.checkoutError}
          submitting={vm.submitting}
          onConfirm={() => vm.handleConfirm()}
        />
      </div>

      {/* Modal xác nhận báo giá thay đổi (UC3.2.2) */}
      {vm.quoteChangeModal && (
        <CheckoutQuoteModal
          modal={vm.quoteChangeModal}
          submitting={vm.submitting}
          onAcceptNewQuote={() => vm.handleConfirm(true)}
          onClose={() => vm.setQuoteChangeModal(null)}
        />
      )}
    </div>
  );
}
