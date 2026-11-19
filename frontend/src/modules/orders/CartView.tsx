import Icon from "../../components/Icon";
import { useCartFlow } from "./cart/useCartFlow";
import { CartScheduleBar } from "./cart/CartScheduleBar";
import { CartItemRow } from "./cart/CartItemRow";
import { CartSummaryPanel } from "./cart/CartSummaryPanel";
import { CartAuthModal } from "./cart/CartAuthModal";

/**
 * Trang Giỏ thiết bị thuê & Báo giá tạm tính (UC3.1, UC3.1.1, UC3.1.2).
 */
export function CartView() {
  const vm = useCartFlow();
  const { app } = vm;

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
      <CartScheduleBar
        pickupDate={app.pickupDate}
        pickupHour={app.pickupHour}
        returnDate={app.returnDate}
        returnHour={app.returnHour}
        days={vm.days}
        datesValid={vm.datesValid}
        cartApiError={vm.cartApiError}
        onScheduleChange={vm.handleScheduleChange}
      />

      <div className="cart-grid cp-cart-grid">
        {/* Danh sách thiết bị trong giỏ */}
        <div className="flex flex-col gap-3">
          {app.cart.map((c) => {
            const p = app.products.find((prod) => prod.id === c.productId);
            if (!p) return null;
            const stockInfo = vm.cartAvailability.find((item) => item.productId === c.productId);
            return (
              <CartItemRow
                key={c.productId}
                product={p}
                qty={c.qty}
                days={vm.days}
                stockInfo={stockInfo}
                cartBusy={vm.cartBusy}
                onQtyDelta={vm.handleQtyDelta}
                onRemove={vm.handleRemoveItem}
              />
            );
          })}
        </div>

        {/* Tóm tắt báo giá Sticky (UC3.1.1 & UC3.1.2) */}
        <CartSummaryPanel
          days={vm.days}
          rental={vm.rental}
          depositTotal={vm.depositTotal}
          discount={vm.discount}
          grand={vm.grand}
          promoCode={vm.promoCode}
          setPromoCode={vm.setPromoCode}
          promoApplied={vm.promoApplied}
          promoError={vm.promoError}
          cartBusy={vm.cartBusy}
          hasStockError={vm.hasStockError}
          datesValid={vm.datesValid}
          onApplyPromo={vm.applyPromo}
          onRemovePromo={vm.removePromo}
          onProceedToCheckout={vm.handleProceedToCheckout}
        />
      </div>

      {/* Modal Yêu cầu đăng nhập đối với Khách vãng lai */}
      {vm.showAuthModal && (
        <CartAuthModal
          onLogin={() => {
            vm.setShowAuthModal(false);
            app.setPage("login");
          }}
          onClose={() => vm.setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
