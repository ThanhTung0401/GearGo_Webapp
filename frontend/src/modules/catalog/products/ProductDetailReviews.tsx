import type { Review } from "../../../types";
import { formatDateVi } from "../../../store";

interface ProductDetailReviewsProps {
  productReviews: Review[];
  displayRating: number;
  displayReviewCount: number;
  reviewsLoading: boolean;
}

/**
 * Khối đánh giá công khai từ khách hàng đã hoàn tất đơn thuê (UC08 / UC9.1.2 / UC9.2).
 */
export function ProductDetailReviews({
  productReviews,
  displayRating,
  displayReviewCount,
  reviewsLoading,
}: ProductDetailReviewsProps) {
  return (
    <div className="lp-reviews-section">
      <div className="flex justify-between items-center mb-6 lp-reviews-header">
        <div>
          <h2 className="lp-reviews-title">
            Đánh giá từ khách hàng ({displayReviewCount || productReviews.length})
          </h2>
          <p className="lp-reviews-sub">
            Nhận xét thực tế từ khách đã thuê và hoàn tất đơn hàng
          </p>
        </div>
        <div className="flex items-center gap-2 lp-reviews-score-box">
          <span className="lp-reviews-score-num">{Number(displayRating || 0).toFixed(1)}</span>
          <div>
            <div className="lp-reviews-score-stars">
              {"★".repeat(Math.floor(displayRating || 0))}{"☆".repeat(5 - Math.floor(displayRating || 0))}
            </div>
            <div className="lp-reviews-score-count">{displayReviewCount} lượt đánh giá</div>
          </div>
        </div>
      </div>

      {reviewsLoading ? (
        <div className="lp-reviews-empty">
          Đang tải đánh giá từ khách hàng...
        </div>
      ) : productReviews.length === 0 ? (
        <div className="lp-reviews-empty">
          Chưa có nhận xét nào cho thiết bị này. Hãy là người đầu tiên trải nghiệm và chia sẻ đánh giá sau khi hoàn tất chuyến đi!
        </div>
      ) : (
        <div className="grid gap-4 lp-reviews-grid">
          {productReviews.map((rev) => (
            <div key={rev.id} className="lp-review-card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="lp-review-author-row">
                    <span className="lp-review-author">{rev.customerName}</span>
                    <span className="lp-review-verified">✓ Khách thuê thực tế</span>
                  </div>
                  <div className="lp-review-meta">{formatDateVi(rev.createdAt)} · Đơn #{rev.orderId}</div>
                </div>
                <div className="lp-review-stars">{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</div>
              </div>
              <p className="lp-review-comment">
                "{rev.comment}"
              </p>

              {/* Hiển thị ảnh dã ngoại thực tế (UC9.1.2) */}
              {rev.images && rev.images.length > 0 && (
                <div className="lp-review-photos">
                  {rev.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Ảnh thực tế ${idx + 1}`}
                      className="lp-review-photo"
                      onClick={() => window.open(img, "_blank")}
                      title="Click để xem ảnh lớn"
                    />
                  ))}
                </div>
              )}

              {/* Phản hồi chính thức từ GearGo (UC9.2) */}
              {(rev.storeResponse || rev.response) && (
                <div className="lp-review-reply">
                  <div className="lp-review-reply-head">
                    <span className="lp-review-reply-brand">
                      <span className="lp-review-reply-badge">GearGo</span>
                      {rev.storeResponse?.respondedBy || "Cửa hàng"} phản hồi:
                    </span>
                    <span className="lp-review-reply-date">{rev.storeResponse?.respondedAt}</span>
                  </div>
                  <div className="lp-review-reply-body">{rev.storeResponse?.response || rev.response}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
