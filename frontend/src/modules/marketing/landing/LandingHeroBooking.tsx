import type { AppState } from "../../../context/AppContext";
import Icon from "../../../components/Icon";
import { LANDING_BOOKING_HOURS } from "./landingData";

interface LandingHeroBookingProps {
  app: AppState;
  hasValidPeriod: boolean;
}

/**
 * Phần Hero trang chủ và thanh chọn lịch thuê nổi (Floating Booking Bar).
 */
export function LandingHeroBooking({ app, hasValidPeriod }: LandingHeroBookingProps) {
  return (
    <>
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
                  {LANDING_BOOKING_HOURS.map((h) => (
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
                  {LANDING_BOOKING_HOURS.map((h) => (
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
    </>
  );
}
