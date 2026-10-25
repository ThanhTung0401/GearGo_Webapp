import { useState } from "react";
import { useApp } from "../App";
import { fmt } from "../store";
import Icon from "../components/Icon";

export default function ProductsView() {
  const app = useApp();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [brand, setBrand] = useState("Tất cả");
  const [sort, setSort] = useState("popular");
  const [qty, setQty] = useState(1);
  const [detailTab, setDetailTab] = useState<"specs" | "accessories" | "policy">("specs");

  const categories = ["Tất cả", ...Array.from(new Set(app.products.map((p) => p.category)))];
  const brands = ["Tất cả", ...Array.from(new Set(app.products.map((p) => p.brand)))];
  const datesSelected = app.hasValidRentalPeriod();
  const hasBothDates = Boolean(app.pickupDate && app.returnDate);

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
    const p = app.products.find((p) => p.id === app.selectedProductId)!;
    if (!p) return null;
    const avail = app.getAvailable(p.id);
    const days = app.getDays();
    const inCart = app.cart.find((c) => c.productId === p.id);

    return (
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px" }}>
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
              onClick={() => { app.addToCart(p.id, qty); app.setPage("cart"); }}
              style={{ width: "100%", background: datesSelected && avail > 0 && qty <= avail ? "var(--color-forest)" : "#9CA3AF", color: "white", padding: "14px", borderRadius: "10px", border: "none", cursor: datesSelected && avail > 0 && qty <= avail ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "1rem", marginBottom: "8px" }}
            >
              {inCart ? "✓ Đã có trong giỏ — Thêm nữa" : "Thêm vào giỏ thuê"}
            </button>

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

        {/* Đánh giá từ khách hàng thực tế (UC08) */}
        {(() => {
          const productReviews = app.reviews.filter((r) => r.productId === p.id && r.status === "active");
          return (
            <div style={{ marginTop: 40, borderTop: "1px solid var(--color-bone)", paddingTop: 28 }}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--color-bark)", marginBottom: 4 }}>
                    Đánh giá từ khách hàng ({productReviews.length})
                  </h2>
                  <p style={{ color: "#6B7280", fontSize: "0.85rem" }}>
                    Nhận xét thực tế từ khách đã thuê và hoàn tất đơn hàng
                  </p>
                </div>
                <div className="flex items-center gap-2" style={{ background: "var(--color-parchment)", padding: "8px 16px", borderRadius: 10, border: "1px solid var(--color-bone)" }}>
                  <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-bark)", fontFamily: "var(--font-mono)" }}>{p.rating}</span>
                  <div>
                    <div style={{ color: "#F59E0B", fontSize: "0.9rem" }}>{"★".repeat(Math.floor(p.rating))}{"☆".repeat(5 - Math.floor(p.rating))}</div>
                    <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>{p.reviews} lượt đánh giá</div>
                  </div>
                </div>
              </div>

              {productReviews.length === 0 ? (
                <div style={{ background: "var(--color-parchment)", borderRadius: 12, padding: 24, textAlign: "center", color: "#6B7280", fontSize: "0.9rem" }}>
                  Chưa có nhận xét nào cho thiết bị này. Hãy là người đầu tiên trải nghiệm và chia sẻ đánh giá sau khi hoàn tất chuyến đi!
                </div>
              ) : (
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                  {productReviews.map((rev) => (
                    <div key={rev.id} style={{ background: "white", borderRadius: 12, padding: 18, border: "1px solid var(--color-bone)", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-bark)" }}>{rev.customerName}</div>
                          <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>{rev.createdAt} · Đơn #{rev.orderId}</div>
                        </div>
                        <div style={{ color: "#F59E0B", fontSize: "0.85rem" }}>{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</div>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "var(--color-bark)", margin: 0, lineHeight: 1.5 }}>
                        "{rev.comment}"
                      </p>
                      {rev.response && (
                        <div style={{ background: "var(--color-parchment)", borderRadius: 10, padding: "10px 14px", fontSize: "0.8rem", color: "var(--color-bark)", border: "1px solid var(--color-bone)" }}>
                          <span style={{ display: "inline-block", background: "var(--color-forest)", color: "white", padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", fontWeight: 700, marginRight: 6 }}>GearGo phản hồi</span>
                          {rev.response}
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

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px 56px" }}>
      <div style={{ color: "#6B7280", fontSize: "0.78rem", marginBottom: 10 }}>Trang chủ / <strong style={{ color: "var(--color-bark)" }}>Thuê đồ</strong></div>
      <div className="mobile-stack flex justify-between items-end gap-4 mb-5">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--color-bark)", marginBottom: "5px" }}>Tìm đồ cho chuyến đi</h1>
          <p style={{ color: "#6B7280", fontSize: "0.86rem" }}>Chọn thời gian để xem số lượng có thể đặt chính xác (Tính theo block 24h làm tròn lên).</p>
        </div>
        <div style={{ color: "#6B7280", fontSize: "0.82rem" }}><strong style={{ color: "var(--color-bark)" }}>{filtered.length}</strong> sản phẩm phù hợp</div>
      </div>

      {/* Filter bar */}
      <div style={{ background: "white", borderRadius: "16px", padding: "16px 18px", marginBottom: "20px", border: "1px solid var(--color-bone)", boxShadow: "0 1px 3px rgba(23,46,35,0.05)" }}>
        <div className="flex flex-wrap gap-3 items-end mb-3">
          <div>
            <label style={{ fontSize: "0.7rem", color: "var(--color-bark)", display: "block", marginBottom: "3px" }}>Ngày nhận</label>
            <div className="flex gap-1">
              <input type="date" value={app.pickupDate} onChange={(e) => app.setPickupDate(e.target.value)}
                style={{ minHeight: 42, border: "1px solid var(--color-bone)", borderRadius: "8px 0 0 8px", padding: "6px 10px", fontSize: "0.85rem", background: "white" }}
              />
              <select value={app.pickupHour || "09:00"} onChange={(e) => app.setPickupHour(e.target.value)}
                aria-label="Giờ nhận"
                style={{ minHeight: 42, border: "1px solid var(--color-bone)", borderLeft: 0, borderRadius: "0 8px 8px 0", padding: "6px 8px", fontSize: "0.82rem", background: "var(--color-parchment)" }}>
                {["08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
          <span style={{ color: "var(--color-bone)", paddingBottom: "10px" }}>→</span>
          <div>
            <label style={{ fontSize: "0.7rem", color: "var(--color-bark)", display: "block", marginBottom: "3px" }}>Ngày trả</label>
            <div className="flex gap-1">
              <input type="date" value={app.returnDate} onChange={(e) => app.setReturnDate(e.target.value)}
                style={{ minHeight: 42, border: "1px solid var(--color-bone)", borderRadius: "8px 0 0 8px", padding: "6px 10px", fontSize: "0.85rem", background: "white" }}
              />
              <select value={app.returnHour || "09:00"} onChange={(e) => app.setReturnHour(e.target.value)}
                aria-label="Giờ trả"
                style={{ minHeight: 42, border: "1px solid var(--color-bone)", borderLeft: 0, borderRadius: "0 8px 8px 0", padding: "6px 8px", fontSize: "0.82rem", background: "var(--color-parchment)" }}>
                {["08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
          <span style={{ background: "var(--color-sage)", color: "white", padding: "10px 14px", borderRadius: "8px", fontSize: "0.82rem", fontWeight: 700, fontFamily: "var(--font-mono)", alignSelf: "flex-end", height: 42, display: "flex", alignItems: "center" }}>
            {datesSelected ? `${app.getDays()} ngày (Block 24h)` : "Chưa hợp lệ"}
          </span>
          <span style={{ position: "relative", flex: 1, minWidth: 210 }}>
            <span style={{ position: "absolute", left: 11, top: 12, color: "#6B7280" }}><Icon name="search" size={17} /></span>
            <input placeholder="Tìm tên, thương hiệu..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", minHeight: 42, border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 12px 7px 36px", fontSize: "0.9rem", background: "white" }} />
          </span>
          <select value={brand} onChange={(e) => setBrand(e.target.value)}
            aria-label="Lọc theo thương hiệu" style={{ minHeight: 42, border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 28px 7px 10px", background: "white", fontSize: "0.85rem" }}>
            {brands.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            aria-label="Sắp xếp sản phẩm" style={{ minHeight: 42, border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "7px 28px 7px 10px", background: "white", fontSize: "0.85rem" }}>
            <option value="popular">Phổ biến nhất</option>
            <option value="rating">Đánh giá cao</option>
            <option value="price-asc">Giá thấp đến cao</option>
            <option value="price-desc">Giá cao đến thấp</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", border: "1px solid", borderColor: category === c ? "var(--color-forest)" : "var(--color-bone)", background: category === c ? "var(--color-forest)" : "white", color: category === c ? "white" : "var(--color-bark)", cursor: "pointer" }}
            >{c}</button>
          ))}
          {(search || category !== "Tất cả" || brand !== "Tất cả") && <button onClick={() => { setSearch(""); setCategory("Tất cả"); setBrand("Tất cả"); }}
            style={{ marginLeft: "auto", minHeight: 34, padding: "4px 10px", borderRadius: "8px", border: "1px solid var(--color-bone)", background: "var(--color-parchment)", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>Xóa bộ lọc</button>}
        </div>
      </div>

      {!datesSelected && (
        <div style={{ background: "#FEF3C7", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "0.82rem", color: "#92400E", border: "1px solid #FCD34D" }}>
          ⚠ {hasBothDates ? "Khoảng thời gian không hợp lệ — ngày trả phải sau ngày nhận." : <>Chưa chọn ngày — hiển thị <strong>giá tham khảo</strong>, chưa xác nhận khả dụng thực tế.</>}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ background: "white", border: "1px solid var(--color-bone)", borderRadius: "16px", padding: "48px 24px", textAlign: "center", marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, margin: "0 auto 12px", borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--color-parchment)", color: "var(--color-forest)" }}><Icon name="search" size={24} /></div>
          <h2 style={{ fontSize: "1.1rem", color: "var(--color-bark)", marginBottom: 6 }}>Không tìm thấy sản phẩm phù hợp</h2>
          <p style={{ color: "#6B7280", fontSize: "0.84rem", marginBottom: 14 }}>Thử đổi từ khóa, thương hiệu hoặc danh mục.</p>
          <button onClick={() => { setSearch(""); setCategory("Tất cả"); setBrand("Tất cả"); }}
            style={{ border: 0, borderRadius: 8, padding: "9px 14px", background: "var(--color-forest)", color: "white", cursor: "pointer", fontWeight: 700 }}>Xóa bộ lọc</button>
        </div>
      )}
      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {filtered.map((p) => {
          const avail = app.getAvailable(p.id);
          const inCart = app.cart.find((c) => c.productId === p.id);
          const days = app.getDays();
          return (
            <div key={p.id}
              className="card-hover-lift"
              style={{
                background: "white",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid var(--color-bone)",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div style={{ position: "relative", height: 200, background: "var(--color-parchment)", overflow: "hidden", cursor: "pointer" }} onClick={() => app.setSelectedProduct(p.id)}>
                <img src={p.image} alt={p.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                />
                <div style={{
                  position: "absolute", top: 12, right: 12,
                  background: !datesSelected ? "rgba(107, 114, 128, 0.9)" : avail > 0 ? "rgba(27, 63, 47, 0.92)" : "rgba(239, 68, 68, 0.92)",
                  backdropFilter: "blur(6px)",
                  color: "white", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: "999px"
                }}>
                  {!datesSelected ? "Giá tham khảo" : avail > 0 ? `● Còn ${avail}` : "Hết hàng"}
                </div>
                {p.name.includes("Tiết kiệm") && (
                  <div style={{
                    position: "absolute", top: 12, left: 12,
                    background: "linear-gradient(135deg, #E07A43 0%, #D46931 100%)",
                    color: "white", fontSize: "0.68rem", padding: "3px 9px", borderRadius: "8px", fontWeight: 800,
                    boxShadow: "0 2px 8px rgba(224, 122, 67, 0.35)"
                  }}>
                    TIẾT KIỆM
                  </div>
                )}
              </div>
              <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--color-moss)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
                  {p.category}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", color: "var(--color-bark)", cursor: "pointer", marginBottom: 3 }} onClick={() => app.setSelectedProduct(p.id)}>
                  {p.name}
                </div>
                <div style={{ fontSize: "0.74rem", color: "#6B7280", marginBottom: "8px" }}>
                  Thương hiệu: <strong style={{ color: "var(--color-bark)" }}>{p.brand}</strong>
                </div>
                <div className="flex items-center gap-1.5 mb-4">
                  <span style={{ color: "#F59E0B", fontSize: "0.8rem" }}>{"★".repeat(Math.floor(p.rating))}</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-bark)" }}>{p.rating}</span>
                  <span style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>({p.reviews} đánh giá)</span>
                </div>
                <div className="flex justify-between items-end mt-auto pt-3" style={{ borderTop: "1px solid var(--color-parchment)" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: "var(--color-forest)", fontSize: "1.05rem" }}>
                      {fmt(p.pricePerDay)}<span style={{ fontSize: "0.72rem", fontWeight: 500, color: "#6B7280" }}> / ngày</span>
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>Cọc: {fmt(p.deposit)}</div>
                    {datesSelected && days > 1 && (
                      <div style={{ fontSize: "0.74rem", color: "var(--color-amber)", fontWeight: 700, marginTop: 2 }}>
                        Tổng {days} ngày: {fmt(p.pricePerDay * days)}
                      </div>
                    )}
                  </div>
                  <button
                    disabled={!datesSelected || avail === 0}
                    onClick={() => app.addToCart(p.id)}
                    style={{
                      background: inCart ? "var(--color-moss)" : "var(--color-forest)",
                      color: "white",
                      padding: "9px 16px",
                      borderRadius: "10px",
                      border: "none",
                      cursor: (!datesSelected || avail === 0) ? "not-allowed" : "pointer",
                      fontSize: "0.84rem",
                      fontWeight: 700,
                      opacity: (!datesSelected || avail === 0) ? 0.5 : 1,
                      boxShadow: (!datesSelected || avail === 0) ? "none" : "0 4px 12px rgba(27, 63, 47, 0.25)",
                      transition: "all 0.2s ease"
                    }}
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
