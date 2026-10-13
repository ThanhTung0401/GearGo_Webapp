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
                        <div style={{ background: "#F3F4F6", borderRadius: 8, padding: "8px 12px", fontSize: "0.78rem", color: "#374151", borderLeft: "3px solid var(--color-forest)" }}>
                          <strong style={{ color: "var(--color-forest)" }}>GearGo phản hồi:</strong> {rev.response}
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
      <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))" }}>
        {filtered.map((p) => {
          const avail = app.getAvailable(p.id);
          const inCart = app.cart.find((c) => c.productId === p.id);
          const days = app.getDays();
          return (
            <div key={p.id} style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--color-bone)" }} className="hover:shadow-lg transition-shadow">
              <div style={{ position: "relative", height: 180, background: "var(--color-parchment)", cursor: "pointer" }} onClick={() => app.setSelectedProduct(p.id)}>
                <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <span style={{
                  position: "absolute", top: 10, right: 10,
                  background: !datesSelected ? "#6B7280" : avail > 0 ? "var(--color-forest)" : "#EF4444",
                  color: "white", fontSize: "0.7rem", padding: "2px 9px", borderRadius: "10px", fontFamily: "var(--font-mono)"
                }}>
                  {!datesSelected ? "Giá tham khảo" : avail > 0 ? `Còn ${avail}` : "Hết hàng"}
                </span>
                {p.name.includes("Tiết kiệm") && (
                  <span style={{ position: "absolute", top: 10, left: 10, background: "var(--color-amber)", color: "white", fontSize: "0.65rem", padding: "2px 7px", borderRadius: "8px", fontWeight: 700 }}>
                    TIẾT KIỆM
                  </span>
                )}
              </div>
              <div style={{ padding: "14px" }}>
                <div style={{ fontSize: "0.68rem", color: "var(--color-moss)", fontWeight: 700, textTransform: "uppercase" }}>{p.category}</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1rem", color: "var(--color-bark)", cursor: "pointer" }} onClick={() => app.setSelectedProduct(p.id)}>{p.name}</div>
                <div style={{ fontSize: "0.72rem", color: "#9CA3AF", marginBottom: "6px" }}>{p.brand}</div>
                <div className="flex items-center gap-1 mb-3">
                  <span style={{ color: "#F59E0B", fontSize: "0.75rem" }}>{"★".repeat(Math.floor(p.rating))}</span>
                  <span style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>{p.rating} ({p.reviews})</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)", fontSize: "0.95rem" }}>{fmt(p.pricePerDay)}<span style={{ fontSize: "0.68rem", fontWeight: 400 }}>/ngày</span></div>
                    <div style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>Cọc {fmt(p.deposit)}</div>
                    {datesSelected && days > 1 && <div style={{ fontSize: "0.75rem", color: "var(--color-amber)", fontWeight: 600 }}>{days}n = {fmt(p.pricePerDay * days)}</div>}
                  </div>
                  <button
                    disabled={!datesSelected || avail === 0}
                    onClick={() => app.addToCart(p.id)}
                    style={{ background: inCart ? "var(--color-moss)" : "var(--color-forest)", color: "white", padding: "8px 12px", borderRadius: "8px", border: "none", cursor: (!datesSelected || avail === 0) ? "not-allowed" : "pointer", fontSize: "0.8rem", fontWeight: 600, opacity: (!datesSelected || avail === 0) ? 0.5 : 1 }}
                  >
                    {inCart ? `✓ ×${inCart.qty}` : "+ Thêm"}
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
