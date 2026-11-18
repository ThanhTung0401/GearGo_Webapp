import { useEffect, useRef, useState } from "react";
import { useApp } from "../App";
import { fmt } from "../store";
import type { Review } from "../types";
import Icon from "../components/Icon";
import { getAuthToken } from "../services/apiClient";
import { catalogApi, rentalCartApi, reviewApi, type TongHopDiemBackend } from "../services/api";
import { ProductDetailView } from "./products/ProductDetailView";
import { mapDanhGiaToReview } from "../services/mappers";

function toIsoRange(pickupDate: string, pickupHour: string, returnDate: string, returnHour: string) {
  const start = new Date(`${pickupDate}T${pickupHour || "09:00"}:00`);
  const end = new Date(`${returnDate}T${returnHour || "09:00"}:00`);
  return {
    gioNhan: Number.isFinite(start.getTime()) ? start.toISOString() : undefined,
    gioTra: Number.isFinite(end.getTime()) ? end.toISOString() : undefined,
  };
}

export default function ProductsView() {
  const app = useApp();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [brand, setBrand] = useState("Tất cả");
  const [sort, setSort] = useState("popular");
  const [qty, setQty] = useState(1);
  const [detailTab, setDetailTab] = useState<"specs" | "accessories" | "policy">("specs");
  const [detailReviews, setDetailReviews] = useState<Review[] | null>(null);
  const [detailSummary, setDetailSummary] = useState<TongHopDiemBackend | null>(null);
  const [detailAvail, setDetailAvail] = useState<number | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [cartSyncMsg, setCartSyncMsg] = useState<string | null>(null);

  const datesSelected = app.hasValidRentalPeriod();
  const hasBothDates = Boolean(app.pickupDate && app.returnDate);
  const categoriesRef = useRef(app.categories);
  categoriesRef.current = app.categories;
  const refreshCatalogRef = useRef(app.refreshCatalog);
  refreshCatalogRef.current = app.refreshCatalog;

  // Đồng bộ số lượng khả dụng thực tế và tìm kiếm/lọc server-side qua catalogApi khi người dùng đổi ngày/từ khóa/danh mục
  // Không đưa app.categories vào dependency để tránh vòng lặp vô hạn khi refreshCatalog cập nhật categories
  useEffect(() => {
    if (!app.realApi) return;
    const matchedCat = category !== "Tất cả" ? categoriesRef.current.find((c) => c.name === category) : undefined;
    const maDanhMuc = matchedCat && /^\d+$/.test(matchedCat.id) ? Number(matchedCat.id) : undefined;
    const tuKhoa = search.trim() || undefined;
    const range = datesSelected
      ? toIsoRange(app.pickupDate, app.pickupHour || "09:00", app.returnDate, app.returnHour || "09:00")
      : { gioNhan: undefined, gioTra: undefined };

    const timer = window.setTimeout(() => {
      void refreshCatalogRef.current?.({
        gioNhan: range.gioNhan,
        gioTra: range.gioTra,
        tuKhoa,
        maDanhMuc,
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [app.realApi, datesSelected, app.pickupDate, app.pickupHour, app.returnDate, app.returnHour, search, category]);

  // Tải đánh giá công khai & khả dụng chi tiết của sản phẩm đang xem
  useEffect(() => {
    if (!app.realApi || app.page !== "product-detail" || !app.selectedProductId) {
      setDetailReviews(null);
      setDetailSummary(null);
      setDetailAvail(null);
      return;
    }
    if (!/^\d+$/.test(app.selectedProductId)) return;
    const spId = Number(app.selectedProductId);
    let cancelled = false;
    setReviewsLoading(true);

    const { gioNhan, gioTra } = datesSelected
      ? toIsoRange(app.pickupDate, app.pickupHour || "09:00", app.returnDate, app.returnHour || "09:00")
      : { gioNhan: undefined, gioTra: undefined };

    Promise.allSettled([
      reviewApi.layDanhGiaSanPham(spId, { soMoiTrang: 20 }),
      reviewApi.layTongHopDiem(spId),
      catalogApi.layChiTietSanPham(spId, gioNhan && gioTra ? { gioNhan, gioTra } : undefined),
    ])
      .then(([revRes, sumRes, prodRes]) => {
        if (cancelled) return;
        if (revRes.status === "fulfilled") {
          setDetailReviews((revRes.value.items ?? []).map(mapDanhGiaToReview));
        }
        if (sumRes.status === "fulfilled") {
          setDetailSummary(sumRes.value);
        }
        if (prodRes.status === "fulfilled" && prodRes.value.soLuongKhaDung !== undefined) {
          setDetailAvail(prodRes.value.soLuongKhaDung);
        }
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [app.realApi, app.page, app.selectedProductId, datesSelected, app.pickupDate, app.pickupHour, app.returnDate, app.returnHour]);

  const handleAddToCartRealAware = async (productId: string, quantity: number, redirectToCart: boolean) => {
    setCartSyncMsg(null);
    app.addToCart(productId, quantity);
    if (app.realApi && app.currentUser && getAuthToken() && /^\d+$/.test(productId)) {
      try {
        if (datesSelected) {
          const { gioNhan, gioTra } = toIsoRange(
            app.pickupDate,
            app.pickupHour || "09:00",
            app.returnDate,
            app.returnHour || "09:00"
          );
          if (gioNhan && gioTra) {
            await rentalCartApi.datThoiGian(gioNhan, gioTra);
          }
        }
        await rentalCartApi.themVaoGio(Number(productId), quantity);
        await app.refreshCart?.();
      } catch (err) {
        setCartSyncMsg(err instanceof Error ? err.message : "Không thể đồng bộ giỏ thuê với máy chủ.");
        return;
      }
    }
    if (redirectToCart) app.setPage("cart");
  };

  const categories = ["Tất cả", ...Array.from(new Set(app.products.map((p) => p.category)))];
  const brands = ["Tất cả", ...Array.from(new Set(app.products.map((p) => p.brand)))];

  const filtered = app.products.filter((p) => {
    const matchCat = category === "Tất cả" || p.category === category;
    const matchBrand = brand === "Tất cả" || p.brand === brand;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchBrand && matchSearch && p.status === "active";
  }).sort((a, b) => {
    if (sort === "price-asc") return a.pricePerDay - b.pricePerDay;
    if (sort === "price-desc") return b.pricePerDay - a.pricePerDay;
    if (sort === "rating") return b.rating - a.rating;
    return b.reviews - a.reviews;
  });


  if (app.page === "product-detail" && app.selectedProductId) {
    const p = app.products.find((prod) => prod.id === app.selectedProductId);
    if (!p) return null;
    return (
      <ProductDetailView
        app={app}
        product={p}
        detailAvail={detailAvail}
        detailSummary={detailSummary}
        detailReviews={detailReviews}
        reviewsLoading={reviewsLoading}
        datesSelected={datesSelected}
        hasBothDates={hasBothDates}
        detailTab={detailTab}
        setDetailTab={setDetailTab}
        cartSyncMsg={cartSyncMsg}
        qty={qty}
        setQty={setQty}
        handleAddToCartRealAware={handleAddToCartRealAware}
      />
    );
  }
  return (
    <div className="lp-catalog-container">
      <div className="lp-breadcrumb">Trang chủ / <strong>Thuê đồ</strong></div>
      <div className="mobile-stack flex justify-between items-end gap-4 mb-5">
        <div>
          <h1 className="lp-catalog-title">Tìm đồ cho chuyến đi</h1>
          <p className="lp-catalog-subtitle">Chọn thời gian để xem số lượng có thể đặt chính xác (Tính theo block 24h làm tròn lên).</p>
        </div>
        <div className="lp-catalog-count"><strong>{filtered.length}</strong> sản phẩm phù hợp</div>
      </div>

      {/* Filter bar */}
      <div className="lp-filter-card">
        <div className="flex flex-wrap gap-3 items-end mb-3">
          <div className="lp-filter-date-group">
            <label className="lp-filter-label">Ngày nhận</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={app.pickupDate}
                onChange={(e) => app.setPickupDate(e.target.value)}
                className="lp-filter-date"
              />
              <select
                value={app.pickupHour || "09:00"}
                onChange={(e) => app.setPickupHour(e.target.value)}
                aria-label="Giờ nhận"
                className="lp-filter-hour"
              >
                {["08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
          <span className="lp-filter-arrow">→</span>
          <div className="lp-filter-date-group">
            <label className="lp-filter-label">Ngày trả</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={app.returnDate}
                onChange={(e) => app.setReturnDate(e.target.value)}
                className="lp-filter-date"
              />
              <select
                value={app.returnHour || "09:00"}
                onChange={(e) => app.setReturnHour(e.target.value)}
                aria-label="Giờ trả"
                className="lp-filter-hour"
              >
                {["08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
          <span className="lp-filter-days-pill">
            {datesSelected ? `${app.getDays()} ngày (Block 24h)` : "Chưa hợp lệ"}
          </span>
          <span className="lp-filter-search-wrap">
            <span className="lp-filter-search-icon"><Icon name="search" size={17} /></span>
            <input
              placeholder="Tìm tên, thương hiệu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="lp-filter-search-input"
            />
          </span>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            aria-label="Lọc theo thương hiệu"
            className="lp-filter-select"
          >
            {brands.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sắp xếp sản phẩm"
            className="lp-filter-select"
          >
            <option value="popular">Phổ biến nhất</option>
            <option value="rating">Đánh giá cao</option>
            <option value="price-asc">Giá thấp đến cao</option>
            <option value="price-desc">Giá cao đến thấp</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`lp-cat-pill${category === c ? " is-active" : ""}`}
            >
              {c}
            </button>
          ))}
          {(search || category !== "Tất cả" || brand !== "Tất cả") && (
            <button
              onClick={() => { setSearch(""); setCategory("Tất cả"); setBrand("Tất cả"); }}
              className="lp-filter-reset"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {!datesSelected && (
        <div className="lp-date-warning">
          ⚠ {hasBothDates ? "Khoảng thời gian không hợp lệ — ngày trả phải sau ngày nhận." : <>Chưa chọn ngày — hiển thị <strong>giá tham khảo</strong>, chưa xác nhận khả dụng thực tế.</>}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="lp-empty-card">
          <div className="lp-empty-icon"><Icon name="search" size={24} /></div>
          <h2 className="lp-empty-title">Không tìm thấy sản phẩm phù hợp</h2>
          <p className="lp-empty-desc">Thử đổi từ khóa, thương hiệu hoặc danh mục.</p>
          <button
            onClick={() => { setSearch(""); setCategory("Tất cả"); setBrand("Tất cả"); }}
            className="lp-empty-btn"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}
      <div className="grid gap-6 lp-catalog-grid">
        {filtered.map((p) => {
          const avail = app.getAvailable(p.id);
          const inCart = app.cart.find((c) => c.productId === p.id);
          const days = app.getDays();
          /* Phân nhánh màu badge theo 3 trạng thái: chưa chọn ngày, còn hàng hoặc hết hàng */
          const badgeToneClass = !datesSelected
            ? "lp-avail-badge--muted"
            : avail > 0
              ? "lp-avail-badge--ok"
              : "lp-avail-badge--out";
          return (
            <div key={p.id} className="card-hover-lift lp-product-card">
              <div className="lp-product-media lp-clickable" onClick={() => app.setSelectedProduct(p.id)}>
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
                  onClick={() => app.setSelectedProduct(p.id)}
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
                    onClick={() => { void handleAddToCartRealAware(p.id, 1, false); }}
                    className={`lp-rent-btn${inCart ? " is-in-cart" : ""}`}
                  >
                    {inCart ? `✓ ×${inCart.qty}` : "+ Thuê ngay"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
