import type React from "react";
import { useApp } from "../../App";
import { fmt, type Product } from "../../store";
import type { Review } from "../../types";
import Icon from "../../components/Icon";
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

  return (      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px" }}>
        <button onClick={() => app.setPage("products")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-forest)", fontWeight: 600, marginBottom: "20px", fontSize: "0.9rem" }}
        >
          ← Quay lại danh sách
        </button>
        <div className="responsive-two-column grid gap-8" style={{ gridTemplateColumns: "1fr 380px" }}>
          <div>
            <div style={{ borderRadius: "14px", overflow: "hidden", height: 360, background: "var(--color-parchment)" }}>
              <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            {(p.images?.length ?? 0) > 1 && <div className="flex gap-2 mt-3">{p.images?.slice(0, 5).map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${p.name} ${index + 1}`} style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 8, border: `2px solid ${index === 0 ? "var(--color-forest)" : "var(--color-bone)"}` }} />)}</div>}
            <p style={{ color: "#6B7280", fontSize: "0.72rem", marginTop: 8 }}>Ảnh minh họa mức sản phẩm; thiết bị cụ thể được nhân viên phân công khi chuẩn bị đơn.</p>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-moss)", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>{p.category}</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--color-bark)", lineHeight: 1.2, marginBottom: "8px" }}>{p.name}</h1>
            <div style={{ fontSize: "0.82rem", color: "#6B7280", marginBottom: "8px" }}>{p.brand} · {p.capacity}</div>
            <div className="flex items-center gap-1 mb-4">
              <span style={{ color: "#F59E0B" }}>{"★".repeat(Math.floor(p.rating))}</span>
              <span style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>{p.rating} ({p.reviews} đánh giá)</span>
            </div>
            <p style={{ color: "#6B7280", lineHeight: 1.6, marginBottom: "16px" }}>{p.description}</p>

            <div style={{ background: "var(--color-parchment)", borderRadius: "10px", padding: "14px 16px", marginBottom: "16px", border: "1px solid var(--color-bone)" }}>
              <div className="flex justify-between mb-2">
                <span style={{ color: "#6B7280", fontSize: "0.85rem" }}>Giá thuê</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", fontSize: "1.1rem" }}>{fmt(p.pricePerDay)}<span style={{ fontSize: "0.75rem", fontWeight: 400 }}>/ngày</span></span>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: "#6B7280", fontSize: "0.85rem" }}>Tiền cọc/chiếc</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>{fmt(p.deposit)}</span>
              </div>
              {datesSelected && (
                <>
                  <div style={{ borderTop: "1px dashed var(--color-bone)", marginTop: "8px", paddingTop: "8px" }}>
                    <div className="flex justify-between">
                      <span style={{ color: "#6B7280", fontSize: "0.85rem" }}>{app.getDays()} ngày × {qty} chiếc</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-amber)" }}>{fmt(p.pricePerDay * app.getDays() * qty)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "#6B7280", fontSize: "0.85rem" }}>Cọc × {qty} chiếc</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>{fmt(p.deposit * qty)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ background: !datesSelected ? "var(--color-parchment)" : avail > 0 ? "#DCFCE7" : "#FEE2E2", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>{!datesSelected ? "i" : avail > 0 ? "✓" : "✗"}</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: !datesSelected ? "var(--color-bark)" : avail > 0 ? "#15803D" : "#DC2626" }}>
                {datesSelected
                  ? avail > 0 ? `Còn ${avail} chiếc cho khoảng ngày đã chọn` : "Hết hàng trong khoảng ngày này"
                  : "Chọn ngày để xem khả dụng thực tế"}
              </span>
            </div>

            {/* Qty selector */}
            <div className="flex items-center gap-3 mb-4">
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-bark)" }}>Số lượng:</span>
              <div className="flex items-center gap-2">
                <button disabled={!datesSelected} onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--color-bone)", background: "white", cursor: datesSelected ? "pointer" : "not-allowed", fontWeight: 700 }}>−</button>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, width: 24, textAlign: "center" }}>{qty}</span>
                <button disabled={!datesSelected || qty >= avail} onClick={() => setQty((q) => Math.min(avail, q + 1))} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--color-bone)", background: "white", cursor: datesSelected && qty < avail ? "pointer" : "not-allowed", fontWeight: 700 }}>+</button>
              </div>
              {qty > avail && avail > 0 && <span style={{ fontSize: "0.78rem", color: "#DC2626" }}>Chỉ còn {avail} chiếc</span>}
            </div>

            <button
              disabled={!datesSelected || avail === 0 || qty > avail}
              onClick={() => { void handleAddToCartRealAware(p.id, qty, true); }}
              style={{ width: "100%", background: datesSelected && avail > 0 && qty <= avail ? "var(--color-forest)" : "#9CA3AF", color: "white", padding: "14px", borderRadius: "10px", border: "none", cursor: datesSelected && avail > 0 && qty <= avail ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "1rem", marginBottom: "8px" }}
            >
              {inCart ? "✓ Đã có trong giỏ — Thêm nữa" : "Thêm vào giỏ thuê"}
            </button>
            {cartSyncMsg && (
              <div style={{ fontSize: "0.78rem", color: "#DC2626", textAlign: "center", marginBottom: 6 }}>{cartSyncMsg}</div>
            )}

            {!datesSelected && (
              <p style={{ fontSize: "0.78rem", color: "var(--color-amber)", textAlign: "center" }}>⚠ {hasBothDates ? "Ngày trả phải sau ngày nhận" : "Chọn ngày nhận/trả để xem số lượng còn nhận đặt"}</p>
            )}

            <div style={{ marginTop: "16px", background: "#EFF6FF", borderRadius: "8px", padding: "10px 14px", fontSize: "0.78rem", color: "#1E40AF" }}>
              <strong>📌 Lưu ý:</strong> Giá tham khảo — không cam kết còn hàng đến khi đặt đơn và thanh toán. Giỏ thuê không giữ số lượng.
            </div>
          </div>
        </div>

        {/* Khối Tabs Thông số kỹ thuật, Phụ kiện & Chính sách nhận trả (UC2.2) */}
        <div style={{ marginTop: 32, background: "white", borderRadius: 16, border: "1px solid var(--color-bone)", overflow: "hidden" }}>
          <div className="flex border-b border-gray-200" style={{ background: "var(--color-parchment)", padding: "0 16px", overflowX: "auto" }}>
            {[
              { id: "specs" as const, label: "📋 Thông số kỹ thuật chi tiết", badge: "Chuẩn thiết bị" },
              { id: "accessories" as const, label: "🎒 Phụ kiện bàn giao kèm theo", badge: "Checklist tại quầy" },
              { id: "policy" as const, label: "🛡️ Chính sách nhận trả & bảo đảm cọc", badge: "Minh bạch 100%" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDetailTab(t.id)}
                style={{
                  padding: "14px 20px",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  borderBottom: detailTab === t.id ? "3px solid var(--color-forest)" : "3px solid transparent",
                  color: detailTab === t.id ? "var(--color-forest)" : "#6B7280",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease"
                }}
              >
                <span>{t.label}</span>
                <span style={{ fontSize: "0.68rem", padding: "2px 7px", borderRadius: 6, background: detailTab === t.id ? "rgba(27,63,47,0.12)" : "#E5E7EB", color: detailTab === t.id ? "var(--color-forest)" : "#6B7280", fontWeight: 600 }}>
                  {t.badge}
                </span>
              </button>
            ))}
          </div>

          <div style={{ padding: 24 }}>
            {detailTab === "specs" && (
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 12 }}>
                  Thông số chi tiết sản phẩm {p.name}
                </h3>
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
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
                    <div key={idx} style={{ background: "var(--color-parchment)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--color-bone)" }}>
                      <div style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: 3 }}>{s.label}</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-bark)" }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailTab === "accessories" && (
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 6 }}>
                  Danh mục phụ kiện kèm theo khi bàn giao (Checklist nghiệm thu)
                </h3>
                <p style={{ fontSize: "0.82rem", color: "#6B7280", marginBottom: 14 }}>
                  Quý khách và nhân viên sẽ cùng kiểm đếm số lượng các chi tiết này tại quầy theo biên bản BBBG trước khi mang về:
                </p>
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {[
                    { name: "Túi đựng chuyên dụng có quai xách", qty: "1 chiếc", note: "Nguyên vẹn, khóa kéo mượt" },
                    { name: p.category === "Lều trại" ? "Thân lều chính & Lớp phủ nóc chống mưa" : "Thân thiết bị chính nguyên bản", qty: "1 bộ", note: "Không rách, sạch sẽ, thơm tho" },
                    { name: p.category === "Lều trại" ? "Bộ cọc ghim đất chống lốc gió" : "Dây sạc / Phụ kiện nguồn", qty: p.category === "Lều trại" ? "8 - 12 chiếc" : "1 sợi Type-C", note: "Thép cứng cáp, không cong vênh" },
                    { name: p.category === "Lều trại" ? "Khung nhôm hợp kim dựng chính" : "Hộp bảo vệ chống sốc", qty: p.category === "Lều trại" ? "2 - 3 thanh gấp" : "1 chiếc", note: "Khớp nối đàn hồi tốt" },
                    { name: "Dây dù phản quang buộc giằng chống gió", qty: "4 - 6 sợi", note: "Kèm khóa tăng giảm độ căng" },
                    { name: "Tờ hướng dẫn dựng & gấp gọn đồ dã ngoại", qty: "1 bản", note: "Kèm mã QR xem video hướng dẫn" },
                  ].map((acc, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--color-forest)", color: "white", display: "grid", placeItems: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
                        ✓
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.86rem", color: "var(--color-bark)" }}>{acc.name}</div>
                        <div style={{ fontSize: "0.76rem", color: "var(--color-forest)", fontWeight: 600 }}>Số lượng: {acc.qty}</div>
                        <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>{acc.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailTab === "policy" && (
              <div className="flex flex-col gap-3">
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
                  Chính sách nhận trả & Bảo đảm cọc tại GearGo (UC8.1)
                </h3>
                <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, color: "#166534", fontSize: "0.88rem", marginBottom: 6 }}>
                      🏠 Nhận và hoàn trả trực tiếp tại cửa hàng
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.8rem", color: "#14532D", lineHeight: 1.6 }}>
                      <li><strong>Địa chỉ:</strong> 128 Nguyễn Đình Chiểu, Phường Võ Thị Sáu, Quận 3, TP.HCM.</li>
                      <li><strong>Giờ làm việc:</strong> 08:00 – 20:00 tất cả các ngày trong tuần (kể cả Lễ, Tết).</li>
                      <li><strong>Nghiệm thu:</strong> Nhân viên hướng dẫn kiểm tra và thử thiết bị trước khi mang đi.</li>
                    </ul>
                  </div>

                  <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, color: "#1E40AF", fontSize: "0.88rem", marginBottom: 6 }}>
                      💳 Quy chế tiền cọc & Hoàn cọc tự động
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.8rem", color: "#1E3A8A", lineHeight: 1.6 }}>
                      <li><strong>Tiền cọc:</strong> Chỉ thu tạm ứng theo đơn vị chiếc, không tính theo ngày thuê.</li>
                      <li><strong>Hoàn cọc 100%:</strong> Chuyển khoản hoàn lại lập tức trong 5-15 phút sau khi nghiệm thu đồ nguyên vẹn.</li>
                      <li><strong>Biên lai điện tử:</strong> Biên bản nhận trả và phiếu hoàn cọc được gửi qua SMS / Email của quý khách.</li>
                    </ul>
                  </div>
                </div>

                <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "12px 16px", fontSize: "0.8rem", color: "#92400E" }}>
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
            <div style={{ marginTop: 40, borderTop: "1px solid var(--color-bone)", paddingTop: 28 }}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
                    Đánh giá từ khách hàng ({displayReviewCount || productReviews.length})
                  </h2>
                  <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
                    Nhận xét thực tế từ khách đã thuê và hoàn tất đơn hàng
                  </p>
                </div>
                <div className="flex items-center gap-2" style={{ background: "var(--color-parchment)", padding: "8px 16px", borderRadius: 10, border: "1px solid var(--color-bone)" }}>
                  <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-bark)", fontFamily: "var(--font-mono)" }}>{Number(displayRating || 0).toFixed(1)}</span>
                  <div>
                    <div style={{ color: "#F59E0B", fontSize: "0.9rem" }}>{"★".repeat(Math.floor(displayRating || 0))}{"☆".repeat(5 - Math.floor(displayRating || 0))}</div>
                    <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>{displayReviewCount} lượt đánh giá</div>
                  </div>
                </div>
              </div>

              {reviewsLoading ? (
                <div style={{ background: "var(--color-parchment)", borderRadius: 12, padding: 24, textAlign: "center", color: "#6B7280", fontSize: "0.9rem" }}>
                  Đang tải đánh giá từ khách hàng...
                </div>
              ) : productReviews.length === 0 ? (
                <div style={{ background: "var(--color-parchment)", borderRadius: 12, padding: 24, textAlign: "center", color: "#6B7280", fontSize: "0.9rem" }}>
                  Chưa có nhận xét nào cho thiết bị này. Hãy là người đầu tiên trải nghiệm và chia sẻ đánh giá sau khi hoàn tất chuyến đi!
                </div>
              ) : (
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                  {productReviews.map((rev) => (
                    <div key={rev.id} style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-bark)" }}>{rev.customerName}</span>
                            <span style={{ fontSize: "0.68rem", background: "#ECFDF5", color: "#059669", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>✓ Khách thuê thực tế</span>
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>{rev.createdAt} · Đơn #{rev.orderId}</div>
                        </div>
                        <div style={{ color: "#F59E0B", fontSize: "0.85rem" }}>{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</div>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "var(--color-bark)", margin: 0, lineHeight: 1.5 }}>
                        "{rev.comment}"
                      </p>

                      {/* Hiển thị ảnh dã ngoại thực tế (UC9.1.2) */}
                      {rev.images && rev.images.length > 0 && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                          {rev.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Ảnh thực tế ${idx + 1}`}
                              style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #E2E8F0", cursor: "pointer" }}
                              onClick={() => window.open(img, "_blank")}
                              title="Click để xem ảnh lớn"
                            />
                          ))}
                        </div>
                      )}

                      {/* Phản hồi chính thức từ GearGo (UC9.2) */}
                      {(rev.storeResponse || rev.response) && (
                        <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", fontSize: "0.8rem", color: "#166534", borderLeft: "3px solid #16A34A" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", fontWeight: 700, marginBottom: 4 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <span style={{ background: "var(--color-forest)", color: "white", padding: "1px 6px", borderRadius: 3, fontSize: "0.68rem" }}>GearGo</span>
                              {rev.storeResponse?.respondedBy || "Cửa hàng"} phản hồi:
                            </span>
                            <span style={{ color: "#64748B", fontWeight: 400 }}>{rev.storeResponse?.respondedAt}</span>
                          </div>
                          <div style={{ lineHeight: 1.45 }}>{rev.storeResponse?.response || rev.response}</div>
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
