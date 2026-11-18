import { fmt, type Product } from "../../../store";
import Icon from "../../../components/Icon";
import type { CartAvailabilityInfo } from "./useCartFlow";

interface CartItemRowProps {
  product: Product;
  qty: number;
  days: number;
  stockInfo: CartAvailabilityInfo | undefined;
  cartBusy: boolean;
  onQtyDelta: (productId: string, delta: number) => Promise<void>;
  onRemove: (productId: string) => Promise<void>;
}

/**
 * Thẻ hiển thị một dòng thiết bị trong Giỏ thuê kèm trạng thái tồn kho và nút chỉnh số lượng.
 */
export function CartItemRow({
  product: p,
  qty,
  days,
  stockInfo,
  cartBusy,
  onQtyDelta,
  onRemove,
}: CartItemRowProps) {
  // Đánh dấu viền đỏ khi số lượng chọn vượt tồn kho hoặc sản phẩm đã hết hàng
  const isError = stockInfo?.isOver || stockInfo?.isOutOfStock;

  return (
    <div className={`cart-item-card cp-cart-item-card ${isError ? "is-error" : ""}`}>
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
          Đơn giá: {fmt(p.pricePerDay)}/ngày × {days} ngày = <strong className="cp-cart-item-price-val">{fmt(p.pricePerDay * days * qty)}</strong>
        </div>

        <div className="cp-cart-item-deposit-row">
          Cọc bảo đảm: {fmt(p.deposit)} × {qty} chiếc = <strong className="cp-cart-item-deposit-val">{fmt(p.deposit * qty)}</strong> (Hoàn 100% khi trả đồ)
        </div>

        {/* Trạng thái tồn kho khả dụng theo UC2.3 / UC3.1 */}
        <div className="cp-cart-stock-wrap">
          {stockInfo?.isOutOfStock ? (
            <span className="cp-cart-stock-pill cp-cart-stock-pill--out">
              ✗ Hết hàng trong khoảng ngày đã chọn (Tồn kho: 0)
            </span>
          ) : stockInfo?.isOver ? (
            <span className="cp-cart-stock-pill cp-cart-stock-pill--over">
              ⚠ Vượt tồn kho: Kho chỉ còn {stockInfo.avail} chiếc (Đang chọn {qty})
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
          onClick={() => void onQtyDelta(p.id, -1)}
          className={`qty-btn cp-qty-btn ${cartBusy ? "is-busy" : ""}`}
          aria-label="Giảm số lượng"
        >
          −
        </button>
        <span className="cp-qty-val">
          {qty}
        </span>
        <button
          disabled={cartBusy}
          onClick={() => void onQtyDelta(p.id, 1)}
          className={`qty-btn cp-qty-btn ${cartBusy ? "is-busy" : ""}`}
          aria-label="Tăng số lượng"
        >
          +
        </button>
      </div>

      {/* Nút xóa khỏi giỏ */}
      <button
        disabled={cartBusy}
        onClick={() => void onRemove(p.id)}
        className={`cp-cart-remove-btn ${cartBusy ? "is-busy" : ""}`}
        title="Xóa thiết bị khỏi giỏ"
        aria-label="Xóa sản phẩm"
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
