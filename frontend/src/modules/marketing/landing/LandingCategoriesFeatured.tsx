import { useRef } from "react";
import type { AppState } from "../../../context/AppContext";
import { fmt } from "../../../store";
import { LANDING_CATEGORIES } from "./landingData";

interface LandingCategoriesFeaturedProps {
  app: AppState;
  hasValidPeriod: boolean;
}

/**
 * Ánh xạ tên danh mục thật từ DB/Seed sang ảnh đại diện tương ứng.
 */
function resolveCategoryVisual(name: string, fallbackDesc?: string): { image: string; subtitle: string } {
  const s = name.toLowerCase();
  if (s.includes("lều") || s.includes("bạt")) {
    return { image: "/images/categories/tent.jpg", subtitle: fallbackDesc || "Lều cắm trại & Tarp" };
  }
  if (s.includes("ngủ") || s.includes("đệm")) {
    return { image: "/images/categories/sleeping.jpg", subtitle: fallbackDesc || "Túi ngủ & Đệm hơi" };
  }
  if (s.includes("đèn") || s.includes("ghế") || s.includes("bàn")) {
    return { image: "/images/categories/lantern.jpg", subtitle: fallbackDesc || "Bàn ghế & Đèn chiếu sáng" };
  }
  if (s.includes("bếp") || s.includes("nấu")) {
    return { image: "/images/categories/cooking.jpg", subtitle: fallbackDesc || "Bếp ga & Nồi dã ngoại" };
  }
  if (s.includes("balo") || s.includes("gậy") || s.includes("trek")) {
    return { image: "/images/categories/backpack.jpg", subtitle: fallbackDesc || "Balo & Gậy leo núi" };
  }
  if (s.includes("năng lượng") || s.includes("phụ kiện") || s.includes("sạc")) {
    return { image: "/images/products/ecoflow-river-2.jpg", subtitle: fallbackDesc || "Trạm sạc & Phụ kiện" };
  }
  if (s.includes("combo")) {
    return { image: "/images/categories/combo.jpg", subtitle: fallbackDesc || "Trọn bộ cắm trại tiết kiệm" };
  }
  return { image: "/images/categories/tent.jpg", subtitle: fallbackDesc || "Thiết bị dã ngoại GearGo" };
}

/**
 * Khối Danh mục phổ biến và Sản phẩm nổi bật trên trang chủ.
 */
export function LandingCategoriesFeatured({ app, hasValidPeriod }: LandingCategoriesFeaturedProps) {
  // Ưu tiên danh mục thật đang hoạt động từ app.categories (Backend/Seed), fallback sang LANDING_CATEGORIES
  const activeCategories = app.categories.filter((c) => c.status === "active");
  const displayCategories =
    activeCategories.length > 0
      ? activeCategories.map((c) => {
          const visual = resolveCategoryVisual(c.name, c.description);
          const count = app.products.filter(
            (p) => p.categoryId === c.id || p.category.toLowerCase() === c.name.toLowerCase()
          ).length;
          return { name: c.name, subtitle: visual.subtitle, image: visual.image, count };
        })
      : LANDING_CATEGORIES.map((cat) => ({
          name: cat.name,
          subtitle: cat.subtitle,
          image: cat.image,
          count: cat.count,
        }));

  const trackRef = useRef<HTMLDivElement>(null);

  const handleOpenCategory = (catName: string) => {
    sessionStorage.setItem("geargo_catalog_category", catName);
    app.setPage("products");
  };

  const scrollCategories = (dir: -1 | 1) => {
    trackRef.current?.scrollBy({ left: dir * 440, behavior: "smooth" });
  };

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
        <div className="lp-cat-carousel">
          <button
            type="button"
            onClick={() => scrollCategories(-1)}
            aria-label="Danh mục trước"
            className="lp-cat-arrow is-prev"
          >
            ‹
          </button>

          <div ref={trackRef} className="lp-cat-track">
            {displayCategories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => handleOpenCategory(cat.name)}
                className="card-hover-lift lp-cat-card lp-cat-card--photo"
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  className="lp-cat-bg-img"
                />
                <div className="lp-cat-scrim" />
                <div className="lp-cat-badge">{cat.count} sản phẩm</div>
                <div className="lp-cat-info">
                  <div className="lp-cat-name">{cat.name}</div>
                  <div className="lp-cat-sub line-clamp-1">{cat.subtitle}</div>
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollCategories(1)}
            aria-label="Danh mục tiếp theo"
            className="lp-cat-arrow is-next"
          >
            ›
          </button>
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
