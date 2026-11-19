import type React from "react";
import type { AppState } from "../../../context/AppContext";
import { fmt, type Product } from "../../../store";
import type { Review } from "../../../types";
import type { TongHopDiemBackend } from "../../../services/api";
import { ProductDetailTabs } from "./ProductDetailTabs";
import { ProductDetailReviews } from "./ProductDetailReviews";

export interface ProductDetailViewProps {
  app: AppState;
  product: Product;
  detailAvail: number | null;
  detailSummary: TongHopDiemBackend | null;
  detailReviews: Review[] | null;
  reviewsLoading: boolean;
  datesSelected: boolean;
  hasBothDates: boolean;
  detailTab: "specs" | "accessories" | "policy";
  setDetailTab: (tab: "specs" | "accessories" | "policy") => void;
  cartSyncMsg: string | null;
  qty: number;
  setQty: React.Dispatch<React.SetStateAction<number>>;
  handleAddToCartRealAware: (productId: string, quantity: number, redirectToCart: boolean) => Promise<void>;
}

/**
 * Trang Chi tiết sản phẩm thuê: hình ảnh, báo giá theo ngày, kiểm tra khả dụng, thông số kỹ thuật và đánh giá (UC2.2 & UC2.3).
 */
export function ProductDetailView({
  app,
  product: p,
  detailAvail,
  detailSummary,
  detailReviews,
  reviewsLoading,
  datesSelected,
  hasBothDates,
  detailTab,
  setDetailTab,
  cartSyncMsg,
  qty,
  setQty,
  handleAddToCartRealAware,
}: ProductDetailViewProps) {
  const avail = app.realApi && detailAvail !== null ? detailAvail : app.getAvailable(p.id);
  const days = app.getDays();
  const inCart = app.cart.find((c) => c.productId === p.id);
  const displayRating = detailSummary?.diemTrungBinh ?? p.rating;
  const displayReviewCount = detailSummary?.tongSoDanhGia ?? p.reviews;

  /* Phân nhánh trạng thái khả dụng cho banner thông báo */
  const availBannerClass = !datesSelected
    ? "lp-detail-avail-banner"
    : avail > 0
      ? "lp-detail-avail-banner is-available"
      : "lp-detail-avail-banner is-unavailable";

  const productReviews =
    app.realApi && detailReviews !== null
      ? detailReviews.filter((r) => r.status === "active")
      : app.reviews.filter((r) => r.productId === p.id && r.status === "active");

  return (
    <div className="lp-detail-container">
      <button onClick={() => app.setPage("products")} className="lp-detail-back">
        ← Quay lại danh sách
      </button>
      <div className="responsive-two-column grid gap-8 lp-detail-grid">
        <div>
          <div className="lp-detail-hero-box">
            <img src={p.image} alt={p.name} className="lp-detail-hero-img" />
          </div>
          {(p.images?.length ?? 0) > 1 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {p.images?.slice(0, 5).map((url, index) => (
                <img
                  key={`${url}-${index}`}
                  src={url}
                  alt={`${p.name} ${index + 1}`}
                  className={`lp-detail-thumb${index === 0 ? " is-active" : ""}`}
                />
              ))}
            </div>
          )}
          <p className="lp-detail-photo-note">Ảnh minh họa mức sản phẩm; thiết bị cụ thể được nhân viên phân công khi chuẩn bị đơn.</p>
        </div>
        <div>
          <div className="lp-detail-cat">{p.category}</div>
          <h1 className="lp-detail-title">{p.name}</h1>
          <div className="lp-detail-meta">{p.brand} · {p.capacity}</div>
          <div className="flex items-center gap-1 mb-4">
            <span className="lp-detail-stars">{"★".repeat(Math.floor(p.rating))}</span>
            <span className="lp-detail-rating">{p.rating} ({p.reviews} đánh giá)</span>
          </div>
          <p className="lp-detail-desc">{p.description}</p>

          <div className="lp-detail-price-box">
            <div className="flex justify-between mb-2">
              <span className="lp-detail-price-label">Giá thuê</span>
              <span className="lp-detail-price-val">
                {fmt(p.pricePerDay)}<span className="lp-detail-price-unit">/ngày</span>
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="lp-detail-price-label">Tiền cọc/chiếc</span>
              <span className="lp-detail-deposit-val">{fmt(p.deposit)}</span>
            </div>
            {datesSelected && (
              <div className="lp-detail-subtotal-box">
                <div className="flex justify-between">
                  <span className="lp-detail-price-label">{days} ngày × {qty} chiếc</span>
                  <span className="lp-detail-subtotal-val">{fmt(p.pricePerDay * days * qty)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="lp-detail-price-label">Cọc × {qty} chiếc</span>
                  <span className="lp-detail-subdeposit-val">{fmt(p.deposit * qty)}</span>
                </div>
              </div>
            )}
          </div>

          <div className={availBannerClass}>
            <span>{!datesSelected ? "i" : avail > 0 ? "✓" : "✗"}</span>
            <span className="lp-detail-avail-text">
              {datesSelected
                ? avail > 0 ? `Còn ${avail} chiếc cho khoảng ngày đã chọn` : "Hết hàng trong khoảng ngày này"
                : "Chọn ngày để xem khả dụng thực tế"}
            </span>
          </div>

          {/* Qty selector */}
          <div className="flex items-center gap-3 mb-4">
            <span className="lp-detail-qty-label">Số lượng:</span>
            <div className="flex items-center gap-2">
              <button
                disabled={!datesSelected}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="lp-detail-qty-btn"
              >−</button>
              <span className="lp-detail-qty-val">{qty}</span>
              <button
                disabled={!datesSelected || qty >= avail}
                onClick={() => setQty((q) => Math.min(avail, q + 1))}
                className="lp-detail-qty-btn"
              >+</button>
            </div>
            {qty > avail && avail > 0 && <span className="lp-detail-qty-warn">Chỉ còn {avail} chiếc</span>}
          </div>

          <button
            disabled={!datesSelected || avail === 0 || qty > avail}
            onClick={() => { void handleAddToCartRealAware(p.id, qty, true); }}
            className="lp-detail-add-btn"
          >
            {inCart ? "✓ Đã có trong giỏ — Thêm nữa" : "Thêm vào giỏ thuê"}
          </button>
          {cartSyncMsg && (
            <div className="lp-detail-error">{cartSyncMsg}</div>
          )}

          {!datesSelected && (
            <p className="lp-detail-date-hint">
              ⚠ {hasBothDates ? "Ngày trả phải sau ngày nhận" : "Chọn ngày nhận/trả để xem số lượng còn nhận đặt"}
            </p>
          )}

          <div className="lp-detail-note">
            <strong>📌 Lưu ý:</strong> Giá tham khảo — không cam kết còn hàng đến khi đặt đơn và thanh toán. Giỏ thuê không giữ số lượng.
          </div>
        </div>
      </div>

      {/* Khối Tabs Thông số kỹ thuật, Phụ kiện & Chính sách nhận trả (UC2.2) */}
      <ProductDetailTabs
        product={p}
        detailTab={detailTab}
        setDetailTab={setDetailTab}
      />

      {/* Đánh giá từ khách hàng thực tế (UC08 / UC88–UC94) */}
      <ProductDetailReviews
        productReviews={productReviews}
        displayRating={displayRating}
        displayReviewCount={displayReviewCount}
        reviewsLoading={reviewsLoading}
      />
    </div>
  );
}
