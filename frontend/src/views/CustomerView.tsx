import { useState } from "react";
import { products } from "../data/mockData";

type CartItem = {
  productId: string;
  name: string;
  qty: number;
  pricePerDay: number;
  deposit: number;
};

type Step = "browse" | "cart" | "checkout" | "confirmed";

const statusColor: Record<string, string> = {
  browse: "#6B8F5E",
  cart: "#C47B2B",
  checkout: "#2A4A2E",
  confirmed: "#2A4A2E",
};

const fmt = (n: number) => n.toLocaleString("vi-VN") + "đ";

export default function CustomerView() {
  const [step, setStep] = useState<Step>("browse");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [pickupDate, setPickupDate] = useState("2024-12-10");
  const [returnDate, setReturnDate] = useState("2024-12-13");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  const categories = ["Tất cả", ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    const matchCat = category === "Tất cả" || p.category === category;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const days = Math.max(1, Math.ceil((new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / 86400000));

  const addToCart = (p: typeof products[0]) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === p.id);
      if (existing) return prev.map((c) => c.productId === p.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { productId: p.id, name: p.name, qty: 1, pricePerDay: p.pricePerDay, deposit: p.deposit }];
    });
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((c) => c.productId !== id));
  const updateQty = (id: string, delta: number) =>
    setCart((prev) => prev.map((c) => c.productId === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c));

  const rentalTotal = cart.reduce((s, c) => s + c.pricePerDay * c.qty * days, 0);
  const depositTotal = cart.reduce((s, c) => s + c.deposit * c.qty, 0);
  const discount = promoApplied ? Math.round(rentalTotal * 0.1) : 0;
  const grandTotal = rentalTotal - discount + depositTotal;

  const applyPromo = () => {
    if (promoCode === "CAMPGO10") setPromoApplied(true);
  };

  const confirmOrder = () => {
    setOrderConfirmed(true);
    setStep("confirmed");
  };

  if (step === "confirmed") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <div className="text-6xl">🎉</div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--color-forest)", marginBottom: "8px" }}>
            Đặt thuê thành công!
          </h2>
          <p style={{ color: "var(--color-bark)", marginBottom: "4px" }}>
            Mã đơn: <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>DT-20241210-015</span>
          </p>
          <p style={{ color: "var(--color-bark)", fontSize: "0.9rem" }}>
            Hạn thanh toán còn lại: <span style={{ color: "var(--color-amber)", fontWeight: 600 }}>14:32</span>
          </p>
        </div>
        <div style={{ background: "var(--color-parchment)", borderRadius: "12px", padding: "20px 28px", minWidth: 320, border: "1px solid var(--color-bone)" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--color-bark)", marginBottom: "8px" }}>Tóm tắt đơn hàng:</p>
          {cart.map((c) => (
            <div key={c.productId} className="flex justify-between" style={{ fontSize: "0.9rem", padding: "4px 0", borderBottom: "1px solid var(--color-bone)" }}>
              <span>{c.name} ×{c.qty} ({days}n)</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{fmt(c.pricePerDay * c.qty * days)}</span>
            </div>
          ))}
          <div className="flex justify-between" style={{ marginTop: "8px", fontWeight: 600 }}>
            <span>Tổng thanh toán ban đầu</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{fmt(grandTotal)}</span>
          </div>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--color-moss)", textAlign: "center", maxWidth: 360 }}>
          Đơn đang ở trạng thái <strong>Chờ thanh toán</strong>. Vui lòng thanh toán trong 15 phút để giữ chỗ. Sau khi thanh toán, đơn chuyển <strong>Đã xác nhận</strong>.
        </p>
        <button
          onClick={() => { setStep("browse"); setCart([]); setPromoApplied(false); setPromoCode(""); }}
          style={{ background: "var(--color-forest)", color: "var(--color-cream)", padding: "10px 24px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600 }}
        >
          Tiếp tục xem sản phẩm
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(["browse", "cart", "checkout"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => (s === "browse" || (s === "cart" && cart.length > 0)) && setStep(s)}
              style={{
                padding: "5px 14px",
                borderRadius: "20px",
                fontSize: "0.8rem",
                fontWeight: 600,
                border: "2px solid",
                borderColor: step === s ? "var(--color-forest)" : "var(--color-bone)",
                background: step === s ? "var(--color-forest)" : "transparent",
                color: step === s ? "var(--color-cream)" : "var(--color-bark)",
                cursor: "pointer",
              }}
            >
              {i + 1}. {s === "browse" ? "Chọn sản phẩm" : s === "cart" ? `Giỏ thuê (${cart.length})` : "Xác nhận đặt"}
            </button>
            {i < 2 && <span style={{ color: "var(--color-bone)" }}>›</span>}
          </div>
        ))}
      </div>

      {/* BROWSE */}
      {step === "browse" && (
        <div>
          {/* Search & Filter bar */}
          <div style={{ background: "var(--color-parchment)", borderRadius: "12px", padding: "16px 20px", marginBottom: "24px", border: "1px solid var(--color-bone)" }}>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 200 }}>
                <span>📅</span>
                <div>
                  <label style={{ fontSize: "0.7rem", color: "var(--color-bark)", display: "block" }}>Ngày nhận</label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    style={{ border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "4px 8px", fontSize: "0.85rem", background: "white" }}
                  />
                </div>
                <span style={{ color: "var(--color-bone)" }}>→</span>
                <div>
                  <label style={{ fontSize: "0.7rem", color: "var(--color-bark)", display: "block" }}>Ngày trả</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    style={{ border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "4px 8px", fontSize: "0.85rem", background: "white" }}
                  />
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--color-forest)", fontWeight: 600, background: "var(--color-sage)", padding: "2px 8px", borderRadius: "4px" }}>
                  {days} ngày
                </span>
              </div>
              <input
                placeholder="🔍 Tìm tên, thương hiệu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ border: "1px solid var(--color-bone)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.9rem", flex: 1, minWidth: 180, background: "white" }}
              />
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    border: "1px solid",
                    borderColor: category === c ? "var(--color-forest)" : "var(--color-bone)",
                    background: category === c ? "var(--color-forest)" : "white",
                    color: category === c ? "var(--color-cream)" : "var(--color-bark)",
                    cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* AI assistant banner */}
          <div style={{ background: "linear-gradient(135deg, var(--color-forest), var(--color-moss))", borderRadius: "12px", padding: "14px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.5rem" }}>🤖</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: "var(--color-cream)", fontWeight: 600, marginBottom: "2px" }}>Tư vấn bộ đồ bằng AI</p>
              <p style={{ color: "var(--color-sage)", fontSize: "0.8rem" }}>Nhập điểm đến, số người, ngân sách — AI gợi ý bộ đồ phù hợp</p>
            </div>
            <button
              style={{ background: "var(--color-amber)", color: "var(--color-charcoal)", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}
            >
              Thử ngay →
            </button>
          </div>

          {/* Product grid */}
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {filtered.map((p) => {
              const inCart = cart.find((c) => c.productId === p.id);
              return (
                <div
                  key={p.id}
                  style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--color-bone)", transition: "box-shadow 0.2s" }}
                  className="hover:shadow-lg"
                >
                  <div style={{ position: "relative", height: "180px", background: "var(--color-parchment)" }}>
                    <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <span style={{
                      position: "absolute", top: "10px", right: "10px",
                      background: p.available > 0 ? "var(--color-forest)" : "#9CA3AF",
                      color: "white", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px",
                      fontFamily: "var(--font-mono)"
                    }}>
                      {p.available > 0 ? `Còn ${p.available}` : "Hết hàng"}
                    </span>
                  </div>
                  <div style={{ padding: "14px" }}>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span style={{ fontSize: "0.7rem", color: "var(--color-moss)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{p.category}</span>
                        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 600, color: "var(--color-bark)", lineHeight: 1.2 }}>{p.name}</h3>
                        <p style={{ fontSize: "0.75rem", color: "var(--color-moss)" }}>{p.brand} · {p.capacity}</p>
                      </div>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: "10px", lineHeight: 1.4 }}>{p.description}</p>
                    <div className="flex items-center gap-1 mb-10px">
                      <span style={{ color: "#F59E0B", fontSize: "0.8rem" }}>{"★".repeat(Math.floor(p.rating))}</span>
                      <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>{p.rating} ({p.reviews} đánh giá)</span>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <div>
                        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1rem", color: "var(--color-forest)" }}>
                          {fmt(p.pricePerDay)}<span style={{ fontSize: "0.7rem", fontWeight: 400 }}>/ngày</span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Cọc: {fmt(p.deposit)}/thiết bị</div>
                        {days > 1 && (
                          <div style={{ fontSize: "0.75rem", color: "var(--color-amber)", fontWeight: 600 }}>
                            {days} ngày = {fmt(p.pricePerDay * days)}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(p)}
                        disabled={p.available === 0}
                        style={{
                          background: inCart ? "var(--color-moss)" : "var(--color-forest)",
                          color: "white",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: p.available === 0 ? "not-allowed" : "pointer",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          opacity: p.available === 0 ? 0.5 : 1,
                        }}
                      >
                        {inCart ? `✓ Đã thêm (${inCart.qty})` : "+ Thêm vào giỏ"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {cart.length > 0 && (
            <div style={{
              position: "fixed", bottom: "20px", right: "20px",
              background: "var(--color-forest)", color: "var(--color-cream)",
              borderRadius: "12px", padding: "12px 20px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
              display: "flex", alignItems: "center", gap: "12px",
              cursor: "pointer",
            }} onClick={() => setStep("cart")}>
              <span>🛒</span>
              <div>
                <div style={{ fontWeight: 700 }}>Giỏ thuê ({cart.reduce((s, c) => s + c.qty, 0)} mặt hàng)</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-sage)", fontFamily: "var(--font-mono)" }}>{fmt(rentalTotal + depositTotal)}</div>
              </div>
              <span>→</span>
            </div>
          )}
        </div>
      )}

      {/* CART */}
      {step === "cart" && (
        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 340px" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginBottom: "16px", color: "var(--color-bark)" }}>Giỏ thuê của bạn</h2>
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#9CA3AF" }}>
                <div style={{ fontSize: "3rem", marginBottom: "8px" }}>🛒</div>
                <p>Giỏ thuê trống. Quay lại chọn sản phẩm.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {cart.map((c) => (
                  <div key={c.productId} style={{ background: "white", borderRadius: "10px", padding: "16px", border: "1px solid var(--color-bone)", display: "flex", gap: "16px", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "var(--color-bark)", marginBottom: "4px" }}>{c.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                        {fmt(c.pricePerDay)}/ngày × {days} ngày × {c.qty} = <strong style={{ color: "var(--color-forest)", fontFamily: "var(--font-mono)" }}>{fmt(c.pricePerDay * days * c.qty)}</strong>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Cọc: {fmt(c.deposit)} × {c.qty} = {fmt(c.deposit * c.qty)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(c.productId, -1)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--color-bone)", background: "white", cursor: "pointer", fontWeight: 700 }}>−</button>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, width: 20, textAlign: "center" }}>{c.qty}</span>
                      <button onClick={() => updateQty(c.productId, 1)} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--color-bone)", background: "white", cursor: "pointer", fontWeight: 700 }}>+</button>
                    </div>
                    <button onClick={() => removeFromCart(c.productId)} style={{ color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div style={{ background: "var(--color-parchment)", borderRadius: "12px", padding: "20px", border: "1px solid var(--color-bone)", alignSelf: "start", position: "sticky", top: "20px" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", marginBottom: "16px", color: "var(--color-bark)" }}>Báo giá tạm tính</h3>
            <div style={{ fontSize: "0.85rem", marginBottom: "12px" }}>
              <div className="flex justify-between py-1" style={{ borderBottom: "1px dashed var(--color-bone)" }}>
                <span>Thời gian thuê</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{days} ngày</span>
              </div>
              <div className="flex justify-between py-1" style={{ borderBottom: "1px dashed var(--color-bone)" }}>
                <span>Tiền thuê</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{fmt(rentalTotal)}</span>
              </div>
              {promoApplied && (
                <div className="flex justify-between py-1" style={{ borderBottom: "1px dashed var(--color-bone)", color: "#16A34A" }}>
                  <span>Giảm giá CAMPGO10</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>−{fmt(discount)}</span>
                </div>
              )}
              <div className="flex justify-between py-1" style={{ borderBottom: "1px dashed var(--color-bone)" }}>
                <span>Tiền cọc (hoàn khi trả)</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{fmt(depositTotal)}</span>
              </div>
              <div className="flex justify-between py-2" style={{ fontWeight: 700, fontSize: "1rem" }}>
                <span>Thanh toán ban đầu</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{fmt(grandTotal)}</span>
              </div>
            </div>

            {/* Promo */}
            <div className="flex gap-2 mb-4">
              <input
                placeholder="Mã giảm giá (CAMPGO10)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                style={{ flex: 1, border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "6px 10px", fontSize: "0.8rem", background: "white" }}
              />
              <button onClick={applyPromo} style={{ background: "var(--color-amber)", color: "white", padding: "6px 12px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}>
                Áp dụng
              </button>
            </div>
            {promoApplied && <p style={{ fontSize: "0.75rem", color: "#16A34A", marginBottom: "8px" }}>✓ Đã áp dụng mã giảm 10% tiền thuê</p>}

            <p style={{ fontSize: "0.72rem", color: "#9CA3AF", marginBottom: "12px" }}>⏱ Đơn giữ chỗ 15 phút sau khi xác nhận. Cần thanh toán trước khi hết hạn.</p>

            <button
              onClick={() => setStep("checkout")}
              disabled={cart.length === 0}
              style={{
                width: "100%", background: "var(--color-forest)", color: "var(--color-cream)",
                padding: "12px", borderRadius: "8px", border: "none", cursor: cart.length === 0 ? "not-allowed" : "pointer",
                fontWeight: 700, fontSize: "0.95rem", opacity: cart.length === 0 ? 0.5 : 1,
              }}
            >
              Tiếp tục đặt thuê →
            </button>
          </div>
        </div>
      )}

      {/* CHECKOUT */}
      {step === "checkout" && (
        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 340px" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginBottom: "16px", color: "var(--color-bark)" }}>Xác nhận đặt thuê</h2>
            <div style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid var(--color-bone)", marginBottom: "16px" }}>
              <h4 style={{ fontWeight: 700, marginBottom: "12px", color: "var(--color-bark)" }}>📋 Thông tin nhận đồ</h4>
              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--color-bark)", display: "block", marginBottom: "4px" }}>Họ tên</label>
                  <input defaultValue="Nguyễn Văn An" style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "8px 12px", fontSize: "0.9rem" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--color-bark)", display: "block", marginBottom: "4px" }}>Số điện thoại</label>
                  <input defaultValue="0901 234 567" style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "8px 12px", fontSize: "0.9rem" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--color-bark)", display: "block", marginBottom: "4px" }}>Giờ nhận</label>
                  <input type="datetime-local" defaultValue={`${pickupDate}T09:00`} style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "8px 12px", fontSize: "0.9rem" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--color-bark)", display: "block", marginBottom: "4px" }}>Giờ trả dự kiến</label>
                  <input type="datetime-local" defaultValue={`${returnDate}T17:00`} style={{ width: "100%", border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "8px 12px", fontSize: "0.9rem" }} />
                </div>
              </div>
            </div>

            <div style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid var(--color-bone)", marginBottom: "16px" }}>
              <h4 style={{ fontWeight: 700, marginBottom: "12px", color: "var(--color-bark)" }}>📦 Sản phẩm đặt thuê</h4>
              {cart.map((c) => (
                <div key={c.productId} className="flex justify-between items-center py-2" style={{ borderBottom: "1px dashed var(--color-bone)", fontSize: "0.9rem" }}>
                  <span>{c.name} × {c.qty}</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{fmt(c.pricePerDay * c.qty * days)}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "#FEF3C7", borderRadius: "10px", padding: "14px 16px", border: "1px solid #FCD34D", fontSize: "0.82rem", color: "#92400E" }}>
              <strong>📌 Chính sách hủy đơn:</strong> Hủy trước 48h hoàn 100% tiền thuê và cọc. Hủy trong vòng 24–48h khấu trừ 30% tiền thuê. Hủy dưới 24h giữ lại 50% tiền thuê. Cọc bảo đảm hoàn toàn bộ khi chưa bàn giao.
            </div>
          </div>

          <div style={{ background: "var(--color-parchment)", borderRadius: "12px", padding: "20px", border: "1px solid var(--color-bone)", alignSelf: "start" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", marginBottom: "16px", color: "var(--color-bark)" }}>Tổng kết</h3>
            <div style={{ fontSize: "0.85rem" }}>
              {cart.map((c) => (
                <div key={c.productId} className="flex justify-between py-1">
                  <span style={{ color: "#6B7280" }}>{c.name} ×{c.qty}</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{fmt(c.pricePerDay * c.qty * days)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1" style={{ borderTop: "1px dashed var(--color-bone)", marginTop: "8px" }}>
                <span>Tiền thuê</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{fmt(rentalTotal)}</span>
              </div>
              {promoApplied && (
                <div className="flex justify-between py-1" style={{ color: "#16A34A" }}>
                  <span>Giảm giá</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>−{fmt(discount)}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span>Tiền cọc</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{fmt(depositTotal)}</span>
              </div>
              <div className="flex justify-between py-2" style={{ fontWeight: 700, fontSize: "1.1rem", borderTop: "2px solid var(--color-bone)", marginTop: "8px" }}>
                <span>Cần thanh toán</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-forest)" }}>{fmt(grandTotal)}</span>
              </div>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "6px", color: "var(--color-bark)" }}>Phương thức thanh toán</p>
              {["Chuyển khoản ngân hàng", "Tiền mặt tại cửa hàng", "Ví MoMo / ZaloPay"].map((m) => (
                <label key={m} className="flex items-center gap-2" style={{ fontSize: "0.85rem", padding: "6px 0", cursor: "pointer" }}>
                  <input type="radio" name="payment" defaultChecked={m === "Chuyển khoản ngân hàng"} />
                  {m}
                </label>
              ))}
            </div>

            <button
              onClick={confirmOrder}
              style={{ width: "100%", background: "var(--color-forest)", color: "var(--color-cream)", padding: "14px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}
            >
              ✓ Xác nhận đặt thuê
            </button>
            <p style={{ fontSize: "0.7rem", color: "#9CA3AF", textAlign: "center", marginTop: "8px" }}>Sau khi xác nhận, đơn được giữ 15 phút chờ thanh toán</p>
          </div>
        </div>
      )}
    </div>
  );
}
