import type React from "react";
import { useApp } from "../../App";
import { fmt, type Product } from "../../store";
import type { Review } from "../../types";

import { type TongHopDiemBackend } from "../../services/api";

interface ProductDetailViewProps {
  app: ReturnType<typeof useApp>;
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
        <div className="lp-tabs-card">
          <div className="flex border-b border-gray-200 lp-tabs-bar">
            {[
              { id: "specs" as const, label: "📋 Thông số kỹ thuật chi tiết", badge: "Chuẩn thiết bị" },
              { id: "accessories" as const, label: "🎒 Phụ kiện bàn giao kèm theo", badge: "Checklist tại quầy" },
              { id: "policy" as const, label: "🛡️ Chính sách nhận trả & bảo đảm cọc", badge: "Minh bạch 100%" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDetailTab(t.id)}
                className={`lp-tab-btn${detailTab === t.id ? " is-active" : ""}`}
              >
                <span>{t.label}</span>
                <span className="lp-tab-badge">
                  {t.badge}
                </span>
              </button>
            ))}
          </div>

          <div className="lp-tabs-body">
            {detailTab === "specs" && (
              <div>
                <h3 className="lp-tab-heading">
                  Thông số chi tiết sản phẩm {p.name}
                </h3>
                <div className="grid gap-3 lp-specs-grid">
                  {[
                    { label: "Kích thước sử dụng", value: p.dimensions || (p.capacity === "4 người" ? "240 × 210 × 140 cm" : "210 × 150 × 115 cm") },
                    { label: "Kích thước gấp gọn", value: p.specifications?.["Gấp gọn"] || "58 × 16 × 16 cm (trong túi đựng)" },
                    { label: "Trọng lượng trọn bộ", value: p.specifications?.["Trọng lượng"] || (p.category === "Lều trại" ? "3.6 kg" : p.category === "Đèn" ? "280g" : "1.2 kg") },
                    { label: "Chất liệu khung & vỏ", value: p.specifications?.["Chất liệu"] || "Vải Polyester 210T tráng bạc chống tia UV50+, khung nhôm 7001" },
                    { label: "Chỉ số chống nước", value: p.specifications?.["Chống nước"] || "PU 3000mm (chịu được mưa rào lớn)" },
                    { label: "Xuất xứ & Phân phối", value: `Chính hãng ${p.brand} · Nhập khẩu & bảo dưỡng bởi GearGo` },
                    { label: "Mức giá trị bồi thường tối đa", value: `${fmt(p.compensation)} (khi làm mất hoặc hỏng hoàn toàn thiết bị)` },
                    { label: "Chu kỳ bảo dưỡng kỹ thuật", value: "Kiểm tra khử khuẩn, tra dầu & test khung sau mỗi lần nhận trả đồ" },
                  ].map((s, idx) => (
                    <div key={idx} className="lp-spec-card">
                      <div className="lp-spec-label">{s.label}</div>
                      <div className="lp-spec-value">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailTab === "accessories" && (
              <div>
                <h3 className="lp-tab-heading lp-tab-heading--sm">
                  Danh mục phụ kiện kèm theo khi bàn giao (Checklist nghiệm thu)
                </h3>
                <p className="lp-tab-sub">
                  Quý khách và nhân viên sẽ cùng kiểm đếm số lượng các chi tiết này tại quầy theo biên bản BBBG trước khi mang về:
                </p>
                <div className="grid gap-3 lp-specs-grid">
                  {[
                    { name: "Túi đựng chuyên dụng có quai xách", qty: "1 chiếc", note: "Nguyên vẹn, khóa kéo mượt" },
                    { name: p.category === "Lều trại" ? "Thân lều chính & Lớp phủ nóc chống mưa" : "Thân thiết bị chính nguyên bản", qty: "1 bộ", note: "Không rách, sạch sẽ, thơm tho" },
                    { name: p.category === "Lều trại" ? "Bộ cọc ghim đất chống lốc gió" : "Dây sạc / Phụ kiện nguồn", qty: p.category === "Lều trại" ? "8 - 12 chiếc" : "1 sợi Type-C", note: "Thép cứng cáp, không cong vênh" },
                    { name: p.category === "Lều trại" ? "Khung nhôm hợp kim dựng chính" : "Hộp bảo vệ chống sốc", qty: p.category === "Lều trại" ? "2 - 3 thanh gấp" : "1 chiếc", note: "Khớp nối đàn hồi tốt" },
                    { name: "Dây dù phản quang buộc giằng chống gió", qty: "4 - 6 sợi", note: "Kèm khóa tăng giảm độ căng" },
                    { name: "Tờ hướng dẫn dựng & gấp gọn đồ dã ngoại", qty: "1 bản", note: "Kèm mã QR xem video hướng dẫn" },
                  ].map((acc, idx) => (
                    <div key={idx} className="lp-acc-card">
                      <div className="lp-acc-check">
                        ✓
                      </div>
                      <div>
                        <div className="lp-acc-name">{acc.name}</div>
                        <div className="lp-acc-qty">Số lượng: {acc.qty}</div>
                        <div className="lp-acc-note">{acc.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailTab === "policy" && (
              <div className="flex flex-col gap-3">
                <h3 className="lp-tab-heading lp-tab-heading--xs">
                  Chính sách nhận trả & Bảo đảm cọc tại GearGo (UC8.1)
                </h3>
                <div className="grid gap-3 lp-policy-cols">
                  <div className="lp-policy-box lp-policy-box--green">
                    <div className="lp-policy-box-title">
                      🏠 Nhận và hoàn trả trực tiếp tại cửa hàng
                    </div>
                    <ul className="lp-policy-list">
                      <li><strong>Địa chỉ:</strong> 128 Nguyễn Đình Chiểu, Phường Võ Thị Sáu, Quận 3, TP.HCM.</li>
                      <li><strong>Giờ làm việc:</strong> 08:00 – 20:00 tất cả các ngày trong tuần (kể cả Lễ, Tết).</li>
                      <li><strong>Nghiệm thu:</strong> Nhân viên hướng dẫn kiểm tra và thử thiết bị trước khi mang đi.</li>
                    </ul>
                  </div>

                  <div className="lp-policy-box lp-policy-box--blue">
                    <div className="lp-policy-box-title">
                      💳 Quy chế tiền cọc & Hoàn cọc tự động
                    </div>
                    <ul className="lp-policy-list">
                      <li><strong>Tiền cọc:</strong> Chỉ thu tạm ứng theo đơn vị chiếc, không tính theo ngày thuê.</li>
                      <li><strong>Hoàn cọc 100%:</strong> Chuyển khoản hoàn lại lập tức trong 5-15 phút sau khi nghiệm thu đồ nguyên vẹn.</li>
                      <li><strong>Biên lai điện tử:</strong> Biên bản nhận trả và phiếu hoàn cọc được gửi qua SMS / Email của quý khách.</li>
                    </ul>
                  </div>
                </div>

                <div className="lp-policy-warn">
                  <strong>🔄 Chính sách hủy đơn & Phạt trễ hạn:</strong> Hủy miễn phí nếu báo trước &gt;48 giờ; hủy trong 24-48 giờ chịu phí 30%; trả đồ trễ hạn tính hệ số phạt 150% đơn giá ngày theo quy chế toàn hệ thống.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Đánh giá từ khách hàng thực tế (UC08 / UC88–UC94) */}
        {(() => {
          const productReviews = app.realApi && detailReviews !== null
            ? detailReviews.filter((r) => r.status === "active")
            : app.reviews.filter((r) => r.productId === p.id && r.status === "active");
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
                    <div className="lp-reviews-score-stars">{"★".repeat(Math.floor(displayRating || 0))}{"☆".repeat(5 - Math.floor(displayRating || 0))}</div>
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
                          <div className="lp-review-meta">{rev.createdAt} · Đơn #{rev.orderId}</div>
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
        })()}
      </div>
    );
}
