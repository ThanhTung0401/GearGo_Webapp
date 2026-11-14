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
                    onClick={() => { void handleAddToCartRealAware(p.id, 1, false); }}
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
