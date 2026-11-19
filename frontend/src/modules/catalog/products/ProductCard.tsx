import { fmt, type CartItem, type Product } from "../../../store";

interface ProductCardProps {
  product: Product;
  avail: number;
  inCart: CartItem | undefined;
  days: number;
  datesSelected: boolean;
  onSelect: (id: string) => void;
  onQuickRent: (id: string) => void;
}

/**
 * Thẻ hiển thị một sản phẩm trong lưới danh mục thuê đồ.
 */
export function ProductCard({
  product: p,
  avail,
  inCart,
  days,
  datesSelected,
  onSelect,
  onQuickRent,
}: ProductCardProps) {
  /* Phân nhánh màu badge theo 3 trạng thái: chưa chọn ngày, còn hàng hoặc hết hàng */
  const badgeToneClass = !datesSelected
    ? "lp-avail-badge--muted"
    : avail > 0
      ? "lp-avail-badge--ok"
      : "lp-avail-badge--out";

  return (
    <div className="card-hover-lift lp-product-card">
      <div className="lp-product-media lp-clickable" onClick={() => onSelect(p.id)}>
        <img src={p.image} alt={p.name} className="lp-product-img" />
        <div className={`lp-avail-badge lp-avail-badge--catalog ${badgeToneClass}`}>
          {!datesSelected ? "Giá tham khảo" : avail > 0 ? `● Còn ${avail}` : "Hết hàng"}
        </div>
        {p.name.includes("Tiết kiệm") && (
          <div className="lp-promo-tag">
            TIẾT KIỆM
          </div>
        )}
      </div>
      <div className="lp-product-body lp-product-body--compact">
        <div className="lp-product-cat lp-product-cat--compact">
          {p.category}
        </div>
        <div
          className="lp-product-title lp-product-title--compact"
          onClick={() => onSelect(p.id)}
        >
          {p.name}
        </div>
        <div className="lp-product-brand">
          Thương hiệu: <strong>{p.brand}</strong>
        </div>
        <div className="flex items-center gap-1.5 mb-4">
          <span className="lp-product-stars lp-product-stars--sm">{"★".repeat(Math.floor(p.rating))}</span>
          <span className="lp-product-rating lp-product-rating--bold">{p.rating}</span>
          <span className="lp-product-reviews">({p.reviews} đánh giá)</span>
        </div>
        <div className="flex justify-between items-end mt-auto pt-3 lp-product-footer">
          <div>
            <div className="lp-product-price lp-product-price--sm">
              {fmt(p.pricePerDay)}<span className="lp-product-price-unit lp-product-price-unit--sm"> / ngày</span>
            </div>
            <div className="lp-product-deposit lp-product-deposit--sm">Cọc: {fmt(p.deposit)}</div>
            {datesSelected && days > 1 && (
              <div className="lp-product-total-hint">
                Tổng {days} ngày: {fmt(p.pricePerDay * days)}
              </div>
            )}
          </div>
          <button
            disabled={!datesSelected || avail === 0}
            onClick={() => onQuickRent(p.id)}
            className={`lp-rent-btn${inCart ? " is-in-cart" : ""}`}
          >
            {inCart ? `✓ ×${inCart.qty}` : "+ Thuê ngay"}
          </button>
        </div>
      </div>
    </div>
  );
}
