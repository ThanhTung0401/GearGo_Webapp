import { useApp } from "../App";
import { fmt } from "../store";
import Icon, { type IconName } from "../components/Icon";

const categories: { icon: IconName; name: string; count: number; color: string }[] = [
  { icon: "tent", name: "Lều trại", count: 2, color: "#244C3A" },
  { icon: "package", name: "Ngủ", count: 3, color: "#2D6A4F" },
  { icon: "sparkles", name: "Đèn", count: 4, color: "#3F6C87" },
  { icon: "package", name: "Nấu ăn", count: 2, color: "#D98550" },
  { icon: "package", name: "Balo", count: 2, color: "#172E23" },
];

const steps: { num: string; icon: IconName; title: string; desc: string }[] = [
  { num: "01", icon: "calendar", title: "Chọn ngày & sản phẩm", desc: "Chọn ngày nhận/trả, duyệt sản phẩm và kiểm tra số lượng còn nhận đặt." },
  { num: "02", icon: "cart", title: "Đặt và thanh toán", desc: "Thêm vào giỏ, xem báo giá tạm tính và thanh toán tiền thuê + cọc bảo đảm." },
  { num: "03", icon: "package", title: "Đến nhận đồ", desc: "Nhân viên chuẩn bị sẵn thiết bị. Đến cửa hàng ký xác nhận và nhận đồ." },
  { num: "04", icon: "check", title: "Trả đồ & hoàn cọc", desc: "Trả đồ đúng hạn, nhân viên kiểm tra và hoàn lại tiền cọc trong ngày." },
];

const faqs = [
  {
    q: "Tiền cọc được hoàn khi nào?",
    a: "Sau khi kiểm tra thiết bị đạt yêu cầu, cửa hàng hoàn cọc trong vòng 24 giờ. Nếu có phụ phí được duyệt, cọc được trừ đi phần đó.",
  },
  {
    q: "Tôi có thể hủy đơn không?",
    a: "Hủy trước 48h hoàn 100% tiền thuê. Hủy trong 24–48h khấu trừ 30%. Hủy dưới 24h giữ lại 50%. Cọc bảo đảm hoàn toàn bộ khi chưa bàn giao.",
  },
  {
    q: "Nếu đồ bị hỏng trong quá trình thuê?",
    a: "Nhân viên sẽ đánh giá mức độ hư hỏng và lập phụ phí theo bảng tỷ lệ bồi thường đã công bố. Hao mòn thông thường không tính phí.",
  },
  {
    q: "Có giao hàng tận nơi không?",
    a: "Hiện tại GearGo chưa có dịch vụ giao hàng. Khách vui lòng đến nhận và trả trực tiếp tại cửa hàng.",
  },
];

export default function LandingView() {
  const app = useApp();

  return (
    <div>
      {/* Hero */}
      <section style={{ overflow: "hidden", background: "var(--color-forest)" }}>
        <div className="hero-grid" style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 24px" }}>
          <div>
            <div style={{ display: "inline-block", background: "rgba(217,133,80,0.18)", color: "#F3C6AA", border: "1px solid rgba(217,133,80,0.4)", padding: "5px 12px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, marginBottom: "18px" }}>
              Cho thuê đồ cắm trại & du lịch
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", color: "white", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, lineHeight: 1.15, marginBottom: "18px" }}>
              Sẵn sàng cho chuyến đi.<br />
              <span style={{ color: "#F0A878" }}>Đồ cắm trại để GearGo lo.</span>
            </h1>
            <p style={{ color: "#C7D1CB", fontSize: "1rem", lineHeight: 1.7, marginBottom: "28px", maxWidth: 540 }}>
              Thuê đồ chất lượng theo đúng nhu cầu, nhận tại cửa hàng và hoàn cọc sau đối soát minh bạch. Bạn chỉ cần tập trung tận hưởng hành trình.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => app.setPage("products")}
                style={{ background: "var(--color-amber)", color: "var(--color-bark)", padding: "13px 24px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" }}
              >
                Khám phá đồ thuê
              </button>
              <button onClick={() => app.setPage("ai-advisor")}
                style={{ background: "transparent", color: "white", padding: "13px 24px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.35)", cursor: "pointer", fontWeight: 600, fontSize: "0.95rem" }}
              >
                <span className="icon-label"><Icon name="sparkles" size={18} /> Tư vấn bộ đồ</span>
              </button>
            </div>
          </div>
          <div className="hero-photo">
            <img src="https://images.unsplash.com/photo-1631740694409-580a251e4ab8?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1080"
              alt="Lều cắm trại giữa rừng xanh" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", left: 18, bottom: 18, background: "rgba(255,255,255,0.94)", borderRadius: 12, padding: "12px 15px", maxWidth: 250 }}>
              <div style={{ color: "var(--color-moss)", fontWeight: 700, fontSize: "0.82rem" }}>Nhận đồ tại cửa hàng</div>
              <div style={{ color: "#6B7280", fontSize: "0.72rem", marginTop: 2 }}>Kiểm tra cùng nhân viên trước mỗi chuyến đi</div>
            </div>
          </div>
        </div>

        {/* Date picker strip */}
        <div style={{ position: "relative", background: "rgba(255,255,255,0.96)", borderTop: "3px solid var(--color-amber)" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
            <span className="icon-label" style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-bark)" }}><Icon name="calendar" size={18} /> Kiểm tra khả dụng:</span>
            <div className="flex items-center gap-2 flex-wrap" style={{ flex: 1 }}>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--color-bark)", display: "block" }}>Ngày nhận</label>
                <input type="date" value={app.pickupDate} onChange={(e) => app.setPickupDate(e.target.value)}
                  style={{ border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "6px 10px", fontSize: "0.88rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--color-bark)", display: "block" }}>Giờ nhận</label>
                <select value={app.pickupHour} onChange={(e) => app.setPickupHour(e.target.value)}
                  style={{ border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "6px 8px", fontSize: "0.85rem", background: "white" }}
                >
                  {["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <span style={{ color: "var(--color-bone)", marginTop: "14px" }}>→</span>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--color-bark)", display: "block" }}>Ngày trả</label>
                <input type="date" value={app.returnDate} onChange={(e) => app.setReturnDate(e.target.value)}
                  style={{ border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "6px 10px", fontSize: "0.88rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--color-bark)", display: "block" }}>Giờ trả</label>
                <select value={app.returnHour} onChange={(e) => app.setReturnHour(e.target.value)}
                  style={{ border: "1px solid var(--color-bone)", borderRadius: "6px", padding: "6px 8px", fontSize: "0.85rem", background: "white" }}
                >
                  {["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <span style={{ background: app.hasValidRentalPeriod() ? "var(--color-sage)" : "var(--color-parchment)", color: app.hasValidRentalPeriod() ? "white" : "var(--color-bark)", padding: "5px 12px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 700, fontFamily: "var(--font-mono)", marginTop: "14px" }}>
                {app.hasValidRentalPeriod()
                  ? `${app.getDays()} ngày (Block 24h)`
                  : app.pickupDate && app.returnDate ? "Khoảng thuê không hợp lệ" : "Chọn ngày & giờ"}
              </span>
            </div>
            <button onClick={() => app.setPage("products")}
              style={{ background: "var(--color-forest)", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}
            >
              Xem sản phẩm →
            </button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px 32px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", color: "var(--color-bark)", marginBottom: "20px", textAlign: "center" }}>
          Danh mục phổ biến
        </h2>
        <div className="flex gap-4 justify-center flex-wrap">
          {categories.map((cat) => (
            <button key={cat.name} onClick={() => app.setPage("products")}
              style={{ background: "white", borderRadius: "12px", padding: "20px 28px", border: "1px solid var(--color-bone)", cursor: "pointer", textAlign: "center", minWidth: 120, transition: "box-shadow 0.2s" }}
              className="hover:shadow-md"
            >
              <div style={{ width: 42, height: 42, margin: "0 auto 8px", borderRadius: 10, background: "var(--color-parchment)", color: cat.color, display: "grid", placeItems: "center" }}><Icon name={cat.icon} size={23} /></div>
              <div style={{ fontWeight: 700, color: cat.color, fontSize: "0.9rem" }}>{cat.name}</div>
              <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>{cat.count} loại</div>
            </button>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 48px" }}>
        <div className="flex justify-between items-center mb-5">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-bark)" }}>Sản phẩm nổi bật</h2>
          <button onClick={() => app.setPage("products")}
            style={{ color: "var(--color-forest)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            Xem tất cả →
          </button>
        </div>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {app.products.slice(0, 4).map((p) => {
            const avail = app.getAvailable(p.id);
            return (
              <div key={p.id} onClick={() => app.setSelectedProduct(p.id)}
                style={{ background: "white", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--color-bone)", cursor: "pointer" }}
                className="hover:shadow-lg transition-shadow"
              >
                <div style={{ position: "relative", height: 180, background: "var(--color-parchment)" }}>
                  <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span style={{
                    position: "absolute", top: 10, right: 10,
                    background: app.hasValidRentalPeriod() && avail > 0 ? "var(--color-forest)" : "#6B7280",
                    color: "white", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", fontFamily: "var(--font-mono)"
                  }}>
                    {!app.hasValidRentalPeriod() ? "Chọn ngày" : avail > 0 ? `Còn ${avail}` : "Hết"}
                  </span>
                </div>
                <div style={{ padding: "14px" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--color-moss)", fontWeight: 600, textTransform: "uppercase" }}>{p.category}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1rem", color: "var(--color-bark)", marginBottom: "4px" }}>{p.name}</div>
                  <div className="flex items-center gap-1 mb-2">
                    <span style={{ color: "#F59E0B", fontSize: "0.8rem" }}>{"★".repeat(Math.floor(p.rating))}</span>
                    <span style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>{p.rating} ({p.reviews})</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-forest)" }}>{fmt(p.pricePerDay)}<span style={{ fontSize: "0.72rem", fontWeight: 400 }}>/ngày</span></div>
                      <div style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>Cọc {fmt(p.deposit)}</div>
                    </div>
                    <span style={{ color: "var(--color-forest)", fontWeight: 700 }}>→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "var(--color-parchment)", borderTop: "1px solid var(--color-bone)", borderBottom: "1px solid var(--color-bone)", padding: "48px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", color: "var(--color-bark)", marginBottom: "32px", textAlign: "center" }}>Cách thuê chỉ 4 bước</h2>
          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {steps.map((s) => (
              <div key={s.num} style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, color: "white", background: "var(--color-forest)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Icon name={s.icon} size={24} /></div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--color-amber)", fontWeight: 700, marginBottom: "4px" }}>BƯỚC {s.num}</div>
                <div style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: "6px" }}>{s.title}</div>
                <div style={{ fontSize: "0.85rem", color: "#6B7280", lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Policy highlight */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px" }}>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {([
            { icon: "calendar", title: "Giữ chỗ 15 phút", desc: "Sau khi đặt đơn, hệ thống giữ số lượng 15 phút để bạn thanh toán." },
            { icon: "wallet", title: "Cọc hoàn minh bạch", desc: "Trả đồ đạt yêu cầu — hoàn cọc sau khi đối soát hoàn tất." },
            { icon: "shield", title: "Thanh toán an toàn", desc: "Chuyển khoản, ví điện tử hoặc tiền mặt tại cửa hàng." },
            { icon: "user", title: "Hỗ trợ 7 ngày/tuần", desc: "Hotline và tư vấn AI sẵn sàng giải đáp mọi thắc mắc." },
          ] as { icon: IconName; title: string; desc: string }[]).map((p) => (
            <div key={p.title} style={{ background: "white", borderRadius: "12px", padding: "20px", border: "1px solid var(--color-bone)", display: "flex", gap: "12px" }}>
              <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 10, color: "var(--color-forest)", background: "var(--color-parchment)", display: "grid", placeItems: "center" }}><Icon name={p.icon} size={22} /></span>
              <div>
                <div style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: "4px" }}>{p.title}</div>
                <div style={{ fontSize: "0.82rem", color: "#6B7280", lineHeight: 1.4 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 60px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-bark)", marginBottom: "20px", textAlign: "center" }}>Câu hỏi thường gặp</h2>
        <div className="flex flex-col gap-3">
          {faqs.map((f, i) => (
            <details key={i} style={{ background: "white", borderRadius: "10px", border: "1px solid var(--color-bone)", overflow: "hidden" }}>
              <summary style={{ padding: "14px 18px", cursor: "pointer", fontWeight: 600, color: "var(--color-bark)", fontSize: "0.95rem", listStyle: "none" }}>
                ＋ {f.q}
              </summary>
              <div style={{ padding: "0 18px 14px", fontSize: "0.88rem", color: "#6B7280", lineHeight: 1.6 }}>{f.a}</div>
            </details>
          ))}
        </div>
      </section>

    </div>
  );
}
