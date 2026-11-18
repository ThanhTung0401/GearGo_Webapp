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
  const hasValidPeriod = app.hasValidRentalPeriod();

  return (
    <div className="lp-page">
      {/* Hero Section với hiệu ứng ánh sáng thiên nhiên và độ sâu */}
      <section className="lp-hero">
        {/* Lớp nền chấm sáng trang trí */}
        <div className="lp-hero-pattern" />

        <div className="hero-grid max-w-7xl mx-auto px-6 pt-16 pb-20 relative z-10">
          <div>
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-dot" />
              Dịch vụ thuê trang thiết bị dã ngoại cao cấp
            </div>
            <h1 className="lp-hero-title">
              Sẵn sàng cho chuyến đi.<br />
              <span className="lp-hero-title-accent">
                Đồ cắm trại để <span className="lp-nowrap">GearGo lo.</span>
              </span>
            </h1>
            <p className="lp-hero-desc">
              Thuê thiết bị chính hãng, bảo dưỡng nghiêm ngặt theo tiêu chuẩn an toàn. Nhận đồ nhanh chóng tại cửa hàng và hoàn cọc minh bạch sau chuyến đi.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button onClick={() => app.setPage("products")} className="lp-hero-btn-primary">
                Khám phá đồ thuê →
              </button>
              <button onClick={() => app.setPage("ai-advisor")} className="lp-hero-btn-secondary">
                <span className="icon-label"><Icon name="sparkles" size={18} /> Tư vấn bộ đồ với AI</span>
              </button>
            </div>
          </div>

          <div className="hero-photo lp-hero-photo">
            <img
              src="https://images.unsplash.com/photo-1631740694409-580a251e4ab8?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1080"
              alt="Lều cắm trại cao cấp giữa thiên nhiên"
              className="lp-hero-photo-img"
            />
            <div className="lp-hero-photo-overlay" />

            {/* Thẻ nổi chứng thực kiểm định */}
            <div className="lp-hero-cert">
              <div className="flex items-center gap-2 lp-hero-cert-title">
                <span className="glow-badge" /> Vệ sinh & Khử khuẩn 100%
              </div>
              <div className="lp-hero-cert-desc">
                Kiểm định chất lượng cùng nhân viên trước khi giao nhận tận tay bạn.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Booking Bar - Nằm ngoài section overflow:hidden để không bị cắt xén chân thanh bar */}
      <div className="lp-booking-wrap">
        <div className="lp-booking-card">
          <div className="icon-label lp-booking-heading">
            <Icon name="calendar" size={20} /> Lịch thuê dự kiến
          </div>

          <div className="flex items-center gap-3 flex-wrap lp-booking-fields">
            {/* Ngày & Giờ nhận */}
            <div className="lp-booking-field">
              <label className="lp-booking-label">Nhận thiết bị</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={app.pickupDate}
                  onChange={(e) => app.setPickupDate(e.target.value)}
                  className="lp-booking-date"
                />
                <select
                  value={app.pickupHour}
                  onChange={(e) => app.setPickupHour(e.target.value)}
                  className="lp-booking-hour"
                >
                  {["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <span className="lp-booking-arrow">→</span>

            {/* Ngày & Giờ trả */}
            <div className="lp-booking-field">
              <label className="lp-booking-label">Trả thiết bị</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={app.returnDate}
                  onChange={(e) => app.setReturnDate(e.target.value)}
                  className="lp-booking-date"
                />
                <select
                  value={app.returnHour}
                  onChange={(e) => app.setReturnHour(e.target.value)}
                  className="lp-booking-hour"
                >
                  {["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Huy hiệu thời gian tính theo block 24h; bật is-valid khi khoảng thuê hợp lệ */}
            <div className={`lp-booking-period-pill${hasValidPeriod ? " is-valid" : ""}`}>
              {hasValidPeriod
                ? `✓ ${app.getDays()} ngày (Block 24h)`
                : app.pickupDate && app.returnDate ? "Khoảng thuê không hợp lệ" : "Chọn ngày & giờ"}
            </div>
          </div>

          <button onClick={() => app.setPage("products")} className="lp-booking-submit">
            Kiểm tra khả dụng →
          </button>
        </div>
      </div>

      {/* Categories Section */}
      <section className="lp-cat-section">
        <div className="lp-section-header">
          <span className="lp-section-eyebrow lp-section-eyebrow--amber">Khám phá kho đồ</span>
          <h2 className="lp-section-title">
            Danh mục phổ biến
          </h2>
        </div>
        <div className="flex gap-4 justify-center flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => app.setPage("products")}
              className="card-hover-lift lp-cat-card"
            >
              {/* Giữ style inline động cho màu sắc riêng theo từng danh mục */}
              <div
                className="lp-cat-icon"
                style={{ background: `${cat.color}14`, color: cat.color }}
              >
                <Icon name={cat.icon} size={24} />
              </div>
              <div className="lp-cat-name">{cat.name}</div>
              <div className="lp-cat-count">{cat.count} trang bị</div>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="lp-featured-section">
        <div className="flex justify-between items-end mb-6 lp-featured-header">
          <div>
            <span className="lp-section-eyebrow lp-section-eyebrow--moss">Lựa chọn hàng đầu</span>
            <h2 className="lp-section-title lp-section-title--featured">Sản phẩm nổi bật</h2>
          </div>
          <button onClick={() => app.setPage("products")} className="lp-featured-link">
            Xem tất cả {app.products.length} sản phẩm →
          </button>
        </div>

        <div className="grid gap-6 lp-featured-grid">
          {app.products.slice(0, 4).map((p) => {
            const avail = app.getAvailable(p.id);
            /* Chỉ hiển thị badge xanh khi đã chọn lịch thuê hợp lệ và còn hàng */
            const badgeToneClass = hasValidPeriod && avail > 0 ? "lp-avail-badge--ok" : "lp-avail-badge--muted";
            return (
              <div
                key={p.id}
                onClick={() => app.setSelectedProduct(p.id)}
                className="card-hover-lift lp-product-card lp-clickable"
              >
                <div className="lp-product-media">
                  <img src={p.image} alt={p.name} className="lp-product-img" />
                  <div className={`lp-avail-badge ${badgeToneClass}`}>
                    {!hasValidPeriod ? "Chọn ngày" : avail > 0 ? `● Còn ${avail}` : "Hết hàng"}
                  </div>
                </div>

                <div className="lp-product-body">
                  <div className="lp-product-cat">{p.category}</div>
                  <div className="lp-product-title">{p.name}</div>

                  <div className="flex items-center gap-1.5 mb-4">
                    <span className="lp-product-stars">{"★".repeat(Math.floor(p.rating))}</span>
                    <span className="lp-product-rating">{p.rating}</span>
                    <span className="lp-product-reviews">({p.reviews} đánh giá)</span>
                  </div>

                  <div className="flex justify-between items-end mt-auto pt-3 lp-product-footer">
                    <div>
                      <div className="lp-product-price">
                        {fmt(p.pricePerDay)}<span className="lp-product-price-unit"> / ngày</span>
                      </div>
                      <div className="lp-product-deposit">Cọc bảo đảm: {fmt(p.deposit)}</div>
                    </div>
                    <span className="lp-product-arrow">→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="lp-steps-section">
        <div className="lp-container">
          <div className="lp-section-header lp-section-header--steps">
            <span className="lp-section-eyebrow lp-section-eyebrow--amber">Đơn giản & Nhanh chóng</span>
            <h2 className="lp-section-title">
              Quy trình thuê 4 bước tại GearGo
            </h2>
          </div>

          <div className="grid gap-6 lp-steps-grid">
            {steps.map((s) => (
              <div key={s.num} className="card-hover-lift lp-step-card">
                <div className="lp-step-icon">
                  <Icon name={s.icon} size={26} />
                </div>
                <div className="lp-step-num">BƯỚC {s.num}</div>
                <div className="lp-step-title">{s.title}</div>
                <div className="lp-step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Policy highlight */}
      <section className="lp-policy-section">
        <div className="grid gap-5 lp-policy-grid">
          {([
            { icon: "calendar", title: "Giữ chỗ 15 phút", desc: "Sau khi đặt đơn, hệ thống giữ số lượng 15 phút để bạn thanh toán." },
            { icon: "wallet", title: "Cọc hoàn minh bạch", desc: "Trả đồ đạt yêu cầu — hoàn cọc ngay sau khi đối soát hoàn tất." },
            { icon: "shield", title: "Bảo quản chuẩn chỉ", desc: "Vệ sinh, phơi sấy và kiểm định độ bền sau mỗi lượt khách." },
            { icon: "user", title: "Hỗ trợ 7 ngày/tuần", desc: "Đội ngũ chuyên viên cắm trại sẵn sàng tư vấn lịch trình và thiết bị." },
          ] as { icon: IconName; title: string; desc: string }[]).map((p) => (
            <div key={p.title} className="card-hover-lift lp-policy-card">
              <span className="lp-policy-icon">
                <Icon name={p.icon} size={22} />
              </span>
              <div>
                <div className="lp-policy-title">{p.title}</div>
                <div className="lp-policy-desc">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-faq-section">
        <div className="lp-section-header">
          <h2 className="lp-faq-title">
            Câu hỏi thường gặp
          </h2>
          <p className="lp-faq-sub">Những thắc mắc phổ biến của khách hàng khi thuê thiết bị tại GearGo</p>
        </div>
        <div className="flex flex-col gap-3">
          {faqs.map((f, i) => (
            <details key={i} className="lp-faq-item">
              <summary className="lp-faq-summary">
                <span className="lp-faq-star">✦</span> {f.q}
              </summary>
              <div className="lp-faq-answer">{f.a}</div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
