import type { AppState } from "../../context/AppContext";
import { fmt } from "../../store";
import Icon from "../../components/Icon";
import { LANDING_CATEGORIES } from "./landingData";

interface LandingCategoriesFeaturedProps {
  app: AppState;
  hasValidPeriod: boolean;
}

/**
 * Khối Danh mục phổ biến và Sản phẩm nổi bật trên trang chủ.
 */
export function LandingCategoriesFeatured({ app, hasValidPeriod }: LandingCategoriesFeaturedProps) {
  return (
    <>
      {/* Categories Section */}
      <section className="lp-cat-section">
        <div className="lp-section-header">
          <span className="lp-section-eyebrow lp-section-eyebrow--amber">Khám phá kho đồ</span>
          <h2 className="lp-section-title">
            Danh mục phổ biến
          </h2>
        </div>
        <div className="flex gap-4 justify-center flex-wrap">
          {LANDING_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => app.setPage("products")}
              className="card-hover-lift lp-cat-card"
            >
              {/* Giữ style inline động cho màu sắc riêng theo từng danh mục */}
              <div
                className="lp-cat-icon"
                style={{ background: `${cat.color}14`, color: cat.color }}
              >
                <Icon name={cat.icon} size={24} />
              </div>
              <div className="lp-cat-name">{cat.name}</div>
              <div className="lp-cat-count">{cat.count} trang bị</div>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="lp-featured-section">
        <div className="flex justify-between items-end mb-6 lp-featured-header">
          <div>
            <span className="lp-section-eyebrow lp-section-eyebrow--moss">Lựa chọn hàng đầu</span>
            <h2 className="lp-section-title lp-section-title--featured">Sản phẩm nổi bật</h2>
          </div>
          <button onClick={() => app.setPage("products")} className="lp-featured-link">
            Xem tất cả {app.products.length} sản phẩm →
          </button>
        </div>

        <div className="grid gap-6 lp-featured-grid">
          {app.products.slice(0, 4).map((p) => {
            const avail = app.getAvailable(p.id);
            /* Chỉ hiển thị badge xanh khi đã chọn lịch thuê hợp lệ và còn hàng */
            const badgeToneClass = hasValidPeriod && avail > 0 ? "lp-avail-badge--ok" : "lp-avail-badge--muted";
            return (
              <div
                key={p.id}
                onClick={() => app.setSelectedProduct(p.id)}
                className="card-hover-lift lp-product-card lp-clickable"
              >
                <div className="lp-product-media">
                  <img src={p.image} alt={p.name} className="lp-product-img" />
                  <div className={`lp-avail-badge ${badgeToneClass}`}>
                    {!hasValidPeriod ? "Chọn ngày" : avail > 0 ? `● Còn ${avail}` : "Hết hàng"}
                  </div>
                </div>

                <div className="lp-product-body">
                  <div className="lp-product-cat">{p.category}</div>
                  <div className="lp-product-title">{p.name}</div>

                  <div className="flex items-center gap-1.5 mb-4">
                    <span className="lp-product-stars">{"★".repeat(Math.floor(p.rating))}</span>
                    <span className="lp-product-rating">{p.rating}</span>
                    <span className="lp-product-reviews">({p.reviews} đánh giá)</span>
                  </div>

                  <div className="flex justify-between items-end mt-auto pt-3 lp-product-footer">
                    <div>
                      <div className="lp-product-price">
                        {fmt(p.pricePerDay)}<span className="lp-product-price-unit"> / ngày</span>
                      </div>
                      <div className="lp-product-deposit">Cọc bảo đảm: {fmt(p.deposit)}</div>
                    </div>
                    <span className="lp-product-arrow">→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
