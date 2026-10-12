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
    <div className="bg-[var(--color-cream)]">
      {/* Hero Section với hiệu ứng ánh sáng thiên nhiên và độ sâu */}
      <section style={{
        position: "relative",
        overflow: "hidden",
        background: "radial-gradient(circle at 85% 15%, rgba(58, 100, 117, 0.28) 0%, transparent 45%), radial-gradient(circle at 10% 75%, rgba(224, 122, 67, 0.18) 0%, transparent 40%), linear-gradient(135deg, #11231B 0%, #1B3F2F 100%)",
      }}>
        {/* Lớp nền noise nhẹ hoặc hạt ánh sáng */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" }} />

        <div className="hero-grid max-w-7xl mx-auto px-6 pt-16 pb-20 relative z-10">
          <div>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(224, 122, 67, 0.16)",
              color: "#F8B388",
              border: "1px solid rgba(224, 122, 67, 0.35)",
              padding: "6px 16px",
              borderRadius: "999px",
              fontSize: "0.78rem",
              fontWeight: 700,
              marginBottom: "22px",
              boxShadow: "0 4px 16px rgba(224, 122, 67, 0.15)",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-amber)", display: "inline-block", boxShadow: "0 0 10px var(--color-amber)" }} />
              Dịch vụ thuê trang thiết bị dã ngoại cao cấp
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", color: "white", fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 800, lineHeight: 1.2, marginBottom: "20px", letterSpacing: "-0.02em" }}>
              Sẵn sàng cho chuyến đi.<br />
              <span style={{ background: "linear-gradient(90deg, #F8B388 0%, #E07A43 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Đồ cắm trại để <span style={{ whiteSpace: "nowrap" }}>GearGo lo.</span>
              </span>
            </h1>
            <p style={{ color: "#D1DDD5", fontSize: "1.05rem", lineHeight: 1.75, marginBottom: "32px", maxWidth: 540 }}>
              Thuê thiết bị chính hãng, bảo dưỡng nghiêm ngặt theo tiêu chuẩn an toàn. Nhận đồ nhanh chóng tại cửa hàng và hoàn cọc minh bạch sau chuyến đi.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button onClick={() => app.setPage("products")}
                style={{
                  background: "linear-gradient(135deg, #E07A43 0%, #D46931 100%)",
                  color: "white",
                  padding: "14px 28px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  boxShadow: "0 10px 24px -6px rgba(224, 122, 67, 0.45)",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                Khám phá đồ thuê →
              </button>
              <button onClick={() => app.setPage("ai-advisor")}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  padding: "14px 26px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.22)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  transition: "all 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span className="icon-label"><Icon name="sparkles" size={18} /> Tư vấn bộ đồ với AI</span>
              </button>
            </div>
          </div>

          <div className="hero-photo" style={{ minHeight: 460, borderRadius: 28, overflow: "hidden", position: "relative", boxShadow: "0 24px 56px -12px rgba(0, 0, 0, 0.45)" }}>
            <img src="https://images.unsplash.com/photo-1631740694409-580a251e4ab8?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1080"
              alt="Lều cắm trại cao cấp giữa thiên nhiên" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(17, 35, 27, 0.7) 0%, transparent 60%)" }} />
            
            {/* Thẻ nổi chứng thực kiểm định */}
            <div style={{
              position: "absolute",
              left: 20,
              bottom: 20,
              background: "rgba(255, 255, 255, 0.94)",
              backdropFilter: "blur(14px)",
              borderRadius: 16,
              padding: "14px 18px",
              maxWidth: 290,
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.6)"
            }}>
              <div className="flex items-center gap-2" style={{ color: "var(--color-moss)", fontWeight: 700, fontSize: "0.86rem" }}>
                <span className="glow-badge" /> Vệ sinh & Khử khuẩn 100%
              </div>
              <div style={{ color: "#6B7280", fontSize: "0.74rem", marginTop: 4, lineHeight: 1.4 }}>
                Kiểm định chất lượng cùng nhân viên trước khi giao nhận tận tay bạn.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Booking Bar - Nằm ngoài section overflow:hidden để không bị cắt xén chân thanh bar */}
      <div style={{ maxWidth: 1280, margin: "-44px auto 0", padding: "0 24px", position: "relative", zIndex: 30 }}>
        <div style={{
          background: "white",
          borderRadius: 20,
          padding: "16px 24px",
          boxShadow: "0 18px 42px -10px rgba(17, 35, 27, 0.16), 0 0 0 1px var(--color-bone)",
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "center"
        }}>
          <div className="icon-label" style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--color-bark)", paddingRight: 12, borderRight: "1px solid var(--color-bone)" }}>
            <Icon name="calendar" size={20} /> Lịch thuê dự kiến
          </div>

          <div className="flex items-center gap-3 flex-wrap" style={{ flex: 1 }}>
            {/* Ngày & Giờ nhận */}
            <div style={{ background: "var(--color-cream)", padding: "8px 14px", borderRadius: 12, border: "1px solid var(--color-bone)" }}>
              <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--color-moss)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Nhận thiết bị</label>
              <div className="flex items-center gap-2">
                <input type="date" value={app.pickupDate} onChange={(e) => app.setPickupDate(e.target.value)}
                  style={{ border: "1px solid var(--color-bone)", borderRadius: "6px", background: "white", padding: "4px 8px", fontSize: "0.86rem", fontWeight: 600, color: "var(--color-bark)", outline: "none", cursor: "pointer", minHeight: 34 }}
                />
                <select value={app.pickupHour} onChange={(e) => app.setPickupHour(e.target.value)}
                  style={{ border: "1px solid var(--color-bone)", borderRadius: "6px", background: "white", padding: "4px 8px", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-bark)", outline: "none", cursor: "pointer", minHeight: 34 }}
                >
                  {["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <span style={{ color: "var(--color-sage)", fontSize: "1.2rem", fontWeight: 700 }}>→</span>

            {/* Ngày & Giờ trả */}
            <div style={{ background: "var(--color-cream)", padding: "8px 14px", borderRadius: 12, border: "1px solid var(--color-bone)" }}>
              <label style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--color-moss)", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Trả thiết bị</label>
              <div className="flex items-center gap-2">
                <input type="date" value={app.returnDate} onChange={(e) => app.setReturnDate(e.target.value)}
                  style={{ border: "1px solid var(--color-bone)", borderRadius: "6px", background: "white", padding: "4px 8px", fontSize: "0.86rem", fontWeight: 600, color: "var(--color-bark)", outline: "none", cursor: "pointer", minHeight: 34 }}
                />
                <select value={app.returnHour} onChange={(e) => app.setReturnHour(e.target.value)}
                  style={{ border: "1px solid var(--color-bone)", borderRadius: "6px", background: "white", padding: "4px 8px", fontSize: "0.84rem", fontWeight: 600, color: "var(--color-bark)", outline: "none", cursor: "pointer", minHeight: 34 }}
                >
                  {["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Huy hiệu thời gian tính theo block 24h */}
            <div style={{
              background: app.hasValidRentalPeriod() ? "rgba(40, 90, 65, 0.12)" : "var(--color-parchment)",
              color: app.hasValidRentalPeriod() ? "var(--color-moss)" : "#6B7280",
              border: `1px solid ${app.hasValidRentalPeriod() ? "rgba(40, 90, 65, 0.25)" : "var(--color-bone)"}`,
              padding: "8px 16px",
              borderRadius: 12,
              fontSize: "0.85rem",
              fontWeight: 700,
              minHeight: 52,
              display: "inline-flex",
              alignItems: "center"
            }}>
              {app.hasValidRentalPeriod()
                ? `✓ ${app.getDays()} ngày (Block 24h)`
                : app.pickupDate && app.returnDate ? "Khoảng thuê không hợp lệ" : "Chọn ngày & giờ"}
            </div>
          </div>

          <button onClick={() => app.setPage("products")}
            style={{
              background: "var(--color-forest)",
              color: "white",
              padding: "14px 26px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.94rem",
              boxShadow: "0 6px 16px rgba(27, 63, 47, 0.3)",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#143124")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-forest)")}
          >
            Kiểm tra khả dụng →
          </button>
        </div>
      </div>

      {/* Categories Section */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-amber)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Khám phá kho đồ</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.9rem", color: "var(--color-bark)", fontWeight: 800, marginTop: 4 }}>
            Danh mục phổ biến
          </h2>
        </div>
        <div className="flex gap-4 justify-center flex-wrap">
          {categories.map((cat) => (
            <button key={cat.name} onClick={() => app.setPage("products")}
              className="card-hover-lift"
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "22px 30px",
                border: "1px solid var(--color-bone)",
                cursor: "pointer",
                textAlign: "center",
                minWidth: 135,
              }}
            >
              <div style={{
                width: 48,
                height: 48,
                margin: "0 auto 12px",
                borderRadius: 14,
                background: `${cat.color}14`,
                color: cat.color,
                display: "grid",
                placeItems: "center",
              }}>
                <Icon name={cat.icon} size={24} />
              </div>
              <div style={{ fontWeight: 700, color: "var(--color-bark)", fontSize: "0.95rem" }}>{cat.name}</div>
              <div style={{ fontSize: "0.74rem", color: "#6B7280", marginTop: 2 }}>{cat.count} trang bị</div>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px 56px" }}>
        <div className="flex justify-between items-end mb-6">
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-moss)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Lựa chọn hàng đầu</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--color-bark)", fontWeight: 800, marginTop: 2 }}>Sản phẩm nổi bật</h2>
          </div>
          <button onClick={() => app.setPage("products")}
            style={{ color: "var(--color-moss)", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.92rem" }}
          >
            Xem tất cả {app.products.length} sản phẩm →
          </button>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))" }}>
          {app.products.slice(0, 4).map((p) => {
            const avail = app.getAvailable(p.id);
            return (
              <div key={p.id} onClick={() => app.setSelectedProduct(p.id)}
                className="card-hover-lift"
                style={{
                  background: "white",
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: "1px solid var(--color-bone)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <div style={{ position: "relative", height: 200, background: "var(--color-parchment)", overflow: "hidden" }}>
                  <img src={p.image} alt={p.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  />
                  <div style={{
                    position: "absolute", top: 12, right: 12,
                    background: app.hasValidRentalPeriod() && avail > 0 ? "rgba(27, 63, 47, 0.9)" : "rgba(107, 114, 128, 0.9)",
                    backdropFilter: "blur(6px)",
                    color: "white", fontSize: "0.72rem", fontWeight: 700, padding: "4px 10px", borderRadius: "999px"
                  }}>
                    {!app.hasValidRentalPeriod() ? "Chọn ngày" : avail > 0 ? `● Còn ${avail}` : "Hết hàng"}
                  </div>
                </div>

                <div style={{ padding: "18px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--color-moss)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    {p.category}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.08rem", color: "var(--color-bark)", marginBottom: "6px" }}>
                    {p.name}
                  </div>
                  
                  <div className="flex items-center gap-1.5 mb-4">
                    <span style={{ color: "#F59E0B", fontSize: "0.85rem" }}>{"★".repeat(Math.floor(p.rating))}</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-bark)" }}>{p.rating}</span>
                    <span style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>({p.reviews} đánh giá)</span>
                  </div>

                  <div className="flex justify-between items-end mt-auto pt-3" style={{ borderTop: "1px solid var(--color-parchment)" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--color-forest)" }}>
                        {fmt(p.pricePerDay)}<span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#6B7280" }}> / ngày</span>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Cọc bảo đảm: {fmt(p.deposit)}</div>
                    </div>
                    <span style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "var(--color-cream)",
                      color: "var(--color-forest)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 700
                    }}>→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "var(--color-parchment)", borderTop: "1px solid var(--color-bone)", borderBottom: "1px solid var(--color-bone)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-amber)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Đơn giản & Nhanh chóng</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.9rem", color: "var(--color-bark)", fontWeight: 800, marginTop: 4 }}>
              Quy trình thuê 4 bước tại GearGo
            </h2>
          </div>

          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {steps.map((s) => (
              <div key={s.num} className="card-hover-lift" style={{ background: "white", padding: "28px 20px", borderRadius: 18, border: "1px solid var(--color-bone)", textAlign: "center" }}>
                <div style={{ width: 58, height: 58, color: "white", background: "var(--color-forest)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 18px -4px rgba(27, 63, 47, 0.35)" }}>
                  <Icon name={s.icon} size={26} />
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--color-amber)", fontWeight: 800, letterSpacing: "0.06em", marginBottom: "6px" }}>BƯỚC {s.num}</div>
                <div style={{ fontWeight: 800, color: "var(--color-bark)", fontSize: "1.02rem", marginBottom: "8px" }}>{s.title}</div>
                <div style={{ fontSize: "0.85rem", color: "#6B7280", lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Policy highlight */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "56px 24px" }}>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {([
            { icon: "calendar", title: "Giữ chỗ 15 phút", desc: "Sau khi đặt đơn, hệ thống giữ số lượng 15 phút để bạn thanh toán." },
            { icon: "wallet", title: "Cọc hoàn minh bạch", desc: "Trả đồ đạt yêu cầu — hoàn cọc ngay sau khi đối soát hoàn tất." },
            { icon: "shield", title: "Bảo quản chuẩn chỉ", desc: "Vệ sinh, phơi sấy và kiểm định độ bền sau mỗi lượt khách." },
            { icon: "user", title: "Hỗ trợ 7 ngày/tuần", desc: "Đội ngũ chuyên viên cắm trại sẵn sàng tư vấn lịch trình và thiết bị." },
          ] as { icon: IconName; title: string; desc: string }[]).map((p) => (
            <div key={p.title} className="card-hover-lift" style={{ background: "white", borderRadius: "16px", padding: "22px", border: "1px solid var(--color-bone)", display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, color: "var(--color-forest)", background: "rgba(40, 90, 65, 0.1)", display: "grid", placeItems: "center" }}>
                <Icon name={p.icon} size={22} />
              </span>
              <div>
                <div style={{ fontWeight: 700, color: "var(--color-bark)", marginBottom: "4px", fontSize: "0.95rem" }}>{p.title}</div>
                <div style={{ fontSize: "0.82rem", color: "#6B7280", lineHeight: 1.5 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px 72px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.7rem", color: "var(--color-bark)", fontWeight: 800 }}>
            Câu hỏi thường gặp
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.9rem", marginTop: 4 }}>Những thắc mắc phổ biến của khách hàng khi thuê thiết bị tại GearGo</p>
        </div>
        <div className="flex flex-col gap-3">
          {faqs.map((f, i) => (
            <details key={i} style={{ background: "white", borderRadius: "12px", border: "1px solid var(--color-bone)", overflow: "hidden", transition: "all 0.2s ease" }}>
              <summary style={{ padding: "16px 20px", cursor: "pointer", fontWeight: 700, color: "var(--color-bark)", fontSize: "0.95rem", listStyle: "none" }}>
                <span style={{ color: "var(--color-amber)", marginRight: 8 }}>✦</span> {f.q}
              </summary>
              <div style={{ padding: "0 20px 18px 36px", fontSize: "0.88rem", color: "#4B5563", lineHeight: 1.65 }}>{f.a}</div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
